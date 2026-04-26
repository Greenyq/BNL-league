const ONE_DAY_MS = 24 * 60 * 60 * 1000;

let cachedSeasonProgress = null;

function getCachedSeasonProgress(now = Date.now()) {
    if (!cachedSeasonProgress || cachedSeasonProgress.expiresAt <= now) return null;
    return cachedSeasonProgress.value;
}

function setCachedSeasonProgress(value, now = Date.now()) {
    cachedSeasonProgress = {
        value,
        expiresAt: now + ONE_DAY_MS,
    };
}

function clearSeasonProgressCache() {
    cachedSeasonProgress = null;
}

module.exports = {
    getCachedSeasonProgress,
    setCachedSeasonProgress,
    clearSeasonProgressCache,
};
