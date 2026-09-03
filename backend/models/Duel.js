const mongoose = require('mongoose');

const duelSchema = new mongoose.Schema({
    playerA: {
        playerId:  { type: String, required: true, index: true },
        battleTag: { type: String, required: true, index: true },
        name:      { type: String, required: true },
        tier:      { type: Number, required: true, min: 1, max: 4 },
        points:    { type: Number, required: true }
    },
    playerB: {
        playerId:  { type: String, required: true, index: true },
        battleTag: { type: String, required: true, index: true },
        name:      { type: String, required: true },
        tier:      { type: Number, required: true, min: 1, max: 4 },
        points:    { type: Number, required: true }
    },
    winner:   { type: String, enum: ['A', 'B'], required: true },
    score:    { type: String, trim: true, maxlength: 30, default: '' },
    notes:    { type: String, trim: true, maxlength: 500, default: '' },
    playedAt: { type: Date, required: true, default: Date.now },
    createdAt:{ type: Date, default: Date.now }
});

duelSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => { ret.id = ret._id.toString(); delete ret._id; }
});

module.exports = { Duel: mongoose.model('Duel', duelSchema) };
