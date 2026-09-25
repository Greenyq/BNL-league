const express = require('express');
const path = require('path');
const multer = require('multer');
const { MapLabel, MapFile } = require('../models/Map');
const { checkAuth } = require('../middleware/auth');
const { ensureMapCatalog } = require('../services/mapCatalog');

const router = express.Router();
const MAP_EXTENSIONS = new Set(['.w3x', '.w3m']);
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const LIST_FIELDS = '-fileData';
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req,file,cb) => {
    const ext=path.extname(file.originalname||'').toLowerCase();
    const allowed=file.fieldname==='preview'?IMAGE_EXTENSIONS:MAP_EXTENSIONS;
    allowed.has(ext)?cb(null,true):cb(new Error(file.fieldname==='preview'?'Preview must be PNG, JPG or WEBP':'Only .w3x and .w3m map files are allowed'));
  }
});
function receiveFiles(req,res,next){upload.fields([{name:'file',maxCount:1},{name:'preview',maxCount:1}])(req,res,err=>err?res.status(400).json({error:err.code==='LIMIT_FILE_SIZE'?'File must be 10 MB or smaller':err.message}):next());}
const clean=v=>String(v||'').trim();
const serialize=doc=>({...doc,id:doc._id.toString(),_id:undefined});
const dataUrl=file=>file?`data:${file.mimetype};base64,${file.buffer.toString('base64')}`:'';
const gameFile=req=>req.files?.file?.[0]||null;
const previewFile=req=>req.files?.preview?.[0]||null;
const gameFields=file=>({originalName:file.originalname,mimeType:file.mimetype||'application/octet-stream',extension:path.extname(file.originalname||'').toLowerCase(),size:file.size,fileData:dataUrl(file)});

router.get('/',async(req,res)=>{
  try{
    await ensureMapCatalog();
    const [labels,maps]=await Promise.all([MapLabel.find().sort({season:1,kind:1,name:1}).lean(),MapFile.find().select(LIST_FIELDS).sort({title:1}).lean()]);
    const grouped=maps.reduce((a,m)=>{(a[m.labelId]||=[]).push(serialize(m));return a;},{});
    res.json(labels.map(l=>({...serialize(l),season:l.season||'Season 3',active:l.active!==false,kind:l.kind||'biome',maps:grouped[l._id.toString()]||[]})));
  }catch(err){res.status(500).json({error:err.message||'Failed to fetch maps'});}
});
router.get('/:id/download',async(req,res)=>{
  try{const map=await MapFile.findById(req.params.id);if(!map)return res.status(404).json({error:'Map not found'});const base64=(map.fileData||'').split(',')[1];if(!base64)return res.status(404).json({error:'Game file has not been attached yet'});const buffer=Buffer.from(base64,'base64');res.attachment(map.originalName);res.type(map.mimeType||'application/octet-stream');res.setHeader('Content-Length',buffer.length);res.send(buffer);}catch{res.status(500).json({error:'Failed to download map'});}
});
router.post('/labels',checkAuth,async(req,res)=>{try{const name=clean(req.body.name);if(!name)return res.status(400).json({error:'Biome name is required'});res.json(await MapLabel.create({name,season:clean(req.body.season)||'Season 3',active:req.body.active!==false,kind:req.body.kind==='arena'?'arena':'biome'}));}catch(err){res.status(err.code===11000?400:500).json({error:err.code===11000?'Biome already exists in this season':err.message});}});
router.put('/labels/:id',checkAuth,async(req,res)=>{try{const name=clean(req.body.name);if(!name)return res.status(400).json({error:'Biome name is required'});const item=await MapLabel.findByIdAndUpdate(req.params.id,{name,season:clean(req.body.season)||'Season 3',active:req.body.active!==false,kind:req.body.kind==='arena'?'arena':'biome',updatedAt:Date.now()},{new:true,runValidators:true});if(!item)return res.status(404).json({error:'Biome not found'});res.json(item);}catch(err){res.status(500).json({error:err.message});}});
router.delete('/labels/:id',checkAuth,async(req,res)=>{try{if(await MapFile.exists({labelId:req.params.id}))return res.status(409).json({error:'Delete maps in this biome first'});const item=await MapLabel.findByIdAndDelete(req.params.id);if(!item)return res.status(404).json({error:'Biome not found'});res.json({success:true});}catch(err){res.status(500).json({error:err.message});}});
router.post('/',checkAuth,receiveFiles,async(req,res)=>{try{const title=clean(req.body.title),labelId=clean(req.body.labelId),game=gameFile(req),preview=previewFile(req);if(!title||!labelId)return res.status(400).json({error:'Title and biome are required'});if(!game&&!preview)return res.status(400).json({error:'Add a preview image or Warcraft map file'});if(!(await MapLabel.exists({_id:labelId})))return res.status(400).json({error:'Biome not found'});const item=await MapFile.create({labelId,title,description:clean(req.body.description),previewImageUrl:dataUrl(preview),...(game?gameFields(game):{})});res.json(await MapFile.findById(item.id).select(LIST_FIELDS));}catch(err){res.status(500).json({error:err.message});}});
router.put('/:id',checkAuth,receiveFiles,async(req,res)=>{try{const updates={updatedAt:Date.now()};if(req.body.title!==undefined)updates.title=clean(req.body.title);if(req.body.description!==undefined)updates.description=clean(req.body.description);if(req.body.labelId!==undefined)updates.labelId=clean(req.body.labelId);if(gameFile(req))Object.assign(updates,gameFields(gameFile(req)));if(previewFile(req))updates.previewImageUrl=dataUrl(previewFile(req));const item=await MapFile.findByIdAndUpdate(req.params.id,updates,{new:true,runValidators:true}).select(LIST_FIELDS);if(!item)return res.status(404).json({error:'Map not found'});res.json(item);}catch(err){res.status(500).json({error:err.message});}});
router.delete('/:id',checkAuth,async(req,res)=>{try{const item=await MapFile.findByIdAndDelete(req.params.id);if(!item)return res.status(404).json({error:'Map not found'});res.json({success:true});}catch(err){res.status(500).json({error:err.message});}});
module.exports=router;
