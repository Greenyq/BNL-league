// Draft — система драфта клан-вара (пулл игроков по тирам, выбор капитанами)

// ── Карточка игрока в пуле ────────────────────────────────────────────────────
function DraftPlayerCard({ player, isPicked, isMyTurn, onPick, picking }) {
    const race    = player.mainRace || player.race;
    const stats   = player.stats;
    const portrait = player.selectedPortrait;

    const raceColor = { 1: '#a8d8ea', 2: '#ff7043', 4: '#66bb6a', 8: '#b0b0b0' };
    const raceAbbr  = { 0: 'Rnd', 1: 'Люди', 2: 'Орки', 4: 'Эльфы', 8: 'Нежить' };
    const raceImg   = { 1: '/images/human.jpg', 2: '/images/orc.jpg', 4: '/images/nightelf.jpg', 8: '/images/undead.jpg' };

    const mmr = stats?.mmr || player.currentMmr || player.mmr || 0;

    return (
        <div
            className={`draft-player-card${isPicked ? ' draft-picked' : ''}${isMyTurn && !isPicked ? ' draft-pickable' : ''}`}
            style={{
                opacity: isPicked ? 0.45 : 1,
                transition: 'all 0.25s ease',
                position: 'relative',
            }}
        >
            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
                {portrait ? (
                    <img src={portrait} alt={player.name} style={{
                        width: 44, height: 44, borderRadius: '50%', objectFit: 'cover',
                        border: '2px solid var(--color-accent-primary)',
                    }} />
                ) : (
                    <div style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: 'var(--color-bg-lighter)',
                        border: '2px solid rgba(212,175,55,0.2)',
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
                <div style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '0.92em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {player.name || player.battleTag?.split('#')[0]}
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
                    {available.length} {available.length === 1 ? 'игрок' : 'игроков'}
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
    const raceImg  = { 1: '/images/human.jpg', 2: '/images/orc.jpg', 4: '/images/nightelf.jpg', 8: '/images/undead.jpg' };

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
                <span style={{ color: 'var(--color-text-muted)', marginLeft: 4, fontSize: '0.85em' }}>Т{pick.tier}</span>
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

    const adminAction = async (action) => {
        const sid = adminSession;
        try {
            const res = await fetch(`/api/draft/${clanWarId}/${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-session-id': sid || '' },
            });
            const json = await res.json();
            if (!res.ok) alert(json.error || 'Failed');
            else fetchDraft();
        } catch (err) { alert(err.message); }
    };

    if (loading) return (
        <div style={{ padding: 40, textAlign: 'center' }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 60, marginBottom: 12, borderRadius: 8 }} />)}
        </div>
    );
    if (error) return <div style={{ color: 'var(--color-error)', padding: 32 }}>⚠ {error}</div>;
    if (!data)  return null;

    const { clanWar, draft, pool, currentTurn } = data;
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
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xl)', flexWrap: 'wrap' }}>
                    {draft?.status !== 'drafting' && draft?.status !== 'complete' && (
                        <button className="btn btn-primary" style={{ padding: '8px 18px', fontSize: '0.85em' }} onClick={() => adminAction('start')}>
                            {t('draft.start')}
                        </button>
                    )}
                    <button className="btn btn-secondary" style={{ padding: '8px 18px', fontSize: '0.85em' }} onClick={() => { if (confirm('Сбросить драфт?')) adminAction('reset'); }}>
                        {t('draft.reset')}
                    </button>
                    {draft?.status === 'drafting' && (
                        <button className="btn btn-secondary" style={{ padding: '8px 18px', fontSize: '0.85em', color: 'var(--color-warning)', borderColor: 'var(--color-warning)' }} onClick={() => { if (confirm('Завершить принудительно?')) adminAction('force-complete'); }}>
                            {t('draft.force_complete')}
                        </button>
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
                    <span>{currentTurn.team === 'a' ? nameA : nameB} — {t(currentTurn.team === 'a' ? 'draft.turn_a' : 'draft.turn_b')} (Тир {currentTurn.tier})</span>
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
                        {[0,1,2].map(i => (
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
                        {[0,1,2].map(i => (
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
                        ? 'Нажмите «Начать драфт» чтобы открыть пул игроков'
                        : 'Драфт ещё не начат. Ожидайте администратора.'}
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
