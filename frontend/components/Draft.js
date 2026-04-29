// Draft — система набора игроков: TeamRecruitView (набор в команду) + DraftView (клан-вар)
const tr = (ru, en) => getLang() === 'en' ? en : ru;

// ── Карточка игрока в пуле ────────────────────────────────────────────────────
function DraftPlayerCard({ player, isPicked, isMyTurn, onPick, picking }) {
    const race    = player.mainRace || player.race;
    const stats   = player.stats;
    const portrait = player.selectedPortrait;
    const isWinner = !!player.seasonWinner;

    const raceColor = { 1: '#a8d8ea', 2: '#ff7043', 4: '#66bb6a', 8: '#b0b0b0' };
    const raceAbbr  = { 0: 'Rnd', 1: tr('Люди', 'Human'), 2: tr('Орки', 'Orc'), 4: tr('Эльфы', 'Elves'), 8: tr('Нежить', 'Undead') };
    const raceImg   = { 0: '/images/random.svg', 1: '/images/human.jpg', 2: '/images/orc.jpg', 4: '/images/nightelf.jpg', 8: '/images/undead.jpg' };

    const mmr = stats?.mmr || player.currentMmr || player.mmr || 0;

    return (
        <div
            className={`draft-player-card${isPicked ? ' draft-picked' : ''}${isMyTurn && !isPicked ? ' draft-pickable' : ''}${isWinner ? ' season-winner-card' : ''}`}
            style={{
                opacity: isPicked ? 0.45 : 1,
                transition: 'all 0.25s ease',
                position: 'relative',
            }}
        >
            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
                {isWinner && (
                    <div className="season-winner-badge" title={tr(`Победитель сезона ${player.seasonWinner}`, `Season ${player.seasonWinner} winner`)}>🏆</div>
                )}
                {portrait ? (
                    <img src={portrait} alt={player.name} className={isWinner ? 'season-winner-avatar' : ''} style={{
                        width: 44, height: 44, borderRadius: '50%', objectFit: 'cover',
                        border: isWinner ? undefined : '2px solid var(--color-accent-primary)',
                    }} />
                ) : (
                    <div className={isWinner ? 'season-winner-avatar' : ''} style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: 'var(--color-bg-lighter)',
                        border: isWinner ? undefined : '2px solid rgba(212,175,55,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden',
                    }}>
                        {race && raceImg[race]
                            ? <img src={raceImg[race]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.75 }} />
                            : <span style={{ fontSize: '1.3em', color: 'var(--color-text-muted)' }}>👤</span>
                        }
                    </div>
                )}
                {race && raceImg[race] && portrait && (
                    <img src={raceImg[race]} alt="" style={{
                        position: 'absolute', bottom: -2, right: -2,
                        width: 16, height: 16, borderRadius: '50%', objectFit: 'cover',
                        border: '1.5px solid var(--color-bg-card, #1a1a2e)',
                    }} />
                )}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '0.92em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player.name || player.battleTag?.split('#')[0]}</span>
                    {isWinner && (
                        <span style={{ fontSize: '0.7em', background: 'rgba(255,215,0,0.15)', color: '#ffd700', border: '1px solid rgba(255,215,0,0.5)', borderRadius: 4, padding: '0 4px', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                            🏆 {tr(`С${player.seasonWinner}`, `S${player.seasonWinner}`)}
                        </span>
                    )}
                </div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.73em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {player.battleTag}
                    {race && raceAbbr[race] && (
                        <span style={{ marginLeft: 5, color: raceColor[race] || 'var(--color-text-muted)' }}>
                            · {raceAbbr[race]}
                        </span>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="team-player-stats" style={{ flexShrink: 0 }}>
                <div className="team-stat-cell">
                    <span className="team-stat-label">MMR</span>
                    <span className="team-stat-val" style={{ color: 'var(--color-accent-secondary)' }}>{mmr || '—'}</span>
                </div>
                {stats && <>
                    <div className="team-stat-cell">
                        <span className="team-stat-label">W</span>
                        <span className="team-stat-val" style={{ color: 'var(--color-success)' }}>{stats.wins}</span>
                    </div>
                    <div className="team-stat-cell">
                        <span className="team-stat-label">L</span>
                        <span className="team-stat-val" style={{ color: 'var(--color-error)' }}>{stats.losses}</span>
                    </div>
                    <div className="team-stat-cell">
                        <span className="team-stat-label">Pts</span>
                        <span className="team-stat-val" style={{ color: 'var(--color-accent-primary)', fontWeight: 800 }}>{stats.points}</span>
                    </div>
                </>}
            </div>

            {/* Picked badge OR Pick button */}
            {isPicked ? (
                <span className="draft-picked-badge">{t('draft.picked_badge')}</span>
            ) : isMyTurn ? (
                <button
                    className="btn btn-primary"
                    style={{ padding: '5px 14px', fontSize: '0.8em', flexShrink: 0 }}
                    onClick={() => onPick(player.id)}
                    disabled={picking}
                >
                    {picking ? '...' : t('draft.pick_btn')}
                </button>
            ) : null}
        </div>
    );
}

// ── Колонка тира ──────────────────────────────────────────────────────────────
function TierColumn({ tierNum, players, pickedIds, isMyTurn, onPick, picking }) {
    const tierKey   = `tier${tierNum}`;
    const ranges    = { 1: t('draft.tier1range'), 2: t('draft.tier2range'), 3: t('draft.tier3range') };
    const available = players.filter(p => !pickedIds.has(p.id?.toString()));

    return (
        <div className="draft-tier-col">
            <div className="draft-tier-header">
                <div style={{ fontWeight: 800, fontSize: '0.95em', letterSpacing: 1, textTransform: 'uppercase' }}>
                    {t(`draft.${tierKey}`)}
                </div>
                <div style={{ fontSize: '0.75em', color: 'var(--color-accent-secondary)', marginTop: 2 }}>
                    {ranges[tierNum]}
                </div>
                <div style={{ fontSize: '0.75em', color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {available.length} {available.length === 1 ? tr('игрок', 'player') : tr('игроков', 'players')}
                </div>
            </div>

            <div className="draft-tier-players">
                {players.length === 0 ? (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85em', textAlign: 'center', padding: '16px 0' }}>
                        {t('draft.no_players')}
                    </p>
                ) : (
                    players.map(p => (
                        <DraftPlayerCard
                            key={p.id}
                            player={p}
                            isPicked={pickedIds.has(p.id?.toString())}
                            isMyTurn={isMyTurn}
                            onPick={onPick}
                            picking={picking}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

// ── Слот капитана в шапке команды ─────────────────────────────────────────────
function CaptainSlot({ captain }) {
    if (!captain) return null;
    const raceImg = { 0: '/images/random.svg', 1: '/images/human.jpg', 2: '/images/orc.jpg', 4: '/images/nightelf.jpg', 8: '/images/undead.jpg' };
    const raceAbbr = { 0: 'Rnd', 1: tr('Люди', 'Human'), 2: tr('Орки', 'Orc'), 4: tr('Эльфы', 'Elves'), 8: tr('Нежить', 'Undead') };
    const race = captain.mainRace || captain.race;
    const portrait = captain.selectedPortrait;
    const mmr = captain.stats?.mmr || captain.currentMmr || captain.mmr || 0;
    const tierName = { 1: 'B', 2: 'A', 3: 'S' }[captain.tier] || '—';

    return (
        <div className="draft-pick-slot draft-pick-slot--filled" style={{
            background: 'rgba(212,175,55,0.1)',
            border: '1px solid rgba(212,175,55,0.35)',
        }}>
            {portrait ? (
                <img src={portrait} alt={captain.name} style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            ) : race && raceImg[race] ? (
                <img src={raceImg[race]} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', opacity: 0.8, flexShrink: 0 }} />
            ) : (
                <span style={{ fontSize: '1.1em', flexShrink: 0 }}>👤</span>
            )}
            <span style={{ fontWeight: 600, fontSize: '0.82em', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                👑 {captain.name || captain.battleTag?.split('#')[0]}
                <span style={{ color: 'var(--color-accent-secondary)', marginLeft: 4, fontSize: '0.85em' }}>{tierName}</span>
                <span style={{ color: 'var(--color-text-muted)', marginLeft: 4, fontSize: '0.8em' }}>{mmr}</span>
            </span>
        </div>
    );
}

// ── Слот выбранного игрока в шапке ────────────────────────────────────────────
function PickSlot({ pick, allPlayers }) {
    if (!pick) {
        return (
            <div className="draft-pick-slot draft-pick-slot--empty">
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8em' }}>{t('draft.empty_slot')}</span>
            </div>
        );
    }
    const player = allPlayers.find(p => p.id === pick.playerId?.toString() || p.id === pick.playerId);
    const name   = player?.name || pick.playerBattleTag?.split('#')[0] || '?';
    const portrait = player?.selectedPortrait;
    const race     = player?.mainRace || player?.race;
    const raceImg  = { 0: '/images/random.svg', 1: '/images/human.jpg', 2: '/images/orc.jpg', 4: '/images/nightelf.jpg', 8: '/images/undead.jpg' };

    return (
        <div className="draft-pick-slot draft-pick-slot--filled draft-pick-anim">
            {portrait ? (
                <img src={portrait} alt={name} style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            ) : race && raceImg[race] ? (
                <img src={raceImg[race]} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', opacity: 0.8, flexShrink: 0 }} />
            ) : (
                <span style={{ fontSize: '1.1em', flexShrink: 0 }}>👤</span>
            )}
            <span style={{ fontWeight: 600, fontSize: '0.82em', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {name}
                <span style={{ color: 'var(--color-text-muted)', marginLeft: 4, fontSize: '0.85em' }}>{{ 1: 'B', 2: 'A', 3: 'S' }[pick.tier] || pick.tier}</span>
            </span>
        </div>
    );
}

// ── Основной компонент драфта ─────────────────────────────────────────────────
function DraftView({ clanWarId, onBack }) {
    useLang();
    const [data,    setData]    = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error,   setError]   = React.useState(null);
    const [picking, setPicking] = React.useState(false);
    const [pickErr, setPickErr] = React.useState(null);
    const [allPlayers, setAllPlayers] = React.useState([]);

    // Admin session check
    const adminSession = localStorage.getItem('bnl_admin_session');
    const isAdmin = !!adminSession;

    // Player session for captain auth
    const playerSession = localStorage.getItem('bnl_player_session');

    const fetchDraft = () => {
        fetch(`/api/draft/${clanWarId}`)
            .then(r => r.json())
            .then(d => {
                if (d.error) { setError(d.error); setLoading(false); return; }
                setData(d);
                // Merge pool into allPlayers for slot lookup
                const poolAll = [...(d.pool?.tier1 || []), ...(d.pool?.tier2 || []), ...(d.pool?.tier3 || [])];
                setAllPlayers(poolAll);
                setLoading(false);
            })
            .catch(err => { setError(err.message); setLoading(false); });
    };

    // Also fetch ALL players for slot name lookup (picks reference players not in pool if already picked)
    React.useEffect(() => {
        fetch('/api/players')
            .then(r => r.json())
            .then(pl => setAllPlayers(Array.isArray(pl) ? pl : []))
            .catch(() => {});
    }, []);

    React.useEffect(() => {
        fetchDraft();
        const timer = setInterval(fetchDraft, 3000);
        return () => clearInterval(timer);
    }, [clanWarId]);

    const makePick = async (playerId) => {
        setPickErr(null); setPicking(true);
        try {
            const sid = playerSession;
            const res = await fetch(`/api/draft/${clanWarId}/pick`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-player-session-id': sid || '' },
                body: JSON.stringify({ playerId }),
            });
            const json = await res.json();
            if (!res.ok) { setPickErr(json.error || 'Pick failed'); }
            else { fetchDraft(); }
        } catch (err) { setPickErr(err.message); }
        setPicking(false);
    };

    // Tier order config for draft start
    const [showStartConfig, setShowStartConfig] = React.useState(false);
    const [tierOrderCfg, setTierOrderCfg] = React.useState({
        tier1: 'a', // who picks first in tier B
        tier2: 'b', // who picks first in tier A
        tier3: 'a', // who picks first in tier S
    });

    const adminAction = async (action, body) => {
        const sid = adminSession;
        try {
            const res = await fetch(`/api/draft/${clanWarId}/${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-session-id': sid || '' },
                body: body ? JSON.stringify(body) : undefined,
            });
            const json = await res.json();
            if (!res.ok) alert(json.error || 'Failed');
            else fetchDraft();
        } catch (err) { alert(err.message); }
    };

    const startDraft = () => {
        const tierOrder = {
            tier1: [tierOrderCfg.tier1, tierOrderCfg.tier1 === 'a' ? 'b' : 'a'],
            tier2: [tierOrderCfg.tier2, tierOrderCfg.tier2 === 'a' ? 'b' : 'a'],
            tier3: [tierOrderCfg.tier3, tierOrderCfg.tier3 === 'a' ? 'b' : 'a'],
        };
        adminAction('start', { tierOrder });
        setShowStartConfig(false);
    };

    if (loading) return (
        <div style={{ padding: 40, textAlign: 'center' }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 60, marginBottom: 12, borderRadius: 8 }} />)}
        </div>
    );
    if (error) return <div style={{ color: 'var(--color-error)', padding: 32 }}>⚠ {error}</div>;
    if (!data)  return null;

    const { clanWar, draft, pool, currentTurn, captains } = data;
    const nameA = clanWar.teamA?.name || 'Team A';
    const nameB = clanWar.teamB?.name || 'Team B';

    const pickedIds = new Set((draft?.picks || []).map(p => p.playerId?.toString()));

    // Picks per team
    const picksA = (draft?.picks || []).filter(p => p.team === 'a');
    const picksB = (draft?.picks || []).filter(p => p.team === 'b');

    // Determine if logged-in player is a captain and it's their turn
    const statusLabel = {
        pending:   t('draft.status_pending'),
        drafting:  t('draft.status_drafting'),
        complete:  t('draft.status_complete'),
    }[draft?.status] || draft?.status;

    return (
        <div className="animate-fade-in">
            {/* Back button + title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-xl)', flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" style={{ padding: '7px 16px', fontSize: '0.9em' }} onClick={onBack}>
                    {t('draft.back')}
                </button>
                <h2 style={{ margin: 0 }}>
                    {t('draft.title')} · <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75em' }}>{nameA} vs {nameB}</span>
                </h2>
                <span className={`cw-status ${draft?.status === 'drafting' ? 'status-ongoing' : draft?.status === 'complete' ? 'status-completed' : 'status-upcoming'}`}>
                    {statusLabel}
                </span>
            </div>

            {/* Admin controls */}
            {isAdmin && (
                <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                        {draft?.status !== 'drafting' && draft?.status !== 'complete' && (
                            <button className="btn btn-primary" style={{ padding: '8px 18px', fontSize: '0.85em' }} onClick={() => setShowStartConfig(true)}>
                                {t('draft.start')}
                            </button>
                        )}
                        <button className="btn btn-secondary" style={{ padding: '8px 18px', fontSize: '0.85em' }} onClick={() => { if (confirm(tr('Сбросить драфт?', 'Reset draft?'))) adminAction('reset'); }}>
                            {t('draft.reset')}
                        </button>
                        {draft?.status === 'drafting' && (
                            <button className="btn btn-secondary" style={{ padding: '8px 18px', fontSize: '0.85em', color: 'var(--color-warning)', borderColor: 'var(--color-warning)' }} onClick={() => { if (confirm(tr('Завершить принудительно?', 'Force complete?'))) adminAction('force-complete'); }}>
                                {t('draft.force_complete')}
                            </button>
                        )}
                    </div>

                    {/* Tier order config modal */}
                    {showStartConfig && (
                        <div className="card-elevated" style={{ padding: 'var(--spacing-xl)', maxWidth: 420, marginBottom: 'var(--spacing-md)' }}>
                            <h4 style={{ color: 'var(--color-accent-primary)', marginBottom: 'var(--spacing-md)' }}>
                                {tr('Порядок выбора по тирам', 'Tier pick order')}
                            </h4>
                            {[
                                { key: 'tier1', label: tr('Тир B (1000–1400)', 'Tier B (1000–1400)') },
                                { key: 'tier2', label: tr('Тир A (1400–1700)', 'Tier A (1400–1700)') },
                                { key: 'tier3', label: tr('Тир S (1700+)', 'Tier S (1700+)') },
                            ].map(t => (
                                <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9em', minWidth: 140 }}>{t.label}:</span>
                                    <select
                                        value={tierOrderCfg[t.key]}
                                        onChange={e => setTierOrderCfg(prev => ({ ...prev, [t.key]: e.target.value }))}
                                        style={{ background: 'var(--color-bg-lighter)', color: 'var(--color-text-primary)', border: '1px solid var(--color-bg-lighter)', borderRadius: 6, padding: '6px 10px' }}
                                    >
                                        <option value="a">{nameA} {tr('первая', 'first')}</option>
                                        <option value="b">{nameB} {tr('первая', 'first')}</option>
                                    </select>
                                </div>
                            ))}
                            <div style={{ display: 'flex', gap: 8, marginTop: 'var(--spacing-md)' }}>
                                <button className="btn btn-primary" style={{ padding: '8px 18px', fontSize: '0.85em' }} onClick={startDraft}>
                                    {tr('Начать драфт', 'Start draft')}
                                </button>
                                <button className="btn btn-secondary" style={{ padding: '8px 18px', fontSize: '0.85em' }} onClick={() => setShowStartConfig(false)}>
                                    {tr('Отмена', 'Cancel')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Current turn indicator */}
            {draft?.status === 'drafting' && currentTurn && (
                <div style={{
                    background: currentTurn.team === 'a' ? 'rgba(76,175,80,0.12)' : 'rgba(0,212,255,0.1)',
                    border: `1px solid ${currentTurn.team === 'a' ? 'var(--color-success)' : 'var(--color-accent-secondary)'}`,
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 18px',
                    marginBottom: 'var(--spacing-xl)',
                    fontWeight: 700,
                    fontSize: '0.95em',
                    color: currentTurn.team === 'a' ? 'var(--color-success)' : 'var(--color-accent-secondary)',
                    display: 'flex', alignItems: 'center', gap: 10,
                }}>
                    <span style={{ fontSize: '1.1em' }}>🟢</span>
                    <span>{currentTurn.team === 'a' ? nameA : nameB} — {t(currentTurn.team === 'a' ? 'draft.turn_a' : 'draft.turn_b')} ({tr('Тир', 'Tier')} {currentTurn.tier})</span>
                </div>
            )}
            {draft?.status === 'complete' && (
                <div style={{
                    background: 'rgba(212,175,55,0.12)',
                    border: '1px solid var(--color-accent-primary)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 18px',
                    marginBottom: 'var(--spacing-xl)',
                    fontWeight: 700,
                    fontSize: '0.95em',
                    color: 'var(--color-accent-primary)',
                }}>
                    🏆 {t('draft.complete_msg')}
                </div>
            )}

            {/* Teams picks row */}
            <div className="draft-teams-row">
                {/* Team A picks */}
                <div className="draft-team-picks">
                    <div className="draft-team-picks-header" style={{ color: 'var(--color-success)' }}>
                        {nameA}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <CaptainSlot captain={captains?.a} />
                        {[0,1].map(i => (
                            <PickSlot key={i} pick={picksA[i] || null} allPlayers={allPlayers} />
                        ))}
                    </div>
                </div>

                {/* Team B picks */}
                <div className="draft-team-picks">
                    <div className="draft-team-picks-header" style={{ color: 'var(--color-accent-secondary)' }}>
                        {nameB}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <CaptainSlot captain={captains?.b} />
                        {[0,1].map(i => (
                            <PickSlot key={i} pick={picksB[i] || null} allPlayers={allPlayers} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Pick error */}
            {pickErr && (
                <div style={{ background: 'rgba(244,67,54,0.1)', border: '1px solid var(--color-error)', borderRadius: 'var(--radius-sm)', padding: '10px 16px', color: 'var(--color-error)', marginBottom: 'var(--spacing-lg)', fontSize: '0.9em' }}>
                    ⚠ {pickErr}
                </div>
            )}

            {/* 3-column tier grid */}
            {draft?.status === 'pending' ? (
                <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 40 }}>
                    {isAdmin
                        ? tr('Нажмите «Начать драфт», чтобы открыть пул игроков', 'Click "Start draft" to open the player pool')
                        : tr('Драфт ещё не начат. Ожидайте администратора.', 'The draft has not started yet. Wait for the admin.')}
                </div>
            ) : (
                <div className="draft-tiers-grid">
                    {[1, 2, 3].map(tier => (
                        <TierColumn
                            key={tier}
                            tierNum={tier}
                            players={[...(pool[`tier${tier}`] || []), ...(draft?.picks || []).filter(p => p.tier === tier).map(pk => {
                                const found = allPlayers.find(p => p.id === pk.playerId?.toString());
                                return found || { id: pk.playerId?.toString(), battleTag: pk.playerBattleTag, name: pk.playerBattleTag?.split('#')[0], mmr: 0 };
                            })].filter((p, idx, arr) => arr.findIndex(x => x.id === p.id) === idx)}
                            pickedIds={pickedIds}
                            isMyTurn={draft?.status === 'drafting' && currentTurn?.tier === tier}
                            onPick={makePick}
                            picking={picking}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// TeamRecruitView — набор игроков в команду (не привязан к клан-вару)
// ══════════════════════════════════════════════════════════════════════════════
function TeamRecruitView({ teamId, teamName, captainId, onBack }) {
    useLang();
    const [allPlayers, setAllPlayers] = React.useState([]);
    const [loading,    setLoading]    = React.useState(true);
    const [assigning,  setAssigning]  = React.useState(null); // playerId being assigned
    const [removing,   setRemoving]   = React.useState(null); // playerId being removed
    const [error,      setError]      = React.useState(null);

    const isAdmin = !!localStorage.getItem('bnl_admin_session');
    const adminSid = localStorage.getItem('bnl_admin_session');

    const raceColor = { 1: '#a8d8ea', 2: '#ff7043', 4: '#66bb6a', 8: '#b0b0b0' };
    const raceAbbr  = race => ({
        0: 'Rnd',
        1: tr('Люди', 'Human'),
        2: tr('Орки', 'Orc'),
        4: tr('Эльфы', 'Elves'),
        8: tr('Нежить', 'Undead'),
    }[race] || 'Rnd');
    const raceImg   = { 0: '/images/random.svg', 1: '/images/human.jpg', 2: '/images/orc.jpg', 4: '/images/nightelf.jpg', 8: '/images/undead.jpg' };

    const load = () => {
        fetch('/api/players')
            .then(r => r.json())
            .then(pl => { setAllPlayers(Array.isArray(pl) ? pl : []); setLoading(false); })
            .catch(err => { setError(err.message); setLoading(false); });
    };

    React.useEffect(() => { load(); }, []);

    const adminFetch = (url, options = {}) =>
        fetch(url, {
            ...options,
            headers: { 'Content-Type': 'application/json', 'x-session-id': adminSid || '', ...(options.headers || {}) },
        }).then(async r => {
            const data = await r.json();
            if (!r.ok) throw new Error(data.error || r.statusText);
            return data;
        });

    const assignPlayer = async (playerId) => {
        setAssigning(playerId);
        try {
            await adminFetch(`/api/players/${playerId}`, { method: 'PUT', body: JSON.stringify({ teamId }) });
            load();
        } catch (err) { setError(err.message); }
        setAssigning(null);
    };

    const removePlayer = async (playerId) => {
        setRemoving(playerId);
        try {
            await adminFetch(`/api/players/${playerId}`, { method: 'PUT', body: JSON.stringify({ teamId: null }) });
            load();
        } catch (err) { setError(err.message); }
        setRemoving(null);
    };

    // Split players: roster (in this team, OR captain without teamId yet) vs pool
    const roster = allPlayers.filter(p =>
        p.teamId === teamId || (captainId && p.id === captainId && !p.teamId)
    );
    const pool = allPlayers.filter(p =>
        p.draftAvailable && !p.teamId && !(captainId && p.id === captainId)
    );

    // Group pool by tier using stats.mmr or currentMmr
    const mmrOf = p => p.stats?.mmr || p.currentMmr || 0;
    // Use tierOverride if set, otherwise MMR-based tier
    const effectiveTier = p => {
        if (p.tierOverride) return p.tierOverride;
        const m = mmrOf(p);
        if (m >= 1700) return 3;
        if (m >= 1400) return 2;
        if (m >= 1000) return 1;
        return 0;
    };
    const tiers = {
        1: pool.filter(p => effectiveTier(p) === 1),
        2: pool.filter(p => effectiveTier(p) === 2),
        3: pool.filter(p => effectiveTier(p) === 3),
        0: pool.filter(p => effectiveTier(p) === 0),
    };
    const tierLabels = {
        0: tr('Без тира (<1000)', 'No tier (<1000)'),
        1: tr('Тир B · 1000–1400', 'Tier B · 1000–1400'),
        2: tr('Тир A · 1400–1700', 'Tier A · 1400–1700'),
        3: tr('Тир S · 1700+', 'Tier S · 1700+'),
    };

    const PlayerMini = ({ p, action, actionLabel, busy, actionTone }) => {
        const race = p.mainRace || p.race;
        const portrait = p.selectedPortrait;
        const stats = p.stats;
        return (
            <div className="draft-player-card" style={{ opacity: busy ? 0.6 : 1 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    {portrait
                        ? <img src={portrait} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-accent-primary)' }} />
                        : <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--color-bg-lighter)', border: '2px solid rgba(212,175,55,0.2)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {race && raceImg[race]
                                ? <img src={raceImg[race]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.75 }} />
                                : <span style={{ fontSize: '1em', color: 'var(--color-text-muted)' }}>👤</span>}
                          </div>
                    }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '0.9em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name || p.battleTag?.split('#')[0]}
                    </div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.72em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.battleTag}
                        {race && raceAbbr(race) && <span style={{ marginLeft: 5, color: raceColor[race] }}>· {raceAbbr(race)}</span>}
                    </div>
                </div>
                <div className="team-player-stats" style={{ flexShrink: 0 }}>
                    <div className="team-stat-cell">
                        <span className="team-stat-label">MMR</span>
                        <span className="team-stat-val" style={{ color: 'var(--color-accent-secondary)' }}>{mmrOf(p) || '—'}</span>
                    </div>
                    {stats && <>
                        <div className="team-stat-cell">
                            <span className="team-stat-label">W</span>
                            <span className="team-stat-val" style={{ color: 'var(--color-success)' }}>{stats.wins}</span>
                        </div>
                        <div className="team-stat-cell">
                            <span className="team-stat-label">L</span>
                            <span className="team-stat-val" style={{ color: 'var(--color-error)' }}>{stats.losses}</span>
                        </div>
                    </>}
                </div>
                {isAdmin && (
                    <button
                        onClick={action}
                        disabled={busy}
                        style={{
                            padding: '4px 12px', fontSize: '0.8em', borderRadius: 4, cursor: 'pointer', fontWeight: 700, flexShrink: 0,
                            background: actionTone === 'add' ? 'rgba(76,175,80,0.15)' : 'rgba(244,67,54,0.12)',
                            color: actionTone === 'add' ? 'var(--color-success)' : 'var(--color-error)',
                            border: `1px solid ${actionTone === 'add' ? 'var(--color-success)' : 'rgba(244,67,54,0.4)'}`,
                        }}
                    >
                        {busy ? '...' : actionLabel}
                    </button>
                )}
            </div>
        );
    };

    if (loading) return (
        <div style={{ padding: 40 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 56, marginBottom: 10, borderRadius: 8 }} />)}
        </div>
    );

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-xl)', flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" style={{ padding: '7px 16px', fontSize: '0.9em' }} onClick={onBack}>
                    ← {tr('Назад', 'Back')}
                </button>
                <h2 style={{ margin: 0 }}>
                    ⚔ {tr('Набор', 'Recruit')} &nbsp;<span style={{ color: 'var(--color-text-muted)', fontSize: '0.75em' }}>{teamName}</span>
                </h2>
                {!isAdmin && (
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85em' }}>
                        {tr('Только администратор может добавлять игроков', 'Only the admin can add players')}
                    </span>
                )}
            </div>

            {error && (
                <div style={{ background: 'rgba(244,67,54,0.1)', border: '1px solid var(--color-error)', borderRadius: 'var(--radius-sm)', padding: '10px 16px', color: 'var(--color-error)', marginBottom: 'var(--spacing-lg)', fontSize: '0.9em' }}>
                    ⚠ {error} <button onClick={() => setError(null)} style={{ marginLeft: 8, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-xl)' }}>

                {/* ── Текущий состав ── */}
                <div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75em', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 'var(--spacing-md)' }}>
                        🛡 {tr('Состав команды', 'Team roster')} ({roster.length})
                    </div>
                    <div className="draft-tier-col" style={{ padding: 'var(--spacing-sm)' }}>
                        {roster.length === 0
                            ? <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85em', textAlign: 'center', padding: 16 }}>{tr('Нет игроков', 'No players')}</p>
                            : roster.map(p => (
                                <PlayerMini
                                    key={p.id}
                                    p={p}
                                    action={() => removePlayer(p.id)}
                                    actionLabel={tr('− Убрать', '− Remove')}
                                    actionTone="remove"
                                    busy={removing === p.id}
                                />
                            ))
                        }
                    </div>
                </div>

                {/* ── Пул доступных игроков ── */}
                <div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75em', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 'var(--spacing-md)' }}>
                        👥 {tr('Доступны для набора', 'Available to recruit')} ({pool.length})
                    </div>
                    {pool.length === 0 ? (
                        <div className="draft-tier-col" style={{ padding: 'var(--spacing-lg)', textAlign: 'center' }}>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88em' }}>
                                {tr('Нет доступных игроков.', 'No available players.')}<br />
                                {tr('Включите игрокам «⚔ Драфт» в', 'Enable "⚔ Draft" for players in')}&nbsp;
                                <strong>{tr('Админ', 'Admin')} → {tr('Игроки', 'Players')}</strong>.
                            </p>
                        </div>
                    ) : (
                        [3, 2, 1, 0].filter(tier => tiers[tier].length > 0).map(tier => (
                            <div key={tier} style={{ marginBottom: 'var(--spacing-md)' }}>
                                <div style={{ fontSize: '0.78em', color: 'var(--color-accent-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                                    {tierLabels[tier]}
                                </div>
                                <div className="draft-tier-col" style={{ padding: 'var(--spacing-xs)' }}>
                                    {tiers[tier].map(p => (
                                        <PlayerMini
                                            key={p.id}
                                            p={p}
                                            action={() => assignPlayer(p.id)}
                                            actionLabel={tr('+ Добавить', '+ Add')}
                                            actionTone="add"
                                            busy={assigning === p.id}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

        </div>
    );
}
