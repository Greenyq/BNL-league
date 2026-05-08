require('dotenv').config();
const mongoose = require('mongoose');

const { Player } = require('../backend/models/Player');
const { Team } = require('../backend/models/Team');
const { ClanWar } = require('../backend/models/ClanWar');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/gnl_league';
const REQUESTED_BATTLE_TAG = String(process.argv[2] || '').trim();

const MATCH_LABELS = ['Дуэль I', 'Дуэль II', '2 на 2', 'Дуэль III', '3 на 3'];
const MATCH_FORMATS = ['1v1', '1v1', '2v2', '1v1', '3v3'];
const MAP_POOL = [
    'Amazonia',
    'Autumn Leaves',
    'Concealed Hill',
    'Echo Isles',
    'Gnoll Wood',
    'Goldshire',
    'Hammerfall',
    'Last Refuge',
    'Northern Isles',
    'Shallow Grave',
    'Synergy',
    'Tidehunters',
    'Twisted Meadows',
];

const OPPONENT_TEAM_DEFS = [
    {
        name: 'Seed Rivals',
        emoji: '⚔',
        captainIndex: 0,
        players: [
            { battleTag: 'SeedRivalOne#7001', name: 'SeedRivalOne', currentMmr: 1585, race: 1, mainRace: 1 },
            { battleTag: 'SeedRivalTwo#7002', name: 'SeedRivalTwo', currentMmr: 1432, race: 4, mainRace: 4 },
            { battleTag: 'SeedRivalThree#7003', name: 'SeedRivalThree', currentMmr: 1178, race: 8, mainRace: 8 },
        ],
    },
    {
        name: 'Practice Kings',
        emoji: '🪓',
        captainIndex: 1,
        players: [
            { battleTag: 'PracticeKingOne#7101', name: 'PracticeKingOne', currentMmr: 1661, race: 2, mainRace: 2 },
            { battleTag: 'PracticeKingTwo#7102', name: 'PracticeKingTwo', currentMmr: 1388, race: 1, mainRace: 1 },
            { battleTag: 'PracticeKingThree#7103', name: 'PracticeKingThree', currentMmr: 1205, race: 4, mainRace: 4 },
        ],
    },
    {
        name: 'Night Watch',
        emoji: '🌙',
        captainIndex: 2,
        players: [
            { battleTag: 'NightWatchOne#7201', name: 'NightWatchOne', currentMmr: 1544, race: 8, mainRace: 8 },
            { battleTag: 'NightWatchTwo#7202', name: 'NightWatchTwo', currentMmr: 1469, race: 4, mainRace: 4 },
            { battleTag: 'NightWatchThree#7203', name: 'NightWatchThree', currentMmr: 1282, race: 2, mainRace: 2 },
        ],
    },
];

const WAR_TEMPLATES = [
    { date: '2026-05-01T19:30:00.000Z', status: 'completed', opponentIndex: 0, results: [{ a: 2, b: 1, winner: 'a' }, { a: 1, b: 2, winner: 'b' }, { a: 2, b: 0, winner: 'a' }, { a: 0, b: 2, winner: 'b' }, { a: 2, b: 1, winner: 'a' }] },
    { date: '2026-04-27T20:00:00.000Z', status: 'completed', opponentIndex: 1, results: [{ a: 2, b: 0, winner: 'a' }, { a: 2, b: 1, winner: 'a' }, { a: 0, b: 2, winner: 'b' }, { a: 2, b: 1, winner: 'a' }, { a: 0, b: 0, winner: null }] },
    { date: '2026-04-22T18:45:00.000Z', status: 'completed', opponentIndex: 2, results: [{ a: 1, b: 2, winner: 'b' }, { a: 0, b: 2, winner: 'b' }, { a: 2, b: 1, winner: 'a' }, { a: 1, b: 2, winner: 'b' }, { a: 0, b: 0, winner: null }] },
    { date: '2026-04-18T19:15:00.000Z', status: 'completed', opponentIndex: 0, results: [{ a: 2, b: 0, winner: 'a' }, { a: 2, b: 0, winner: 'a' }, { a: 2, b: 1, winner: 'a' }, { a: 0, b: 0, winner: null }, { a: 0, b: 0, winner: null }] },
    { date: '2026-04-14T20:30:00.000Z', status: 'ongoing', opponentIndex: 1, results: [{ a: 2, b: 1, winner: 'a' }, { a: 1, b: 2, winner: 'b' }, { a: 2, b: 0, winner: 'a' }, { a: 0, b: 0, winner: null }, { a: 0, b: 0, winner: null }] },
    { date: '2026-04-10T19:00:00.000Z', status: 'upcoming', opponentIndex: 2, results: [{ a: 0, b: 0, winner: null }, { a: 0, b: 0, winner: null }, { a: 0, b: 0, winner: null }, { a: 0, b: 0, winner: null }, { a: 0, b: 0, winner: null }] },
    { date: '2026-04-06T20:10:00.000Z', status: 'completed', opponentIndex: 0, results: [{ a: 2, b: 1, winner: 'a' }, { a: 0, b: 2, winner: 'b' }, { a: 1, b: 2, winner: 'b' }, { a: 2, b: 0, winner: 'a' }, { a: 1, b: 2, winner: 'b' }] },
    { date: '2026-04-02T18:30:00.000Z', status: 'ongoing', opponentIndex: 1, results: [{ a: 2, b: 0, winner: 'a' }, { a: 0, b: 2, winner: 'b' }, { a: 1, b: 1, winner: null }, { a: 0, b: 0, winner: null }, { a: 0, b: 0, winner: null }] },
    { date: '2026-03-29T19:40:00.000Z', status: 'upcoming', opponentIndex: 2, results: [{ a: 0, b: 0, winner: null }, { a: 0, b: 0, winner: null }, { a: 0, b: 0, winner: null }, { a: 0, b: 0, winner: null }, { a: 0, b: 0, winner: null }] },
    { date: '2026-03-24T20:20:00.000Z', status: 'completed', opponentIndex: 0, results: [{ a: 2, b: 1, winner: 'a' }, { a: 1, b: 2, winner: 'b' }, { a: 2, b: 0, winner: 'a' }, { a: 2, b: 1, winner: 'a' }, { a: 0, b: 0, winner: null }] },
];

function escapeRegex(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function pickMap(warIndex, matchIndex, gameIndex) {
    return MAP_POOL[(warIndex * 5 + matchIndex * 3 + gameIndex) % MAP_POOL.length];
}

function buildGames(result, warIndex, matchIndex) {
    if (!result?.a && !result?.b) return [];

    if (result.winner === 'a') {
        if (result.a === 2 && result.b === 0) {
            return ['a', 'a'].map((winner, index) => ({
                gameNumber: index + 1,
                map: pickMap(warIndex, matchIndex, index),
                winner,
            }));
        }
        return ['a', 'b', 'a'].map((winner, index) => ({
            gameNumber: index + 1,
            map: pickMap(warIndex, matchIndex, index),
            winner,
        }));
    }

    if (result.winner === 'b') {
        if (result.b === 2 && result.a === 0) {
            return ['b', 'b'].map((winner, index) => ({
                gameNumber: index + 1,
                map: pickMap(warIndex, matchIndex, index),
                winner,
            }));
        }
        return ['b', 'a', 'b'].map((winner, index) => ({
            gameNumber: index + 1,
            map: pickMap(warIndex, matchIndex, index),
            winner,
        }));
    }

    const partialGames = [];
    for (let index = 0; index < result.a; index += 1) {
        partialGames.push({
            gameNumber: partialGames.length + 1,
            map: pickMap(warIndex, matchIndex, partialGames.length),
            winner: 'a',
        });
    }
    for (let index = 0; index < result.b; index += 1) {
        partialGames.push({
            gameNumber: partialGames.length + 1,
            map: pickMap(warIndex, matchIndex, partialGames.length),
            winner: 'b',
        });
    }
    return partialGames;
}

async function ensureOpponentTeam(definition) {
    const now = new Date();
    const team = await Team.findOneAndUpdate(
        { name: definition.name },
        {
            $set: {
                name: definition.name,
                emoji: definition.emoji,
                updatedAt: now,
            },
            $setOnInsert: {
                createdAt: now,
            },
        },
        { new: true, upsert: true }
    );

    const players = [];
    for (const playerDef of definition.players) {
        const player = await Player.findOneAndUpdate(
            { battleTag: playerDef.battleTag },
            {
                $set: {
                    ...playerDef,
                    teamId: team.id,
                    updatedAt: now,
                },
                $setOnInsert: {
                    createdAt: now,
                },
            },
            { new: true, upsert: true }
        );
        players.push(player);
    }

    await Team.findByIdAndUpdate(team.id, {
        captainId: players[definition.captainIndex].id,
        updatedAt: now,
    });

    return { team, players };
}

function buildWarMatches({ warIndex, targetCore, opponentCore, results, targetIsSideA }) {
    const targetThree = targetCore.join(' + ');
    const opponentThree = opponentCore.join(' + ');
    const targetTwoAlt = `${targetCore[0]} + ${targetCore[2]}`;
    const opponentTwoAlt = `${opponentCore[1]} + ${opponentCore[2]}`;

    const targetParticipants = [
        targetCore[0],
        targetCore[1],
        targetTwoAlt,
        targetCore[2],
        targetThree,
    ];
    const opponentParticipants = [
        opponentCore[0],
        opponentCore[1],
        opponentTwoAlt,
        opponentCore[2],
        opponentThree,
    ];

    return results.map((result, matchIndex) => {
        const score = targetIsSideA
            ? { a: result.a, b: result.b }
            : { a: result.b, b: result.a };
        const winner = result.winner == null
            ? null
            : targetIsSideA
                ? result.winner
                : result.winner === 'a'
                    ? 'b'
                    : 'a';

        return {
        order: matchIndex + 1,
        format: MATCH_FORMATS[matchIndex],
        label: MATCH_LABELS[matchIndex],
        playerA: targetIsSideA ? targetParticipants[matchIndex] : opponentParticipants[matchIndex],
        playerB: targetIsSideA ? opponentParticipants[matchIndex] : targetParticipants[matchIndex],
        score,
        winner,
        games: buildGames(result, warIndex, matchIndex),
        };
    });
}

function summarizeWar(matches) {
    const winsA = matches.filter(match => match.winner === 'a').length;
    const winsB = matches.filter(match => match.winner === 'b').length;
    return {
        clanWarScore: { a: winsA, b: winsB },
        winner: winsA >= 3 ? 'a' : winsB >= 3 ? 'b' : null,
    };
}

async function main() {
    if (!REQUESTED_BATTLE_TAG) {
        throw new Error('Usage: node scripts/seed-clan-wars.js <BattleTag>');
    }

    await mongoose.connect(MONGO_URL, {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
    });

    const targetPlayer = await Player.findOne({
        battleTag: { $regex: new RegExp(`^${escapeRegex(REQUESTED_BATTLE_TAG)}$`, 'i') }
    });
    if (!targetPlayer) throw new Error(`Player ${REQUESTED_BATTLE_TAG} was not found`);
    if (!targetPlayer.teamId) throw new Error(`Player ${REQUESTED_BATTLE_TAG} is not assigned to a team`);

    const seedSeason = `Seed Showcase: ${targetPlayer.battleTag}`;

    const targetTeam = await Team.findById(targetPlayer.teamId);
    const targetRoster = await Player.find({ teamId: targetPlayer.teamId }).sort({ currentMmr: -1, name: 1 });
    const teammates = targetRoster.filter(player => player.battleTag !== targetPlayer.battleTag);
    if (teammates.length < 2) {
        throw new Error(`Player ${targetPlayer.battleTag} needs at least two teammates on the same team for 2v2/3v3 seed data`);
    }

    const homeCore = [targetPlayer.name, teammates[0].name, teammates[1].name];
    const homeCaptain = teammates[0].name;
    const opponentBundles = [];
    for (const definition of OPPONENT_TEAM_DEFS) {
        opponentBundles.push(await ensureOpponentTeam(definition));
    }

    await ClanWar.deleteMany({ season: seedSeason });

    const warsToCreate = WAR_TEMPLATES.map((template, warIndex) => {
        const opponentBundle = opponentBundles[template.opponentIndex];
        const opponentCore = opponentBundle.players.map(player => player.name);
        const targetIsSideA = warIndex % 2 === 0;
        const matches = buildWarMatches({
            warIndex,
            targetCore: homeCore,
            opponentCore,
            results: template.results,
            targetIsSideA,
        });
        const summary = summarizeWar(matches);
        const targetTeamBlock = {
            name: targetTeam?.name || 'Team A',
            captain: homeCaptain,
            players: homeCore,
        };
        const opponentTeamBlock = {
            name: opponentBundle.team.name,
            captain: opponentCore[OPPONENT_TEAM_DEFS[template.opponentIndex].captainIndex],
            players: opponentCore,
        };

        return {
            season: seedSeason,
            date: new Date(template.date),
            status: template.status,
            teamA: targetIsSideA ? targetTeamBlock : opponentTeamBlock,
            teamB: targetIsSideA ? opponentTeamBlock : targetTeamBlock,
            clanWarScore: summary.clanWarScore,
            winner: template.status === 'completed' ? summary.winner : null,
            matches,
        };
    });

    const createdWars = await ClanWar.insertMany(warsToCreate);

    console.log(`Seeded ${createdWars.length} clan wars for ${targetPlayer.battleTag}`);
}

main()
    .catch(err => {
        console.error(err.message || err);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect().catch(() => {});
    });
