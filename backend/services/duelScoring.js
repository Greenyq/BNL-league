// Tier values: C=1, B=2, A=3, S=4. These are suggestions only; admins can override them.
function suggestDuelPoints(playerTier, opponentTier, won) {
    const own = Math.max(1, Math.min(4, Number(playerTier) || 1));
    const opponent = Math.max(1, Math.min(4, Number(opponentTier) || 1));
    const tierDifference = opponent - own;

    if (won) return Math.max(10, 30 + tierDifference * 10);
    return Math.min(-5, -15 + tierDifference * 5);
}

module.exports = { suggestDuelPoints };
