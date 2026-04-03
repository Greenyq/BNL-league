/**
 * Migration script to fix winnerId values in TeamMatch documents
 * Converts team IDs to player IDs where necessary
 *
 * Run with: node src/migrations/fix-winner-ids.js
 */

const mongoose = require('mongoose');

// Load models
const { TeamMatch } = require('../backend/models');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gnl_league';

async function migrateWinnerIds() {
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find all completed matches with winnerId
        const matches = await TeamMatch.find({
            status: 'completed',
            winnerId: { $exists: true, $ne: null }
        });

        console.log(`📊 Found ${matches.length} completed matches to check`);

        let fixedCount = 0;
        let alreadyCorrect = 0;
        let couldNotFix = 0;

        for (const match of matches) {
            // Check if winnerId is already a valid player ID
            if (match.winnerId === match.player1Id || match.winnerId === match.player2Id) {
                alreadyCorrect++;
                continue;
            }

            // winnerId might be a team ID - try to convert it
            let newWinnerId = null;

            if (match.winnerId === match.team1Id) {
                newWinnerId = match.player1Id;
            } else if (match.winnerId === match.team2Id) {
                newWinnerId = match.player2Id;
            }

            if (newWinnerId) {
                // Update the match
                await TeamMatch.findByIdAndUpdate(
                    match._id,
                    { winnerId: newWinnerId },
                    { new: true }
                );
                fixedCount++;
                console.log(`✅ Fixed match ${match.id}: ${match.winnerId} → ${newWinnerId}`);
            } else {
                // Could not determine the correct player ID
                couldNotFix++;
                console.log(`⚠️  Could not fix match ${match.id} - winnerId: ${match.winnerId}, team1Id: ${match.team1Id}, team2Id: ${match.team2Id}, player1Id: ${match.player1Id}, player2Id: ${match.player2Id}`);
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log('✅ MIGRATION COMPLETE');
        console.log(`✅ Fixed: ${fixedCount} matches`);
        console.log(`✓  Already correct: ${alreadyCorrect} matches`);
        console.log(`⚠️  Could not fix: ${couldNotFix} matches`);
        console.log('='.repeat(50));

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
migrateWinnerIds();
