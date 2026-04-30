// Teams — карточки команд с портретами игроков, статистикой и клан-варами

const RACE_IMG  = { 0: '/images/random.svg', 1: '/images/human.jpg', 2: '/images/orc.jpg', 4: '/images/nightelf.jpg', 8: '/images/undead.jpg' };
const tr = (ru, en) => getLang() === 'en' ? en : ru;
const RACE_ABBR = race => ({
    0: 'Rnd',
    1: tr('Люди', 'Human'),
    2: tr('Орки', 'Orc'),
    4: tr('Эльфы', 'Elves'),
    8: tr('Нежить', 'Undead'),
}[race] || 'Rnd');
const RACE_COLOR = { 1: '#a8d8ea', 2: '#ff7043', 4: '#66bb6a', 8: '#b0b0b0' };
const TEAMS_PAGE_SIZE = 10;

function parseTeamClanWarSide(value) {
    return String(value || '')
        .split(' + ')
        .map(name => name.trim())
        .filter(Boolean);
}

function teamClanWarSideHasPlayer(side, players, needle) {
    if (!needle) return true;
    if (matchesNamedPlayer(side?.captain, needle)) return true;
    return (side?.players || []).some(name => {
        const player = findPlayerByAlias(players, name);
        return matchesNamedPlayer(name, needle) || matchesPlayerSearch(player, needle);
    });
}

function teamClanWarMatchHasPlayer(match, players, teamName, needle) {
    if (!needle) return true;
    const normalizedTeamName = normalizeSearchText(teamName);
    const sideNames = normalizeSearchText(match?.teamAName) === normalizedTeamName
        ? parseTeamClanWarSide(match.playerA)
        : normalizeSearchText(match?.teamBName) === normalizedTeamName
            ? parseTeamClanWarSide(match.playerB)
            : parseTeamClanWarSide(match.playerA);

    return sideNames.some(name => {
        const player = findPlayerByAlias(players, name);
        return matchesNamedPlayer(name, needle) || matchesPlayerSearch(player, needle);
    });
}

function teamClanWarHasPlayer(cw, players, teamName, needle) {
    if (!needle) return true;
    const normalizedTeamName = normalizeSearchText(teamName);
    const isTeamA = normalizeSearchText(cw.teamA?.name) === normalizedTeamName;
    const side = isTeamA ? cw.teamA : normalizeSearchText(cw.teamB?.name) === normalizedTeamName ? cw.teamB : null;
    if (!side) return false;
    if (teamClanWarSideHasPlayer(side, players, needle)) return true;
    return (cw.matches || []).some(match => teamClanWarMatchHasPlayer({
        ...match,
        teamAName: cw.teamA?.name,
        teamBName: cw.teamB?.name,
    }, players, teamName, needle));
}

// ── Строка игрока в команде ───────────────────────────────────────────────────
function PlayerRow({ player, isCaptain }) {
    const race    = player.mainRace ?? player.race;
    const stats   = player.stats || null;
    const portrait = player.selectedPortrait;
    const isWinner = !!player.seasonWinner;
    const statValues = {
        mmr: stats?.mmr ?? player.currentMmr ?? null,
        wins: stats?.wins ?? 0,
        losses: stats?.losses ?? 0,
        points: stats?.points ?? 0,
    };

    return (
        <div className={`team-player-row${isWinner ? ' season-winner-card' : ''}`}>
            {/* Аватар + раса */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
                {isWinner && (
                    <div className="season-winner-badge" title={tr(`Победитель сезона ${player.seasonWinner}`, `Season ${player.seasonWinner} winner`)}>🏆</div>
                )}
                {portrait ? (
                    <img src={portrait} alt={player.name} className={isWinner ? 'season-winner-avatar' : ''} style={{
                        width: 46, height: 46, borderRadius: '50%', objectFit: 'cover',
                        border: isWinner ? undefined : '2px solid var(--color-accent-primary)',
                    }} />
                ) : (
                    <div className={isWinner ? 'season-winner-avatar' : ''} style={{
                        width: 46, height: 46, borderRadius: '50%',
                        background: 'var(--color-bg-lighter)',
                        border: isWinner ? undefined : '2px solid rgba(212,175,55,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.3em', color: 'var(--color-text-muted)',
                    }}>
                        {race != null && RACE_IMG[race] ? (
                            <img src={RACE_IMG[race]} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', opacity: 0.7 }} />
                        ) : '👤'}
                    </div>
                )}
                {/* Иконка расы в углу */}
                {race != null && RACE_IMG[race] && portrait && (
                    <img src={RACE_IMG[race]} alt="" style={{
                        position: 'absolute', bottom: -3, right: -3,
                        width: 18, height: 18, borderRadius: '50%', objectFit: 'cover',
                        border: '1.5px solid var(--color-bg-card)',
                    }} />
                )}
            </div>

            <div className="team-player-content">
                {/* Имя + тег */}
                <div className="team-player-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span className="team-player-name">
                            {player.name || player.battleTag.split('#')[0]}
                        </span>
                        {isCaptain && (
                            <span style={{ fontSize: '0.65em', background: 'rgba(212,175,55,0.2)', color: 'var(--color-accent-primary)', border: '1px solid rgba(212,175,55,0.4)', borderRadius: 4, padding: '1px 5px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                👑 {tr('Капитан', 'Captain')}
                            </span>
                        )}
                        {isWinner && (
                            <span style={{ fontSize: '0.65em', background: 'rgba(255,215,0,0.15)', color: '#ffd700', border: '1px solid rgba(255,215,0,0.5)', borderRadius: 4, padding: '1px 5px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                🏆 {tr(`Сезон ${player.seasonWinner}`, `Season ${player.seasonWinner}`)}
                            </span>
                        )}
                    </div>
                    <div className="team-player-meta">
                        {player.battleTag}
                        {race != null && RACE_ABBR(race) && (
                            <span style={{ marginLeft: 6, color: RACE_COLOR[race] || 'var(--color-text-muted)' }}>
                                · {RACE_ABBR(race)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Статистика */}
                <div className="team-player-stats">
                    <div className="team-stat-cell">
                        <span className="team-stat-label">MMR</span>
                        <span className="team-stat-val" style={{ color: 'var(--color-accent-secondary)' }}>{statValues.mmr ?? '—'}</span>
                    </div>
                    <div className="team-stat-cell">
                        <span className="team-stat-label">W</span>
                        <span className="team-stat-val" style={{ color: 'var(--color-success)' }}>{statValues.wins}</span>
                    </div>
                    <div className="team-stat-cell">
                        <span className="team-stat-label">L</span>
                        <span className="team-stat-val" style={{ color: 'var(--color-error)' }}>{statValues.losses}</span>
                    </div>
                    <div className="team-stat-cell">
                        <span className="team-stat-label">Pts</span>
                        <span className="team-stat-val" style={{ color: 'var(--color-accent-primary)', fontWeight: 800 }}>{statValues.points}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Карточка клан-вара внутри команды ─────────────────────────────────────────
function TeamClanWarRow({ cw, teamName }) {
    const isA   = cw.teamA?.name?.toLowerCase() === teamName.toLowerCase();
    const opp   = isA ? cw.teamB?.name : cw.teamA?.name;
    const myScore  = isA ? (cw.clanWarScore?.a ?? 0) : (cw.clanWarScore?.b ?? 0);
    const oppScore = isA ? (cw.clanWarScore?.b ?? 0) : (cw.clanWarScore?.a ?? 0);
    const won   = cw.status === 'completed' && ((isA && cw.winner === 'a') || (!isA && cw.winner === 'b'));
    const lost  = cw.status === 'completed' && !won && cw.winner;
    const result = won ? '✅' : lost ? '❌' : cw.status === 'ongoing' ? '⚔' : '📅';
    const date   = cw.date ? new Date(cw.date).toLocaleDateString('ru') : '';

    return (
        <div className="team-cw-row">
            <span style={{ fontSize: '1em' }}>{result}</span>
            <span style={{ flex: 1, color: 'var(--color-text-secondary)', fontSize: '0.85em' }}>
                vs <strong style={{ color: 'var(--color-text-primary)' }}>{opp || '?'}</strong>
            </span>
            <span style={{ fontWeight: 700, color: won ? 'var(--color-success)' : lost ? 'var(--color-error)' : 'var(--color-text-muted)', fontSize: '0.9em' }}>
                {myScore} — {oppScore}
            </span>
            {date && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75em' }}>{date}</span>}
        </div>
    );
}

// ── Полная карточка команды ───────────────────────────────────────────────────
function TeamCard({ team, players, clanWars, onOpenRecruit, onOpenDraft, playerFilter }) {
    useLang();
    const playerFilterNeedle = normalizeSearchText(playerFilter);
    const rosterRaw = players.filter(p => p.teamId === team.id);
    // Captain always first in roster
    const roster = [...rosterRaw].sort((a, b) => {
        if (a.id === team.captainId) return -1;
        if (b.id === team.captainId) return 1;
        return 0;
    });
    const captain  = players.find(p => p.id === team.captainId);
    const teamCWs  = clanWars.filter(cw =>
        cw.teamA?.name?.toLowerCase() === team.name.toLowerCase() ||
        cw.teamB?.name?.toLowerCase() === team.name.toLowerCase()
    ).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    const visibleRoster = playerFilterNeedle
        ? roster.filter(player => matchesPlayerSearch(player, playerFilterNeedle))
        : roster;
    const visibleTeamCWs = playerFilterNeedle
        ? teamCWs.filter(cw => teamClanWarHasPlayer(cw, players, team.name, playerFilterNeedle))
        : teamCWs;

    // Find the most relevant clan war for draft: drafting > upcoming > ongoing > latest
    const draftCw = teamCWs.find(cw => cw.draft?.status === 'drafting')
        || teamCWs.find(cw => cw.status === 'upcoming')
        || teamCWs.find(cw => cw.status === 'ongoing')
        || teamCWs[0] || null;

    const draftStatus = draftCw?.draft?.status || 'pending';
    const cwWins   = teamCWs.filter(cw => cw.status === 'completed' && (
        (cw.teamA?.name?.toLowerCase() === team.name.toLowerCase() && cw.winner === 'a') ||
        (cw.teamB?.name?.toLowerCase() === team.name.toLowerCase() && cw.winner === 'b')
    )).length;
    const cwLosses = teamCWs.filter(cw => cw.status === 'completed' && cw.winner && (
        (cw.teamA?.name?.toLowerCase() === team.name.toLowerCase() && cw.winner !== 'a') ||
        (cw.teamB?.name?.toLowerCase() === team.name.toLowerCase() && cw.winner !== 'b')
    )).length;
    const totalPts = roster.reduce((sum, p) => sum + (p.stats?.points || 0), 0);

    return (
        <div className="team-card-v2">
            {/* Шапка команды */}
            <div className="team-card-header">
                {team.logo ? (
                    <img src={team.logo} alt={team.name} className="team-logo-v2" />
                ) : (
                    <div className="team-logo-placeholder">{team.emoji || '🛡'}</div>
                )}
                <div style={{ flex: 1, minWidth: 80 }}>
                    <div className="team-name-v2">{team.emoji && !team.logo ? '' : (team.emoji || '')} {team.name}</div>
                    {captain && (
                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.82em', marginTop: 2 }}>
                            👑 {captain.name || captain.battleTag}
                        </div>
                    )}
                </div>
                {/* Сводка */}
                <div className="team-summary">
                    <div className="team-summary-item">
                        <span className="team-summary-label">{tr('Игроков', 'Players')}</span>
                        <span className="team-summary-val">{roster.length}</span>
                    </div>
                    <div className="team-summary-item">
                        <span className="team-summary-label">{tr('Очков', 'Points')}</span>
                        <span className="team-summary-val" style={{ color: 'var(--color-accent-primary)' }}>{totalPts}</span>
                    </div>
                    {(cwWins + cwLosses) > 0 && (
                        <div className="team-summary-item">
                            <span className="team-summary-label">КВ</span>
                            <span className="team-summary-val">
                                <span style={{ color: 'var(--color-success)' }}>{cwWins}</span>
                                <span style={{ color: 'var(--color-text-muted)' }}>-</span>
                                <span style={{ color: 'var(--color-error)' }}>{cwLosses}</span>
                            </span>
                        </div>
                    )}
                </div>

                {/* Кнопка набора */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                    {draftStatus === 'drafting' && (
                        <button
                            className="btn btn-primary"
                            style={{ padding: '6px 12px', fontSize: '0.82em', display: 'flex', alignItems: 'center', gap: 5 }}
                            onClick={() => onOpenDraft && onOpenDraft({ clanWarId: draftCw.id || draftCw._id })}
                        >
                            {tr('Драфт идёт', 'Draft live')}
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff', display: 'inline-block', flexShrink: 0 }} />
                        </button>
                    )}
                    <button
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.82em' }}
                        onClick={() => onOpenRecruit && onOpenRecruit({ teamId: team.id, teamName: team.name, captainId: team.captainId || null })}
                    >
                        {tr('Набор', 'Recruit')}
                    </button>
                </div>
            </div>

            {/* Разделитель */}
            <div style={{ height: 1, background: 'rgba(212,175,55,0.15)', margin: '0 var(--spacing-lg)' }} />

            {/* Состав */}
            <div className="team-roster">
                {visibleRoster.length === 0 ? (
                    <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '16px 0', fontSize: '0.85em' }}>
                        {tr('Нет игроков', 'No players')}
                    </p>
                ) : (
                    visibleRoster.map(p => (
                        <PlayerRow key={p.id} player={p} isCaptain={p.id === team.captainId} />
                    ))
                )}
            </div>

            {/* История клан-варов */}
            {visibleTeamCWs.length > 0 && (
                <>
                    <div style={{ height: 1, background: 'rgba(212,175,55,0.15)', margin: '0 var(--spacing-lg)' }} />
                    <div style={{ padding: 'var(--spacing-md) var(--spacing-lg)' }}>
                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.72em', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                            ⚔ {tr('Клан-вары', 'Clan Wars')}
                        </div>
                        {visibleTeamCWs.slice(0, 5).map((cw, i) => (
                            <TeamClanWarRow key={cw.id || i} cw={cw} teamName={team.name} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// ── Модалка запуска драфта ────────────────────────────────────────────────────
function StartDraftModal({ teams, onStart, onClose }) {
    useLang();
    const [teamAId, setTeamAId] = React.useState('');
    const [teamBId, setTeamBId] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [error,   setError]   = React.useState(null);
    const adminSid = localStorage.getItem('bnl_admin_session');

    const submit = async () => {
        if (!teamAId || !teamBId) return setError(tr('Выберите обе команды', 'Select both teams'));
        if (teamAId === teamBId)  return setError(tr('Команды должны быть разными', 'Teams must be different'));
        setLoading(true); setError(null);
        try {
            const res  = await fetch('/api/draft/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-session-id': adminSid || '' },
                body: JSON.stringify({ teamAId, teamBId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || tr('Ошибка создания драфта', 'Failed to create draft'));
            onStart(data.clanWarId);
        } catch (err) { setError(err.message); setLoading(false); }
    };

    const sel = { background: 'var(--color-bg-lighter)', color: 'var(--color-text-primary)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 6, padding: '8px 12px', width: '100%', fontSize: '0.9em' };
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="card-elevated" style={{ padding: 'var(--spacing-xxl)', maxWidth: 420, width: '90%' }}>
                <h3 style={{ color: 'var(--color-accent-primary)', marginBottom: 'var(--spacing-xl)', textAlign: 'center' }}>
                    {tr('Начать драфт', 'Start draft')}
                </h3>
                {error && (
                    <div style={{ background: 'rgba(244,67,54,0.1)', border: '1px solid var(--color-error)', borderRadius: 6, padding: '8px 12px', color: 'var(--color-error)', marginBottom: 'var(--spacing-md)', fontSize: '0.9em' }}>
                        {error}
                    </div>
                )}
                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8em', marginBottom: 6 }}>{tr('Команда A', 'Team A')}</div>
                    <select value={teamAId} onChange={e => setTeamAId(e.target.value)} style={sel}>
                        <option value="">{tr('— выберите команду —', '— select a team —')}</option>
                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8em', marginBottom: 6 }}>{tr('Команда B', 'Team B')}</div>
                    <select value={teamBId} onChange={e => setTeamBId(e.target.value)} style={sel}>
                        <option value="">{tr('— выберите команду —', '— select a team —')}</option>
                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" style={{ flex: 1, padding: '10px' }} onClick={submit} disabled={loading}>
                        {loading ? '...' : tr('Начать драфт', 'Start draft')}
                    </button>
                    <button className="btn btn-secondary" style={{ flex: 1, padding: '10px' }} onClick={onClose} disabled={loading}>
                        {tr('Отмена', 'Cancel')}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Точка входа ───────────────────────────────────────────────────────────────
function Teams({ onOpenRecruit, onOpenDraft }) {
    useLang();
    const [teams,         setTeams]         = React.useState([]);
    const [players,       setPlayers]       = React.useState([]);
    const [clanWars,      setClanWars]      = React.useState([]);
    const [loading,       setLoading]       = React.useState(true);
    const [error,         setError]         = React.useState(null);
    const [showDraftModal, setShowDraftModal] = React.useState(false);
    const [page,          setPage]          = React.useState(1);
    const [playerFilter,  setPlayerFilter]  = React.useState('');
    const isAdmin = !!localStorage.getItem('bnl_admin_session');
    const playerFilterNeedle = normalizeSearchText(playerFilter);

    const load = () => {
        Promise.all([
            fetch('/api/teams').then(r => r.json()),
            fetch('/api/players').then(r => r.json()),
            fetch('/api/clan-wars').then(r => r.json()),
        ])
            .then(([tm, pl, cw]) => {
                setTeams(tm);
                setPlayers(pl);
                setClanWars(Array.isArray(cw) ? cw : []);
                setLoading(false);
            })
            .catch(err => { setError(err.message); setLoading(false); });
    };

    React.useEffect(() => { load(); }, []);
    const filteredTeams = teams.filter(team => {
        if (!playerFilterNeedle) return true;
        const rosterPlayers = players.filter(player => player.teamId === team.id);
        const captain = players.find(player => player.id === team.captainId);
        if (matchesPlayerSearch(captain, playerFilterNeedle)) return true;
        if (rosterPlayers.some(player => matchesPlayerSearch(player, playerFilterNeedle))) return true;
        return clanWars.some(cw =>
            (cw.teamA?.name?.toLowerCase() === team.name.toLowerCase() || cw.teamB?.name?.toLowerCase() === team.name.toLowerCase())
            && teamClanWarHasPlayer(cw, players, team.name, playerFilterNeedle)
        );
    });
    const pagination = paginateCollection(filteredTeams, page, TEAMS_PAGE_SIZE);

    React.useEffect(() => {
        if (page !== pagination.currentPage) setPage(pagination.currentPage);
    }, [page, pagination.currentPage]);

    React.useEffect(() => {
        setPage(1);
    }, [playerFilterNeedle]);

    if (loading) return (
        <div className="animate-fade-in wow-section-page">
            <WoWSectionTitle>{t('teams.title')}</WoWSectionTitle>
            <div className="teams-grid-v2">
                {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 320, borderRadius: 'var(--radius-lg)' }} />)}
            </div>
        </div>
    );
    if (error) return (
        <div className="animate-fade-in wow-section-page">
            <WoWSectionTitle>{t('teams.title')}</WoWSectionTitle>
            <div style={{ color: 'var(--color-error)', padding: 32, textAlign: 'center' }}>⚠ {error}</div>
        </div>
    );

    return (
        <div className="animate-fade-in wow-section-page">
            <WoWSectionTitle>{t('teams.title')}</WoWSectionTitle>
            {showDraftModal && (
                <StartDraftModal
                    teams={teams}
                    onStart={clanWarId => { setShowDraftModal(false); onOpenDraft && onOpenDraft({ clanWarId }); }}
                    onClose={() => setShowDraftModal(false)}
                />
            )}
            {isAdmin && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--spacing-lg)' }}>
                    <button className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '0.9em' }} onClick={() => setShowDraftModal(true)}>
                        {tr('Начать драфт', 'Start draft')}
                    </button>
                </div>
            )}
            <div className="wow-filter-bar" style={{ marginBottom: 18 }}>
                <PlayerNameFilterInput value={playerFilter} onChange={setPlayerFilter} />
            </div>
            {filteredTeams.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 48 }}>
                    {playerFilterNeedle ? t('filters.no_results') : t('teams.empty')}
                </p>
            ) : (
                <>
                    <div className="teams-grid-v2">
                        {pagination.items.map(team => (
                            <TeamCard
                                key={team.id}
                                team={team}
                                players={players}
                                clanWars={clanWars}
                                onOpenRecruit={onOpenRecruit}
                                onOpenDraft={onOpenDraft}
                                playerFilter={playerFilterNeedle}
                            />
                        ))}
                    </div>
                    <PaginationControls page={pagination.currentPage} totalPages={pagination.totalPages} onPageChange={setPage} className="teams-pagination" />
                </>
            )}
        </div>
    );
}
