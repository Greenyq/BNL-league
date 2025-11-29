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

// Player Schema
const playerSchema = new mongoose.Schema({
    battleTag: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    race: { type: Number },
    currentMmr: { type: Number },
    teamId: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
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

// Admin Session Schema
const adminSessionSchema = new mongoose.Schema({
    sessionId: { type: String, unique: true },
    isLoggedIn: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
});

module.exports = {
    Team: mongoose.model('Team', teamSchema),
    Player: mongoose.model('Player', playerSchema),
    TeamMatch: mongoose.model('TeamMatch', teamMatchSchema),
    AdminSession: mongoose.model('AdminSession', adminSessionSchema)
};
