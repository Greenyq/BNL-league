// Standings — таблица рейтинга игроков + рейтинг команд по клан-варам

const RACE_KEYS   = [null, 1, 2, 4, 8];
const RACE_IMG    = { 0: '/images/random.svg', 1: '/images/human.jpg', 2: '/images/orc.jpg', 4: '/images/nightelf.jpg', 8: '/images/undead.jpg' };
const PLAYERS_PAGE_SIZE = 10;
const TEAMS_PAGE_SIZE = 10;
const DRAFT_POOL_PAGE_SIZE = 10;
const tr = (ru, en) => getLang() === 'en' ? en : ru;
const rankClass   = i => i === 0 ? 'top-1' : i === 1 ? 'top-2' : i === 2 ? 'top-3' : '';
const rankIcon    = i => i === 0 ? 'I' : i === 1 ? 'II' : i === 2 ? 'III' : i + 1;
const playerRace  = player => player?.mainRace ?? player?.race ?? null;

function PlayerStandingsMobileCard({ row, index }) {
    const race = row.race ?? playerRace(row.player);
    const portrait = row.player.selectedPortrait;
    const raceImg = race != null ? RACE_IMG[race] : null;
    const avatarSrc = portrait || raceImg || null;
    const isWinner = !!row.player.seasonWinner;

    return (
        <div className={`standings-mobile-card${isWinner ? ' season-winner-card' : ''}`}>
            <div className="standings-mobile-rank-wrap">
                <div className={`standings-mobile-rank ${rankClass(index)}`}>{rankIcon(index)}</div>
            </div>
            <div className="standings-mobile-main">
                <div className="standings-mobile-head">
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                        {avatarSrc ? (
                            <img
                                src={avatarSrc}
                                alt=""
                                className={isWinner ? 'season-winner-avatar standings-mobile-avatar' : 'standings-mobile-avatar'}
                            />
                        ) : (
                            <div className="standings-mobile-avatar standings-mobile-avatar--placeholder">👤</div>
                        )}
                        {isWinner && (
                            <div className="season-winner-badge" title={tr(`Победитель сезона ${row.player.seasonWinner}`, `Season ${row.player.seasonWinner} winner`)}>🏆</div>
                        )}
                    </div>
                    <div className="standings-mobile-identity">
                        <div className="standings-mobile-name-row">
                            <span className="standings-mobile-name">{row.player.name || row.player.battleTag}</span>
                            {isWinner && (
                                <span className="standings-mobile-badge">🏆 {tr(`С${row.player.seasonWinner}`, `S${row.player.seasonWinner}`)}</span>
                            )}
                        </div>
                        <div className="standings-mobile-meta">{row.player.battleTag}</div>
                    </div>
                </div>
                <div className="standings-mobile-subrow">
                    <span className="standings-mobile-pill">
                        {race != null ? t(`race.${race}`) : '—'}
                    </span>
                </div>
                <div className="standings-mobile-stats">
                    <div className="standings-mobile-stat">
                        <span className="standings-mobile-stat-label">{t('standings.mmr')}</span>
                        <span className="standings-mobile-stat-value standings-mobile-stat-value--mmr">{row.mmr ?? '—'}</span>
                    </div>
                    <div className="standings-mobile-stat">
                        <span className="standings-mobile-stat-label">{t('standings.wins')}</span>
                        <span className="standings-mobile-stat-value standings-mobile-stat-value--wins">{row.wins}</span>
                    </div>
                    <div className="standings-mobile-stat">
                        <span className="standings-mobile-stat-label">{t('standings.losses')}</span>
                        <span className="standings-mobile-stat-value standings-mobile-stat-value--losses">{row.losses}</span>
                    </div>
                    <div className="standings-mobile-stat">
                        <span className="standings-mobile-stat-label">{t('standings.points')}</span>
                        <span className="standings-mobile-stat-value standings-mobile-stat-value--points">{row.points}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function TeamStandingsMobileCard({ row, index }) {
    return (
        <div className="team-standings-mobile-card">
            <div className="standings-mobile-rank-wrap">
                <div className={`standings-mobile-rank ${rankClass(index)}`}>{rankIcon(index)}</div>
            </div>
            <div className="standings-mobile-main">
                <div className="standings-mobile-head">
                    {row.team.logo ? (
                        <img src={row.team.logo} alt="" className="standings-mobile-team-logo" />
                    ) : (
                        <div className="standings-mobile-team-emoji">{row.team.emoji || '🛡'}</div>
                    )}
                    <div className="standings-mobile-identity">
                        <div className="standings-mobile-name-row">
                            <span className="standings-mobile-name">{row.team.name}</span>
                        </div>
                        {row.captain && (
                            <div className="standings-mobile-meta">👑 {row.captain.name || row.captain.battleTag}</div>
                        )}
                    </div>
                </div>
                <div className="standings-mobile-stats team-standings-mobile-stats">
                    <div className="standings-mobile-stat">
                        <span className="standings-mobile-stat-label">{t('standings.teams.played')}</span>
                        <span className="standings-mobile-stat-value">{row.played}</span>
                    </div>
                    <div className="standings-mobile-stat">
                        <span className="standings-mobile-stat-label">{t('standings.teams.cwwins')}</span>
                        <span className="standings-mobile-stat-value standings-mobile-stat-value--wins">{row.wins}</span>
                    </div>
                    <div className="standings-mobile-stat">
                        <span className="standings-mobile-stat-label">{t('standings.teams.cwlose')}</span>
                        <span className="standings-mobile-stat-value standings-mobile-stat-value--losses">{row.losses}</span>
                    </div>
                    <div className="standings-mobile-stat">
                        <span className="standings-mobile-stat-label">{t('standings.teams.matches')}</span>
                        <span className="standings-mobile-stat-value standings-mobile-stat-value--mmr">{row.matchWins}:{row.matchLosses}</span>
                    </div>
                    <div className="standings-mobile-stat">
                        <span className="standings-mobile-stat-label">{t('teams.players_count')}</span>
                        <span className="standings-mobile-stat-value">{row.roster}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function DraftPoolCard({ row, index }) {
    const player = row.player;
    const race = playerRace(player);
    const portrait = player.selectedPortrait;
    const raceImg = race != null ? RACE_IMG[race] : null;
    const isWinner = !!player.seasonWinner;

    return (
        <div className={`draft-pool-player-card${isWinner ? ' season-winner-card' : ''}`}>
            <div className="standings-mobile-rank-wrap">
                <div className={`standings-mobile-rank ${rankClass(index)}`}>{rankIcon(index)}</div>
            </div>
            <div style={{ position: 'relative', flexShrink: 0 }}>
                {isWinner && (
                    <div className="season-winner-badge" title={tr(`Победитель сезона ${player.seasonWinner}`, `Season ${player.seasonWinner} winner`)}>🏆</div>
                )}
                {portrait ? (
                    <img src={portrait} alt="" className={isWinner ? 'season-winner-avatar' : ''} style={{
                        width: 40, height: 40, borderRadius: '50%', objectFit: 'cover',
                        border: isWinner ? undefined : '2px solid var(--color-accent-primary)',
                    }} />
                ) : (
                    <div className={isWinner ? 'season-winner-avatar' : ''} style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: 'var(--color-bg-lighter)',
                        border: isWinner ? undefined : '2px solid rgba(212,175,55,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden',
                    }}>
                        {race != null && raceImg
                            ? <img src={raceImg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.75 }} />
                            : <span style={{ fontSize: '1.2em', color: 'var(--color-text-muted)' }}>👤</span>
                        }
                    </div>
                )}
                {race != null && raceImg && portrait && (
                    <img src={raceImg} alt="" style={{
                        position: 'absolute', bottom: -2, right: -2,
                        width: 14, height: 14, borderRadius: '50%', objectFit: 'cover',
                        border: '1.5px solid var(--color-bg-card, #1a1a2e)',
                    }} />
                )}
            </div>
            <div className="draft-pool-player-content">
                <div className="draft-pool-player-info">
                    <div className="draft-pool-player-name-row">
                        <span className="draft-pool-player-name">{player.name || player.battleTag?.split('#')[0]}</span>
                        <span className={`draft-pool-tier-pill draft-pool-tier-pill--${row.tierClass}`}>
                            {row.tierLabel}
                        </span>
                        {isWinner && (
                            <span className="standings-mobile-badge">🏆 {tr(`С${player.seasonWinner}`, `S${player.seasonWinner}`)}</span>
                        )}
                    </div>
                    <div className="draft-pool-player-meta">
                        {player.battleTag}
                        {race != null && (
                            <span style={{ marginLeft: 6 }}>
                                · {t(`race.${race}`)}
                            </span>
                        )}
                    </div>
                </div>
                <div className="draft-pool-player-stats">
                    <div className="team-stat-cell">
                        <span className="team-stat-label">MMR</span>
                        <span className="team-stat-val" style={{ color: 'var(--color-accent-secondary)' }}>{row.mmr ?? '—'}</span>
                    </div>
                    <div className="team-stat-cell">
                        <span className="team-stat-label">W</span>
                        <span className="team-stat-val" style={{ color: 'var(--color-success)' }}>{row.wins}</span>
                    </div>
                    <div className="team-stat-cell">
                        <span className="team-stat-label">L</span>
                        <span className="team-stat-val" style={{ color: 'var(--color-error)' }}>{row.losses}</span>
                    </div>
                    <div className="team-stat-cell">
                        <span className="team-stat-label">Pts</span>
                        <span className="team-stat-val" style={{ color: 'var(--color-accent-primary)', fontWeight: 800 }}>{row.points}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Рейтинг команд по победам в клан-варах ────────────────────────────────────
function TeamStandings({ page, onPageChange, playerFilter }) {
    useLang();
    const [teams,    setTeams]    = React.useState([]);
    const [wars,     setWars]     = React.useState([]);
    const [players,  setPlayers]  = React.useState([]);
    const [loading,  setLoading]  = React.useState(true);
    const [error,    setError]    = React.useState(null);
    const playerFilterNeedle = normalizeSearchText(playerFilter);

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

    const completed = wars.filter(cw => cw.status === 'completed' && cw.winner);

    // Compute stats for each team
    const rows = teams.map(team => {
        const name = team.name.toLowerCase();
        const rosterPlayers = players.filter(p => p.teamId === team.id);
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
        const roster  = rosterPlayers.length;
        const matchesPlayer = !playerFilterNeedle
            || matchesPlayerSearch(captain, playerFilterNeedle)
            || rosterPlayers.some(player => matchesPlayerSearch(player, playerFilterNeedle));
        return { team, wins, losses, matchWins, matchLosses, played: myWars.length, captain, roster, matchesPlayer };
    })
    .filter(row => row.matchesPlayer)
    // Sort: clan war wins desc, then match wins desc
    .sort((a, b) => b.wins - a.wins || b.matchWins - a.matchWins);
    const pagination = paginateCollection(rows, page, TEAMS_PAGE_SIZE);

    React.useEffect(() => {
        if (page !== pagination.currentPage) onPageChange(pagination.currentPage);
    }, [page, pagination.currentPage, onPageChange]);

    if (loading) return (
        <div>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 52, marginBottom: 8, borderRadius: 'var(--radius-sm)' }} />)}
        </div>
    );
    if (error) return <div style={{ color: 'var(--color-error)', padding: 32 }}>⚠ {error}</div>;

    return (
        <div style={{ marginTop: 'var(--spacing-lg)' }}>
            <div className="standings-desktop-only standings-table-wrap">
                <table className="standings-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>{tr('Команда', 'Team')}</th>
                            <th>{tr('И', 'P')}</th>
                            <th style={{ color: 'var(--color-success)' }}>{tr('КВ В', 'CW W')}</th>
                            <th style={{ color: 'var(--color-error)' }}>{tr('КВ П', 'CW L')}</th>
                            <th style={{ color: 'var(--color-accent-secondary)' }}>{tr('Матчи', 'Matches')}</th>
                            <th>{tr('Состав', 'Roster')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 && (
                            <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 32 }}>{tr('Нет данных', 'No data')}</td></tr>
                        )}
                        {pagination.items.map((row, i) => {
                            const rank = (pagination.currentPage - 1) * TEAMS_PAGE_SIZE + i;
                            return (
                            <tr key={row.team.id}>
                                <td className={`col-rank ${rankClass(rank)}`}>{rankIcon(rank)}</td>
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
                                <td style={{ color: 'var(--color-text-muted)', fontSize: '0.88em' }}>{row.roster} {tr('чел.', 'players')}</td>
                            </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="team-standings-mobile-list standings-mobile-only">
                {rows.length === 0 ? (
                    <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 32 }}>{tr('Нет данных', 'No data')}</p>
                ) : (
                    pagination.items.map((row, i) => {
                        const rank = (pagination.currentPage - 1) * TEAMS_PAGE_SIZE + i;
                        return <TeamStandingsMobileCard key={row.team.id} row={row} index={rank} />;
                    })
                )}
            </div>
            <PaginationControls page={pagination.currentPage} totalPages={pagination.totalPages} onPageChange={onPageChange} />
            <div className="standings-note">
                {tr('КВ В/П — победы/поражения в клан-варах. Матчи — суммарный счёт внутренних матчей.', 'CW W/L shows clan-war wins/losses. Matches shows the combined score of internal matchups.')}
            </div>
        </div>
    );
}

// ── Драфт-пул: игроки с draftAvailable, разбитые по тирам ─────────────────────
function DraftPoolStandings({ page, onPageChange, playerFilter }) {
    useLang();
    const [players, setPlayers] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError]     = React.useState(null);
    const playerFilterNeedle = normalizeSearchText(playerFilter);

    React.useEffect(() => {
        fetch('/api/players')
            .then(r => r.json())
            .then(data => { setPlayers(Array.isArray(data) ? data : []); setLoading(false); })
            .catch(err => { setError(err.message); setLoading(false); });
    }, []);

    // Filter only draft-available players
    const draftPlayers = players.filter(p => p.draftAvailable);
    const filteredDraftPlayers = draftPlayers.filter(player => matchesPlayerSearch(player, playerFilterNeedle));

    // Tier calculation: same logic as backend
    function getEffectiveTier(p) {
        if (p.tierOverride) return p.tierOverride;
        const mmr = p.stats?.mmr || p.currentMmr || 0;
        if (mmr >= 1700) return 3;
        if (mmr >= 1400) return 2;
        if (mmr >= 1000) return 1;
        return 0;
    }

    const draftRows = filteredDraftPlayers
        .map(player => {
            const tier = getEffectiveTier(player);
            const mmr = player.stats?.mmr ?? player.currentMmr ?? null;
            return {
                player,
                tier,
                tierClass: tier === 3 ? 's' : tier === 2 ? 'a' : tier === 1 ? 'b' : 'u',
                tierLabel: tier === 3 ? 'S' : tier === 2 ? 'A' : tier === 1 ? 'B' : '—',
                mmr,
                wins: player.stats?.wins ?? 0,
                losses: player.stats?.losses ?? 0,
                points: player.stats?.points ?? 0,
            };
        })
        .sort((a, b) => b.tier - a.tier || (b.mmr ?? 0) - (a.mmr ?? 0) || b.points - a.points);
    const pagination = paginateCollection(draftRows, page, DRAFT_POOL_PAGE_SIZE);

    React.useEffect(() => {
        if (page !== pagination.currentPage) onPageChange(pagination.currentPage);
    }, [page, pagination.currentPage, onPageChange]);

    if (loading) return (
        <div style={{ marginTop: 'var(--spacing-lg)' }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 120, marginBottom: 12, borderRadius: 'var(--radius-md)' }} />)}
        </div>
    );
    if (error) return <div style={{ color: 'var(--color-error)', padding: 32 }}>⚠ {error}</div>;
    if (filteredDraftPlayers.length === 0) {
        return <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 48 }}>{t('standings.draftpool.empty')}</p>;
    }

    return (
        <div style={{ marginTop: 'var(--spacing-lg)' }}>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85em', marginBottom: 'var(--spacing-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{t('standings.draftpool.total')}: <strong style={{ color: 'var(--color-accent-primary)' }}>{filteredDraftPlayers.length}</strong></span>
            </div>
            <div className="draft-pool-list">
                {pagination.items.map((row, i) => {
                    const rank = (pagination.currentPage - 1) * DRAFT_POOL_PAGE_SIZE + i;
                    return <DraftPoolCard key={row.player.id || row.player.battleTag} row={row} index={rank} />;
                })}
            </div>
            <PaginationControls page={pagination.currentPage} totalPages={pagination.totalPages} onPageChange={onPageChange} />
        </div>
    );
}

// ── Рейтинг игроков (оригинал) ────────────────────────────────────────────────
function Standings() {
    useLang();
    const [mode,       setMode]       = React.useState('players'); // 'players' | 'teams' | 'draftpool'
    const [players,    setPlayers]    = React.useState([]);
    const [loading,    setLoading]    = React.useState(true);
    const [error,      setError]      = React.useState(null);
    const [raceFilter, setRaceFilter] = React.useState(null);
    const [playerFilter, setPlayerFilter] = React.useState('');
    const [pages,      setPages]      = React.useState({ players: 1, teams: 1, draftpool: 1 });
    const playerFilterNeedle = normalizeSearchText(playerFilter);

    React.useEffect(() => {
        fetch('/api/players')
            .then(r => r.json())
            .then(data => { setPlayers(data); setLoading(false); })
            .catch(err  => { setError(err.message); setLoading(false); });
    }, []);

    // Строим строки таблицы
    const rows = players
    .filter(player => matchesPlayerSearch(player, playerFilterNeedle))
    .flatMap(p => {
        const s = p.stats;
        if (!s) return [];
        if (raceFilter !== null) {
            const rs = (s.raceStats || []).find(r => r.race === raceFilter);
            if (!rs) return [];
            return [{ player: p, race: raceFilter, wins: rs.wins, losses: rs.losses, points: rs.points, mmr: rs.mmr }];
        }
        return [{ player: p, race: null, wins: s.wins, losses: s.losses, points: s.points, mmr: s.mmr }];
    })
    .sort((a, b) => b.points - a.points);
    const pagedPlayers = paginateCollection(rows, pages.players, PLAYERS_PAGE_SIZE);

    const setModePage = (key, value) => {
        setPages(prev => prev[key] === value ? prev : { ...prev, [key]: value });
    };

    React.useEffect(() => {
        setModePage('players', 1);
    }, [raceFilter]);

    React.useEffect(() => {
        setPages(prev => (
            prev.players === 1 && prev.teams === 1 && prev.draftpool === 1
                ? prev
                : { players: 1, teams: 1, draftpool: 1 }
        ));
    }, [playerFilterNeedle]);

    React.useEffect(() => {
        if (pages.players !== pagedPlayers.currentPage) setModePage('players', pagedPlayers.currentPage);
    }, [pages.players, pagedPlayers.currentPage]);

    if (error) return <div style={{ color: 'var(--color-error)', padding: 32, textAlign: 'center' }}>⚠ {error}</div>;

    return (
        <div className="animate-fade-in wow-section-page">
            <WoWSectionTitle>{t('standings.title')}</WoWSectionTitle>

            {/* Single row: race filters (left) + mode buttons (right) */}
            <div className="wow-filter-bar standings-controls">
                {/* Race filter — only visible in players mode */}
                {mode === 'players' && (
                    <div className="standings-controls-group standings-controls-group--filters">
                        {RACE_KEYS.map(r => (
                            <button
                                key={String(r)}
                                className={`wow-btn${raceFilter === r ? ' active' : ''}`}
                                onClick={() => setRaceFilter(r)}
                            >
                                {r === null ? t('race.all') : t(`race.${r}`)}
                            </button>
                        ))}
                    </div>
                )}
                <div className="standings-controls-group standings-controls-group--search">
                    <PlayerNameFilterInput value={playerFilter} onChange={setPlayerFilter} />
                </div>
                {/* Mode toggle */}
                <div className="standings-controls-group standings-controls-group--modes">
                    <button
                        className={`wow-btn${mode === 'players' ? ' active' : ''}`}
                        onClick={() => setMode('players')}
                    >
                        {t('standings.mode.players')}
                    </button>
                    <button
                        className={`wow-btn${mode === 'teams' ? ' active' : ''}`}
                        onClick={() => setMode('teams')}
                    >
                        {t('standings.mode.teams')}
                    </button>
                    <button
                        className={`wow-btn${mode === 'draftpool' ? ' active' : ''}`}
                        onClick={() => setMode('draftpool')}
                    >
                        {t('standings.mode.draftpool')}
                    </button>
                </div>
            </div>

            {mode === 'teams' ? (
                <TeamStandings page={pages.teams} onPageChange={page => setModePage('teams', page)} playerFilter={playerFilterNeedle} />
            ) : mode === 'draftpool' ? (
                <DraftPoolStandings page={pages.draftpool} onPageChange={page => setModePage('draftpool', page)} playerFilter={playerFilterNeedle} />
            ) : (
                <>

                    {loading ? (
                        <div>
                            {[1,2,3,4,5].map(i => (
                                <div key={i} className="skeleton" style={{ height: 48, marginBottom: 8, borderRadius: 'var(--radius-sm)' }} />
                            ))}
                        </div>
                    ) : rows.length === 0 ? (
                        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 48 }}>{t('standings.empty')}</p>
                    ) : (
                        <>
                            <div className="standings-desktop-only standings-table-wrap">
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
                                        {pagedPlayers.items.map((row, i) => {
                                            const rank = (pagedPlayers.currentPage - 1) * PLAYERS_PAGE_SIZE + i;
                                            const portrait = row.player.selectedPortrait;
                                            const race = row.race ?? playerRace(row.player);
                                            const raceImg  = race != null ? RACE_IMG[race] : null;
                                            const avatarSrc = portrait || raceImg || null;
                                            const isWinner = !!row.player.seasonWinner;
                                            return (
                                                <tr key={`${row.player.battleTag}-${row.race}`}>
                                                    <td className={`col-rank ${rankClass(rank)}`}>{rankIcon(rank)}</td>
                                                    <td className="col-name" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        {avatarSrc && (
                                                            <div style={{ position: 'relative', flexShrink: 0 }}>
                                                                <img src={avatarSrc} alt="" className={isWinner ? 'season-winner-avatar' : ''} style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', border: isWinner ? undefined : '2px solid rgba(212,175,55,0.4)' }} />
                                                                {isWinner && <div className="season-winner-badge" style={{ width: 14, height: 14, fontSize: 8, top: -4, left: -4 }} title={tr(`Победитель сезона ${row.player.seasonWinner}`, `Season ${row.player.seasonWinner} winner`)}>🏆</div>}
                                                            </div>
                                                        )}
                                                        <span>{row.player.name || row.player.battleTag}</span>
                                                        {isWinner && (
                                                            <span style={{ fontSize: '0.68em', background: 'rgba(255,215,0,0.15)', color: '#ffd700', border: '1px solid rgba(255,215,0,0.5)', borderRadius: 4, padding: '0 4px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                                                🏆 {tr(`С${row.player.seasonWinner}`, `S${row.player.seasonWinner}`)}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td style={{ color: 'var(--color-text-muted)' }}>
                                                        {row.race !== null ? t(`race.${row.race}`) : '—'}
                                                    </td>
                                                    <td style={{ color: 'var(--color-accent-secondary)', fontWeight: 600 }}>
                                                        {row.mmr ?? '—'}
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
                            <div className="standings-mobile-list standings-mobile-only">
                                {pagedPlayers.items.map((row, i) => {
                                    const rank = (pagedPlayers.currentPage - 1) * PLAYERS_PAGE_SIZE + i;
                                    return <PlayerStandingsMobileCard key={`${row.player.battleTag}-${row.race}`} row={row} index={rank} />;
                                })}
                            </div>
                            <PaginationControls
                                page={pagedPlayers.currentPage}
                                totalPages={pagedPlayers.totalPages}
                                onPageChange={page => setModePage('players', page)}
                            />
                        </>
                    )}
                </>
            )}
        </div>
    );
}
