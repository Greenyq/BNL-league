import React from 'react';
import { createActor } from 'xstate';
import { motion, AnimatePresence } from 'framer-motion';
import { gameMachine } from './gameMachine';

const ROUTES = [
    { id: 'upperB', tier: 'B', status: 'upper', wins: 'upperWins', d: 'M38 116 C180 52 337 77 455 273', color: '#56d5e8' },
    { id: 'lowerB', tier: 'B', status: 'lower', wins: 'lowerWins', d: 'M32 562 C190 627 360 560 462 404', color: '#56d5e8' },
    { id: 'upperA', tier: 'A', status: 'upper', wins: 'upperWins', d: 'M1162 116 C1020 52 863 77 745 273', color: '#dd765f' },
    { id: 'lowerA', tier: 'A', status: 'lower', wins: 'lowerWins', d: 'M1168 562 C1010 627 840 560 738 404', color: '#dd765f' }
];

const DRAGON_BRANCH = 'M455 273 C486 190 526 114 600 67 C674 114 714 190 745 273';
const DUNGEON_BRANCH = 'M462 404 C500 492 540 560 600 620 C660 560 700 492 738 404';

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
                <button onClick={() => send({ type: 'ENCOUNTER_WON' })}>Симулировать победу</button>
            </>}
            {dungeon && <>
                <div className="dnd-gate"><i /><span>ᛝ</span><i /></div><small>DUNGEON BOSS REVEALED</small><h3>{guardian || 'Hidden Player'}</h3>
                <div className="dnd-versus"><b>YOU</b><em>VS</em><b>{guardian || 'PLAYER'}</b></div>
                <p>Босс данжа — случайно выбранный реальный участник лиги.</p>
                <button onClick={() => send({ type: 'ENCOUNTER_WON' })}>Симулировать победу</button>
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

function PlayerPanel({ self, king, guardian, snapshot, send, onMystery, onFind }) {
    const ctx = snapshot.context;
    const lower = self?.status === 'lower';
    const center = ['s_bracket', 'king'].includes(self?.status);
    const wins = center ? 0 : Number(lower ? self?.lowerWins : self?.upperWins) || ctx.wins || 0;
    const losses = Number(lower ? self?.lowerLosses : self?.upperLosses) || 0;

    return <aside className="dnd-player-panel">
        <header><span className="dnd-panel-avatar">{self?.tier || 'B'}</span><div><small>PLAYER CAMPAIGN</small><h3>{self?.name || 'Guest Adventurer'}</h3><p>{center ? 'S Arena' : `Tier ${self?.tier || 'B'} · ${lower ? 'Lower' : 'Upper'} Bracket`}</p></div></header>
        <section><label>ROAD TO THE ARENA <b>{wins}/3</b></label><div className="dnd-runes">{[1, 2, 3].map(n => <i key={n} className={n <= wins ? 'is-lit' : ''} />)}</div></section>
        <div className="dnd-panel-stats"><span><small>LOSSES</small><b>{losses}/{lower ? 1 : 2}</b></span><span><small>WIN STREAK</small><b className="is-fire">🔥 ×{ctx.streak}</b></span></div>
        {snapshot.matches('choosingPath') ? <section className="dnd-panel-choice"><label>CHOOSE YOUR PATH</label>
            <button onClick={() => send({ type: 'CHOOSE_PATH', path: 'safe' })}><b>Safe Road</b><small>Следующая обычная дуэль</small></button>
            <button className="is-mystery" onClick={onMystery}><b>Mystery Road</b><small>Dragon Player или Dungeon Boss</small></button>
        </section> : <section className="dnd-next-battle"><label>NEXT BATTLE</label><div><strong>{self?.name || 'YOU'}</strong><em>VS</em><strong>{guardian || 'TBD'}</strong></div><small>{center && king ? `King: ${king.name}` : 'Official BO3 duel'}</small></section>}
        <section className={`dnd-panel-relic${ctx.arenaShield ? ' has-relic' : ''}`}><span>{ctx.arenaShield ? '◆' : '◇'}</span><div><label>{ctx.arenaShield ? 'ARENA SHIELD' : 'NO RELIC'}</label><small>{ctx.arenaShield ? '1 charge · S Arena only' : 'Win a special encounter'}</small></div></section>
        <button className="dnd-find-button" onClick={onFind}>⌖ Найти меня на карте</button>
    </aside>;
}

function MapToken({ player, x, y, king, focus }) {
    return <motion.g initial={{ opacity: 0, scale: .65 }} animate={{ opacity: 1, scale: 1, x, y }} transition={{ type: 'spring', damping: 17 }}>
        <foreignObject x="-27" y="-27" width="80" height="76"><div className={`dnd-map-token tier-${String(player.tier).toLowerCase()}${player.isSelf ? ' is-self' : ''}${king ? ' is-king' : ''}${player.isSelf && focus ? ' is-focus' : ''}`}><i style={{ backgroundImage: `url('/images/faction-tokens/${player.iconKey}.svg')` }} />{player.showName && <small>{player.name}</small>}</div></foreignObject>
    </motion.g>;
}

function CampaignMap({ participants, snapshot, demo, focus }) {
    const refs = React.useRef({});
    const [positions, setPositions] = React.useState([]);
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
    const mystery = snapshot.context.selectedPath === 'mystery';
    return <div className="dnd-map-stage"><svg viewBox="0 0 1200 675" className="dnd-campaign-svg">
        <image href="/images/stage2-dnd-map-v2.jpg" width="1200" height="675" preserveAspectRatio="xMidYMid slice" /><rect width="1200" height="675" className="dnd-map-vignette" />
        {ROUTES.map(r => <g key={r.id}><path ref={el => refs.current[r.id] = el} d={r.d} className="dnd-road-shadow" /><path d={r.d} className="dnd-road" style={{ stroke: r.color }} /><path d={r.d} className="dnd-road-flow" style={{ stroke: r.color }} /></g>)}
        <path d={DRAGON_BRANCH} className={`dnd-event-road${mystery ? ' is-active' : ''}`} /><path d={DUNGEON_BRANCH} className={`dnd-event-road${mystery ? ' is-active' : ''}`} />
        <g className="dnd-location-label"><text x="600" y="38" textAnchor="middle">DRAGON LAIR</text><text x="600" y="660" textAnchor="middle">DUNGEON</text></g>
        <g className="dnd-throne-label"><text x="600" y="345" textAnchor="middle">KING OF THE HILL</text></g>
        {positions.map(p => <MapToken key={p.player.id} {...p} focus={focus} />)}
        {demo && snapshot.context.selectedPath && <motion.circle r="8" className="dnd-travel-orb" initial={{ cx: 360, cy: 170 }} animate={{ cx: snapshot.context.selectedPath === 'safe' ? 455 : 600, cy: snapshot.context.selectedPath === 'safe' ? 273 : snapshot.context.encounter === 'dungeon' ? 610 : 70 }} transition={{ duration: 1.25, ease: [.22, 1, .36, 1] }} />}
    </svg></div>;
}

export function GameBoard({ participants = [] }) {
    const demo = new URLSearchParams(location.search).get('dndDemo') === '1';
    const self = participants.find(p => p.isSelf) || participants[0];
    const king = participants.find(p => p.status === 'king');
    const [actor] = React.useState(() => createActor(gameMachine, { input: { wins: self?.status === 'lower' ? self.lowerWins : self?.upperWins || 0, streak: 0, arenaShield: self?.arenaShield } }).start());
    const [snapshot, setSnapshot] = React.useState(actor.getSnapshot());
    const [seed, setSeed] = React.useState(0);
    const [focus, setFocus] = React.useState(0);
    React.useEffect(() => { const sub = actor.subscribe(setSnapshot); setSnapshot(actor.getSnapshot()); return () => sub.unsubscribe(); }, [actor]);
    React.useEffect(() => () => actor.stop(), [actor]);
    const send = event => actor.send(event);
    React.useEffect(() => { if (!snapshot.matches('moving') && !snapshot.matches('movingToMystery')) return; const id = setTimeout(() => send({ type: 'MOTION_DONE' }), 1300); return () => clearTimeout(id); }, [snapshot.value]);
    React.useEffect(() => { if (!snapshot.matches('revealing')) return; const id = setTimeout(() => send({ type: 'REVEAL', encounter: seed % 2 ? 'dragon' : 'dungeon' }), 600); return () => clearTimeout(id); }, [snapshot.value, seed]);
    const candidates = participants.filter(p => p.id !== self?.id && p.status !== 'eliminated');
    const guardian = candidates[seed % Math.max(1, candidates.length)];
    const chooseMystery = () => { setSeed(v => v + 1); send({ type: 'CHOOSE_PATH', path: 'mystery' }); };
    const findSelf = () => { setFocus(v => v + 1); setTimeout(() => setFocus(0), 1200); };

    return <div className="dnd-board-shell">
        <div className="dnd-board-heading"><div><small>BNL CAMPAIGN</small><h3>Road to the Frozen Throne</h3></div><div className="dnd-live"><i /> LIVE TOURNAMENT</div></div>
        <div className="dnd-campaign-layout"><CampaignMap participants={participants} snapshot={snapshot} demo={demo} focus={focus} /><PlayerPanel self={self} king={king} guardian={guardian?.name} snapshot={snapshot} send={send} onMystery={chooseMystery} onFind={findSelf} /></div>
        {demo && <div className="dnd-demo-controls"><strong>Demo controls</strong><button onClick={() => send({ type: 'RESULT', result: 'win' })}>⚔ Победа</button><button onClick={() => send({ type: 'RESULT', result: 'loss' })}>☠ Поражение</button><span>Победы: {snapshot.context.wins}/3 · Streak: {snapshot.context.streak}</span></div>}
        <EncounterOverlay snapshot={snapshot} send={send} guardian={guardian?.name} />
    </div>;
}
