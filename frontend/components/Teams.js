// Teams — список команд и их состав

function Teams() {
    useLang();
    const [teams,   setTeams]   = React.useState([]);
    const [players, setPlayers] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error,   setError]   = React.useState(null);

    React.useEffect(() => {
        Promise.all([
            fetch('/api/teams').then(r => r.json()),
            fetch('/api/players').then(r => r.json()),
        ])
            .then(([tm, pl]) => { setTeams(tm); setPlayers(pl); setLoading(false); })
            .catch(err => { setError(err.message); setLoading(false); });
    }, []);

    if (loading) return (
        <div className="teams-grid">
            {[1,2,3].map(i => <div key={i} className="skeleton skeleton-card" style={{ height: 200 }} />)}
        </div>
    );
    if (error) return <div style={{ color: 'var(--color-error)', padding: 32, textAlign: 'center' }}>⚠ {error}</div>;

    const playerMap = Object.fromEntries(players.map(p => [p.id, p]));

    return (
        <div className="animate-fade-in">
            <h2 style={{ marginBottom: 'var(--spacing-xl)' }}>{t('teams.title')}</h2>
            {teams.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 48 }}>{t('teams.empty')}</p>
            ) : (
                <div className="teams-grid">
                    {teams.map(team => {
                        const roster  = players.filter(p => p.teamId === team.id);
                        const captain = playerMap[team.captainId];
                        return (
                            <div key={team.id} className="team-card">
                                {team.logo && <img src={team.logo} alt={team.name} className="team-logo-img" />}
                                <div className="team-name-heading">
                                    {team.emoji && <span style={{ marginRight: 8 }}>{team.emoji}</span>}
                                    {team.name}
                                </div>
                                <div className="team-captain-line">
                                    {t('teams.captain')}: <span>{captain ? captain.name : (team.captainId || '—')}</span>
                                </div>
                                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8em', marginBottom: 'var(--spacing-sm)' }}>
                                    {roster.length} {t('teams.players_count')}
                                </div>
                                {roster.length > 0 && (
                                    <ul className="team-players-list">
                                        {roster.map(p => (
                                            <li key={p.id}>
                                                {p.selectedPortrait && (
                                                    <img src={p.selectedPortrait} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
                                                )}
                                                {p.name || p.battleTag}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
