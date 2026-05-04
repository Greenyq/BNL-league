// BNL League — app entry point (JSX via Babel CDN)
// Хэш-роутинг / Hash routing: /#home, /#standings, /#teams, /#clanwar, /#maps, /#profile, /#admin

const TABS = [
    { id: 'home',      labelKey: 'nav.home' },
    { id: 'standings', labelKey: 'nav.standings' },
    { id: 'teams',     labelKey: 'nav.teams' },
    { id: 'clanwar',   labelKey: 'nav.clanwar' },
    { id: 'maps',      labelKey: 'nav.maps' },
    { id: 'profile',   labelKey: 'nav.profile' },
    { id: 'admin',     labelKey: 'nav.admin' },
];

function getTabFromHash() {
    const hash = window.location.hash.replace('#', '') || 'home';
    return TABS.find(t => t.id === hash) ? hash : 'home';
}

// ── Главная страница / Home page ──────────────────────────────────────────────
function HomePage() {
    useLang();
    var steps = [
        { titleKey: 'hero.how1_title', descKey: 'hero.how1_desc', icon: '/images/wow/icon-3.png' },
        { titleKey: 'hero.how2_title', descKey: 'hero.how2_desc', icon: '/images/wow/icon-2.png' },
        { titleKey: 'hero.how3_title', descKey: 'hero.how3_desc', icon: '/images/wow/icon-7.png' },
        { titleKey: 'hero.how4_title', descKey: 'hero.how4_desc', icon: '/images/wow/icon-6.png' },
    ];
    return (
        <div className="animate-fade-in">
            <WoWSectionTitle>{t('hero.how_title')}</WoWSectionTitle>
            <div className="play-block">
                <ul>
                    {steps.map(function(step) {
                        return (
                            <li key={step.titleKey}>
                                <img src={step.icon} alt="" />
                                <p>{t(step.titleKey)}</p>
                                <div className="step-desc">{t(step.descKey)}</div>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}

function WoWSectionTitle({ children }) {
    const slot = document.getElementById('wow-section-title-slot');
    const title = <div className="wow-section-title">{children}</div>;
    return slot ? ReactDOM.createPortal(title, slot) : title;
}

function clampPage(page, totalPages) {
    const safeTotal = Math.max(1, Number(totalPages) || 1);
    return Math.min(Math.max(1, Number(page) || 1), safeTotal);
}

function paginateCollection(items, page, pageSize) {
    const list = Array.isArray(items) ? items : [];
    const safePageSize = Math.max(1, Number(pageSize) || 1);
    const totalPages = Math.max(1, Math.ceil(list.length / safePageSize));
    const currentPage = clampPage(page, totalPages);
    const start = (currentPage - 1) * safePageSize;

    return {
        items: list.slice(start, start + safePageSize),
        currentPage,
        totalPages,
        totalItems: list.length,
    };
}

function normalizeSearchText(value) {
    return String(value == null ? '' : value).trim().toLowerCase();
}

function getBattleTagName(tag) {
    if (typeof tag !== 'string') return '';
    return tag.split('#')[0].trim();
}

function getPlayerSearchAliases(player) {
    if (!player) return [];
    return [player.name, player.battleTag, getBattleTagName(player.battleTag)]
        .map(value => String(value || '').trim())
        .filter(Boolean);
}

function matchesAnySearchValue(values, needle) {
    const normalizedNeedle = normalizeSearchText(needle);
    if (!normalizedNeedle) return true;
    const list = Array.isArray(values) ? values : [values];
    return list.some(value => normalizeSearchText(value).includes(normalizedNeedle));
}

function matchesNamedPlayer(value, needle) {
    const raw = String(value || '').trim();
    return matchesAnySearchValue([raw, getBattleTagName(raw)], needle);
}

function matchesPlayerSearch(player, needle) {
    return matchesAnySearchValue(getPlayerSearchAliases(player), needle);
}

function playerHasAlias(player, candidate) {
    const normalizedCandidate = normalizeSearchText(candidate);
    if (!normalizedCandidate) return false;
    return getPlayerSearchAliases(player).some(value => normalizeSearchText(value) === normalizedCandidate);
}

function findPlayerByAlias(players, candidate) {
    const list = Array.isArray(players) ? players : [];
    return list.find(player => playerHasAlias(player, candidate)) || null;
}

function PlayerNameFilterInput({ value, onChange, className = '' }) {
    useLang();
    const inputClass = ['wow-filter-input', className].filter(Boolean).join(' ');

    return (
        <input
            type="text"
            className={inputClass}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={t('filters.player_name_placeholder')}
            aria-label={t('filters.player_name')}
            spellCheck={false}
        />
    );
}

function PaginationControls({ page, totalPages, onPageChange, className = '' }) {
    useLang();
    if (totalPages <= 1) return null;

    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    const rootClass = ['pagination', className].filter(Boolean).join(' ');

    return (
        <nav className={rootClass} aria-label={t('pagination.label')}>
            <button
                type="button"
                className="pagination__btn"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                aria-label={t('pagination.prev')}
            >
                {t('pagination.prev')}
            </button>
            <div className="pagination__pages">
                {pages.map(pageNum => (
                    <button
                        key={pageNum}
                        type="button"
                        className={`pagination__btn pagination__page${pageNum === page ? ' is-active' : ''}`}
                        onClick={() => onPageChange(pageNum)}
                        aria-label={`${t('pagination.page')} ${pageNum}`}
                        aria-current={pageNum === page ? 'page' : undefined}
                    >
                        {pageNum}
                    </button>
                ))}
            </div>
            <button
                type="button"
                className="pagination__btn"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                aria-label={t('pagination.next')}
            >
                {t('pagination.next')}
            </button>
        </nav>
    );
}

Object.assign(window, {
    WoWSectionTitle,
    clampPage,
    paginateCollection,
    normalizeSearchText,
    getBattleTagName,
    getPlayerSearchAliases,
    matchesAnySearchValue,
    matchesNamedPlayer,
    matchesPlayerSearch,
    playerHasAlias,
    findPlayerByAlias,
    PlayerNameFilterInput,
    PaginationControls,
});

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
    const [tab,           setTab]           = React.useState(getTabFromHash);
    const [recruitTarget, setRecruitTarget] = React.useState(null); // { teamId, teamName, captainId }
    const [draftTarget,   setDraftTarget]   = React.useState(null); // { clanWarId }
    useLang(); // подписка на смену языка / language-change subscription

    // Синхронизация хэша с табом / sync hash with current tab
    React.useEffect(() => {
        const onHash = () => {
            window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
            setTab(getTabFromHash());
            setRecruitTarget(null);
            setDraftTarget(null);
        };
        window.addEventListener('hashchange', onHash);
        return () => window.removeEventListener('hashchange', onHash);
    }, []);

    const navigate = (id) => {
        window.location.hash = id;
        setTab(id);
        setRecruitTarget(null);
        setDraftTarget(null);
    };

    const openRecruit = (target) => { setDraftTarget(null); setRecruitTarget(target); };
    const closeRecruit = () => setRecruitTarget(null);
    const openDraft = (target) => { setRecruitTarget(null); setDraftTarget(target); };
    const closeDraft = () => setDraftTarget(null);

    const toggleLang = () => setLang(getLang() === 'ru' ? 'en' : 'ru');

    // Header and nav are now in the WoW template HTML (index.html).
    // React renders only the content area.
    return (
        <div className="app">
            {tab === 'home'      && <HomePage />}
            {tab === 'standings' && <Standings />}
            {tab === 'teams'     && (
                recruitTarget
                    ? <TeamRecruitView
                        teamId={recruitTarget.teamId}
                        teamName={recruitTarget.teamName}
                        captainId={recruitTarget.captainId}
                        onBack={closeRecruit}
                      />
                    : draftTarget
                        ? <DraftView clanWarId={draftTarget.clanWarId} onBack={closeDraft} />
                        : <Teams onOpenRecruit={openRecruit} onOpenDraft={openDraft} />
            )}
            {tab === 'clanwar'   && <ClanWar />}
            {tab === 'maps'      && <Maps />}
            {tab === 'profile'   && <Profile />}
            {tab === 'admin'     && <Admin />}
        </div>
    );
}

ReactDOM.render(<App />, document.getElementById('root'));
