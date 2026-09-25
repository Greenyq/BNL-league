// Find a maximum-cardinality set of non-overlapping pairs. A simple greedy
// pass can strand two incompatible players even when another pairing would
// schedule everyone, so use a bounded backtracking search per tier/bracket.
function maximumPairing(items, canPair) {
    let best = [];
    const target = Math.floor(items.length / 2);

    const search = (remaining, pairs) => {
        if (pairs.length > best.length) best = pairs;
        if (best.length === target) return true;
        if (pairs.length + Math.floor(remaining.length / 2) <= best.length) return false;

        // Start with the most constrained player. This both avoids bad early
        // choices and keeps the search small for the league-sized pools.
        let firstIndex = 0;
        let fewestOptions = Infinity;
        for (let index = 0; index < remaining.length; index++) {
            let options = 0;
            for (let other = 0; other < remaining.length; other++) {
                if (index !== other && canPair(remaining[index], remaining[other])) options++;
            }
            if (options < fewestOptions) {
                firstIndex = index;
                fewestOptions = options;
            }
        }

        const first = remaining[firstIndex];
        const withoutFirst = remaining.filter((_, index) => index !== firstIndex);
        for (let index = 0; index < withoutFirst.length; index++) {
            const second = withoutFirst[index];
            if (!canPair(first, second)) continue;
            const next = withoutFirst.filter((_, other) => other !== index);
            if (search(next, [...pairs, [first, second]])) return true;
        }

        search(withoutFirst, pairs);
        return best.length === target;
    };

    search(items, []);
    return best;
}

module.exports = { maximumPairing };
