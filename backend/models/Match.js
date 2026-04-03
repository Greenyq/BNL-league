const mongoose = require('mongoose');

const toJSON = {
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => { ret.id = ret._id.toString(); delete ret._id; }
};

// ── TeamMatch (1v1 league matches between team representatives) ───────────────
const teamMatchSchema = new mongoose.Schema({
    team1Id:    { type: String, required: true },
    team2Id:    { type: String, required: true },
    player1Id:  { type: String, required: true },
    player2Id:  { type: String, required: true },
    homePlayerId:{ type: String }, // Responsible for lobby / reporting
    winnerId:   { type: String },
    points:     { type: Number, default: 0 },
    pointsOverride: { type: Number }, // Admin override (e.g. off-race matches)
    notes:      { type: String },
    status:     { type: String, enum: ['upcoming', 'completed'], default: 'upcoming' },
    scheduledDate: { type: Date },
    scheduledTime: { type: String }, // HH:MM
    reportedBy: { type: String },
    w3championsMatchId: { type: String },
    matchFile: {
        originalName: String,
        filename:     String,
        size:         Number,
        uploadedAt:   Date,
        uploadedBy:   String
    },
    createdAt:  { type: Date, default: Date.now },
    updatedAt:  { type: Date, default: Date.now }
});
teamMatchSchema.set('toJSON', toJSON);

// ── FinalsMatch (tournament bracket) ─────────────────────────────────────────
const finalsMatchSchema = new mongoose.Schema({
    round:        { type: String, enum: ['quarterfinal', 'semifinal', 'final'], required: true },
    matchIndex:   { type: Number, required: true },
    player1Id:    { type: String },
    player2Id:    { type: String },
    player1TeamId:{ type: String },
    player2TeamId:{ type: String },
    winnerId:     { type: String },
    map1:         { type: String, default: '' },
    map2:         { type: String, default: '' },
    score1:       { type: Number, default: 0 },
    score2:       { type: Number, default: 0 },
    status:       { type: String, enum: ['upcoming', 'completed'], default: 'upcoming' },
    createdAt:    { type: Date, default: Date.now },
    updatedAt:    { type: Date, default: Date.now }
});
finalsMatchSchema.set('toJSON', toJSON);

// ── SiteSettings (key-value store) ───────────────────────────────────────────
const siteSettingsSchema = new mongoose.Schema({
    key:   { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed }
});

module.exports = {
    TeamMatch:    mongoose.model('TeamMatch', teamMatchSchema),
    FinalsMatch:  mongoose.model('FinalsMatch', finalsMatchSchema),
    SiteSettings: mongoose.model('SiteSettings', siteSettingsSchema),
};
