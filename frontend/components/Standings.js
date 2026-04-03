// Standings — таблица рейтинга

const RACE_KEYS   = [null, 1, 2, 4, 8];
const RACE_IMG    = { 1: '/images/human.jpg', 2: '/images/orc.jpg', 4: '/images/nightelf.jpg', 8: '/images/undead.jpg' };

function Standings() {
    useLang();
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
        <div>
            {[1,2,3,4,5].map(i => (
                <div key={i} className="skeleton" style={{ height: 48, marginBottom: 8, borderRadius: 'var(--radius-sm)' }} />
            ))}
        </div>
    );
    if (error) return <div style={{ color: 'var(--color-error)', padding: 32, textAlign: 'center' }}>⚠ {error}</div>;

    // Строим строки таблицы
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

    const rankClass = i => i === 0 ? 'top-1' : i === 1 ? 'top-2' : i === 2 ? 'top-3' : '';
    const rankIcon  = i => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1;

    return (
        <div className="animate-fade-in">
            <div className="standings-header">
                <h2 style={{ margin: 0 }}>{t('standings.title')}</h2>
                <div className="race-filter-bar">
                    {RACE_KEYS.map(r => (
                        <button
                            key={String(r)}
                            className={`nav-btn${raceFilter === r ? ' active' : ''}`}
                            style={{ padding: '8px 16px', fontSize: '0.85em' }}
                            onClick={() => setRaceFilter(r)}
                        >
                            <span>{r === null ? t('race.all') : t(`race.${r}`)}</span>
                        </button>
                    ))}
                </div>
            </div>

            {rows.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 48 }}>{t('standings.empty')}</p>
            ) : (
                <div className="standings-table-wrap">
                    <table className="standings-table">
                        <thead>
                            <tr>
                                <th>{t('standings.rank')}</th>
                                <th>{t('standings.player')}</th>
                                <th>{t('standings.race')}</th>
                                <th>{t('standings.mmr')}</th>
                                <th>{t('standings.wins')}</th>
                                <th>{t('standings.losses')}</th>
                                <th>{t('standings.points')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, i) => {
                                const portrait = row.player.selectedPortrait;
                                const raceImg  = RACE_IMG[row.race || row.player.mainRace || row.player.race];
                                const avatarSrc = portrait || raceImg || null;
                                return (
                                    <tr key={`${row.player.battleTag}-${row.race}`}>
                                        <td className={`col-rank ${rankClass(i)}`}>{rankIcon(i)}</td>
                                        <td className="col-name" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            {avatarSrc && (
                                                <img src={avatarSrc} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(212,175,55,0.4)' }} />
                                            )}
                                            <span>{row.player.name || row.player.battleTag}</span>
                                        </td>
                                        <td style={{ color: 'var(--color-text-muted)' }}>
                                            {row.race !== null ? t(`race.${row.race}`) : '—'}
                                        </td>
                                        <td style={{ color: 'var(--color-accent-secondary)', fontWeight: 600 }}>
                                            {row.mmr || '—'}
                                        </td>
                                        <td className="col-wins">{row.wins}</td>
                                        <td className="col-losses">{row.losses}</td>
                                        <td className="col-points">{row.points}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
