const mongoose = require('mongoose');

// ── ClanWar ───────────────────────────────────────────────────────────────────
// Format: first team to 3 wins. Each internal match is BO3.
// Match order: 1v1 Duel A → 1v1 Duel B → 2v2 → (if 2-1) 1v1 → (if 2-2) tiebreak
const clanWarSchema = new mongoose.Schema(
    {
        season: { type: String },
        date:   { type: Date },
        status: { type: String, enum: ['upcoming', 'ongoing', 'completed'], default: 'upcoming' },

        teamA: {
            name:    String,
            captain: String,
            players: [String]
        },
        teamB: {
            name:    String,
            captain: String,
            players: [String]
        },

        clanWarScore: {
            a: { type: Number, default: 0 }, // wins by teamA
            b: { type: Number, default: 0 }  // wins by teamB
        },

        matches: [{
            order:  { type: Number },                                        // 1–5
            format: { type: String, enum: ['1v1', '2v2', '3v3'] },
            label:  { type: String },                                        // "Дуэль I", "2 на 2" etc.
            playerA:{ type: String },                                        // "МистерЧенс" or "А + Б"
            playerB:{ type: String },
            score:  { a: { type: Number, default: 0 }, b: { type: Number, default: 0 } }, // BO3 score
            winner: { type: String, enum: ['a', 'b', null], default: null },
            games: [{
                gameNumber: Number,
                map:        String,
                winner:     String  // 'a' | 'b'
            }]
        }],

        winner: { type: String, enum: ['a', 'b', null], default: null },

        draft: {
            status: { type: String, enum: ['pending', 'drafting', 'complete'], default: 'pending' },
            currentTier: { type: Number, default: 1 },
            currentTeamTurn: { type: String, enum: ['a', 'b'], default: 'a' },
            tierOrder: {
                tier1: { type: [String], default: ['a', 'b'] },
                tier2: { type: [String], default: ['b', 'a'] },
                tier3: { type: [String], default: ['a', 'b'] }
            },
            picks: [{
                team:            { type: String },          // 'a' or 'b'
                playerId:        { type: mongoose.Schema.Types.ObjectId },
                playerBattleTag: { type: String },
                tier:            { type: Number },
                pickedAt:        { type: Date, default: Date.now }
            }]
        }
    },
    { timestamps: true }
);

clanWarSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => { ret.id = ret._id.toString(); delete ret._id; }
});

module.exports = { ClanWar: mongoose.model('ClanWar', clanWarSchema) };
