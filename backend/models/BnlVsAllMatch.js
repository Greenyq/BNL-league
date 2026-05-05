const mongoose = require('mongoose');

const bnlVsAllMatchSchema = new mongoose.Schema(
    {
        date: { type: Date },
        season: { type: String },
        status: { type: String, enum: ['upcoming', 'ongoing', 'completed'], default: 'completed' },
        bnlTeamName: { type: String, default: 'BNL' },
        opponentName: { type: String, required: true },
        score: {
            bnl: { type: Number, default: 0 },
            opponent: { type: Number, default: 0 },
        },
        winner: { type: String, enum: ['bnl', 'opponent', null], default: null },
        bnlPlayers: [{ type: String }],
        opponentPlayers: [{ type: String }],
        note: { type: String },
    },
    { timestamps: true }
);

bnlVsAllMatchSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
    },
});

module.exports = { BnlVsAllMatch: mongoose.model('BnlVsAllMatch', bnlVsAllMatchSchema) };
