const mongoose = require('mongoose');

const duelSchema = new mongoose.Schema({
    phase:     { type: String, enum: ['qualifier', 'upper', 'lower', 'king', 's_bracket', 'encounter'], default: 'qualifier', index: true },
    tierGroup: { type: String, enum: ['B', 'A', 'S'], required: true, index: true },
    playerA: {
        playerId:  { type: String, required: true, index: true },
        battleTag: { type: String, required: true, index: true },
        name:      { type: String, required: true },
        tier:      { type: Number, required: true, min: 1, max: 4 },
        points:    { type: Number, default: 0 }
    },
    playerB: {
        playerId:  { type: String, required: true, index: true },
        battleTag: { type: String, required: true, index: true },
        name:      { type: String, required: true },
        tier:      { type: Number, required: true, min: 1, max: 4 },
        points:    { type: Number, default: 0 }
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

const stage2ParticipantSchema = new mongoose.Schema({
    playerId:  { type: String, required: true, unique: true, index: true },
    battleTag: { type: String, required: true, unique: true, index: true },
    name:      { type: String, required: true },
    tier:      { type: String, enum: ['B', 'A', 'S'], required: true, index: true },
    status:    { type: String, enum: ['qualifier', 'upper', 'lower', 'king', 's_bracket', 'eliminated'], required: true },
    qualifierWins:   { type: Number, default: 0 },
    qualifierLosses: { type: Number, default: 0 },
    qualifierGames:  { type: Number, default: 0 },
    upperWins:       { type: Number, default: 0 },
    upperLosses:     { type: Number, default: 0 },
    lowerWins:       { type: Number, default: 0 },
    lowerLosses:     { type: Number, default: 0 },
    kingQualified:   { type: Boolean, default: false },
    // One-use relic. It can only prevent removal from the central S arena.
    arenaShield:     { type: Boolean, default: false },
    arenaShieldUsedAt: { type: Date, default: null },
    winStreak:       { type: Number, default: 0 },
    specialMoveReady: { type: Boolean, default: false },
    mysteryUsed:     { type: Boolean, default: false },
    specialPath:     { type: String, enum: ['safe', 'mystery', null], default: null },
    encounterType:   { type: String, enum: ['dragon', 'dungeon', null], default: null },
    encounterOpponentId: { type: String, default: null },
    encounterOpponentName: { type: String, default: null },
    encounterStatus: { type: String, enum: ['pending', 'won', 'lost', null], default: null },
    mapWins:         { type: Number, default: 0 },
    mapLosses:       { type: Number, default: 0 },
    opponents:       { type: [String], default: [] },
    updatedAt:       { type: Date, default: Date.now }
});
stage2ParticipantSchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id.toString(); delete ret._id; } });

module.exports.Stage2Participant = mongoose.model('Stage2Participant', stage2ParticipantSchema);
