// ClanWar — клан-вары (первый до 3 побед, BO3 каждый матч) + интеграция с командами

// ── Вспомогательные константы расы ───────────────────────────────────────────
const CW_RACE_IMG   = { 0: '/images/random.svg', 1: '/images/human.jpg', 2: '/images/orc.jpg', 4: '/images/nightelf.jpg', 8: '/images/undead.jpg' };
const CW_RACE_COLOR = { 1: '#a8d8ea', 2: '#ff7043', 4: '#66bb6a', 8: '#b0b0b0' };
const tr = (ru, en) => getLang() === 'en' ? en : ru;
const CLAN_WARS_PAGE_SIZE = 10;
const MY_MATCHES_PAGE_SIZE = 5;
const CW_PLAYER_SESSION_STORAGE_KEY = 'bnl_player_session';
const CW_PLAYER_SESSION_CHANGE_EVENT = 'bnl-player-session-change';
const CLAN_WAR_STATUS_FILTERS = [
    { id: 'all',       key: 'cw.all' },
    { id: 'upcoming',  key: 'cw.upcoming' },
    { id: 'ongoing',   key: 'cw.ongoing' },
    { id: 'completed', key: 'cw.completed' },
];
const MY_MATCHES_FILTERS = [
    { id: 'all',       key: 'cw.all' },
    { id: 'upcoming',  key: 'cw.upcoming' },
    { id: 'completed', key: 'cw.completed' },
];
const MY_MATCHES_FORMAT_FILTERS = ['1v1', '2v2', '3v3'];
const CW_RACE_ABBR  = race => ({
    0: 'Rnd',
    1: tr('Люди', 'Human'),
    2: tr('Орки', 'Orc'),
    4: tr('Эльфы', 'Elves'),
    8: tr('Нежить', 'Undead'),
}[race] || 'Rnd');

function getClanWarParticipantAliases(player) {
    const aliases = new Set();

    for (const value of [
        player?.linkedBattleTag,
        player?.name,
        player?.battleTag,
        String(player?.battleTag || '').split('#')[0],
    ]) {
        const normalized = normalizeSearchText(value);
        if (normalized) aliases.add(normalized);
    }

    return aliases;
}

function clanWarAliasesMatchValue(aliases, value) {
    const normalized = normalizeSearchText(value);
    const battleTagName = normalizeSearchText(String(value || '').split('#')[0]);
    return (!!normalized && aliases.has(normalized)) || (!!battleTagName && aliases.has(battleTagName));
}

function clanWarMatchHasParticipantIdentity(match, player) {
    if (!match || !player) return false;
    const aliases = getClanWarParticipantAliases(player);
    return [...parseClanWarSide(match.playerA), ...parseClanWarSide(match.playerB)].some(value => clanWarAliasesMatchValue(aliases, value));
}

function clampClanWarScore(value) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || Number.isNaN(parsed)) return 0;
    return Math.max(0, Math.min(2, parsed));
}

function getClanWarWinnerFromScore(score) {
    const scoreA = clampClanWarScore(score?.a);
    const scoreB = clampClanWarScore(score?.b);
    if (scoreA >= 2 && scoreA > scoreB) return 'a';
    if (scoreB >= 2 && scoreB > scoreA) return 'b';
    return null;
}

function getClanWarResolvedMatchWinner(match) {
    if (match?.winner === 'a' || match?.winner === 'b') return match.winner;
    return getClanWarWinnerFromScore(match?.score);
}

async function clanWarParticipantFetch(url, options = {}) {
    const sessionId = localStorage.getItem(CW_PLAYER_SESSION_STORAGE_KEY);
    const headers = {
        'Content-Type': 'application/json',
        ...(sessionId ? { 'x-player-session-id': sessionId } : {}),
        ...(options.headers || {}),
    };
    const response = await fetch(url, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || response.statusText);
    return data;
}

function parseClanWarSide(value) {
    return String(value || '')
        .split(' + ')
        .map(name => name.trim())
        .filter(Boolean);
}

function getClanWarMatchParticipantSide(match, player) {
    if (!match || !player) return null;
    const aliases = getClanWarParticipantAliases(player);
    if (parseClanWarSide(match.playerA).some(value => clanWarAliasesMatchValue(aliases, value))) return 'a';
    if (parseClanWarSide(match.playerB).some(value => clanWarAliasesMatchValue(aliases, value))) return 'b';
    return null;
}

function getClanWarMyMatchRow(clanWar, match, player) {
    const participantSide = getClanWarMatchParticipantSide(match, player);
    if (!participantSide) return null;

    const teamNameA = clanWar.teamA?.name || 'Team A';
    const teamNameB = clanWar.teamB?.name || 'Team B';
    const aliases = getClanWarParticipantAliases(player);
    const ownSidePlayers = parseClanWarSide(participantSide === 'a' ? match.playerA : match.playerB);
    const opponentPlayers = parseClanWarSide(participantSide === 'a' ? match.playerB : match.playerA);
    const teammates = ownSidePlayers.filter(name => !clanWarAliasesMatchValue(aliases, name));

    return {
        clanWarId: clanWar.id || clanWar._id,
        clanWarLabel: `${teamNameA} vs ${teamNameB}`,
        clanWarDate: clanWar.date,
        clanWarDateLabel: formatClanWarDate(clanWar.date),
        sortDate: new Date(clanWar.date || 0).getTime(),
        match,
        matchId: match.id || match._id || `${clanWar.id || clanWar._id}-${match.order || match.label || match.format}`,
        matchOrder: match.order ?? 0,
        format: match.format || '1v1',
        label: match.label || tr(`Матч ${match.order}`, `Match ${match.order}`),
        participantSide,
        ownBansFirst: participantSide === 'a',
        opponentBansFirst: participantSide === 'b',
        opponentTeamName: participantSide === 'a'
            ? teamNameB
            : teamNameA,
        opponents: opponentPlayers,
        teammates,
    };
}

function formatClanWarMatchGroups(wars, player) {
    const formatOrder = ['1v1', '2v2', '3v3'];
    const rows = wars.flatMap(clanWar => (clanWar.matches || [])
        .filter(match => clanWarMatchHasParticipantIdentity(match, player))
        .map(match => getClanWarMyMatchRow(clanWar, match, player))
        .filter(Boolean)
    );

    rows.sort((a, b) => {
        if (b.sortDate !== a.sortDate) return b.sortDate - a.sortDate;
        return a.matchOrder - b.matchOrder;
    });

    return formatOrder
        .map(format => ({
            format,
            rows: rows.filter(row => row.format === format),
        }))
        .filter(group => group.rows.length > 0);
}

function filterMyMatchGroups(groups, filter) {
    const list = Array.isArray(groups) ? groups : [];
    if (filter === 'all') return list;

    const matcher = filter === 'completed'
        ? row => row?.match?.winner === 'a' || row?.match?.winner === 'b'
        : row => row?.match?.winner == null;

    return list
        .map(group => ({
            ...group,
            rows: (group.rows || []).filter(matcher),
        }))
        .filter(group => group.rows.length > 0);
}

function filterMyMatchGroupsByFormat(groups, selectedFormat) {
    const list = Array.isArray(groups) ? groups : [];
    if (!selectedFormat) return [];
    return list.filter(group => group.format === selectedFormat);
}

function getClanWarMatchDisplayPlayer(name, players) {
    const player = findPlayerByAlias(players, name);
    const race = player?.mainRace ?? player?.race ?? null;
    const mmr = player?.stats?.mmr ?? player?.currentMmr ?? null;
    return {
        name,
        race,
        mmr,
    };
}

function getClanWarRoster(teamObj, cwTeam, players) {
    const roster = [];
    const addedIds = new Set();

    if (teamObj) {
        for (const player of players.filter(entry => entry.teamId === teamObj.id)) {
            roster.push(player);
            addedIds.add(player.id);
        }
    }

    if (cwTeam?.captain) {
        const captain = players.find(player => !addedIds.has(player.id) && playerHasAlias(player, cwTeam.captain));
        if (captain) {
            roster.unshift(captain);
            addedIds.add(captain.id);
        }
    }

    if (cwTeam?.players?.length) {
        for (const name of cwTeam.players) {
            const player = players.find(entry => !addedIds.has(entry.id) && playerHasAlias(entry, name));
            if (player) {
                roster.push(player);
                addedIds.add(player.id);
            }
        }
    }

    return roster;
}

function clanWarSideHasPlayer(side, players, needle) {
    if (!needle) return true;
    if (matchesNamedPlayer(side?.captain, needle)) return true;
    return (side?.players || []).some(name => {
        const player = findPlayerByAlias(players, name);
        return matchesNamedPlayer(name, needle) || matchesPlayerSearch(player, needle);
    });
}

function clanWarMatchSideHasPlayer(sideValue, players, needle) {
    if (!needle) return true;
    return parseClanWarSide(sideValue).some(name => {
        const player = findPlayerByAlias(players, name);
        return matchesNamedPlayer(name, needle) || matchesPlayerSearch(player, needle);
    });
}

function clanWarHasPlayer(cw, players, teams, needle) {
    if (!needle) return true;

    const teamObjA = teams.find(team => normalizeSearchText(team.name) === normalizeSearchText(cw.teamA?.name));
    const teamObjB = teams.find(team => normalizeSearchText(team.name) === normalizeSearchText(cw.teamB?.name));
    const rosterA = getClanWarRoster(teamObjA, cw.teamA, players);
    const rosterB = getClanWarRoster(teamObjB, cw.teamB, players);

    if (rosterA.some(player => matchesPlayerSearch(player, needle))) return true;
    if (rosterB.some(player => matchesPlayerSearch(player, needle))) return true;
    if (clanWarSideHasPlayer(cw.teamA, players, needle) || clanWarSideHasPlayer(cw.teamB, players, needle)) return true;

    return (cw.matches || []).some(match =>
        clanWarMatchSideHasPlayer(match.playerA, players, needle)
        || clanWarMatchSideHasPlayer(match.playerB, players, needle)
    );
}

function formatClanWarDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(getLang() === 'en' ? 'en-US' : 'ru');
}

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
                    {race && CW_RACE_ABBR(race) && (
                        <span style={{ marginLeft: 5, color: CW_RACE_COLOR[race] }}>· {CW_RACE_ABBR(race)}</span>
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
function CwMatchupCard({ match, players, nameA, nameB, canEdit = false, clanWarId = null, onClanWarUpdated = null }) {
    const findPlayer = (name) => {
        if (!name || !name.trim()) return null;
        return findPlayerByAlias(players, name.trim());
    };

    const sideA = parseClanWarSide(match.playerA);
    const sideB = parseClanWarSide(match.playerB);

    const resolvedWinner = getClanWarResolvedMatchWinner(match);
    const winA  = resolvedWinner === 'a';
    const winB  = resolvedWinner === 'b';
    const played = resolvedWinner != null;

    // Determine tier from first player on side A
    const p0    = sideA[0] ? findPlayer(sideA[0]) : null;
    const mmr0  = p0 ? (p0.stats?.mmr || p0.currentMmr || 0) : 0;
    const tier0 = p0 ? (p0.tierOverride || (mmr0 >= 1700 ? 3 : mmr0 >= 1400 ? 2 : mmr0 >= 1000 ? 1 : null)) : null;
    const tierLabel = { 1: 'B', 2: 'A', 3: 'S' }[tier0] || null;
    const tierColor = { 3: '#ffd700', 2: '#00d4ff', 1: '#b0b0b0' }[tier0] || null;

    const scoreA = match.score?.a ?? 0;
    const scoreB = match.score?.b ?? 0;
    const [editScoreA, setEditScoreA] = React.useState(scoreA);
    const [editScoreB, setEditScoreB] = React.useState(scoreB);
    const [saving, setSaving] = React.useState(false);
    const [saveFeedback, setSaveFeedback] = React.useState(null);

    const winnerGlow = 'rgba(76,175,80,0.07)';
    React.useEffect(() => {
        setEditScoreA(scoreA);
        setEditScoreB(scoreB);
        setSaveFeedback(null);
    }, [match.id, scoreA, scoreB, match.winner]);

    const saveScore = async () => {
        if (!canEdit || !clanWarId || saving) return;

        const safeScore = {
            a: clampClanWarScore(editScoreA),
            b: clampClanWarScore(editScoreB),
        };
        setSaving(true);
        setSaveFeedback(null);

        try {
            const updatedClanWar = await clanWarParticipantFetch(`/api/clan-wars/${clanWarId}/matches/${match.id || match._id}`, {
                method: 'PUT',
                body: JSON.stringify({ score: safeScore }),
            });
            setEditScoreA(safeScore.a);
            setEditScoreB(safeScore.b);
            setSaveFeedback({ type: 'ok', text: tr('Счёт сохранён', 'Score saved') });
            onClanWarUpdated && onClanWarUpdated(updatedClanWar);
        } catch (err) {
            setSaveFeedback({ type: 'error', text: err.message || tr('Не удалось сохранить счёт', 'Failed to save score') });
        } finally {
            setSaving(false);
        }
    };

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
                    {match.label || tr(`Матч ${match.order}`, `Match ${match.order}`)}
                </span>
                <span className="cw-match-fmt">{match.format}</span>
                {tierLabel && (
                    <span style={{ fontSize: '0.75em', fontWeight: 800, color: tierColor }}>Tier {tierLabel}</span>
                )}
                {resolvedWinner && (
                    <span style={{ marginLeft: 'auto', color: 'var(--color-success)', fontSize: '0.82em', fontWeight: 700 }}>
                        ✓ {resolvedWinner === 'a' ? nameA : nameB}
                    </span>
                )}
            </div>

            {/* Body */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12, padding: '10px 16px' }}>
                {/* Team A side */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderRadius: 8, padding: winA ? '6px 8px' : 0, background: winA ? winnerGlow : 'transparent' }}>
                    {sideA.length > 0 && (
                        <div>
                            <span className="cw-ban-order">
                                🗺 {t('cw.bans_first')}
                            </span>
                        </div>
                    )}
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
                    {canEdit && clanWarId && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginTop: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <input
                                    type="number"
                                    min="0"
                                    max="2"
                                    value={editScoreA}
                                    onChange={e => { setEditScoreA(clampClanWarScore(e.target.value)); setSaveFeedback(null); }}
                                    style={{ width: 44, textAlign: 'center', padding: '4px 2px', fontSize: '0.9rem' }}
                                />
                                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78em' }}>:</span>
                                <input
                                    type="number"
                                    min="0"
                                    max="2"
                                    value={editScoreB}
                                    onChange={e => { setEditScoreB(clampClanWarScore(e.target.value)); setSaveFeedback(null); }}
                                    style={{ width: 44, textAlign: 'center', padding: '4px 2px', fontSize: '0.9rem' }}
                                />
                            </div>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: '6px 10px', fontSize: '0.72em', lineHeight: 1.1 }}
                                disabled={saving}
                                onClick={saveScore}
                            >
                                {saving ? tr('Сохранение...', 'Saving...') : tr('Сохранить счёт', 'Save score')}
                            </button>
                            {saveFeedback && (
                                <div style={{
                                    fontSize: '0.68em',
                                    color: saveFeedback.type === 'error' ? 'var(--color-error)' : 'var(--color-success)',
                                    textAlign: 'center',
                                    maxWidth: 120,
                                }}>
                                    {saveFeedback.text}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Team B side */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', borderRadius: 8, padding: winB ? '6px 8px' : 0, background: winB ? winnerGlow : 'transparent' }}>
                    {sideB.length > 0 && (
                        <div>
                            <span className="cw-ban-order is-second">
                                🗺 {t('cw.bans_second')}
                            </span>
                        </div>
                    )}
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
function ClanWarCard({ cw, players, teams, currentPlayer, onClanWarUpdated }) {
    useLang();
    const [open, setOpen] = React.useState(false);

    const statusLabel = t(`cw.status.${cw.status}`) || cw.status;
    const statusClass  = { upcoming: 'status-upcoming', ongoing: 'status-ongoing', completed: 'status-completed' }[cw.status] || '';

    const nameA = cw.teamA?.name || 'Team A';
    const nameB = cw.teamB?.name || 'Team B';

    // Find team objects by name for roster display
    const teamObjA = teams.find(t => t.name?.toLowerCase() === nameA.toLowerCase());
    const teamObjB = teams.find(t => t.name?.toLowerCase() === nameB.toLowerCase());

    const renderTeamHeaderIdentity = (teamObj, fallbackName, side) => (
        <span className={`cw-team-showcase cw-team-showcase--${side}`}>
            {teamObj?.logo
                ? <img src={teamObj.logo} alt={fallbackName} className="cw-team-showcase-logo" />
                : <span className="cw-team-showcase-emoji">{teamObj?.emoji || '🛡'}</span>
            }
            <span className="cw-team-showcase-name">{fallbackName}</span>
        </span>
    );

    const rosterA = getClanWarRoster(teamObjA, cw.teamA, players);
    const rosterB = getClanWarRoster(teamObjB, cw.teamB, players);

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
                <div className="cw-card-status-row">
                    <span className={`cw-status ${statusClass}`}>{statusLabel}</span>
                    {cw.winner && (
                        <span className="cw-winner-badge">
                            🏆 {cw.winner === 'a' ? nameA : nameB}
                        </span>
                    )}
                    {hasDraft && draftStatus !== 'pending' && (
                        <span className={`cw-draft-badge ${draftStatus === 'drafting' ? 'draft-badge-active' : 'draft-badge-done'}`}>
                            {t(`draft.status_${draftStatus}`)}
                        </span>
                    )}
                    <span className="cw-toggle">{open ? '▲' : '▼'}</span>
                </div>
                <div className="cw-teams">
                    {renderTeamHeaderIdentity(teamObjA, nameA, 'left')}
                    <span className="cw-score-display">
                        {cw.clanWarScore?.a ?? 0} — {cw.clanWarScore?.b ?? 0}
                    </span>
                    {renderTeamHeaderIdentity(teamObjB, nameB, 'right')}
                </div>
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
                                    {rosterA.length === 0 && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82em', padding: '6px 0' }}>{tr('Нет игроков', 'No players')}</p>}
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
                                    {rosterB.length === 0 && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82em', padding: '6px 0' }}>{tr('Нет игроков', 'No players')}</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Divider */}
                    <div style={{ height: 1, background: 'rgba(212,175,55,0.1)', margin: '0 var(--spacing-lg)' }} />

                    {/* Match matchups */}
                    <div style={{ padding: 'var(--spacing-md) var(--spacing-lg)' }}>
                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.72em', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                            ⚔ {tr('Матчи', 'Matches')}
                        </div>
                        {(cw.matches || []).length === 0
                            ? <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85em' }}>—</p>
                            : (cw.matches || []).map((m, i) => (
                                <CwMatchupCard
                                    key={m._id || i}
                                    match={m}
                                    players={players}
                                    nameA={nameA}
                                    nameB={nameB}
                                    canEdit={clanWarMatchHasParticipantIdentity(m, currentPlayer)}
                                    clanWarId={cw.id || cw._id}
                                    onClanWarUpdated={onClanWarUpdated}
                                />
                            ))
                        }
                    </div>

                </div>
            )}
        </div>
    );
}

function ClanWarMatchPlayerList({ names, players }) {
    if (!names.length) return <span className="cw-my-match-primary">—</span>;

    return (
        <div className="cw-my-player-list">
            {names.map((name, index) => {
                const entry = getClanWarMatchDisplayPlayer(name, players);
                const raceColor = CW_RACE_COLOR[entry.race] || 'var(--color-text-primary)';
                return (
                    <React.Fragment key={`${name}-${index}`}>
                        {index > 0 && <span className="cw-my-player-separator">, </span>}
                        <span className="cw-my-player-entry">
                            <span className="cw-my-player-name" style={{ color: raceColor }}>{entry.name}</span>
                            {entry.race != null && (
                                <span className="cw-my-player-race" style={{ color: raceColor }}>
                                    · {CW_RACE_ABBR(entry.race)}
                                </span>
                            )}
                            {entry.mmr != null && (
                                <span className="cw-my-player-mmr">
                                    {' '}· {entry.mmr}
                                </span>
                            )}
                        </span>
                    </React.Fragment>
                );
            })}
        </div>
    );
}

function MyClanWarTable({ format, rows, players, onClanWarUpdated }) {
    useLang();
    const [editingMatchId, setEditingMatchId] = React.useState(null);
    const [editOwnScore, setEditOwnScore] = React.useState(0);
    const [editOpponentScore, setEditOpponentScore] = React.useState(0);
    const [saving, setSaving] = React.useState(false);
    const [saveFeedback, setSaveFeedback] = React.useState(null);
    const isTeamMatch = format !== '1v1';
    const [isMobileViewport, setIsMobileViewport] = React.useState(() => (
        typeof window !== 'undefined' ? window.matchMedia('(max-width: 700px)').matches : false
    ));

    React.useEffect(() => {
        if (editingMatchId && !rows.some(row => row.matchId === editingMatchId)) {
            setEditingMatchId(null);
            setSaveFeedback(null);
        }
    }, [rows, editingMatchId]);

    React.useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return undefined;

        const mediaQuery = window.matchMedia('(max-width: 700px)');
        const handleChange = event => setIsMobileViewport(event.matches);
        setIsMobileViewport(mediaQuery.matches);

        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }

        mediaQuery.addListener(handleChange);
        return () => mediaQuery.removeListener(handleChange);
    }, []);

    const beginEditing = (row) => {
        if (saving) return;
        setEditingMatchId(row.matchId);
        setEditOwnScore(row.participantSide === 'a' ? (row.match.score?.a ?? 0) : (row.match.score?.b ?? 0));
        setEditOpponentScore(row.participantSide === 'a' ? (row.match.score?.b ?? 0) : (row.match.score?.a ?? 0));
        setSaveFeedback(null);
    };

    const cancelEditing = () => {
        if (saving) return;
        setEditingMatchId(null);
        setSaveFeedback(null);
    };

    const handleScoreInputFocus = (event) => {
        event.target.select();
    };

    const getDraftScore = (row) => {
        const safeOwnScore = clampClanWarScore(editOwnScore);
        const safeOpponentScore = clampClanWarScore(editOpponentScore);
        return row.participantSide === 'a'
            ? { a: safeOwnScore, b: safeOpponentScore }
            : { a: safeOpponentScore, b: safeOwnScore };
    };

    const hasDraftScoreChanges = (row) => {
        const nextScore = getDraftScore(row);
        return nextScore.a !== (row.match.score?.a ?? 0) || nextScore.b !== (row.match.score?.b ?? 0);
    };

    const saveScore = async (row, { closeOnSuccess = true } = {}) => {
        if (saving) return;

        const safeScore = getDraftScore(row);

        setSaving(true);
        setSaveFeedback(null);

        try {
            const updatedClanWar = await clanWarParticipantFetch(`/api/clan-wars/${row.clanWarId}/matches/${row.match.id || row.match._id}`, {
                method: 'PUT',
                body: JSON.stringify({ score: safeScore }),
            });
            if (closeOnSuccess) setEditingMatchId(null);
            setSaveFeedback(null);
            onClanWarUpdated && onClanWarUpdated(updatedClanWar);
        } catch (err) {
            setSaveFeedback({ type: 'error', text: err.message || t('cw.my_matches.score.failed') });
        } finally {
            setSaving(false);
        }
    };

    const handleMobileEditorBlur = async (event, row) => {
        if (!isMobileViewport || editingMatchId !== row.matchId || saving) return;
        const editorNode = event.currentTarget;

        window.requestAnimationFrame(async () => {
            if (editorNode.contains(document.activeElement)) return;
            if (!hasDraftScoreChanges(row)) {
                setEditingMatchId(null);
                setSaveFeedback(null);
                return;
            }

            await saveScore(row, { closeOnSuccess: true });
        });
    };

    return (
        <div className="cw-my-format-block">
            <div className="cw-my-format-title">{format}</div>
            <div className="standings-table-wrap cw-my-table-wrap">
                <table className={`standings-table cw-my-table ${isTeamMatch ? 'cw-my-table--team' : 'cw-my-table--solo'}`}>
                    <thead>
                        <tr>
                            <th>{t('cw.my_matches.table.clan_war')}</th>
                            <th>{t(isTeamMatch ? 'cw.my_matches.table.opponents' : 'cw.my_matches.table.player')}</th>
                            {isTeamMatch && <th>{t('cw.my_matches.table.teammates')}</th>}
                            <th>{t('cw.my_matches.table.score')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(row => {
                            const isEditing = editingMatchId === row.matchId;
                            const scoreA = row.match.score?.a ?? 0;
                            const scoreB = row.match.score?.b ?? 0;
                            const currentScore = row.participantSide === 'a'
                                ? `${scoreA}:${scoreB}`
                                : `${scoreB}:${scoreA}`;
                            const resolvedWinner = getClanWarResolvedMatchWinner(row.match);
                            const rowPlayed = resolvedWinner != null;
                            const didWin = resolvedWinner === row.participantSide;

                            return (
                                <tr key={row.matchId} className={`cw-my-match-row${didWin ? ' is-win' : rowPlayed ? ' is-loss' : ''}${isEditing ? ' is-editing' : ''}`}>
                                    <td className="cw-my-match-cell" data-label={t('cw.my_matches.table.clan_war')}>
                                        <div className="cw-my-match-primary">{row.clanWarLabel}</div>
                                        {row.clanWarDateLabel && (
                                            <div className="cw-my-match-meta">{row.clanWarDateLabel}</div>
                                        )}
                                    </td>
                                    <td className="cw-my-match-cell" data-label={t(isTeamMatch ? 'cw.my_matches.table.opponents' : 'cw.my_matches.table.player')}>
                                        <ClanWarMatchPlayerList names={row.opponents} players={players} />
                                        <div className="cw-my-match-meta">{row.label}</div>
                                        <div className="cw-my-mobile-context">
                                            <div className="cw-my-match-meta">
                                                {row.clanWarLabel}
                                                {row.clanWarDateLabel ? ` · ${row.clanWarDateLabel}` : ''}
                                            </div>
                                            {isTeamMatch && row.teammates.length > 0 && (
                                                <div className="cw-my-match-meta">
                                                    {t('cw.my_matches.table.teammates')}: {row.teammates.join(', ')}
                                                </div>
                                            )}
                                        </div>
                                        <div className={`cw-ban-order cw-my-ban-order${row.opponentBansFirst ? '' : ' is-second'}`}>
                                            {t(row.opponentBansFirst ? 'cw.bans_first' : 'cw.bans_second')}
                                        </div>
                                    </td>
                                    {isTeamMatch && (
                                        <td className="cw-my-match-cell" data-label={t('cw.my_matches.table.teammates')}>
                                            <ClanWarMatchPlayerList names={row.teammates} players={players} />
                                        </td>
                                    )}
                                    <td className="cw-my-match-cell cw-my-match-cell--score" data-label={t('cw.my_matches.table.score')}>
                                        {isEditing ? (
                                            <div
                                                className={`cw-my-score-editor${isMobileViewport ? ' cw-my-score-editor--mobile' : ''}`}
                                                onBlur={e => handleMobileEditorBlur(e, row)}
                                            >
                                                <div className="cw-my-score-editor-inputs">
                                                    <label className="cw-my-score-editor-field">
                                                        <span>{t('cw.my_matches.score.you')}</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="2"
                                                            inputMode="numeric"
                                                            value={editOwnScore}
                                                            onFocus={handleScoreInputFocus}
                                                            onChange={e => { setEditOwnScore(clampClanWarScore(e.target.value)); setSaveFeedback(null); }}
                                                        />
                                                    </label>
                                                    <span className="cw-my-score-editor-divider">:</span>
                                                    <label className="cw-my-score-editor-field">
                                                        <span>{t('cw.my_matches.score.them')}</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="2"
                                                            inputMode="numeric"
                                                            value={editOpponentScore}
                                                            onFocus={handleScoreInputFocus}
                                                            onChange={e => { setEditOpponentScore(clampClanWarScore(e.target.value)); setSaveFeedback(null); }}
                                                        />
                                                    </label>
                                                </div>
                                                {!isMobileViewport && (
                                                    <div className="cw-my-score-editor-actions">
                                                        <button
                                                            type="button"
                                                            className="btn btn-secondary"
                                                            disabled={saving}
                                                            onClick={() => saveScore(row)}
                                                        >
                                                            {saving ? t('cw.my_matches.score.saving') : t('cw.my_matches.score.save')}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-secondary cw-my-cancel-button"
                                                            disabled={saving}
                                                            onClick={cancelEditing}
                                                        >
                                                            {t('cw.my_matches.score.cancel')}
                                                        </button>
                                                    </div>
                                                )}
                                                {isMobileViewport && (
                                                    <div className="cw-my-match-meta cw-my-match-meta--editor">
                                                        {saving ? t('cw.my_matches.score.saving') : t('cw.my_matches.score.edit')}
                                                    </div>
                                                )}
                                                {saveFeedback && (
                                                    <div className="cw-my-match-feedback is-error">
                                                        {saveFeedback.text}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                className={`cw-my-score-button${didWin ? ' is-win' : rowPlayed ? ' is-loss' : ''}`}
                                                disabled={saving}
                                                onClick={() => beginEditing(row)}
                                                aria-expanded={isEditing}
                                            >
                                                <span className="cw-my-score-button-value">{currentScore}</span>
                                                <span className="cw-my-score-button-hint">{t('cw.my_matches.score.edit')}</span>
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function MyClanWarGlobalTables({ groups, players, onClanWarUpdated }) {
    useLang();

    return (
        <div className="cw-card cw-my-card">
            <div className="cw-my-card-body">
                {groups.map(group => (
                    <MyClanWarTable
                        key={group.format}
                        format={group.format}
                        rows={group.rows}
                        players={players}
                        onClanWarUpdated={onClanWarUpdated}
                    />
                ))}
            </div>
        </div>
    );
}

function useClanWarPageData(filter = 'all') {
    const [wars,    setWars]    = React.useState([]);
    const [players, setPlayers] = React.useState([]);
    const [teams,   setTeams]   = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error,   setError]   = React.useState(null);
    const [currentPlayer, setCurrentPlayer] = React.useState(null);
    const activeFilter = filter || 'all';

    const loadWars = () => {
        setLoading(true);
        setError(null);
        const q = activeFilter !== 'all' ? `?status=${activeFilter}` : '';
        fetch(`/api/clan-wars${q}`)
            .then(r => r.json())
            .then(data => { setWars(Array.isArray(data) ? data : []); setLoading(false); })
            .catch(err  => { setError(err.message); setLoading(false); });
    };

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
        loadWars();
    }, [filter]);

    React.useEffect(() => {
        const syncCurrentPlayer = () => {
            const sessionId = localStorage.getItem(CW_PLAYER_SESSION_STORAGE_KEY);
            if (!sessionId) {
                setCurrentPlayer(null);
                return;
            }

            fetch('/api/players/auth/me', {
                headers: { 'x-player-session-id': sessionId }
            })
                .then(async response => {
                    const data = await response.json().catch(() => ({}));
                    if (!response.ok) throw new Error(data.error || response.statusText);
                    setCurrentPlayer(data.user
                        ? {
                            ...(data.playerData || {}),
                            linkedBattleTag: data.user.linkedBattleTag || null,
                            username: data.user.username || null,
                        }
                        : null);
                })
                .catch(() => setCurrentPlayer(null));
        };

        syncCurrentPlayer();
        window.addEventListener(CW_PLAYER_SESSION_CHANGE_EVENT, syncCurrentPlayer);
        window.addEventListener('storage', syncCurrentPlayer);
        return () => {
            window.removeEventListener(CW_PLAYER_SESSION_CHANGE_EVENT, syncCurrentPlayer);
            window.removeEventListener('storage', syncCurrentPlayer);
        };
    }, []);

    const handleClanWarUpdated = (updatedClanWar) => {
        setWars(prevWars => {
            const nextWars = prevWars.map(existingWar =>
                (existingWar.id || existingWar._id) === (updatedClanWar.id || updatedClanWar._id)
                    ? updatedClanWar
                    : existingWar
            );

            return activeFilter === 'all'
                ? nextWars
                : nextWars.filter(existingWar => existingWar.status === activeFilter);
        });
    };

    return {
        wars,
        players,
        teams,
        loading,
        error,
        currentPlayer,
        handleClanWarUpdated,
    };
}

function ClanWar() {
    useLang();
    const [filter,  setFilter]  = React.useState('all');
    const [page,    setPage]    = React.useState(1);
    const [playerFilter, setPlayerFilter] = React.useState('');
    const playerFilterNeedle = normalizeSearchText(playerFilter);
    const {
        wars,
        players,
        teams,
        loading,
        error,
        currentPlayer,
        handleClanWarUpdated,
    } = useClanWarPageData(filter);
    const filteredWars = wars.filter(cw => clanWarHasPlayer(cw, players, teams, playerFilterNeedle));
    const pagination = paginateCollection(filteredWars, page, CLAN_WARS_PAGE_SIZE);

    React.useEffect(() => {
        setPage(1);
    }, [filter, playerFilterNeedle]);

    React.useEffect(() => {
        if (page !== pagination.currentPage) setPage(pagination.currentPage);
    }, [page, pagination.currentPage]);

    if (error) return <div style={{ color: 'var(--color-error)', padding: 32, textAlign: 'center' }}>⚠ {error}</div>;

    return (
        <div className="animate-fade-in wow-section-page">
            <WoWSectionTitle>{t('cw.title')}</WoWSectionTitle>

            <div className="wow-filter-bar standings-controls" style={{ marginBottom: 18 }}>
                <div className="standings-controls-group standings-controls-group--filters">
                    {CLAN_WAR_STATUS_FILTERS.map(f => (
                        <button
                            key={f.id}
                            className={`wow-btn${filter === f.id ? ' active' : ''}`}
                            onClick={() => setFilter(f.id)}
                        >
                            {t(f.key)}
                        </button>
                    ))}
                </div>
                <div className="standings-controls-group standings-controls-group--search">
                    <PlayerNameFilterInput value={playerFilter} onChange={setPlayerFilter} />
                </div>
            </div>

            {loading ? (
                <div className="cw-list">
                    {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 64, marginBottom: 12, borderRadius: 'var(--radius-md)' }} />)}
                </div>
            ) : filteredWars.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 48 }}>
                    {playerFilterNeedle ? t('filters.no_results') : t('cw.empty')}
                </p>
            ) : (
                <>
                    <div className="cw-list">
                        {pagination.items.map(cw => (
                            <ClanWarCard
                                key={cw.id || cw._id}
                                cw={cw}
                                players={players}
                                teams={teams}
                                currentPlayer={currentPlayer}
                                onClanWarUpdated={handleClanWarUpdated}
                            />
                        ))}
                    </div>
                    <PaginationControls page={pagination.currentPage} totalPages={pagination.totalPages} onPageChange={setPage} />
                </>
            )}
        </div>
    );
}

function MyMatchesPage() {
    useLang();
    const [filter, setFilter] = React.useState('all');
    const [selectedFormat, setSelectedFormat] = React.useState(MY_MATCHES_FORMAT_FILTERS[0]);
    const [page, setPage] = React.useState(1);
    const {
        wars,
        players,
        loading,
        error,
        currentPlayer,
        handleClanWarUpdated,
    } = useClanWarPageData();
    const sortedWars = wars.slice().sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    const allMyMatchGroups = currentPlayer
        ? formatClanWarMatchGroups(sortedWars, currentPlayer)
        : [];
    const statusFilteredMatchGroups = filterMyMatchGroups(allMyMatchGroups, filter);
    const myMatchGroups = filterMyMatchGroupsByFormat(statusFilteredMatchGroups, selectedFormat);
    const activeFormatGroup = myMatchGroups[0] || null;
    const pagination = paginateCollection(activeFormatGroup?.rows || [], page, MY_MATCHES_PAGE_SIZE);
    const paginatedMatchGroups = activeFormatGroup
        ? [{ ...activeFormatGroup, rows: pagination.items }]
        : [];
    const hasMatchesAtAll = allMyMatchGroups.length > 0;
    const hasMatchesAfterStatusFilter = statusFilteredMatchGroups.length > 0;

    React.useEffect(() => {
        setPage(1);
    }, [filter, selectedFormat]);

    React.useEffect(() => {
        if (page !== pagination.currentPage) setPage(pagination.currentPage);
    }, [page, pagination.currentPage]);

    if (error) return <div style={{ color: 'var(--color-error)', padding: 32, textAlign: 'center' }}>⚠ {error}</div>;

    return (
        <div className="animate-fade-in wow-section-page">
            <WoWSectionTitle>{t('cw.mode.my_matches')}</WoWSectionTitle>

            <div className="wow-filter-bar standings-controls" style={{ marginBottom: 18 }}>
                <div className="standings-controls-group standings-controls-group--filters">
                    {MY_MATCHES_FILTERS.map(f => (
                        <button
                            key={f.id}
                            className={`wow-btn${filter === f.id ? ' active' : ''}`}
                            onClick={() => setFilter(f.id)}
                        >
                            {t(f.key)}
                        </button>
                    ))}
                </div>
                <div className="standings-controls-group standings-controls-group--formats">
                    {MY_MATCHES_FORMAT_FILTERS.map(format => (
                        <button
                            key={format}
                            className={`wow-btn${selectedFormat === format ? ' active' : ''}`}
                            onClick={() => setSelectedFormat(format)}
                        >
                            {format}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="cw-list">
                    {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 64, marginBottom: 12, borderRadius: 'var(--radius-md)' }} />)}
                </div>
            ) : !currentPlayer ? (
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 48 }}>
                    {t('cw.my_matches.login_required')}
                </p>
            ) : myMatchGroups.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 48 }}>
                    {hasMatchesAtAll && hasMatchesAfterStatusFilter ? t('filters.no_results') : t('cw.my_matches.empty')}
                </p>
            ) : (
                <>
                    <div className="cw-list">
                        <MyClanWarGlobalTables
                            groups={paginatedMatchGroups}
                            players={players}
                            onClanWarUpdated={handleClanWarUpdated}
                        />
                    </div>
                    <PaginationControls page={pagination.currentPage} totalPages={pagination.totalPages} onPageChange={setPage} />
                </>
            )}
        </div>
    );
}
