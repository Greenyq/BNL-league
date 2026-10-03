const test = require('node:test');
const assert = require('node:assert/strict');
const { applyLowerBracketLoss, restorePrematureLowerEliminations } = require('./lowerBracket');

test('two upper losses and one lower loss leave the player in the lower bracket', () => {
    const player = { status: 'lower', upperWins: 2, upperLosses: 2, lowerWins: 1, lowerLosses: 0 };
    applyLowerBracketLoss(player);
    assert.deepEqual(player, { status: 'lower', upperWins: 2, upperLosses: 2, lowerWins: 1, lowerLosses: 1 });
    applyLowerBracketLoss(player);
    assert.equal(player.status, 'eliminated');
    assert.equal(player.lowerLosses, 2);
});

test('an arena player entering lower with no losses also has two lives', () => {
    const player = { status: 'lower', lowerWins: 0 };
    applyLowerBracketLoss(player);
    assert.equal(player.status, 'lower');
    assert.equal(player.lowerLosses, 1);
    applyLowerBracketLoss(player);
    assert.equal(player.status, 'eliminated');
});

test('repair restores only one-loss eliminations and preserves progress on repeated calls', async () => {
    const players = [
        { name: 'patriotdvora', status: 'eliminated', lowerLosses: 1, lowerWins: 1, upperLosses: 2 },
        { name: 'Invictud', status: 'eliminated', lowerLosses: 1, lowerWins: 1 },
        { name: 'ЖИВОТНОЕ', status: 'eliminated', lowerLosses: 1, lowerWins: 0, upperWins: 2 },
        { name: 'Two losses', status: 'eliminated', lowerLosses: 2 },
        { name: 'Arena', status: 's_bracket', lowerLosses: 1 },
        { name: 'Other elimination', status: 'eliminated', lowerLosses: 0 }
    ];
    const before = structuredClone(players);
    const Participant = { updateMany: async (filter, update) => {
        let modifiedCount = 0;
        for (const player of players) {
            if (!Object.entries(filter).every(([key, value]) => player[key] === value)) continue;
            Object.assign(player, update.$set);
            modifiedCount++;
        }
        return { modifiedCount };
    } };
    assert.equal((await restorePrematureLowerEliminations(Participant)).modifiedCount, 3);
    for (let i = 0; i < 3; i++) {
        assert.equal(players[i].status, 'lower');
        const { updatedAt, ...restored } = players[i];
        assert.ok(updatedAt instanceof Date);
        assert.deepEqual(restored, { ...before[i], status: 'lower' });
    }
    assert.deepEqual(players.slice(3), before.slice(3));
    assert.equal((await restorePrematureLowerEliminations(Participant)).modifiedCount, 0);
});
