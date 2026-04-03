// Standings — таблица рейтинга

const RACE_NAMES   = { 0: 'Все расы', 1: 'Люди', 2: 'Орки', 4: 'Ночные эльфы', 8: 'Нежить' };
const RACE_FILTERS = [null, 1, 2, 4, 8];

function Standings() {
    const [players,    setPlayers]    = React.useState([]);
    const [loading,    setLoading]    = React.useState(true);
    const [error,      setError]      = React.useState(null);
    const [raceFilter, setRaceFilter] = React.useState(null);

    React.useEffect(() => {
        fetch('/api/players')
            .then(r => r.json())
            .then(data => { setPlayers(data); setLoading(false); })
            .catch(err  => { setError(err.message); setLoading(false); });
    }, []);

    if (loading) return (
        <div className="app">
            <div className="skeleton skeleton-banner" style={{ height: 60, marginBottom: 16 }} />
            {[1,2,3,4,5].map(i => (
                <div key={i} className="skeleton skeleton-card" style={{ height: 48, marginBottom: 8 }} />
            ))}
        </div>
    );

    if (error) return (
        <div style={{ padding: 32, color: 'var(--color-error)', textAlign: 'center' }}>
            ⚠ Ошибка загрузки: {error}
        </div>
    );

    // Build rows
    const rows = players.flatMap(p => {
        const s = p.stats;
        if (!s) return [];
        if (raceFilter !== null) {
            const rs = (s.raceStats || []).find(r => r.race === raceFilter);
            if (!rs) return [];
            return [{ player: p, race: raceFilter, wins: rs.wins, losses: rs.losses, points: rs.points, mmr: rs.mmr }];
        }
        return [{ player: p, race: null, wins: s.wins, losses: s.losses, points: s.points, mmr: s.mmr }];
    }).sort((a, b) => b.points - a.points);

    const rankClass = (i) => i === 0 ? 'top-1' : i === 1 ? 'top-2' : i === 2 ? 'top-3' : '';

    return (
        <div className="animate-fade-in">
            <div className="standings-header">
                <h2 style={{ margin: 0 }}>🏆 Рейтинг</h2>
                <div className="race-filter-bar">
                    {RACE_FILTERS.map(r => (
                        <button
                            key={r}
                            className={`nav-btn${raceFilter === r ? ' active' : ''}`}
                            style={{ padding: '8px 18px', fontSize: '0.85em' }}
                            onClick={() => setRaceFilter(r)}
                        >
                            <span>{RACE_NAMES[r] || 'Все расы'}</span>
                        </button>
                    ))}
                </div>
            </div>

            {rows.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 48 }}>
                    Нет данных для отображения
                </p>
            ) : (
                <div className="standings-table-wrap">
                    <table className="standings-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Игрок</th>
                                <th>Раса</th>
                                <th>MMR</th>
                                <th>Победы</th>
                                <th>Поражения</th>
                                <th>Очки</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, i) => (
                                <tr key={`${row.player.battleTag}-${row.race}`}>
                                    <td className={`col-rank ${rankClass(i)}`}>
                                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                                    </td>
                                    <td className="col-name">{row.player.name || row.player.battleTag}</td>
                                    <td style={{ color: 'var(--color-text-muted)' }}>
                                        {row.race !== null ? RACE_NAMES[row.race] : '—'}
                                    </td>
                                    <td style={{ color: 'var(--color-accent-secondary)' }}>
                                        {row.mmr || '—'}
                                    </td>
                                    <td className="col-wins">{row.wins}</td>
                                    <td className="col-losses">{row.losses}</td>
                                    <td className="col-points">{row.points}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
