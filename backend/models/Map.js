const mongoose = require('mongoose');

const toJSON = {
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => { ret.id = ret._id.toString(); delete ret._id; }
};

const mapLabelSchema = new mongoose.Schema({
    name:        { type: String, required: true, trim: true },
    season:      { type: String, required: true, trim: true, default: 'Season 3', index: true },
    active:      { type: Boolean, default: true, index: true },
    kind:        { type: String, enum: ['biome', 'arena'], default: 'biome' },
    createdAt:   { type: Date, default: Date.now },
    updatedAt:   { type: Date, default: Date.now }
});
mapLabelSchema.set('toJSON', toJSON);

mapLabelSchema.index({ season: 1, name: 1 }, { unique: true });

const mapFileSchema = new mongoose.Schema({
    labelId:      { type: String, required: true, index: true },
    title:        { type: String, required: true, trim: true },
    description:  { type: String, default: '', trim: true },
    previewImageUrl: { type: String, default: '' },
    originalName: { type: String, default: '' },
    mimeType:     { type: String, default: 'application/octet-stream' },
    extension:    { type: String, default: '' },
    size:         { type: Number, default: 0 },
    fileData:     { type: String, default: '' },
    createdAt:    { type: Date, default: Date.now },
    updatedAt:    { type: Date, default: Date.now }
});
mapFileSchema.set('toJSON', toJSON);

module.exports = {
    MapLabel: mongoose.model('MapLabel', mapLabelSchema),
    MapFile:  mongoose.model('MapFile', mapFileSchema),
};
