const { test } = require('node:test');
const assert = require('node:assert/strict');
const { promoteSoleBracketPlayers } = require('./bracketPromotion');

const player = (playerId, tier, status, extra = {}) => ({
    playerId, tier, status, upperWins: 1, lowerWins: 2, relicType: 'arena_shield',
    async save() { this.saved = true; }, ...extra
});
const run = participants => promoteSoleBracketPlayers({
    async find(query) {
        assert.deepEqual(query, { status: { $ne: 'eliminated' } });
        return participants.filter(p => p.status !== 'eliminated');
    }
}, p => { p.assignedMaps = []; p.assignedOpponentId = null; });

test('sole upper and lower players advance independently per tier without fabricated wins', async () => {
    const players = [player('Lumeedee', 'B', 'upper', { specialMoveReady: true }),
        player('lower', 'B', 'lower'), player('other-tier', 'A', 'upper'),
        player('out', 'B', 'upper', { status: 'eliminated' })];
    assert.equal(await run(players), 3);
    for (const p of players.slice(0, 3)) {
        assert.equal(p.status, 's_bracket');
        assert.equal(p.upperWins, 1);
        assert.equal(p.lowerWins, 2);
        assert.equal(p.relicType, 'arena_shield');
        assert.equal(p.specialMoveReady, false);
        assert.equal(p.kingQualified, false);
    }
    assert.equal(await run(players), 0);
});

test('an unpaired player in a route with other waiting players does not advance', async () => {
    const players = [player('free', 'B', 'upper'),
        player('assigned', 'B', 'upper', { assignedOpponentId: 'third' }),
        player('third', 'B', 'upper', { assignedOpponentId: 'assigned' })];
    assert.equal(await run(players), 0);
    assert.ok(players.every(p => p.status === 'upper'));
});

test('pending encounters and their bosses finish before promotion', async () => {
    for (const encounterStatus of ['pending', 'awaiting_admin']) {
        const challenger = player('challenger', 'B', 'upper', { encounterStatus, encounterOpponentId: 'boss' });
        const boss = player('boss', 'A', 'lower');
        assert.equal(await run([challenger, boss]), 0);
        challenger.encounterStatus = 'won';
        assert.equal(await run([challenger, boss]), 2);
    }
});

test('assigned matches and existing arena or king players are unchanged', async () => {
    const players = [player('assigned', 'C', 'lower', { assignedOpponentId: 'opponent' }),
        player('arena', 'S', 's_bracket'), player('king', 'S', 'king')];
    assert.equal(await run(players), 0);
    assert.deepEqual(players.map(p => p.status), ['lower', 's_bracket', 'king']);
});
