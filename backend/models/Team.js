const mongoose = require('mongoose');

const toJSON = {
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => { ret.id = ret._id.toString(); delete ret._id; }
};

const teamSchema = new mongoose.Schema({
    name:      { type: String, required: true },
    emoji:     { type: String, default: '👥' },
    logo:      { type: String }, // base64 data URL or external URL
    captainId: { type: String },
    coaches:   [String],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
teamSchema.set('toJSON', toJSON);

module.exports = { Team: mongoose.model('Team', teamSchema) };
