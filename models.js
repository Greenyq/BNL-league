const mongoose = require('mongoose');

// Team Schema
const teamSchema = new mongoose.Schema({
    name: { type: String, required: true },
    emoji: { type: String, default: '👥' },
    logo: { type: String },
    captainId: { type: String },
    coaches: [String],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Transform _id to id for JSON responses
teamSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
    }
});

// Player Schema
const playerSchema = new mongoose.Schema({
    battleTag: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    race: { type: Number },
    currentMmr: { type: Number },
    teamId: { type: String },
    discordTag: { type: String }, // Discord tag, e.g., "username#1234"
    selectedPortraitId: { type: String }, // ID of selected portrait
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Transform _id to id for JSON responses
playerSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
    }
});

// Team Match Schema
const teamMatchSchema = new mongoose.Schema({
    team1Id: { type: String, required: true },
    team2Id: { type: String, required: true },
    player1Id: { type: String, required: true },
    player2Id: { type: String, required: true },
    winnerId: { type: String },
    points: { type: Number, default: 0 },
    notes: { type: String },
    status: { type: String, enum: ['upcoming', 'completed'], default: 'upcoming' },
    scheduledDate: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Transform _id to id for JSON responses
teamMatchSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
    }
});

// Portrait Schema
const portraitSchema = new mongoose.Schema({
    name: { type: String, required: true },
    race: { type: Number, required: true }, // 0=Random, 1=Human, 2=Orc, 4=NightElf, 8=Undead
    pointsRequired: { type: Number, required: true }, // Minimum points to unlock
    imageUrl: { type: String, required: true }, // URL to portrait image
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Transform _id to id for JSON responses
portraitSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
    }
});

// Streamer Schema
const streamerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    twitchUsername: { type: String, required: true }, // Twitch username
    avatarUrl: { type: String }, // Avatar/logo URL
    description: { type: String }, // Short description
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Transform _id to id for JSON responses
streamerSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
    }
});

// Admin Session Schema
const adminSessionSchema = new mongoose.Schema({
    sessionId: { type: String, unique: true },
    isLoggedIn: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
});

// Player User Schema (for authentication and profile management)
const playerUserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    linkedBattleTag: { type: String }, // Links to Player.battleTag
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Transform _id to id for JSON responses
playerUserSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.passwordHash; // Never send password hash to client
    }
});

// Player Session Schema (similar to AdminSession)
const playerSessionSchema = new mongoose.Schema({
    sessionId: { type: String, unique: true },
    playerUserId: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

// Password Reset Schema
const passwordResetSchema = new mongoose.Schema({
    username: { type: String, required: true },
    resetCode: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now }
});

// Player Cache Schema - for caching W3Champions match data
const playerCacheSchema = new mongoose.Schema({
    battleTag: { type: String, required: true, unique: true },
    matchData: { type: Array, default: [] }, // Raw match data from W3Champions
    profiles: { type: Array, default: [] }, // Processed profiles by race
    lastUpdated: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true } // Cache expiration (e.g., 10 minutes)
});

// Transform _id to id for JSON responses
playerCacheSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
    }
});

module.exports = {
    Team: mongoose.model('Team', teamSchema),
    Player: mongoose.model('Player', playerSchema),
    TeamMatch: mongoose.model('TeamMatch', teamMatchSchema),
    Portrait: mongoose.model('Portrait', portraitSchema),
    Streamer: mongoose.model('Streamer', streamerSchema),
    AdminSession: mongoose.model('AdminSession', adminSessionSchema),
    PlayerUser: mongoose.model('PlayerUser', playerUserSchema),
    PlayerSession: mongoose.model('PlayerSession', playerSessionSchema),
    PasswordReset: mongoose.model('PasswordReset', passwordResetSchema),
    PlayerCache: mongoose.model('PlayerCache', playerCacheSchema)
};
