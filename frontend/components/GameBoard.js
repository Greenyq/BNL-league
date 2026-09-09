import React from 'react';
import { createActor } from 'xstate';
import { motion, AnimatePresence } from 'framer-motion';
import { gameMachine } from './gameMachine';

const ROUTES = [
    { id:'upperB', tier:'B', status:'upper', wins:'upperWins', d:'M82 108 C205 72 320 82 410 118 C492 151 555 151 600 188', color:'#45ddff' },
    { id:'lowerB', tier:'B', status:'lower', wins:'lowerWins', d:'M92 542 C215 510 342 520 448 493 C520 474 568 447 600 408', color:'#45ddff' },
    { id:'upperA', tier:'A', status:'upper', wins:'upperWins', d:'M1118 108 C995 72 880 82 790 118 C708 151 645 151 600 188', color:'#ff6949' },
    { id:'lowerA', tier:'A', status:'lower', wins:'lowerWins', d:'M1108 542 C985 510 858 520 752 493 C680 474 632 447 600 408', color:'#ff6949' }
];

function DragonMark() {
    return <svg viewBox="0 0 180 110" className="dnd-dragon" aria-hidden="true"><path d="M92 54c24-39 54-43 78-38-19 9-25 23-27 38 12-8 24-9 35-5-14 8-24 20-29 36-18-16-34-20-49-13-4 19-20 30-43 29 14-8 19-18 16-30-21 8-39 5-55-9 20 2 35-5 46-19-13-5-23-14-29-27 22 4 39 14 52 29l5 9Z"/><circle cx="112" cy="46" r="3"/></svg>;
}

function Portal({ active }) {
    return <motion.g className={`dnd-portal${active ? ' is-active' : ''}`} animate={{ rotate: active ? 360 : 0 }} transition={{ duration:8, repeat:Infinity, ease:'linear' }} style={{ transformOrigin:'600px 338px' }}>
        <circle cx="600" cy="338" r="91" className="dnd-portal-halo"/>
        <circle cx="600" cy="338" r="76" className="dnd-portal-ring" strokeDasharray="7 13"/>
        {[0,45,90,135,180,225,270,315].map(angle => {
            const rad = angle * Math.PI / 180;
            return <circle key={angle} cx={600 + Math.cos(rad)*76} cy={338 + Math.sin(rad)*76} r="3.5" className="dnd-portal-rune"/>;
        })}
    </motion.g>;
}

function EncounterOverlay({ snapshot, send, guardian }) {
    const dragon = snapshot.matches('dragon');
    const dungeon = snapshot.matches('dungeon');
    const reward = snapshot.matches('reward');
    if (!dragon && !dungeon && !reward) return null;
    return <AnimatePresence><motion.div className="dnd-encounter-shade" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
        <motion.section className={`dnd-encounter-card ${dragon ? 'is-dragon' : dungeon ? 'is-dungeon' : 'is-reward'}`} initial={{opacity:0, scale:.72, y:55}} animate={{opacity:1, scale:1, y:0}} transition={{type:'spring', damping:18}}>
            {dragon && <><motion.div initial={{x:380,y:-180,rotate:18}} animate={{x:0,y:0,rotate:0}} transition={{duration:1.1}}><DragonMark/></motion.div><small>ELITE ENCOUNTER</small><h3>Ancient Dragon</h3><p>Победи избранного Dragon Champion и получи защиту для центральной арены.</p><button onClick={() => send({type:'ENCOUNTER_WON'})}>Симулировать победу</button></>}
            {dungeon && <><div className="dnd-gate"><i/><span>ᛝ</span><i/></div><small>DUNGEON ENCOUNTER</small><h3>Хранитель подземелья</h3><div className="dnd-versus"><b>YOU</b><em>VS</em><b>{guardian || 'MYSTERY PLAYER'}</b></div><p>Роль хранителя временно получает реальный игрок Tier A/B/S.</p><button onClick={() => send({type:'ENCOUNTER_WON'})}>Симулировать победу</button></>}
            {reward && <><motion.div className="dnd-shield-large" initial={{scale:0,rotate:-25}} animate={{scale:1,rotate:0}}>◆</motion.div><small>LEGENDARY REWARD</small><h3>Shield of the Arena</h3><p>Один раз защищает от вылета или потери трона только в центральной арене.</p><button onClick={() => send({type:'CLOSE'})}>Забрать щит</button></>}
            {!reward && <button className="dnd-close" onClick={() => send({type:'CLOSE'})}>×</button>}
        </motion.section>
    </motion.div></AnimatePresence>;
}

export function GameBoard({ participants = [], viewer = {}, revealNames = false, onRevealNames, legacy }) {
    const demo = new URLSearchParams(location.search).get('dndDemo') === '1';
    const self = participants.find(player => player.isSelf);
    const [actor] = React.useState(() => createActor(gameMachine, { input:{
        wins: self?.status === 'lower' ? self.lowerWins : self?.upperWins || 0,
        streak: 0,
        arenaShield: self?.arenaShield
    } }).start());
    const [snapshot, setSnapshot] = React.useState(actor.getSnapshot());
    const [encounterSeed, setEncounterSeed] = React.useState(0);
    React.useEffect(() => {
        const subscription = actor.subscribe(setSnapshot);
        setSnapshot(actor.getSnapshot());
        return () => subscription.unsubscribe();
    }, [actor]);
    React.useEffect(() => () => actor.stop(), [actor]);
    const send = event => actor.send(event);
    const mysteryActive = snapshot.matches('movingToMystery') || snapshot.matches('revealing');
    React.useEffect(() => {
        if (!snapshot.matches('revealing')) return;
        const id = setTimeout(() => send({ type:'REVEAL', encounter: encounterSeed % 2 ? 'dragon' : 'dungeon' }), 650);
        return () => clearTimeout(id);
    }, [snapshot.value, encounterSeed]);
    React.useEffect(() => {
        if (!snapshot.matches('moving')) return;
        const id = setTimeout(() => send({ type:'MOTION_DONE' }), 900);
        return () => clearTimeout(id);
    }, [snapshot.value]);

    const actualPlayers = participants.filter(p => ['upper','lower','s_bracket','king'].includes(p.status));
    const guardians = actualPlayers.filter(p => !p.isSelf);
    const guardian = guardians[encounterSeed % Math.max(1, guardians.length)]?.name;
    return <div className="dnd-board-shell">
        <div className="dnd-board-heading"><div><small>BNL CAMPAIGN</small><h3>Road to the Frozen Throne</h3></div><div className="dnd-relic">{snapshot.context.arenaShield ? <><span>◆</span><b>ARENA SHIELD</b><small>1 charge</small></> : <><span className="is-empty">◇</span><b>NO RELIC</b><small>Win an encounter</small></>}</div></div>
        <div className="dnd-board-map">
            {legacy}
            <svg className="dnd-board-effects" viewBox="0 0 1200 675" aria-hidden="true">
                <Portal active={mysteryActive || snapshot.context.arenaShield}/>
                {ROUTES.map(route => <path key={route.id} d={route.d} className="dnd-route-sheen" style={{stroke:route.color}}/>)}
                <motion.g animate={{x: mysteryActive ? 76 : 0, y: mysteryActive ? 34 : 0}} transition={{duration:1.15,ease:[.22,1,.36,1]}} onAnimationComplete={() => mysteryActive && send({type:'MOTION_DONE'})}>
                    {demo && <g transform="translate(348 78)"><circle r="22" className="dnd-demo-token-ring"/><circle r="16" className="dnd-demo-token"/><text y="4" textAnchor="middle">YOU</text></g>}
                </motion.g>
                {snapshot.matches('choosingPath') && <g className="dnd-fork-beacon"><circle cx="430" cy="120" r="25"/><text x="430" y="126" textAnchor="middle">?</text></g>}
            </svg>
            <AnimatePresence>{snapshot.matches('choosingPath') && <motion.aside className="dnd-choice-panel" initial={{opacity:0,x:35}} animate={{opacity:1,x:0}} exit={{opacity:0,x:35}}>
                <small>WIN STREAK ×{snapshot.context.streak}</small><h4>Выбери свой путь</h4>
                <button onClick={() => send({type:'CHOOSE_PATH',path:'safe'})}><b>Безопасная дорога</b><span>Обычная следующая дуэль</span></button>
                <button className="is-mystery" onClick={() => {setEncounterSeed(v=>v+1);send({type:'CHOOSE_PATH',path:'mystery'});}}><b>Таинственная тропа</b><span>Скрытая встреча и артефакт</span></button>
            </motion.aside>}</AnimatePresence>
        </div>
        {demo && <div className="dnd-demo-controls"><strong>Demo controls</strong><button onClick={() => send({type:'RESULT',result:'win'})}>⚔ Победа</button><button onClick={() => send({type:'RESULT',result:'loss'})}>☠ Поражение</button><span>Победы: {snapshot.context.wins}/3 · Streak: {snapshot.context.streak}</span></div>}
        <EncounterOverlay snapshot={snapshot} send={send} guardian={guardian}/>
    </div>;
}
