const express = require('express');
const multer = require('multer');
const router = express.Router();
const { Portrait } = require('../models/Portrait');
const { checkAuth } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });
const receive = (req,res,next) => upload.single('image')(req,res,err => err ? res.status(400).json({error:err.code==='LIMIT_FILE_SIZE'?'Portrait must be 2 MB or smaller':err.message}) : next());
const dataUrl = file => file ? `data:${file.mimetype};base64,${file.buffer.toString('base64')}` : '';
const publicPortrait = portrait => ({...portrait,id:String(portrait._id),_id:undefined,imageUrl:`/api/portraits/${portrait._id}/image`});

// Keep the catalog response small. Images are served separately and cached.
router.get('/', async (req,res) => {
  try{
    const portraits=await Portrait.find().select('-imageUrl').sort({race:1,pointsRequired:1}).lean();
    res.json(portraits.map(publicPortrait));
  }catch{res.status(500).json({error:'Failed to fetch portraits'});}
});

router.get('/:id/image', async (req,res) => {
  try{
    const portrait=await Portrait.findById(req.params.id).select('imageUrl').lean();
    if(!portrait?.imageUrl)return res.status(404).end();
    const match=portrait.imageUrl.match(/^data:([^;]+);base64,(.+)$/s);
    if(!match)return res.redirect(portrait.imageUrl);
    const image=Buffer.from(match[2],'base64');
    res.type(match[1]);
    res.set('Cache-Control','public, max-age=86400');
    res.set('Content-Length',String(image.length));
    res.send(image);
  }catch{res.status(404).end();}
});

router.post('/',checkAuth,receive,async(req,res)=>{try{const imageUrl=dataUrl(req.file);if(!req.body.name||!imageUrl)return res.status(400).json({error:'Name and image file are required'});res.json(await Portrait.create({name:req.body.name,race:parseInt(req.body.race)||0,pointsRequired:parseInt(req.body.pointsRequired)||0,imageUrl}));}catch(err){res.status(500).json({error:err.message});}});
router.put('/:id',checkAuth,receive,async(req,res)=>{try{const updates={name:req.body.name,race:parseInt(req.body.race)||0,pointsRequired:parseInt(req.body.pointsRequired)||0,updatedAt:Date.now()};if(req.file)updates.imageUrl=dataUrl(req.file);const item=await Portrait.findByIdAndUpdate(req.params.id,updates,{new:true,runValidators:true});if(!item)return res.status(404).json({error:'Portrait not found'});res.json(item);}catch(err){res.status(500).json({error:err.message});}});
router.delete('/:id',checkAuth,async(req,res)=>{try{await Portrait.findByIdAndDelete(req.params.id);res.json({success:true});}catch(err){res.status(500).json({error:err.message});}});

module.exports=router;
