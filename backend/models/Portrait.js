const mongoose = require('mongoose');

const toJSON = {
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => { ret.id = ret._id.toString(); delete ret._id; }
};

// race: 0=Random/All, 1=Human, 2=Orc, 4=NightElf, 8=Undead
const portraitSchema = new mongoose.Schema({
    name:           { type: String, required: true },
    race:           { type: Number, required: true, default: 0 },
    pointsRequired: { type: Number, required: true, default: 0 },
    imageUrl:       { type: String, required: true },
    createdAt:      { type: Date, default: Date.now },
    updatedAt:      { type: Date, default: Date.now }
});
portraitSchema.set('toJSON', toJSON);

const Portrait = mongoose.model('Portrait', portraitSchema);

module.exports = { Portrait };
