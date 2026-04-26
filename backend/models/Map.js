const mongoose = require('mongoose');

const toJSON = {
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => { ret.id = ret._id.toString(); delete ret._id; }
};

const mapLabelSchema = new mongoose.Schema({
    name:        { type: String, required: true, trim: true, unique: true },
    createdAt:   { type: Date, default: Date.now },
    updatedAt:   { type: Date, default: Date.now }
});
mapLabelSchema.set('toJSON', toJSON);

const mapFileSchema = new mongoose.Schema({
    labelId:      { type: String, required: true, index: true },
    title:        { type: String, required: true, trim: true },
    description:  { type: String, default: '', trim: true },
    originalName: { type: String, required: true },
    mimeType:     { type: String, required: true, default: 'application/octet-stream' },
    extension:    { type: String, required: true },
    size:         { type: Number, required: true },
    fileData:     { type: String, required: true },
    createdAt:    { type: Date, default: Date.now },
    updatedAt:    { type: Date, default: Date.now }
});
mapFileSchema.set('toJSON', toJSON);

module.exports = {
    MapLabel: mongoose.model('MapLabel', mapLabelSchema),
    MapFile:  mongoose.model('MapFile', mapFileSchema),
};
