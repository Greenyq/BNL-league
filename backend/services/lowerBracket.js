// Upper and lower brackets each allow two unprotected losses.
function applyLowerBracketLoss(participant) {
    participant.lowerLosses = (Number(participant.lowerLosses) || 0) + 1;
    participant.status = participant.lowerLosses >= 2 ? 'eliminated' : 'lower';
}

async function restorePrematureLowerEliminations(Participant) {
    // Only the old one-loss elimination is repaired. Keep all match history,
    // counters, relics and path progress; the filter makes this idempotent and
    // prevents a concurrent second loss from being overwritten.
    return Participant.updateMany(
        { status: 'eliminated', lowerLosses: 1 },
        { $set: { status: 'lower', updatedAt: new Date() } }
    );
}

module.exports = { applyLowerBracketLoss, restorePrematureLowerEliminations };
