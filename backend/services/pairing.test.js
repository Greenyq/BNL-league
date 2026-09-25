const test = require('node:test');
const assert = require('node:assert/strict');
const { maximumPairing } = require('./pairing');

test('finds all pairs when a greedy first choice would strand players', () => {
    const players = ['A', 'B', 'C', 'D'];
    const allowed = new Set(['A:B', 'A:C', 'B:D']);
    const key = (a, b) => [a, b].sort().join(':');
    const pairs = maximumPairing(players, (a, b) => allowed.has(key(a, b)));

    assert.equal(pairs.length, 2);
    assert.deepEqual(new Set(pairs.map(([a, b]) => key(a, b))), new Set(['A:C', 'B:D']));
});

test('returns the largest possible schedule for an odd pool', () => {
    const players = ['A', 'B', 'C', 'D', 'E'];
    const pairs = maximumPairing(players, () => true);
    assert.equal(pairs.length, 2);
    assert.equal(new Set(pairs.flat()).size, 4);
});
