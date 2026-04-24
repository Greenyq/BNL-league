const mongoose = require('mongoose');

const toJSON = {
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => { ret.id = ret._id.toString(); delete ret._id; }
};

// ── Player ────────────────────────────────────────────────────────────────────
const playerSchema = new mongoose.Schema({
    battleTag:         { type: String, required: true, unique: true, index: true },
    name:              { type: String, required: true },
    race:              { type: Number },
    mainRace:          { type: Number }, // 0=Random 1=Human 2=Orc 4=NightElf 8=Undead
    currentMmr:        { type: Number },
    teamId:            { type: String },
    discordTag:        { type: String },
    selectedPortraitId:       { type: String },
    selectedPortrait:         { type: String }, // URL of selected portrait image
    tierOverride:             { type: Number, default: null }, // null=auto, 1=B, 2=A, 3=S
    seasonWinner:             { type: Number, default: null }, // null=no, 1=season1, 2=season2, ...
    draftAvailable:           { type: Boolean, default: false },
    draftAvailableUpdatedAt:  { type: Date },
    createdAt:                { type: Date, default: Date.now },
    updatedAt:                { type: Date, default: Date.now }
});
playerSchema.set('toJSON', toJSON);

// ── PlayerCache (W3Champions match data, 1-hour TTL) ─────────────────────────
const playerCacheSchema = new mongoose.Schema({
    battleTag:   { type: String, required: true, unique: true, index: true },
    matchData:   { type: Array, default: [] },
    lastUpdated: { type: Date, default: Date.now },
    expiresAt:   { type: Date, required: true, index: true }
});
playerCacheSchema.set('toJSON', toJSON);

// ── PlayerStats (pre-calculated, updated by cron every 10 min) ───────────────
const playerStatsSchema = new mongoose.Schema({
    battleTag:         { type: String, required: true, unique: true, index: true },
    points:            { type: Number, default: 0 },
    wins:              { type: Number, default: 0 },
    losses:            { type: Number, default: 0 },
    mmr:               { type: Number, default: 0 },
    maxPointsAchieved: { type: Number, default: 0 },
    raceStats: [{
        race:         Number,
        points:       Number,
        wins:         Number,
        losses:       Number,
        mmr:          Number,
        achievements: [String],
        matchCount:   Number,
        matchHistory: [{
            result:      String,  // 'win' | 'loss'
            mmrDiff:     Number,
            playerMMR:   Number,
            opponentMMR: Number,
            isBnlMatch:  Boolean,
            opponentTag: String
        }]
    }],
    cachedAt:  { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
playerStatsSchema.set('toJSON', toJSON);

// ── ManualPointsAdjustment ────────────────────────────────────────────────────
const manualPointsAdjustmentSchema = new mongoose.Schema({
    playerId:  { type: String, required: true, index: true },
    battleTag: { type: String, required: true, index: true },
    amount:    { type: Number, required: true },
    reason:    { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
manualPointsAdjustmentSchema.set('toJSON', toJSON);

// ── PlayerUser / PlayerSession / PasswordReset ────────────────────────────────
const playerUserSchema = new mongoose.Schema({
    username:       { type: String, required: true, unique: true },
    passwordHash:   { type: String, required: true },
    linkedBattleTag:{ type: String },
    createdAt:      { type: Date, default: Date.now },
    updatedAt:      { type: Date, default: Date.now }
});
playerUserSchema.set('toJSON', {
    ...toJSON,
    transform: (doc, ret) => { ret.id = ret._id.toString(); delete ret._id; delete ret.passwordHash; }
});

const playerSessionSchema = new mongoose.Schema({
    sessionId:    { type: String, unique: true },
    playerUserId: { type: String, required: true },
    timestamp:    { type: Date, default: Date.now },
    expiresAt:    { type: Date, required: true, index: { expireAfterSeconds: 0 } }
});

const passwordResetSchema = new mongoose.Schema({
    username:  { type: String, required: true },
    resetCode: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = {
    Player:                  mongoose.model('Player', playerSchema),
    PlayerCache:             mongoose.model('PlayerCache', playerCacheSchema),
    PlayerStats:             mongoose.model('PlayerStats', playerStatsSchema),
    ManualPointsAdjustment:  mongoose.model('ManualPointsAdjustment', manualPointsAdjustmentSchema),
    PlayerUser:              mongoose.model('PlayerUser', playerUserSchema),
    PlayerSession:           mongoose.model('PlayerSession', playerSessionSchema),
    PasswordReset:           mongoose.model('PasswordReset', passwordResetSchema),
};
