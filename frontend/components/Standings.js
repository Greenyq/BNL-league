// Standings — таблица рейтинга игроков + рейтинг команд по клан-варам

const RACE_KEYS   = [null, 1, 2, 4, 8];
const RACE_IMG    = { 1: '/images/human.jpg', 2: '/images/orc.jpg', 4: '/images/nightelf.jpg', 8: '/images/undead.jpg' };

// ── Рейтинг команд по победам в клан-варах ────────────────────────────────────
function TeamStandings() {
    useLang();
    const [teams,    setTeams]    = React.useState([]);
    const [wars,     setWars]     = React.useState([]);
    const [players,  setPlayers]  = React.useState([]);
    const [loading,  setLoading]  = React.useState(true);
    const [error,    setError]    = React.useState(null);

    React.useEffect(() => {
        Promise.all([
            fetch('/api/teams').then(r => r.json()),
            fetch('/api/clan-wars').then(r => r.json()),
            fetch('/api/players').then(r => r.json()),
        ])
            .then(([tm, cw, pl]) => {
                setTeams(Array.isArray(tm) ? tm : []);
                setWars(Array.isArray(cw) ? cw : []);
                setPlayers(Array.isArray(pl) ? pl : []);
                setLoading(false);
            })
            .catch(err => { setError(err.message); setLoading(false); });
    }, []);

    if (loading) return (
        <div>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 52, marginBottom: 8, borderRadius: 'var(--radius-sm)' }} />)}
        </div>
    );
    if (error) return <div style={{ color: 'var(--color-error)', padding: 32 }}>⚠ {error}</div>;

    const completed = wars.filter(cw => cw.status === 'completed' && cw.winner);

    // Compute stats for each team
    const rows = teams.map(team => {
        const name = team.name.toLowerCase();
        const myWars = completed.filter(cw =>
            cw.teamA?.name?.toLowerCase() === name ||
            cw.teamB?.name?.toLowerCase() === name
        );
        const wins = myWars.filter(cw =>
            (cw.teamA?.name?.toLowerCase() === name && cw.winner === 'a') ||
            (cw.teamB?.name?.toLowerCase() === name && cw.winner === 'b')
        ).length;
        const losses = myWars.length - wins;
        // Total internal match wins across all clan wars
        const matchWins = myWars.reduce((sum, cw) => {
            const isA = cw.teamA?.name?.toLowerCase() === name;
            return sum + (isA ? (cw.clanWarScore?.a || 0) : (cw.clanWarScore?.b || 0));
        }, 0);
        const matchLosses = myWars.reduce((sum, cw) => {
            const isA = cw.teamA?.name?.toLowerCase() === name;
            return sum + (isA ? (cw.clanWarScore?.b || 0) : (cw.clanWarScore?.a || 0));
        }, 0);
        const captain = players.find(p => p.id === team.captainId);
        const roster  = players.filter(p => p.teamId === team.id).length;
        return { team, wins, losses, matchWins, matchLosses, played: myWars.length, captain, roster };
    })
    // Sort: clan war wins desc, then match wins desc
    .sort((a, b) => b.wins - a.wins || b.matchWins - a.matchWins);

    const rankIcon = i => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1;
    const rankClass = i => i === 0 ? 'top-1' : i === 1 ? 'top-2' : i === 2 ? 'top-3' : '';

    return (
        <div className="standings-table-wrap" style={{ marginTop: 'var(--spacing-lg)' }}>
            <table className="standings-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Команда</th>
                        <th>И</th>
                        <th style={{ color: 'var(--color-success)' }}>КВ В</th>
                        <th style={{ color: 'var(--color-error)' }}>КВ П</th>
                        <th style={{ color: 'var(--color-accent-secondary)' }}>Матчи</th>
                        <th>Состав</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 && (
                        <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 32 }}>Нет данных</td></tr>
                    )}
                    {rows.map((row, i) => (
                        <tr key={row.team.id}>
                            <td className={`col-rank ${rankClass(i)}`}>{rankIcon(i)}</td>
                            <td className="col-name">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    {row.team.logo
                                        ? <img src={row.team.logo} alt="" style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', objectFit: 'contain', border: '1px solid rgba(212,175,55,0.3)' }} />
                                        : <span style={{ fontSize: '1.3em' }}>{row.team.emoji || '🛡'}</span>
                                    }
                                    <div>
                                        <div style={{ fontWeight: 700 }}>{row.team.name}</div>
                                        {row.captain && (
                                            <div style={{ fontSize: '0.75em', color: 'var(--color-text-muted)' }}>
                                                👑 {row.captain.name || row.captain.battleTag}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </td>
                            <td style={{ color: 'var(--color-text-muted)' }}>{row.played}</td>
                            <td className="col-wins">{row.wins}</td>
                            <td className="col-losses">{row.losses}</td>
                            <td style={{ color: 'var(--color-accent-secondary)', fontWeight: 600 }}>
                                {row.matchWins}<span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}> : </span>{row.matchLosses}
                            </td>
                            <td style={{ color: 'var(--color-text-muted)', fontSize: '0.88em' }}>{row.roster} чел.</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.78em', marginTop: 10, padding: '0 4px' }}>
                КВ В/П — победы/поражения в клан-варах. Матчи — суммарный счёт внутренних матчей.
            </div>
        </div>
    );
}

// ── Рейтинг игроков (оригинал) ────────────────────────────────────────────────
function Standings() {
    useLang();
    const [mode,       setMode]       = React.useState('players'); // 'players' | 'teams'
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

                {/* Mode toggle */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                        className={`nav-btn${mode === 'players' ? ' active' : ''}`}
                        style={{ padding: '8px 16px', fontSize: '0.85em' }}
                        onClick={() => setMode('players')}
                    >
                        <span>👤 Игроки</span>
                    </button>
                    <button
                        className={`nav-btn${mode === 'teams' ? ' active' : ''}`}
                        style={{ padding: '8px 16px', fontSize: '0.85em' }}
                        onClick={() => setMode('teams')}
                    >
                        <span>🛡 Команды</span>
                    </button>
                </div>
            </div>

            {mode === 'teams' ? (
                <TeamStandings />
            ) : (
                <>
                    {/* Race filter */}
                    <div className="race-filter-bar" style={{ marginBottom: 'var(--spacing-lg)' }}>
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

                    {loading ? (
                        <div>
                            {[1,2,3,4,5].map(i => (
                                <div key={i} className="skeleton" style={{ height: 48, marginBottom: 8, borderRadius: 'var(--radius-sm)' }} />
                            ))}
                        </div>
                    ) : rows.length === 0 ? (
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
                </>
            )}
        </div>
    );
}
