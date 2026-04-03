#!/usr/bin/env node

/**
 * Manual script to recalculate player stats
 * Usage: node scripts/recalculate-stats.js
 */

const mongoose = require('mongoose');
const { recalculateAllPlayerStats } = require('../src/backend/scheduler');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bnl-league';

async function main() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log('🔄 Starting stats recalculation...');
        const result = await recalculateAllPlayerStats();

        console.log('\n📊 Results:');
        console.log(`   ✅ Success: ${result.success}`);
        console.log(`   📈 Updated: ${result.updated} players`);
        console.log(`   ⏱️  Time: ${result.elapsed}ms`);

        await mongoose.disconnect();
        console.log('\n✅ Done! Database disconnected.');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

main();
