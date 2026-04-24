// ClanWar — клан-вары (первый до 3 побед, BO3 каждый матч) + интеграция с командами

// ── Вспомогательные константы расы ───────────────────────────────────────────
const CW_RACE_IMG   = { 0: '/images/random.svg', 1: '/images/human.jpg', 2: '/images/orc.jpg', 4: '/images/nightelf.jpg', 8: '/images/undead.jpg' };
const CW_RACE_COLOR = { 1: '#a8d8ea', 2: '#ff7043', 4: '#66bb6a', 8: '#b0b0b0' };
const CW_RACE_ABBR  = { 0: 'Rnd', 1: 'Люди', 2: 'Орки', 4: 'Эльфы', 8: 'Нежить' };

// ── Мини-строка игрока (для расширенного вида клан-вара) ──────────────────────
function CwPlayerRow({ player, isCaptain }) {
    const race    = player.mainRace || player.race;
    const stats   = player.stats;
    const portrait = player.selectedPortrait;

    // Calculate tier
    const mmr = stats?.mmr || player.currentMmr || 0;
    const tier = player.tierOverride || (mmr >= 1700 ? 3 : mmr >= 1400 ? 2 : mmr >= 1000 ? 1 : null);
    const tierName = { 1: 'B', 2: 'A', 3: 'S' }[tier] || '—';
    const tierColor = { 3: '#ffd700', 2: '#00d4ff', 1: '#b0b0b0' }[tier] || 'var(--color-text-muted)';

    return (
        <div className="team-player-row" style={{ padding: '6px 0' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
                {portrait ? (
                    <img src={portrait} alt={player.name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-accent-primary)' }} />
                ) : (
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-bg-lighter)', border: '2px solid rgba(212,175,55,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {race && CW_RACE_IMG[race]
                            ? <img src={CW_RACE_IMG[race]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.75 }} />
                            : <span style={{ fontSize: '1em', color: 'var(--color-text-muted)' }}>👤</span>}
                    </div>
                )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '0.88em' }}>
                        {player.name || player.battleTag?.split('#')[0]}
                    </span>
                    {isCaptain && (
                        <span style={{ fontSize: '0.62em', background: 'rgba(212,175,55,0.2)', color: 'var(--color-accent-primary)', border: '1px solid rgba(212,175,55,0.4)', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>
                            👑
                        </span>
                    )}
                    <span style={{ fontSize: '0.65em', background: `${tierColor}22`, color: tierColor, border: `1px solid ${tierColor}66`, borderRadius: 4, padding: '1px 6px', fontWeight: 800, letterSpacing: 0.5 }}>
                        {tierName}
                    </span>
                </div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.72em' }}>
                    {player.battleTag}
                    {race && CW_RACE_ABBR[race] && (
                        <span style={{ marginLeft: 5, color: CW_RACE_COLOR[race] }}>· {CW_RACE_ABBR[race]}</span>
                    )}
                </div>
            </div>
            {stats ? (
                <div className="team-player-stats" style={{ fontSize: '0.82em' }}>
                    <div className="team-stat-cell">
                        <span className="team-stat-label">MMR</span>
                        <span className="team-stat-val" style={{ color: 'var(--color-accent-secondary)' }}>{stats.mmr || player.currentMmr || '—'}</span>
                    </div>
                    <div className="team-stat-cell">
                        <span className="team-stat-label">W</span>
                        <span className="team-stat-val" style={{ color: 'var(--color-success)' }}>{stats.wins}</span>
                    </div>
                    <div className="team-stat-cell">
                        <span className="team-stat-label">L</span>
                        <span className="team-stat-val" style={{ color: 'var(--color-error)' }}>{stats.losses}</span>
                    </div>
                </div>
            ) : (
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75em' }}>MMR {player.currentMmr || '—'}</div>
            )}
        </div>
    );
}

// ── Мини-карточка игрока внутри матча ─────────────────────────────────────────
function CwPlayerMini({ player, side }) {
    const race    = player.mainRace || player.race;
    const portrait = player.selectedPortrait;
    const mmr     = player.stats?.mmr || player.currentMmr || 0;
    const tier    = player.tierOverride || (mmr >= 1700 ? 3 : mmr >= 1400 ? 2 : mmr >= 1000 ? 1 : null);
    const tierLabel = { 1: 'B', 2: 'A', 3: 'S' }[tier] || null;
    const tierColor = { 3: '#ffd700', 2: '#00d4ff', 1: '#b0b0b0' }[tier] || 'var(--color-text-muted)';
    const isRight = side === 'b';

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: isRight ? 'row-reverse' : 'row' }}>
            {portrait ? (
                <img src={portrait} alt={player.name} style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-accent-primary)', flexShrink: 0 }} />
            ) : (
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--color-bg-lighter)', border: '2px solid rgba(212,175,55,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                    {race && CW_RACE_IMG[race]
                        ? <img src={CW_RACE_IMG[race]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.75 }} />
                        : <span style={{ color: 'var(--color-text-muted)' }}>👤</span>}
                </div>
            )}
            <div style={{ textAlign: isRight ? 'right' : 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexDirection: isRight ? 'row-reverse' : 'row' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.92em', color: 'var(--color-text-primary)' }}>
                        {player.name || player.battleTag?.split('#')[0]}
                    </span>
                    {tierLabel && (
                        <span style={{ fontSize: '0.65em', background: `${tierColor}22`, color: tierColor, border: `1px solid ${tierColor}66`, borderRadius: 4, padding: '1px 5px', fontWeight: 800 }}>
                            {tierLabel}
                        </span>
                    )}
                </div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.72em' }}>MMR {mmr || '—'}</div>
            </div>
        </div>
    );
}

// ── Карточка одного матча внутри клан-вара ────────────────────────────────────
function CwMatchupCard({ match, players, nameA, nameB }) {
    const findPlayer = (name) => {
        if (!name || !name.trim()) return null;
        const n = name.trim();
        return players.find(p => p.name === n || p.battleTag?.split('#')[0] === n || p.battleTag === n) || null;
    };
    const parseSide = (str) => (str || '').split(' + ').map(s => s.trim()).filter(Boolean);

    const sideA = parseSide(match.playerA);
    const sideB = parseSide(match.playerB);

    const winA  = match.winner === 'a';
    const winB  = match.winner === 'b';
    const played = match.winner != null;

    // Determine tier from first player on side A
    const p0    = sideA[0] ? findPlayer(sideA[0]) : null;
    const mmr0  = p0 ? (p0.stats?.mmr || p0.currentMmr || 0) : 0;
    const tier0 = p0 ? (p0.tierOverride || (mmr0 >= 1700 ? 3 : mmr0 >= 1400 ? 2 : mmr0 >= 1000 ? 1 : null)) : null;
    const tierLabel = { 1: 'B', 2: 'A', 3: 'S' }[tier0] || null;
    const tierColor = { 3: '#ffd700', 2: '#00d4ff', 1: '#b0b0b0' }[tier0] || null;

    const scoreA = match.score?.a ?? 0;
    const scoreB = match.score?.b ?? 0;

    const winnerGlow = 'rgba(76,175,80,0.07)';

    return (
        <div style={{
            border: `1px solid ${played ? 'rgba(212,175,55,0.22)' : 'rgba(255,255,255,0.07)'}`,
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-bg-base)',
            marginBottom: 8,
            overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                padding: '7px 14px',
                background: 'rgba(0,0,0,0.2)',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
                <span style={{ fontWeight: 700, fontSize: '0.88em', color: 'var(--color-text-primary)' }}>
                    {match.label || `Матч ${match.order}`}
                </span>
                <span className="cw-match-fmt">{match.format}</span>
                {tierLabel && (
                    <span style={{ fontSize: '0.75em', fontWeight: 800, color: tierColor }}>Tier {tierLabel}</span>
                )}
                {match.winner && (
                    <span style={{ marginLeft: 'auto', color: 'var(--color-success)', fontSize: '0.82em', fontWeight: 700 }}>
                        ✓ {match.winner === 'a' ? nameA : nameB}
                    </span>
                )}
            </div>

            {/* Body */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12, padding: '10px 16px' }}>
                {/* Team A side */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderRadius: 8, padding: winA ? '6px 8px' : 0, background: winA ? winnerGlow : 'transparent' }}>
                    {sideA.length === 0
                        ? <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85em' }}>—</span>
                        : sideA.map((name, i) => {
                            const p = findPlayer(name);
                            return p
                                ? <CwPlayerMini key={i} player={p} side="a" />
                                : <span key={i} style={{ color: 'var(--color-text-secondary)', fontSize: '0.9em', fontWeight: 600 }}>{name}</span>;
                        })
                    }
                </div>

                {/* Score */}
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '1.7em', fontWeight: 900 }}>
                        <span style={{ color: winA ? 'var(--color-success)' : played ? 'var(--color-error)' : 'var(--color-text-muted)' }}>{scoreA}</span>
                        <span style={{ color: 'var(--color-text-muted)', fontWeight: 300, fontSize: '0.65em' }}>:</span>
                        <span style={{ color: winB ? 'var(--color-success)' : played ? 'var(--color-error)' : 'var(--color-text-muted)' }}>{scoreB}</span>
                    </div>
                    <div style={{ fontSize: '0.68em', color: 'var(--color-text-muted)' }}>BO3</div>
                </div>

                {/* Team B side */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', borderRadius: 8, padding: winB ? '6px 8px' : 0, background: winB ? winnerGlow : 'transparent' }}>
                    {sideB.length === 0
                        ? <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85em' }}>—</span>
                        : sideB.map((name, i) => {
                            const p = findPlayer(name);
                            return p
                                ? <CwPlayerMini key={i} player={p} side="b" />
                                : <span key={i} style={{ color: 'var(--color-text-secondary)', fontSize: '0.9em', fontWeight: 600 }}>{name}</span>;
                        })
                    }
                </div>
            </div>
        </div>
    );
}

// ── Карточка клан-вара ─────────────────────────────────────────────────────────
function ClanWarCard({ cw, players, teams }) {
    useLang();
    const [open, setOpen] = React.useState(false);

    const statusLabel = t(`cw.status.${cw.status}`) || cw.status;
    const statusClass  = { upcoming: 'status-upcoming', ongoing: 'status-ongoing', completed: 'status-completed' }[cw.status] || '';

    const nameA = cw.teamA?.name || 'Team A';
    const nameB = cw.teamB?.name || 'Team B';

    // Find team objects by name for roster display
    const teamObjA = teams.find(t => t.name?.toLowerCase() === nameA.toLowerCase());
    const teamObjB = teams.find(t => t.name?.toLowerCase() === nameB.toLowerCase());

    // Roster players — from teams page or from clanWar.teamA.players (names)
    const getRoster = (teamObj, cwTeam) => {
        const roster = [];
        const addedIds = new Set();

        // Add players assigned to the team via teamId
        if (teamObj) {
            for (const p of players.filter(pl => pl.teamId === teamObj.id)) {
                roster.push(p);
                addedIds.add(p.id);
            }
        }

        // Add captain if not already in roster (by name match from cwTeam.captain)
        if (cwTeam?.captain) {
            const cap = players.find(p =>
                !addedIds.has(p.id) &&
                (p.name === cwTeam.captain || p.battleTag?.split('#')[0] === cwTeam.captain || p.battleTag === cwTeam.captain)
            );
            if (cap) { roster.unshift(cap); addedIds.add(cap.id); }
        }

        // Fallback: add players listed in cwTeam.players (by name)
        if (cwTeam?.players?.length) {
            for (const name of cwTeam.players) {
                const p = players.find(pl => !addedIds.has(pl.id) && (pl.name === name || pl.battleTag === name));
                if (p) { roster.push(p); addedIds.add(p.id); }
            }
        }

        return roster;
    };

    const rosterA = getRoster(teamObjA, cw.teamA);
    const rosterB = getRoster(teamObjB, cw.teamB);

    const captainA = teamObjA?.captainId ? players.find(p => p.id === teamObjA.captainId) : null;
    const captainB = teamObjB?.captainId ? players.find(p => p.id === teamObjB.captainId) : null;

    // Also determine captain by name for isCaptain check
    const isCaptainA = (p) => p.id === teamObjA?.captainId || p.name === cw.teamA?.captain || p.battleTag?.split('#')[0] === cw.teamA?.captain;
    const isCaptainB = (p) => p.id === teamObjB?.captainId || p.name === cw.teamB?.captain || p.battleTag?.split('#')[0] === cw.teamB?.captain;

    const hasDraft = !!(cw.draft?.status);
    const draftStatus = cw.draft?.status || 'pending';

    return (
        <div className="cw-card">
            <div className="cw-header" onClick={() => setOpen(!open)}>
                <span className={`cw-status ${statusClass}`}>{statusLabel}</span>
                <span className="cw-teams">{nameA} &nbsp;vs&nbsp; {nameB}</span>
                <span className="cw-score-display">
                    {cw.clanWarScore?.a ?? 0} — {cw.clanWarScore?.b ?? 0}
                </span>
                {cw.winner && (
                    <span className="cw-winner-badge">
                        🏆 {cw.winner === 'a' ? nameA : nameB}
                    </span>
                )}
                {/* Draft status badge */}
                {hasDraft && draftStatus !== 'pending' && (
                    <span className={`cw-draft-badge ${draftStatus === 'drafting' ? 'draft-badge-active' : 'draft-badge-done'}`}>
                        {t(`draft.status_${draftStatus}`)}
                    </span>
                )}
                <span className="cw-toggle">{open ? '▲' : '▼'}</span>
            </div>

            {open && (
                <div>
                    {/* Team rosters */}
                    {(rosterA.length > 0 || rosterB.length > 0) && (
                        <div className="cw-teams-section">
                            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.72em', textTransform: 'uppercase', letterSpacing: 1, padding: '12px var(--spacing-lg) 8px' }}>
                                ⚔ {t('draft.teams_title')}
                            </div>
                            <div className="cw-teams-grid">
                                {/* Team A */}
                                <div className="cw-team-col">
                                    <div className="cw-team-col-title" style={{ color: 'var(--color-success)' }}>
                                        {teamObjA?.logo
                                            ? <img src={teamObjA.logo} alt={nameA} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', verticalAlign: 'middle', marginRight: 6 }} />
                                            : <span style={{ marginRight: 4 }}>{teamObjA?.emoji || '🛡'}</span>
                                        }
                                        {nameA}
                                        {cw.teamA?.captain && <span style={{ marginLeft: 6, color: 'var(--color-text-muted)', fontSize: '0.82em' }}>👑 {cw.teamA.captain}</span>}
                                    </div>
                                    {rosterA.map(p => (
                                        <CwPlayerRow key={p.id} player={p} isCaptain={isCaptainA(p)} />
                                    ))}
                                    {rosterA.length === 0 && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82em', padding: '6px 0' }}>Нет игроков</p>}
                                </div>

                                {/* Team B */}
                                <div className="cw-team-col">
                                    <div className="cw-team-col-title" style={{ color: 'var(--color-accent-secondary)' }}>
                                        {teamObjB?.logo
                                            ? <img src={teamObjB.logo} alt={nameB} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', verticalAlign: 'middle', marginRight: 6 }} />
                                            : <span style={{ marginRight: 4 }}>{teamObjB?.emoji || '🛡'}</span>
                                        }
                                        {nameB}
                                        {cw.teamB?.captain && <span style={{ marginLeft: 6, color: 'var(--color-text-muted)', fontSize: '0.82em' }}>👑 {cw.teamB.captain}</span>}
                                    </div>
                                    {rosterB.map(p => (
                                        <CwPlayerRow key={p.id} player={p} isCaptain={isCaptainB(p)} />
                                    ))}
                                    {rosterB.length === 0 && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82em', padding: '6px 0' }}>Нет игроков</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Divider */}
                    <div style={{ height: 1, background: 'rgba(212,175,55,0.1)', margin: '0 var(--spacing-lg)' }} />

                    {/* Match matchups */}
                    <div style={{ padding: 'var(--spacing-md) var(--spacing-lg)' }}>
                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.72em', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                            ⚔ Матчи
                        </div>
                        {(cw.matches || []).length === 0
                            ? <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85em' }}>—</p>
                            : (cw.matches || []).map((m, i) => (
                                <CwMatchupCard key={m._id || i} match={m} players={players} nameA={nameA} nameB={nameB} />
                            ))
                        }
                    </div>

                </div>
            )}
        </div>
    );
}

function ClanWar() {
    useLang();
    const [wars,    setWars]    = React.useState([]);
    const [players, setPlayers] = React.useState([]);
    const [teams,   setTeams]   = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error,   setError]   = React.useState(null);
    const [filter,  setFilter]  = React.useState('all');

    React.useEffect(() => {
        // Load teams and players once
        Promise.all([
            fetch('/api/players').then(r => r.json()),
            fetch('/api/teams').then(r => r.json()),
        ])
            .then(([pl, tm]) => {
                setPlayers(Array.isArray(pl) ? pl : []);
                setTeams(Array.isArray(tm) ? tm : []);
            })
            .catch(() => {});
    }, []);

    React.useEffect(() => {
        setLoading(true);
        const q = filter !== 'all' ? `?status=${filter}` : '';
        fetch(`/api/clan-wars${q}`)
            .then(r => r.json())
            .then(data => { setWars(data); setLoading(false); })
            .catch(err  => { setError(err.message); setLoading(false); });
    }, [filter]);

    const FILTERS = [
        { id: 'all',       key: 'cw.all' },
        { id: 'upcoming',  key: 'cw.upcoming' },
        { id: 'ongoing',   key: 'cw.ongoing' },
        { id: 'completed', key: 'cw.completed' },
    ];

    if (error) return <div style={{ color: 'var(--color-error)', padding: 32, textAlign: 'center' }}>⚠ {error}</div>;

    return (
        <div className="animate-fade-in wow-section-page">
            <WoWSectionTitle>{t('cw.title')}</WoWSectionTitle>

            <div className="wow-filter-bar" style={{ marginBottom: 18 }}>
                {FILTERS.map(f => (
                    <button
                        key={f.id}
                        className={`wow-btn${filter === f.id ? ' active' : ''}`}
                        onClick={() => setFilter(f.id)}
                    >
                        {t(f.key)}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="cw-list">
                    {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 64, marginBottom: 12, borderRadius: 'var(--radius-md)' }} />)}
                </div>
            ) : wars.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 48 }}>{t('cw.empty')}</p>
            ) : (
                <div className="cw-list">
                    {wars.map(cw => (
                        <ClanWarCard
                            key={cw.id || cw._id}
                            cw={cw}
                            players={players}
                            teams={teams}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
