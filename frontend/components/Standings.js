// Standings — таблица рейтинга игроков + рейтинг команд по клан-варам

const RACE_KEYS   = [null, 1, 2, 4, 8];
const RACE_IMG    = { 0: '/images/random.svg', 1: '/images/human.jpg', 2: '/images/orc.jpg', 4: '/images/nightelf.jpg', 8: '/images/undead.jpg' };
const PLAYERS_PAGE_SIZE = 10;
const TEAMS_PAGE_SIZE = 10;
const DRAFT_POOL_PAGE_SIZE = 10;
const TIER_LABELS = { 0: '-', 1: 'C', 2: 'B', 3: 'A', 4: 'S' };
const TIER_CLASSES = { 0: 'u', 1: 'c', 2: 'b', 3: 'a', 4: 's' };
const tr = (ru, en) => getLang() === 'en' ? en : ru;
const rankClass   = i => i === 0 ? 'top-1' : i === 1 ? 'top-2' : i === 2 ? 'top-3' : '';
const rankIcon    = i => i === 0 ? 'I' : i === 1 ? 'II' : i === 2 ? 'III' : i + 1;
const playerRace  = player => player?.mainRace ?? player?.race ?? null;
const tierLabel = tier => TIER_LABELS[Number(tier) || 0] || '-';
const tierClass = tier => TIER_CLASSES[Number(tier) || 0] || 'u';
const achievementPreview = achievements => (Array.isArray(achievements) ? achievements : []).slice(0, 3);
const ACHIEVEMENTS = {
    winStreak3: { points: 30, ru: 'Серия побед x3', en: 'Win streak x3', ruDesc: '3 победы подряд.', enDesc: 'Win 3 matches in a row.' },
    winStreak5: { points: 50, ru: 'Серия побед x5', en: 'Win streak x5', ruDesc: '5 побед подряд.', enDesc: 'Win 5 matches in a row.' },
    winStreak10: { points: 100, ru: 'Серия побед x10', en: 'Win streak x10', ruDesc: '10 побед подряд.', enDesc: 'Win 10 matches in a row.' },
    winStreak15: { points: 150, ru: 'Серия побед x15', en: 'Win streak x15', ruDesc: '15 побед подряд.', enDesc: 'Win 15 matches in a row.' },
    loseStreak3: { points: 10, ru: 'Упорство x3', en: 'Resilience x3', ruDesc: '3 поражения подряд.', enDesc: 'Lose 3 matches in a row.' },
    loseStreak10: { points: 25, ru: 'Упорство x10', en: 'Resilience x10', ruDesc: '10 поражений подряд.', enDesc: 'Lose 10 matches in a row.' },
    giantSlayer: { points: 25, ru: 'Охотник на гигантов', en: 'Giant slayer', ruDesc: 'Победа над соперником с MMR выше на 50+.', enDesc: 'Beat an opponent with 50+ higher MMR.' },
    titanSlayer: { points: 50, ru: 'Убийца титанов', en: 'Titan slayer', ruDesc: 'Победа над соперником с MMR выше на 100+.', enDesc: 'Beat an opponent with 100+ higher MMR.' },
    davidVsGoliath: { points: 100, ru: 'Давид против Голиафа', en: 'David vs Goliath', ruDesc: 'Победа над соперником с MMR выше на 200+.', enDesc: 'Beat an opponent with 200+ higher MMR.' },
    warrior: { points: 30, ru: 'Воин', en: 'Warrior', ruDesc: '50 побед за сезон.', enDesc: 'Win 50 matches in the season.' },
    centurion: { points: 50, ru: 'Центурион', en: 'Centurion', ruDesc: '100 побед за сезон.', enDesc: 'Win 100 matches in the season.' },
    centurionSupreme: { points: 80, ru: 'Верховный центурион', en: 'Supreme centurion', ruDesc: '200 побед за сезон.', enDesc: 'Win 200 matches in the season.' },
    noMercy: { points: 40, ru: 'Без пощады', en: 'No mercy', ruDesc: '50 побед за сезон.', enDesc: 'Win 50 matches in the season.' },
    gladiator: { points: 20, ru: 'Гладиатор', en: 'Gladiator', ruDesc: '10 побед за сезон.', enDesc: 'Win 10 matches in the season.' },
    perfectWeek: { points: 50, ru: 'Идеальная неделя', en: 'Perfect week', ruDesc: '20 побед за сезон.', enDesc: 'Win 20 matches in the season.' },
    goldRush: { points: 30, ru: 'Золотая гонка', en: 'Gold rush', ruDesc: '1000 очков за сезон.', enDesc: 'Reach 1000 season points.' },
    platinumRush: { points: 60, ru: 'Платиновая гонка', en: 'Platinum rush', ruDesc: '2000 очков за сезон.', enDesc: 'Reach 2000 season points.' },
    comeback: { points: 20, ru: 'Камбэк', en: 'Comeback', ruDesc: 'Победа после серии из 3+ поражений.', enDesc: 'Win after a streak of 3+ losses.' },
    persistent: { points: 40, ru: 'Несломленный', en: 'Persistent', ruDesc: '5 побед после серии из 5 поражений.', enDesc: 'Win 5 after a streak of 5 losses.' },
    veteran: { points: 35, ru: 'Ветеран', en: 'Veteran', ruDesc: '500 игр за сезон.', enDesc: 'Play 500 matches in the season.' },
    marathonRunner: { points: 30, ru: 'Марафонец', en: 'Marathon runner', ruDesc: '100 игр за сезон.', enDesc: 'Play 100 matches in the season.' },
    mmrMillionaire: { points: 50, ru: 'MMR миллионер', en: 'MMR millionaire', ruDesc: 'Достичь 2000 MMR.', enDesc: 'Reach 2000 MMR.' },
    eliteWarrior: { points: 100, ru: 'Элитный воин', en: 'Elite warrior', ruDesc: 'Достичь 2200 MMR.', enDesc: 'Reach 2200 MMR.' },
    bnlRobber: { points: 30, ru: 'BNL грабитель', en: 'BNL robber', ruDesc: 'Победа против игрока из BNL.', enDesc: 'Beat a BNL player.' },
    bnlVictim: { points: -10, ru: 'Жертва BNL', en: 'BNL victim', ruDesc: 'Поражение от игрока из BNL.', enDesc: 'Lose to a BNL player.' },
    bnlRivalry: { points: 25, ru: 'BNL соперник', en: 'BNL rivalry', ruDesc: '5 побед против игроков из BNL.', enDesc: 'Win 5 matches against BNL players.' },
    bnlDominator: { points: 60, ru: 'BNL доминатор', en: 'BNL dominator', ruDesc: '10 побед против игроков из BNL.', enDesc: 'Win 10 matches against BNL players.' },
};

const achievementInfo = key => ACHIEVEMENTS[key] || { points: 0, ru: key, en: key, ruDesc: key, enDesc: key };
const achievementTitle = key => {
    const info = achievementInfo(key);
    return tr(info.ru, info.en);
};
const achievementDescription = key => {
    const info = achievementInfo(key);
    return tr(info.ruDesc, info.enDesc);
};
const achievementPointLabel = key => {
    const points = achievementInfo(key).points || 0;
    return `${points > 0 ? '+' : ''}${points} ${tr('очков', 'pts')}`;
};
const groupAchievements = achievements => {
    const counts = new Map();
    (Array.isArray(achievements) ? achievements : []).forEach(key => counts.set(key, (counts.get(key) || 0) + 1));
    return [...counts.entries()].map(([key, count]) => ({ key, count }));
};

function getStandingsTeamCaptain(team, players) {
    return (players || []).find(player => player.id === team?.captainId) || null;
}

function getStandingsTeamRosterPlayers(team, players) {
    const rosterById = new Map();
    (players || [])
        .filter(player => player.teamId === team?.id || player.id === team?.captainId)
        .forEach(player => rosterById.set(player.id, player));
    return [...rosterById.values()];
}

function AchievementPills({ achievements, onOpen }) {
    const list = Array.isArray(achievements) ? achievements : [];
    if (!list.length) {
        return <span className="achievement-pill achievement-pill--empty">{tr('Нет ачивок', 'No achievements')}</span>;
    }

    return (
        <>
            {achievementPreview(list).map((key, index) => (
                <button
                    key={`${key}-${index}`}
                    type="button"
                    className="achievement-pill achievement-pill--button"
                    title={`${achievementTitle(key)} · ${achievementPointLabel(key)}`}
                    onClick={() => onOpen(list)}
                >
                    {achievementTitle(key)}
                </button>
            ))}
            {list.length > 3 && (
                <button
                    type="button"
                    className="achievement-pill achievement-pill--more achievement-pill--button"
                    onClick={() => onOpen(list)}
                >
                    +{list.length - 3}
                </button>
            )}
        </>
    );
}

function AchievementModal({ row, onClose }) {
    React.useEffect(() => {
        if (!row) return undefined;
        const onKeyDown = event => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [row, onClose]);

    if (!row) return null;

    const achievements = Array.isArray(row.achievements) ? row.achievements : [];
    const grouped = groupAchievements(achievements);
    const totalBonus = achievements.reduce((sum, key) => sum + (achievementInfo(key).points || 0), 0);
    const playerName = row.player?.name || row.player?.battleTag || tr('Игрок', 'Player');

    return (
        <div className="achievement-modal-overlay" onClick={onClose}>
            <div className="achievement-modal" role="dialog" aria-modal="true" aria-label={tr('Ачивки игрока', 'Player achievements')} onClick={event => event.stopPropagation()}>
                <div className="achievement-modal-header">
                    <div>
                        <div className="achievement-modal-kicker">{tr('Ачивки', 'Achievements')}</div>
                        <h3>{playerName}</h3>
                    </div>
                    <button type="button" className="achievement-modal-close" onClick={onClose} aria-label={tr('Закрыть', 'Close')}>×</button>
                </div>
                <div className="achievement-modal-summary">
                    <span>{achievements.length} {tr('всего', 'total')}</span>
                    <span>{totalBonus > 0 ? '+' : ''}{totalBonus} {tr('очков', 'pts')}</span>
                </div>
                <div className="achievement-modal-list">
                    {grouped.map(({ key, count }) => (
                        <div key={key} className="achievement-modal-item">
                            <div className="achievement-modal-item-main">
                                <div className="achievement-modal-title">
                                    {achievementTitle(key)}
                                    {count > 1 && <span className="achievement-count">×{count}</span>}
                                </div>
                                <div className="achievement-modal-desc">{achievementDescription(key)}</div>
                            </div>
                            <div className="achievement-modal-points">{achievementPointLabel(key)}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function PlayerStandingsMobileCard({ row, index, onOpenAchievements, mode = 'ladder' }) {
    const race = row.race ?? playerRace(row.player);
    const portrait = row.player.selectedPortrait;
    const raceImg = race != null ? RACE_IMG[race] : null;
    const avatarSrc = portrait || raceImg || null;
    const isWinner = !!row.player.seasonWinner;

    return (
        <div className={`standings-mobile-card${isWinner ? ' season-winner-card' : ''}${row.tierPromoted ? ' tier-promoted-card' : ''}`}>
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
                    <span className={`standings-mobile-pill tier-pill tier-pill--${tierClass(row.tier)}`}>
                        {tierLabel(row.tier)}
                    </span>
                    {mode === 'ladder' && <span className="standings-mobile-pill">
                        {race != null ? t(`race.${race}`) : '—'}
                    </span>}
                    {mode === 'ladder' && row.tierPromoted && (
                        <span className="standings-mobile-pill tier-promotion-pill">
                            {tr('Повышение', 'Promoted')}
                        </span>
                    )}
                </div>
                <div className="standings-mobile-stats">
                    {mode === 'ladder' && <div className="standings-mobile-stat">
                        <span className="standings-mobile-stat-label">{t('standings.mmr')}</span>
                        <span className="standings-mobile-stat-value standings-mobile-stat-value--mmr">{row.mmr ?? '—'}</span>
                    </div>}
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
                        <span className="standings-mobile-stat-value standings-mobile-stat-value--points">
                            <span className="points-pill points-pill--compact">{row.points ?? 0}</span>
                        </span>
                    </div>
                </div>
                {mode === 'ladder' && <div className="standings-achievements-row">
                    <AchievementPills achievements={row.achievements} onOpen={() => onOpenAchievements(row)} />
                </div>}
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

function Stage2Arena({ participants }) {
    const [expanded, setExpanded] = React.useState(false);
    const arenaRef = React.useRef(null);
    const panRef = React.useRef(null);
    React.useEffect(() => {
        if (!expanded) return undefined;
        const previousOverflow = document.body.style.overflow;
        const closeOnEscape = event => { if (event.key === 'Escape') setExpanded(false); };
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [expanded]);
    React.useEffect(() => {
        if (!expanded || !arenaRef.current) return;
        const arena = arenaRef.current;
        arena.scrollLeft = Math.max(0, (arena.scrollWidth - arena.clientWidth) / 2);
        arena.scrollTop = Math.max(0, (arena.scrollHeight - arena.clientHeight) / 2);
    }, [expanded]);
    const startPan = event => {
        if (!expanded || event.button !== 0) return;
        const arena = arenaRef.current;
        panRef.current = { x: event.clientX, y: event.clientY, left: arena.scrollLeft, top: arena.scrollTop };
        arena.setPointerCapture(event.pointerId);
        arena.classList.add('is-panning');
    };
    const movePan = event => {
        if (!panRef.current || !arenaRef.current) return;
        arenaRef.current.scrollLeft = panRef.current.left - (event.clientX - panRef.current.x);
        arenaRef.current.scrollTop = panRef.current.top - (event.clientY - panRef.current.y);
    };
    const stopPan = event => {
        if (!panRef.current) return;
        panRef.current = null;
        arenaRef.current?.classList.remove('is-panning');
        if (arenaRef.current?.hasPointerCapture(event.pointerId)) arenaRef.current.releasePointerCapture(event.pointerId);
    };
    const groups = {
        upperB: participants.filter(p => p.tier === 'B' && p.status === 'upper'),
        upperA: participants.filter(p => p.tier === 'A' && p.status === 'upper'),
        lowerA: participants.filter(p => p.tier === 'A' && p.status === 'lower'),
        lowerB: participants.filter(p => p.tier === 'B' && p.status === 'lower'),
        center: participants.filter(p => ['s_bracket', 'king'].includes(p.status)),
        eliminated: participants.filter(p => p.status === 'eliminated')
    };
    const pathRefs = React.useRef({});
    const [pieces, setPieces] = React.useState([]);
    const paths = [
        { id: 'upperB', list: groups.upperB, wins: 'upperWins', tier: 'B', bracket: 'upper', d: 'M82 108 C205 72 320 82 410 118 C492 151 555 151 600 188' },
        { id: 'lowerB', list: groups.lowerB, wins: 'lowerWins', tier: 'B', bracket: 'lower', d: 'M92 542 C215 510 342 520 448 493 C520 474 568 447 600 408' },
        { id: 'upperA', list: groups.upperA, wins: 'upperWins', tier: 'A', bracket: 'upper', d: 'M1118 108 C995 72 880 82 790 118 C708 151 645 151 600 188' },
        { id: 'lowerA', list: groups.lowerA, wins: 'lowerWins', tier: 'A', bracket: 'lower', d: 'M1108 542 C985 510 858 520 752 493 C680 474 632 447 600 408' }
    ];
    React.useLayoutEffect(() => {
        const next = [];
        for (const route of paths) {
            const path = pathRefs.current[route.id];
            if (!path) continue;
            const length = path.getTotalLength();
            for (let step = 0; step < 3; step++) {
                const bucket = route.list.filter(player => Math.min(2, Number(player[route.wins]) || 0) === step);
                const visible = bucket.slice(0, 4);
                const fraction = Math.min(3, Math.max(0, step)) / 3;
                const point = path.getPointAtLength(length * fraction);
                const nearby = path.getPointAtLength(Math.min(length, length * fraction + 4));
                const dx = nearby.x - point.x, dy = nearby.y - point.y;
                const magnitude = Math.hypot(dx, dy) || 1;
                const nx = -dy / magnitude, ny = dx / magnitude;
                visible.forEach((player, index) => {
                    const spread = (index - (visible.length - 1) / 2) * 44;
                    next.push({ id: player.id, player, x: point.x + nx * spread, y: point.y + ny * spread, wins: step, route });
                });
                if (bucket.length > visible.length) next.push({ id: `more-${route.id}-${step}`, count: bucket.length - visible.length, x: point.x + nx * 78, y: point.y + ny * 78, route });
            }
        }
        const centerVisible = groups.center.slice(0, 7);
        const centerSlots = [[480, 315], [720, 315], [455, 370], [745, 370], [500, 430], [700, 430]];
        let slotIndex = 0;
        centerVisible.forEach(player => {
            const [x, y] = player.status === 'king' ? [600, 202] : centerSlots[slotIndex++] || [600, 470];
            next.push({ id: player.id, player, x, y, center: true });
        });
        if (groups.center.length > centerVisible.length) next.push({ id: 'more-center', count: groups.center.length - centerVisible.length, x: 600, y: 470, center: true });
        setPieces(next);
    }, [participants]);

    const renderPiece = piece => <g key={piece.id} className="stage2-svg-piece" style={{ transform: `translate(${piece.x}px, ${piece.y}px)` }}>
        <foreignObject x="-66" y="-32" width="132" height="53">
            {piece.count ? <div className="stage2-map-overflow">+{piece.count}</div> : <div className={`stage2-map-card stage2-map-card--${String(piece.player.tier).toLowerCase()}${piece.player.status === 'king' ? ' is-king' : ''}${piece.route?.bracket === 'lower' ? ' is-lower' : ''}${piece.center ? ' is-center' : ''}`}>
                <span className="stage2-piece-token">{piece.player.status === 'king' ? '♛' : piece.player.tier}</span>
                <span className="stage2-piece-name">{piece.player.name}</span>
                {!piece.center && <span className="stage2-rune-progress" aria-label={`${piece.wins}/3`}>
                    {[0, 1, 2].map(rune => <i key={rune} className={rune < piece.wins ? 'is-lit' : ''} />)}
                </span>}
            </div>}
        </foreignObject>
    </g>;
    return <div
        className={`stage2-arena-wrap${expanded ? ' is-expanded' : ''}`}
        onClick={event => {
            if (expanded && event.target === event.currentTarget) setExpanded(false);
        }}
    >
        <button type="button" className="stage2-expand-button" aria-expanded={expanded} onClick={event => { event.stopPropagation(); setExpanded(value => !value); }}>
            {expanded ? `× ${tr('Закрыть', 'Close')}` : `⛶ ${tr('Развернуть карту', 'Expand map')}`}
        </button>
        <div
            ref={arenaRef}
            className="stage2-arena"
            onClick={() => { if (!expanded) setExpanded(true); }}
            onPointerDown={startPan}
            onPointerMove={movePan}
            onPointerUp={stopPan}
            onPointerCancel={stopPan}
            onPointerLeave={stopPan}
        >
            <svg className="stage2-map-svg" viewBox="0 0 1200 675" role="img" aria-label={tr('Карта второго этапа', 'Stage 2 tournament map')}>
                <defs>
                    <filter id="stage2-glow"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                    <radialGradient id="stage2-arena-glow"><stop offset="0" stopColor="#ffe08a" stopOpacity=".28"/><stop offset="1" stopColor="#1a2430" stopOpacity=".05"/></radialGradient>
                </defs>
                <image href="/images/stage2-fantasy-map.jpg" x="0" y="0" width="1200" height="675" preserveAspectRatio="xMidYMid meet" />
                <rect className="stage2-map-vignette" x="0" y="0" width="1200" height="675" />
                <circle cx="600" cy="338" r="104" fill="url(#stage2-arena-glow)" className="stage2-svg-arena-aura"/>
                {paths.map(route => <g key={route.id} className={`stage2-svg-route stage2-svg-route--${route.tier.toLowerCase()} stage2-svg-route--${route.bracket}`}>
                    <path ref={node => { pathRefs.current[route.id] = node; }} d={route.d} className="stage2-svg-road-shadow"/>
                    <path d={route.d} className="stage2-svg-road"/>
                    <path d={route.d} className="stage2-svg-road-flow"/>
                </g>)}
                <text x="250" y="42" className="stage2-svg-label stage2-svg-label--b">{tr('ВЕРХНЯЯ СЕТКА B', 'TIER B — UPPER')}</text>
                <text x="250" y="632" className="stage2-svg-label stage2-svg-label--b">{tr('НИЖНЯЯ СЕТКА B', 'TIER B — LOWER')}</text>
                <text x="950" y="42" className="stage2-svg-label stage2-svg-label--a">{tr('ВЕРХНЯЯ СЕТКА A', 'TIER A — UPPER')}</text>
                <text x="950" y="632" className="stage2-svg-label stage2-svg-label--a">{tr('НИЖНЯЯ СЕТКА A', 'TIER A — LOWER')}</text>
                <g className="stage2-svg-pieces">{pieces.map(renderPiece)}</g>
            </svg>
        </div>
        {!!groups.eliminated.length && <div className="stage2-eliminated"><strong>{tr('Вылетели', 'Eliminated')}:</strong> {groups.eliminated.map(p => p.name).join(', ')}</div>}
    </div>;
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

function splitClanWarSide(value) {
    return String(value || '')
        .split(' + ')
        .map(name => name.trim())
        .filter(Boolean);
}

function playerClanWarAliases(player) {
    return getPlayerSearchAliases(player).map(normalizeSearchText).filter(Boolean);
}

function sideHasClanWarPlayer(sideValue, player) {
    const aliases = playerClanWarAliases(player);
    return splitClanWarSide(sideValue).some(name => {
        const normalized = normalizeSearchText(name);
        const battleName = normalizeSearchText(getBattleTagName(name));
        return aliases.includes(normalized) || aliases.includes(battleName);
    });
}

function calculatePlayerClanWarStats(player, wars) {
    return (wars || []).reduce((stats, cw) => {
        for (const match of (cw.matches || [])) {
            if (match.winner !== 'a' && match.winner !== 'b') continue;
            const onA = sideHasClanWarPlayer(match.playerA, player);
            const onB = sideHasClanWarPlayer(match.playerB, player);
            if (!onA && !onB) continue;
            if ((onA && match.winner === 'a') || (onB && match.winner === 'b')) stats.wins += 1;
            else stats.losses += 1;
        }
        return stats;
    }, { wins: 0, losses: 0, points: 0 });
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
            Promise.resolve([]),
            Promise.resolve([]),
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
        const rosterPlayers = getStandingsTeamRosterPlayers(team, players);
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
        const captain = getStandingsTeamCaptain(team, players);
        const roster  = rosterPlayers.length;
        const matchesPlayer = !playerFilterNeedle
            || matchesPlayerSearch(captain, playerFilterNeedle)
            || rosterPlayers.some(player => matchesPlayerSearch(player, playerFilterNeedle));
        return { team, wins, losses, matchWins, matchLosses, played: myWars.length, captain, roster, matchesPlayer };
    })
    .filter(row => row.matchesPlayer)
    // Sort: clan war wins desc, then match wins desc
    .sort((a, b) => b.wins - a.wins || b.matchWins - a.matchWins || a.losses - b.losses || String(a.team.name || '').localeCompare(String(b.team.name || '')));
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
        if (p.stats?.tier != null) return p.stats.tier;
        const mmr = p.stats?.mmr || p.currentMmr || 0;
        if (mmr >= 1800) return 4;
        if (mmr >= 1500) return 3;
        if (mmr >= 1200) return 2;
        if (mmr >= 800)  return 1;
        return 0;
    }

    const draftRows = filteredDraftPlayers
        .map(player => {
            const tier = getEffectiveTier(player);
            const mmr = player.stats?.mmr ?? player.currentMmr ?? null;
            return {
                player,
                tier,
                tierClass: tierClass(tier),
                tierLabel: tierLabel(tier),
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
    const [mode,       setMode]       = React.useState('ladder');
    const [players,    setPlayers]    = React.useState([]);
    const [duels,      setDuels]      = React.useState([]);
    const [stage2,     setStage2]     = React.useState([]);
    const [wars,       setWars]       = React.useState([]);
    const [loading,    setLoading]    = React.useState(true);
    const [error,      setError]      = React.useState(null);
    const [raceFilter, setRaceFilter] = React.useState(null);
    const [playerFilter, setPlayerFilter] = React.useState('');
    const [pages,      setPages]      = React.useState({ players: 1 });
    const [achievementRow, setAchievementRow] = React.useState(null);
    const playerFilterNeedle = normalizeSearchText(playerFilter);

    React.useEffect(() => {
        let active = true;
        const loadStandings = (initial = false) => Promise.all([
            fetch('/api/players').then(r => r.json()),
            fetch('/api/duels').then(r => r.json()),
            fetch('/api/duels/stage2').then(r => r.json()),
        ])
            .then(([pl, duelData, stage2Data]) => {
                if (!active) return;
                setPlayers(Array.isArray(pl) ? pl : []);
                setDuels(Array.isArray(duelData) ? duelData : []);
                setStage2(Array.isArray(stage2Data) ? stage2Data : []);
                if (initial) setLoading(false);
            })
            .catch(err  => { if (active && initial) { setError(err.message); setLoading(false); } });
        loadStandings(true);
        const refresh = setInterval(() => loadStandings(false), 10000);
        return () => { active = false; clearInterval(refresh); };
    }, []);

    const duelStats = duels.reduce((map, duel) => {
        for (const side of ['A', 'B']) {
            const entry = duel[`player${side}`];
            if (!entry?.battleTag) continue;
            const key = entry.battleTag.toLowerCase();
            const current = map[key] || { wins: 0, losses: 0, points: 0, matches: 0 };
            current.points += Number(entry.points) || 0;
            current.matches++;
            if (duel.winner === side) current.wins++; else current.losses++;
            map[key] = current;
        }
        return map;
    }, {});
    for (const participant of stage2) {
        const progressWins = participant.status === 'lower' ? participant.lowerWins : participant.status === 'upper' ? participant.upperWins : 0;
        duelStats[(participant.battleTag || '').toLowerCase()] = {
            wins: progressWins,
            losses: (Number(participant.upperLosses) || 0) + (Number(participant.lowerLosses) || 0),
            points: progressWins,
            matches: progressWins,
            status: participant.status || 'qualifier'
        };
    }

    // Build independent rows for Stage 1 (ladder) and Stage 2 (duels).
    const rows = players
    .filter(player => matchesPlayerSearch(player, playerFilterNeedle))
    .flatMap(p => {
        const s = p.stats;
        const ds = duelStats[(p.battleTag || '').toLowerCase()] || { wins: 0, losses: 0, points: 0, matches: 0 };
        if (raceFilter !== null) {
            const raceStat = (s?.raceStats || []).find(r => Number(r.race) === Number(raceFilter));
            const playerRaceValue = playerRace(p);
            if (!raceStat && playerRaceValue !== raceFilter) return [];
            return [{
                player: p,
                race: raceFilter,
                points: mode === 'duels' ? ds.points : (raceStat?.points ?? 0),
                ladderPoints: raceStat?.points ?? 0,
                duelPoints: ds.points,
                mmr: raceStat?.mmr ?? s?.mmr ?? p.currentMmr ?? null,
                tier: raceStat?.tier ?? s?.tier ?? 0,
                achievements: mode === 'duels' ? [] : (raceStat?.achievements ?? []),
                wins: mode === 'duels' ? ds.wins : (raceStat?.wins ?? 0),
                losses: mode === 'duels' ? ds.losses : (raceStat?.losses ?? 0),
                duelMatches: ds.matches,
                stage2Status: ds.status,
                tierPromoted: !!s?.tierPromoted
            }];
        }
        const primaryRace = playerRace(p);
        const primaryRaceStat = (s?.raceStats || []).find(r => primaryRace != null && Number(r.race) === Number(primaryRace));
        return [{
            player: p,
            race: primaryRace,
            wins: mode === 'duels' ? ds.wins : (s?.wins ?? 0),
            losses: mode === 'duels' ? ds.losses : (s?.losses ?? 0),
            points: mode === 'duels' ? ds.points : (s?.ladderPoints ?? 0),
            ladderPoints: s?.ladderPoints ?? 0,
            duelPoints: s?.duelPoints ?? 0,
            mmr: s?.mmr ?? p.currentMmr ?? null,
            tier: s?.tier ?? 0,
            achievements: mode === 'duels' ? [] : (primaryRaceStat?.achievements ?? (s?.raceStats || []).flatMap(r => r.achievements || [])),
            duelMatches: ds.matches,
            stage2Status: ds.status,
            tierPromoted: !!s?.tierPromoted
        }];
    })
    .sort((a, b) => b.points - a.points || b.wins - a.wins || (b.mmr ?? 0) - (a.mmr ?? 0) || a.losses - b.losses);
    const pagedPlayers = paginateCollection(rows, pages.players, PLAYERS_PAGE_SIZE);

    const setModePage = (key, value) => {
        setPages(prev => prev[key] === value ? prev : { ...prev, [key]: value });
    };

    React.useEffect(() => {
        setModePage('players', 1);
    }, [raceFilter, mode]);

    React.useEffect(() => {
        setPages(prev => (
            prev.players === 1
                ? prev
                : { players: 1 }
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
                {mode === 'ladder' && (
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
                <div className="standings-controls-group standings-controls-group--modes">
                    <button className={`wow-btn${mode === 'ladder' ? ' active' : ''}`} onClick={() => setMode('ladder')}>{tr('Этап 1 — Ладдер', 'Stage 1 — Ladder')}</button>
                    <button className={`wow-btn${mode === 'duels' ? ' active' : ''}`} onClick={() => { setMode('duels'); setRaceFilter(null); }}>{tr('Этап 2 — Дуэли', 'Stage 2 — Duels')}</button>
                </div>
            </div>

            {(
                <>

                    {mode === 'duels' && <Stage2Arena participants={stage2} />}

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
                            <div className={`standings-desktop-only standings-table-wrap${mode === 'ladder' ? ' stage1-table-hidden' : ''}`}>
                                <table className="standings-table">
                                    <thead>
                                        <tr>
                                            <th>{t('standings.rank')}</th>
                                            <th>{t('standings.player')}</th>
                                            {mode === 'ladder' && <th>{t('standings.race')}</th>}
                                            <th>{tr('Тир', 'Tier')}</th>
                                            {mode === 'ladder' && <th>{t('standings.mmr')}</th>}
                                            <th>{t('standings.wins')}</th>
                                            <th>{t('standings.losses')}</th>
                                            <th>{mode === 'duels' ? tr('Прогресс', 'Progress') : t('standings.points')}</th>
                                            {mode === 'duels' && <th>{tr('Дуэлей', 'Duels')}</th>}
                                            {mode === 'ladder' && <th>{tr('Ачивки', 'Achievements')}</th>}
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
                                                <tr key={`${row.player.battleTag}-${row.race}`} className={row.tierPromoted ? 'tier-promoted-row' : ''}>
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
                                                    {mode === 'ladder' && <td style={{ color: 'var(--color-text-muted)' }}>
                                                        {row.race !== null ? t(`race.${row.race}`) : '—'}
                                                    </td>}
                                                    <td>
                                                        <span className={`tier-pill tier-pill--${tierClass(row.tier)}`}>{tierLabel(row.tier)}</span>
                                                        {row.tierPromoted && <span className="tier-promotion-pill">{tr('Повышение', 'Promoted')}</span>}
                                                    </td>
                                                    {mode === 'ladder' && <td style={{ color: 'var(--color-accent-secondary)', fontWeight: 600 }}>
                                                        {row.mmr ?? '—'}
                                                    </td>}
                                                    <td className="col-wins">{row.wins}</td>
                                                    <td className="col-losses">{row.losses}</td>
                                                    <td className="col-points">
                                                        <span className="points-pill">
                                                            {mode === 'duels' ? `${row.points || 0}/3` : (row.points ?? 0)}
                                                        </span>
                                                    </td>
                                                    {mode === 'duels' && <td>{({ qualifier: tr('Квалификация', 'Qualifier'), upper: tr('Верхняя', 'Upper'), lower: tr('Нижняя', 'Lower'), king: tr('Царь горы', 'King of the Hill'), s_bracket: tr('Сетка S', 'S bracket'), eliminated: tr('Вылетел', 'Eliminated') })[row.stage2Status] || '—'}</td>}
                                                    {mode === 'ladder' && <td className="col-achievements">
                                                        <AchievementPills achievements={row.achievements} onOpen={() => setAchievementRow(row)} />
                                                    </td>}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className={mode === 'ladder' ? 'standings-card-grid' : 'standings-mobile-list standings-mobile-only'}>
                                {pagedPlayers.items.map((row, i) => {
                                    const rank = (pagedPlayers.currentPage - 1) * PLAYERS_PAGE_SIZE + i;
                                    return <PlayerStandingsMobileCard key={`${row.player.battleTag}-${row.race}`} row={row} index={rank} mode={mode} onOpenAchievements={setAchievementRow} />;
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
            <AchievementModal row={achievementRow} onClose={() => setAchievementRow(null)} />
        </div>
    );
}
