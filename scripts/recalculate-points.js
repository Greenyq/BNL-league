#!/usr/bin/env node

/**
 * Script to recalculate points for all completed matches with correct K-factor
 * Usage: node scripts/recalculate-points.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Import models
const modelPath = path.join(__dirname, '../src/backend/models');
const { Team, Player, TeamMatch } = require(modelPath);

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/bnl-league';

async function recalculateAllPoints() {
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected to MongoDB');

        // Find all completed matches with winners
        const matches = await TeamMatch.find({
            status: 'completed',
            winnerId: { $ne: null }
        });

        console.log(`🔄 Recalculating points for ${matches.length} completed matches...\n`);
        let updatedCount = 0;
        let skippedCount = 0;

        for (const match of matches) {
            // Get both players to compare MMR
            const player1 = await Player.findById(match.player1Id);
            const player2 = await Player.findById(match.player2Id);

            if (!player1 || !player2) {
                console.log(`⚠️  SKIP: Match ${match.id} - Player not found`);
                skippedCount++;
                continue;
            }

            const winnerIsPlayer1 = match.winnerId === match.player1Id;
            const winner = winnerIsPlayer1 ? player1 : player2;
            const loser = winnerIsPlayer1 ? player2 : player1;

            const winnerMmr = winner.currentMmr || 0;
            const loserMmr = loser.currentMmr || 0;
            const mmrDiff = winnerMmr - loserMmr;

            // Calculate points with CORRECT K-factor logic
            let points = 0;
            if (mmrDiff >= 150) {
                points = 10; // Winner is much stronger (easy win)
            } else if (mmrDiff >= 100) {
                points = 20; // Winner is stronger
            } else if (mmrDiff >= -99) {
                points = 50; // Normal match (around equal)
            } else {
                // Winner is weaker (difficult win)
                points = 70;
            }

            // Update match with correct points
            await TeamMatch.findByIdAndUpdate(
                match.id,
                { points: points },
                { new: true }
            );

            updatedCount++;
            console.log(`✅ ${updatedCount}. ${winner.name} (${winnerMmr}) vs ${loser.name} (${loserMmr}) = +${points} pts (diff: ${mmrDiff})`);
        }

        console.log(`\n✅ Recalculation complete:`);
        console.log(`   Updated: ${updatedCount} matches`);
        console.log(`   Skipped: ${skippedCount} matches`);

        await mongoose.connection.close();
        console.log('✅ Disconnected from MongoDB');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error recalculating match points:', error);
        process.exit(1);
    }
}

recalculateAllPoints();
