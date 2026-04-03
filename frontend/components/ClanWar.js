// ClanWar component — displays clan war results and live score
// Format: first to 3 wins. Each internal match is BO3.

const { useState, useEffect } = React;

const FORMAT_LABELS = { '1v1': '1v1', '2v2': '2v2', '3v3': '3v3' };

function ClanWarCard({ cw }) {
    const [open, setOpen] = useState(false);
    const statusClass = { upcoming: 'status-upcoming', ongoing: 'status-ongoing', completed: 'status-completed' }[cw.status] || '';

    return React.createElement('div', { className: 'cw-card' },
        React.createElement('div', { className: 'cw-header', onClick: () => setOpen(!open) },
            React.createElement('span', { className: `cw-status ${statusClass}` }, cw.status),
            React.createElement('span', { className: 'cw-teams' }, `${cw.teamA?.name || 'Team A'} vs ${cw.teamB?.name || 'Team B'}`),
            React.createElement('span', { className: 'cw-score' }, `${cw.clanWarScore?.a ?? 0} — ${cw.clanWarScore?.b ?? 0}`),
            cw.winner && React.createElement('span', { className: 'cw-winner' }, `Winner: ${cw.winner === 'a' ? cw.teamA?.name : cw.teamB?.name}`),
            React.createElement('span', { className: 'cw-toggle' }, open ? '▲' : '▼'),
        ),

        open && React.createElement('div', { className: 'cw-matches' },
            (cw.matches || []).map((m, i) =>
                React.createElement('div', { key: m._id || i, className: `cw-match ${m.winner ? 'cw-match--done' : ''}` },
                    React.createElement('span', { className: 'cw-match-label' }, m.label || `Match ${m.order}`),
                    React.createElement('span', { className: 'cw-match-format' }, FORMAT_LABELS[m.format] || m.format),
                    React.createElement('span', { className: 'cw-match-players' }, `${m.playerA || '?'} vs ${m.playerB || '?'}`),
                    React.createElement('span', { className: 'cw-match-score' }, `${m.score?.a ?? 0}:${m.score?.b ?? 0}`),
                    m.winner && React.createElement('span', { className: 'cw-match-winner' }, m.winner === 'a' ? '✓ A' : '✓ B'),
                )
            )
        )
    );
}

function ClanWar() {
    const [wars,    setWars]    = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);
    const [filter,  setFilter]  = useState('all'); // 'all' | 'upcoming' | 'ongoing' | 'completed'

    useEffect(() => {
        const query = filter !== 'all' ? `?status=${filter}` : '';
        fetch(`/api/clan-wars${query}`)
            .then(r => r.json())
            .then(data => { setWars(data); setLoading(false); })
            .catch(err  => { setError(err.message); setLoading(false); });
    }, [filter]);

    if (loading) return React.createElement('p', null, 'Loading clan wars…');
    if (error)   return React.createElement('p', { className: 'error' }, error);

    return React.createElement('div', { className: 'clan-war' },
        React.createElement('h2', null, 'Clan Wars'),

        React.createElement('div', { className: 'cw-filters' },
            ['all', 'upcoming', 'ongoing', 'completed'].map(f =>
                React.createElement('button', { key: f, className: filter === f ? 'active' : '', onClick: () => setFilter(f) },
                    f.charAt(0).toUpperCase() + f.slice(1)
                )
            )
        ),

        wars.length === 0
            ? React.createElement('p', null, 'No clan wars found.')
            : wars.map(cw => React.createElement(ClanWarCard, { key: cw.id || cw._id, cw }))
    );
}
