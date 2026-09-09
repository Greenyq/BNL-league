import React from 'react';
import { createActor } from 'xstate';
import { motion, AnimatePresence } from 'framer-motion';
import { gameMachine } from './gameMachine';

const ROUTES = [
    { id: 'upperC', tier: 'C', status: 'upper', wins: 'upperWins', d: 'M42 54 C154 40 270 66 338 142 C393 203 421 274 474 316', color: '#78d69b' },
    { id: 'lowerC', tier: 'C', status: 'lower', wins: 'lowerWins', d: 'M42 646 C154 652 275 625 350 566 C421 510 462 459 520 427', color: '#78d69b' },
    { id: 'upperB', tier: 'B', status: 'upper', wins: 'upperWins', d: 'M45 116 C125 118 178 150 188 215 C198 270 169 298 225 316 C305 342 392 313 474 316', color: '#76dceb' },
    { id: 'lowerB', tier: 'B', status: 'lower', wins: 'lowerWins', d: 'M45 585 C130 580 193 548 268 542 C338 536 381 552 432 518 C468 494 487 457 520 427', color: '#76dceb' },
    { id: 'upperA', tier: 'A', status: 'upper', wins: 'upperWins', d: 'M1155 116 C1075 118 1022 150 1012 215 C1002 270 1031 298 975 316 C895 342 808 313 726 316', color: '#df806a' },
    { id: 'lowerA', tier: 'A', status: 'lower', wins: 'lowerWins', d: 'M1155 585 C1070 580 1007 548 932 542 C862 536 819 552 768 518 C732 494 713 457 680 427', color: '#df806a' }
];

const DRAGON_BRANCH = 'M600 270 C600 224 600 178 600 130';
const DUNGEON_BRANCH = 'M600 430 C600 475 600 520 600 590';

function DragonMark() {
    return <svg viewBox="0 0 180 110" className="dnd-dragon"><path d="M92 54c24-39 54-43 78-38-19 9-25 23-27 38 12-8 24-9 35-5-14 8-24 20-29 36-18-16-34-20-49-13-4 19-20 30-43 29 14-8 19-18 16-30-21 8-39 5-55-9 20 2 35-5 46-19-13-5-23-14-29-27 22 4 39 14 52 29l5 9Z" /></svg>;
}

function EncounterOverlay({ snapshot, send, guardian }) {
    const dragon = snapshot.matches('dragon');
    const dungeon = snapshot.matches('dungeon');
    const reward = snapshot.matches('reward');
    if (!dragon && !dungeon && !reward) return null;

    return <AnimatePresence><motion.div className="dnd-encounter-shade" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <motion.section className="dnd-encounter-card" initial={{ opacity: 0, scale: .72, y: 55 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', damping: 18 }}>
            {dragon && <>
                <motion.div initial={{ x: 380, y: -180, rotate: 18 }} animate={{ x: 0, y: 0, rotate: 0 }} transition={{ duration: 1.1 }}><DragonMark /></motion.div>
                <small>DRAGON PLAYER AWAKENED</small><h3>{guardian || 'Hidden Player'}</h3>
                <p>Реальный участник временно становится Ancient Dragon. Победи его в BO3 и получи Arena Shield.</p>
                <div className="dnd-await-result">Ожидается официальный результат боя</div>
            </>}
            {dungeon && <>
                <div className="dnd-gate"><i /><span>ᛝ</span><i /></div><small>DUNGEON BOSS REVEALED</small><h3>{guardian || 'Hidden Player'}</h3>
                <div className="dnd-versus"><b>YOU</b><em>VS</em><b>{guardian || 'PLAYER'}</b></div>
                <p>Босс данжа — случайно выбранный реальный участник лиги.</p>
                <div className="dnd-await-result">Ожидается официальный результат боя</div>
            </>}
            {reward && <>
                <motion.div className="dnd-shield-large" initial={{ scale: 0, rotate: -25 }} animate={{ scale: 1, rotate: 0 }}>◆</motion.div>
                <small>LEGENDARY REWARD</small><h3>Shield of the Arena</h3>
                <p>Один раз защищает от вылета или потери трона только в центральной S-арене.</p>
                <button onClick={() => send({ type: 'CLOSE' })}>Забрать щит</button>
            </>}
            {!reward && <button className="dnd-close" onClick={() => send({ type: 'CLOSE' })}>×</button>}
        </motion.section>
    </motion.div></AnimatePresence>;
}

function PlayerPanel({ self, king, guardian, snapshot, onSafe, onMystery, onFind, pathError }) {
    const ctx = snapshot.context;
    const lower = self?.status === 'lower';
    const center = ['s_bracket', 'king'].includes(self?.status);
    const recordedWins = Number(lower ? self?.lowerWins : self?.upperWins) || 0;
    const wins = center ? 0 : Math.max(recordedWins, ctx.wins || 0);
    const recordedLosses = Number(lower ? self?.lowerLosses : self?.upperLosses) || 0;
    const losses = Math.max(recordedLosses, ctx.losses || 0);

    return <aside className="dnd-player-panel">
        <header><span className="dnd-panel-avatar">{self?.tier || 'B'}</span><div><small>PLAYER CAMPAIGN</small><h3>{self?.name || 'Guest Adventurer'}</h3><p>{center ? 'S Arena' : `Tier ${self?.tier || 'B'} · ${lower ? 'Lower' : 'Upper'} Bracket`}</p></div></header>
        <section><label>ROAD TO THE ARENA <b>{wins}/3</b></label><div className="dnd-runes">{[1, 2, 3].map(n => <i key={n} className={n <= wins ? 'is-lit' : ''} />)}</div></section>
        <div className="dnd-panel-stats"><span><small>LOSSES</small><b>{losses}/{lower ? 1 : 2}</b></span><span><small>WIN STREAK</small><b className="is-fire">🔥 ×{ctx.streak}</b></span></div>
        {snapshot.matches('choosingPath') ? <section className="dnd-panel-choice"><label>CHOOSE YOUR PATH</label>
            <button onClick={onSafe}><b>Safe Road</b><small>Следующая обычная дуэль</small></button>
            <button className="is-mystery" onClick={onMystery}><b>Mystery Road</b><small>Dragon Player или Dungeon Boss</small></button>
            {pathError && <p className="dnd-path-error">{pathError}</p>}
        </section> : snapshot.matches('waitingForAdmin') || self?.encounterStatus === 'awaiting_admin' ? <section className="dnd-next-battle is-locked"><label>MYSTERY ENCOUNTER</label><div><strong>{self?.name || 'YOU'}</strong><em>VS</em><strong>HIDDEN</strong></div><small>Админ откроет соперника, когда бой будет готов</small></section> : <section className="dnd-next-battle"><label>NEXT BATTLE</label><div><strong>{self?.name || 'YOU'}</strong><em>VS</em><strong>{guardian || 'TBD'}</strong></div><small>{center && king && king.showName ? `King: ${king.name}` : 'Official BO3 duel'}</small></section>}
        <section className={`dnd-panel-relic${ctx.arenaShield ? ' has-relic' : ''}`}><span>{ctx.arenaShield ? '◆' : '◇'}</span><div><label>{ctx.arenaShield ? 'ARENA SHIELD' : 'NO RELIC'}</label><small>{ctx.arenaShield ? '1 charge · S Arena only' : 'Win a special encounter'}</small></div></section>
        <button className="dnd-find-button" onClick={onFind}>⌖ Найти меня на карте</button>
    </aside>;
}

function MapToken({ player, x, y, king, focus, stackCount = 0, expanded = false, onToggle }) {
    const toggle = event => { event.stopPropagation(); if (onToggle) onToggle(); };
    return <motion.g className={onToggle ? 'dnd-token-clickable' : ''} initial={{ opacity: 0, scale: .65 }} animate={{ opacity: 1, scale: 1, x, y }} transition={{ type: 'spring', damping: 17, stiffness: 190 }} onClick={toggle}>
        <foreignObject x="-34" y="-34" width="92" height="88"><div role={onToggle ? 'button' : undefined} tabIndex={onToggle ? 0 : undefined} aria-label={stackCount > 1 ? `${stackCount} players in this position` : undefined} onKeyDown={event => { if (onToggle && (event.key === 'Enter' || event.key === ' ')) toggle(event); }} className={`dnd-map-token tier-${String(player.tier).toLowerCase()}${player.isSelf ? ' is-self' : ''}${king ? ' is-king' : ''}${player.isSelf && focus ? ' is-focus' : ''}`}><i style={{ backgroundImage: `url('/images/faction-tokens/${player.iconKey}.svg')` }} />{stackCount > 1 && !expanded && <b className="dnd-token-count">×{stackCount}</b>}{player.showName && <small>{player.name}</small>}</div></foreignObject>
    </motion.g>;
}

function fanOffset(index, total) {
    const ringIndex = Math.floor(index / 8);
    const ringSize = Math.min(8, total - ringIndex * 8);
    const angle = -Math.PI / 2 + (index % 8) * (Math.PI * 2 / ringSize);
    const radius = 54 + ringIndex * 40;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

function CampaignMap({ participants, snapshot, focus }) {
    const refs = React.useRef({});
    const [positions, setPositions] = React.useState([]);
    const [expandedClusters, setExpandedClusters] = React.useState(() => new Set());
    React.useLayoutEffect(() => {
        const next = [];
        for (const player of participants) {
            if (['s_bracket', 'king'].includes(player.status)) {
                next.push({ player, x: player.status === 'king' ? 600 : player.tier === 'S' ? 555 : 645, y: player.status === 'king' ? 292 : 370, king: player.status === 'king' });
                continue;
            }
            const route = ROUTES.find(r => r.tier === player.tier && r.status === player.status);
            const path = route && refs.current[route.id];
            if (!path) continue;
            const progress = Math.max(0, Math.min(3, Number(player[route.wins]) || 0));
            const point = path.getPointAtLength(path.getTotalLength() * (.08 + progress * .28));
            next.push({ player, x: point.x, y: point.y });
        }
        setPositions(next);
    }, [participants]);
    const clusters = React.useMemo(() => {
        const grouped = new Map();
        for (const position of positions) {
            const key = `${Math.round(position.x)}:${Math.round(position.y)}`;
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key).push(position);
        }
        return Array.from(grouped, ([id, players]) => ({
            id,
            players: players.sort((a, b) => Number(b.player.isSelf) - Number(a.player.isSelf)),
            x: players[0].x,
            y: players[0].y
        }));
    }, [positions]);
    const toggleCluster = id => setExpandedClusters(current => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });
    const mystery = snapshot.context.selectedPath === 'mystery';
    return <div className="dnd-map-stage"><svg viewBox="0 0 1200 675" className="dnd-campaign-svg">
        <image href="/images/stage2-dnd-map-v2.jpg" width="1200" height="675" preserveAspectRatio="xMidYMid slice" /><rect width="1200" height="675" className="dnd-map-vignette" />
        {ROUTES.map(r => <g key={r.id}><path ref={el => refs.current[r.id] = el} d={r.d} className="dnd-road-hit" /><path pathLength="100" d={r.d} className="dnd-road-runes" style={{ stroke: r.color }} /></g>)}
        <path d={DRAGON_BRANCH} className={`dnd-event-road${mystery ? ' is-active' : ''}`} /><path d={DUNGEON_BRANCH} className={`dnd-event-road${mystery ? ' is-active' : ''}`} />
        <g className="dnd-location-label"><text x="600" y="38" textAnchor="middle">DRAGON LAIR</text><text x="600" y="660" textAnchor="middle">DUNGEON</text></g>
        <g className="dnd-throne-label"><text x="600" y="345" textAnchor="middle">KING OF THE HILL</text></g>
        {clusters.flatMap(cluster => {
            const expanded = expandedClusters.has(cluster.id);
            const visible = expanded ? cluster.players : cluster.players.slice(0, 1);
            return visible.map((position, index) => {
                const offset = expanded && cluster.players.length > 1 ? fanOffset(index, cluster.players.length) : { x: 0, y: 0 };
                return <MapToken key={position.player.id} {...position} x={cluster.x + offset.x} y={cluster.y + offset.y} focus={focus} stackCount={cluster.players.length} expanded={expanded} onToggle={cluster.players.length > 1 ? () => toggleCluster(cluster.id) : undefined} />;
            });
        })}
    </svg></div>;
}

export function GameBoard({ participants = [], duels = [], viewer = {}, revealNames = false, onRevealNames }) {
    const self = participants.find(p => p.isSelf) || null;
    const king = participants.find(p => p.status === 'king');
    const initialWins = self?.status === 'lower' ? self?.lowerWins : self?.upperWins;
    const initialLosses = self?.status === 'lower' ? self?.lowerLosses : self?.upperLosses;
    const [actor] = React.useState(() => createActor(gameMachine, { input: { wins: initialWins || 0, losses: initialLosses || 0, streak: self?.winStreak || 0, status: self?.status, arenaShield: self?.arenaShield, mysteryUsed: self?.mysteryUsed } }).start());
    const [snapshot, setSnapshot] = React.useState(actor.getSnapshot());
    const [focus, setFocus] = React.useState(0);
    const [assignedEncounter, setAssignedEncounter] = React.useState(null);
    const [pathError, setPathError] = React.useState('');
    const previousServerState = React.useRef(null);
    React.useEffect(() => { const sub = actor.subscribe(setSnapshot); setSnapshot(actor.getSnapshot()); return () => sub.unsubscribe(); }, [actor]);
    React.useEffect(() => () => actor.stop(), [actor]);
    const send = event => actor.send(event);
    React.useEffect(() => { if (!snapshot.matches('moving') && !snapshot.matches('movingToMystery') && !snapshot.matches('defeat')) return; const id = setTimeout(() => send({ type: 'MOTION_DONE' }), 1300); return () => clearTimeout(id); }, [snapshot.value]);
    React.useEffect(() => { if (!snapshot.matches('revealing')) return; const id = setTimeout(() => send({ type: 'REVEAL', encounter: assignedEncounter?.type || 'dungeon' }), 600); return () => clearTimeout(id); }, [snapshot.value, assignedEncounter]);
    const serverWins = Number(self?.status === 'lower' ? self?.lowerWins : self?.upperWins) || 0;
    const serverLosses = Number(self?.status === 'lower' ? self?.lowerLosses : self?.upperLosses) || 0;
    React.useEffect(() => {
        if (!self) return;
        const current = { wins: serverWins, losses: serverLosses, streak: Number(self.winStreak) || 0, status: self.status, arenaShield: Boolean(self.arenaShield), mysteryUsed: Boolean(self.mysteryUsed) };
        const previous = previousServerState.current;
        previousServerState.current = current;
        if (self.encounterStatus === 'pending' && self.encounterType) {
            setAssignedEncounter({ type: self.encounterType, name: self.encounterOpponentName });
            send({ type: 'RESTORE_ENCOUNTER', encounter: self.encounterType });
            return;
        }
        if (!previous) {
            if (self.encounterStatus === 'awaiting_admin') {
                send({ type: 'RESTORE_WAIT' });
            } else if (self.specialMoveReady) send({ type: 'SERVER_RESULT', result: 'win', ...current });
            else send({ type: 'SYNC', ...current });
            return;
        }
        const won = current.wins > previous.wins || (current.status === 's_bracket' && previous.status !== 's_bracket' && current.losses <= previous.losses);
        const lost = current.losses > previous.losses || current.status === 'lower' && previous.status === 'upper' || current.status === 'eliminated' && previous.status !== 'eliminated';
        if (won || lost) send({ type: 'SERVER_RESULT', result: won ? 'win' : 'loss', ...current });
        else send({ type: 'SYNC', ...current });
    }, [self?.id, self?.status, serverWins, serverLosses, self?.winStreak, self?.arenaShield, self?.mysteryUsed, self?.specialMoveReady, self?.encounterStatus]);
    const officialOpponent = participants.find(p => p.isOpponent);
    const guardianName = assignedEncounter?.name || officialOpponent?.name;
    const choosePath = async path => {
        setPathError('');
        try {
            const playerSession = localStorage.getItem('bnl_player_session') || '';
            const adminSession = localStorage.getItem('bnl_admin_session') || '';
            const response = await fetch(`/api/duels/stage2/${self.id}/special-path`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(playerSession ? { 'x-player-session-id': playerSession } : {}), ...(adminSession ? { 'x-session-id': adminSession } : {}) }, body: JSON.stringify({ path }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Не удалось выбрать путь');
            if (data.encounterType) setAssignedEncounter({ type: data.encounterType, name: data.encounterOpponentName });
            send({ type: 'CHOOSE_PATH', path, revealNow: false });
        } catch (err) { setPathError(err.message); }
    };
    const findSelf = () => { setFocus(v => v + 1); setTimeout(() => setFocus(0), 1200); };

    return <div className="dnd-board-shell">
        <div className="dnd-board-heading"><div><small>BNL CAMPAIGN</small><h3>Road to the Frozen Throne</h3></div><div className="dnd-heading-actions">{viewer?.canRevealNames && <label className="dnd-admin-name-toggle"><input type="checkbox" checked={revealNames} onChange={event => onRevealNames?.(event.target.checked)} /><span>{revealNames ? 'Скрыть имена' : 'Показать имена'}</span></label>}<div className="dnd-live"><i /> LIVE TOURNAMENT</div></div></div>
        <div className={`dnd-campaign-layout${snapshot.matches('defeat') ? ' is-defeat' : ''}${!self ? ' is-spectator' : ''}`}><CampaignMap participants={participants} snapshot={snapshot} focus={focus} />{self ? <PlayerPanel self={self} king={king} guardian={guardianName} snapshot={snapshot} onSafe={() => choosePath('safe')} onMystery={() => choosePath('mystery')} onFind={findSelf} pathError={pathError} /> : <aside className="dnd-player-panel dnd-spectator-panel"><small>PLAYER CAMPAIGN</small><h3>Войдите в аккаунт</h3><p>После входа здесь появятся ваша статистика, следующий бой и выбор дороги.</p></aside>}</div>
        <AnimatePresence>{snapshot.matches('defeat') && <motion.div className="dnd-result-banner is-loss" initial={{ opacity: 0, scale: .8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}><b>DEFEAT</b><span>Серия побед сброшена</span></motion.div>}</AnimatePresence>
        <EncounterOverlay snapshot={snapshot} send={send} guardian={guardianName} />
    </div>;
}
