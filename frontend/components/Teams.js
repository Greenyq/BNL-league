// Teams component — shows all teams and their rosters

const { useState, useEffect } = React;

function Teams() {
    const [teams,   setTeams]   = useState([]);
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);

    useEffect(() => {
        Promise.all([fetch('/api/teams').then(r => r.json()), fetch('/api/players').then(r => r.json())])
            .then(([t, p]) => { setTeams(t); setPlayers(p); setLoading(false); })
            .catch(err => { setError(err.message); setLoading(false); });
    }, []);

    if (loading) return React.createElement('p', null, 'Loading teams…');
    if (error)   return React.createElement('p', { className: 'error' }, error);

    const playerMap = Object.fromEntries(players.map(p => [p.id, p]));

    return React.createElement('div', { className: 'teams' },
        React.createElement('h2', null, 'Teams'),
        teams.length === 0
            ? React.createElement('p', null, 'No teams yet.')
            : teams.map(team =>
                React.createElement('div', { key: team.id, className: 'team-card' },
                    team.logo && React.createElement('img', { src: team.logo, alt: team.name, className: 'team-logo' }),
                    React.createElement('h3', null, `${team.emoji || ''} ${team.name}`),
                    React.createElement('p',  { className: 'team-captain' }, `Captain: ${playerMap[team.captainId]?.name || team.captainId || '—'}`),
                    React.createElement('ul', { className: 'team-players' },
                        players.filter(p => p.teamId === team.id).map(p =>
                            React.createElement('li', { key: p.id }, p.name || p.battleTag)
                        )
                    )
                )
            )
    );
}
