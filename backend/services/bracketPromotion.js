// Count the entire route, including players waiting on matches or special moves.
// An odd matchmaking pool is not the same as a sole remaining route player.
async function promoteSoleBracketPlayers(Participant, clearAssignment) {
    const participants = await Participant.find({ status: { $ne: 'eliminated' } });
    const reserved = new Set();
    const groups = new Map();
    for (const participant of participants) {
        if (['awaiting_admin', 'pending'].includes(participant.encounterStatus)) {
            reserved.add(String(participant.playerId));
            if (participant.encounterOpponentId) reserved.add(String(participant.encounterOpponentId));
        }
        if (!['upper', 'lower'].includes(participant.status)) continue;
        const key = `${participant.tier}:${participant.status}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(participant);
    }
    let promoted = 0;
    for (const route of groups.values()) {
        if (route.length !== 1) continue;
        const participant = route[0];
        if (participant.assignedOpponentId || reserved.has(String(participant.playerId))) continue;
        participant.status = 's_bracket';
        participant.kingQualified = false;
        participant.specialMoveReady = false;
        clearAssignment(participant);
        participant.updatedAt = new Date();
        await participant.save();
        promoted++;
    }
    return promoted;
}

module.exports = { promoteSoleBracketPlayers };
