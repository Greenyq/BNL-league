const express = require('express');
const path = require('path');
const multer = require('multer');

const { MapLabel, MapFile } = require('../models/Map');
const { checkAuth } = require('../middleware/auth');

const router = express.Router();
const ALLOWED_EXTENSIONS = new Set(['.w3x', '.w3m']);
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const LIST_FIELDS = '-fileData';

const mapUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        if (ALLOWED_EXTENSIONS.has(ext)) return cb(null, true);
        cb(new Error('Only .w3x and .w3m map files are allowed'));
    }
});

function uploadMapFile(req, res, next) {
    mapUpload.single('file')(req, res, err => {
        if (!err) return next();
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Map file must be 10 MB or smaller' });
        }
        return res.status(400).json({ error: err.message || 'Invalid map file' });
    });
}

function clean(value) {
    return String(value || '').trim();
}

function serializeLean(doc) {
    return {
        ...doc,
        id: doc._id.toString(),
        _id: undefined,
    };
}

function serializeLabel(doc) {
    const label = serializeLean(doc);
    delete label.description;
    return label;
}

function buildFileFields(file) {
    const mimeType = file.mimetype || 'application/octet-stream';
    const extension = path.extname(file.originalname || '').toLowerCase();
    return {
        originalName: file.originalname,
        mimeType,
        extension,
        size: file.size,
        fileData: `data:${mimeType};base64,${file.buffer.toString('base64')}`,
    };
}

async function ensureLabel(labelId) {
    if (!labelId) return false;
    return !!(await MapLabel.exists({ _id: labelId }));
}

// Public list grouped by label. File payloads are intentionally excluded.
router.get('/', async (req, res) => {
    try {
        const [labels, maps] = await Promise.all([
            MapLabel.find().sort({ name: 1 }).lean(),
            MapFile.find().select(LIST_FIELDS).sort({ title: 1 }).lean(),
        ]);

        const mapsByLabel = maps.reduce((acc, map) => {
            if (!acc[map.labelId]) acc[map.labelId] = [];
            acc[map.labelId].push(serializeLean(map));
            return acc;
        }, {});

        res.json(labels.map(label => ({
            ...serializeLabel(label),
            maps: mapsByLabel[label._id.toString()] || [],
        })));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch maps' });
    }
});

router.get('/:id/download', async (req, res) => {
    try {
        const map = await MapFile.findById(req.params.id);
        if (!map) return res.status(404).json({ error: 'Map not found' });

        const base64 = (map.fileData || '').split(',')[1];
        if (!base64) return res.status(500).json({ error: 'Map file is corrupted' });

        const buffer = Buffer.from(base64, 'base64');
        res.attachment(map.originalName);
        res.type(map.mimeType || 'application/octet-stream');
        res.setHeader('Content-Length', buffer.length);
        res.send(buffer);
    } catch (err) {
        res.status(500).json({ error: 'Failed to download map' });
    }
});

// Admin label CRUD.
router.post('/labels', checkAuth, async (req, res) => {
    try {
        const name = clean(req.body.name);
        if (!name) return res.status(400).json({ error: 'Label name is required' });

        const label = await MapLabel.create({ name });
        res.json(label);
    } catch (err) {
        if (err.code === 11000) return res.status(400).json({ error: 'Label already exists' });
        res.status(500).json({ error: err.message });
    }
});

router.put('/labels/:id', checkAuth, async (req, res) => {
    try {
        const name = clean(req.body.name);
        if (!name) return res.status(400).json({ error: 'Label name is required' });

        const label = await MapLabel.findByIdAndUpdate(
            req.params.id,
            { $set: { name, updatedAt: Date.now() }, $unset: { description: '' } },
            { new: true, runValidators: true }
        );
        if (!label) return res.status(404).json({ error: 'Label not found' });
        res.json(label);
    } catch (err) {
        if (err.code === 11000) return res.status(400).json({ error: 'Label already exists' });
        res.status(500).json({ error: err.message });
    }
});

router.delete('/labels/:id', checkAuth, async (req, res) => {
    try {
        const mapCount = await MapFile.countDocuments({ labelId: req.params.id });
        if (mapCount > 0) {
            return res.status(409).json({ error: 'Delete maps in this label before deleting the label' });
        }

        const label = await MapLabel.findByIdAndDelete(req.params.id);
        if (!label) return res.status(404).json({ error: 'Label not found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin map CRUD.
router.post('/', checkAuth, uploadMapFile, async (req, res) => {
    try {
        const title = clean(req.body.title);
        const labelId = clean(req.body.labelId);
        if (!title) return res.status(400).json({ error: 'Map title is required' });
        if (!labelId) return res.status(400).json({ error: 'Label is required' });
        if (!req.file) return res.status(400).json({ error: 'Map file is required' });
        if (!(await ensureLabel(labelId))) return res.status(400).json({ error: 'Label not found' });

        const map = await MapFile.create({
            labelId,
            title,
            description: clean(req.body.description),
            ...buildFileFields(req.file),
        });
        const publicMap = await MapFile.findById(map.id).select(LIST_FIELDS);
        res.json(publicMap);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', checkAuth, uploadMapFile, async (req, res) => {
    try {
        const updates = { updatedAt: Date.now() };

        if (req.body.title !== undefined) {
            const title = clean(req.body.title);
            if (!title) return res.status(400).json({ error: 'Map title is required' });
            updates.title = title;
        }

        if (req.body.description !== undefined) updates.description = clean(req.body.description);

        if (req.body.labelId !== undefined) {
            const labelId = clean(req.body.labelId);
            if (!labelId) return res.status(400).json({ error: 'Label is required' });
            if (!(await ensureLabel(labelId))) return res.status(400).json({ error: 'Label not found' });
            updates.labelId = labelId;
        }

        if (req.file) Object.assign(updates, buildFileFields(req.file));

        const map = await MapFile.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        ).select(LIST_FIELDS);
        if (!map) return res.status(404).json({ error: 'Map not found' });
        res.json(map);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', checkAuth, async (req, res) => {
    try {
        const map = await MapFile.findByIdAndDelete(req.params.id);
        if (!map) return res.status(404).json({ error: 'Map not found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
