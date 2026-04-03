// Standings component — shows league table sorted by points
// Ported from legacy/public/app.js (Standings section)


const RACE_NAMES = { 0: 'Random', 1: 'Human', 2: 'Orc', 4: 'Night Elf', 8: 'Undead' };
const RACE_FILTERS = [0, 1, 2, 4, 8];

function Standings() {
    const [players, setPlayers] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error,   setError]   = React.useState(null);
    const [raceFilter, setRaceFilter] = React.useState(null); // null = all races

    React.useEffect(() => {
        fetch('/api/players')
            .then(r => r.json())
            .then(data => { setPlayers(data); setLoading(false); })
            .catch(err  => { setError(err.message); setLoading(false); });
    }, []);

    if (loading) return React.createElement('p', null, 'Loading standings…');
    if (error)   return React.createElement('p', { className: 'error' }, error);

    // Build rows: if a race filter is active, expand per-race stats
    const rows = players.flatMap(player => {
        const stats = player.stats;
        if (!stats) return [];

        if (raceFilter !== null) {
            const rs = (stats.raceStats || []).find(s => s.race === raceFilter);
            if (!rs) return [];
            return [{ player, race: raceFilter, wins: rs.wins, losses: rs.losses, points: rs.points, mmr: rs.mmr }];
        }

        return [{ player, race: null, wins: stats.wins, losses: stats.losses, points: stats.points, mmr: stats.mmr }];
    }).sort((a, b) => b.points - a.points);

    return React.createElement('div', { className: 'standings' },
        React.createElement('h2', null, 'Standings'),

        // Race filter buttons
        React.createElement('div', { className: 'race-filters' },
            React.createElement('button', { className: raceFilter === null ? 'active' : '', onClick: () => setRaceFilter(null) }, 'All'),
            RACE_FILTERS.map(r =>
                React.createElement('button', { key: r, className: raceFilter === r ? 'active' : '', onClick: () => setRaceFilter(r) }, RACE_NAMES[r])
            )
        ),

        // Table
        React.createElement('table', { className: 'standings-table' },
            React.createElement('thead', null,
                React.createElement('tr', null,
                    React.createElement('th', null, '#'),
                    React.createElement('th', null, 'Player'),
                    React.createElement('th', null, 'Race'),
                    React.createElement('th', null, 'MMR'),
                    React.createElement('th', null, 'W'),
                    React.createElement('th', null, 'L'),
                    React.createElement('th', null, 'Points'),
                )
            ),
            React.createElement('tbody', null,
                rows.map((row, i) =>
                    React.createElement('tr', { key: `${row.player.battleTag}-${row.race}` },
                        React.createElement('td', null, i + 1),
                        React.createElement('td', null, row.player.name || row.player.battleTag),
                        React.createElement('td', null, row.race !== null ? RACE_NAMES[row.race] : '—'),
                        React.createElement('td', null, row.mmr || '—'),
                        React.createElement('td', null, row.wins),
                        React.createElement('td', null, row.losses),
                        React.createElement('td', { className: 'points' }, row.points),
                    )
                )
            )
        )
    );
}
