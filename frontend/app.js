// BNL League — app entry point (JSX via Babel CDN)
// Хэш-роутинг: /#home, /#standings, /#teams, /#clanwar, /#profile, /#admin

const TABS = [
    { id: 'home',      labelKey: 'nav.home' },
    { id: 'standings', labelKey: 'nav.standings' },
    { id: 'teams',     labelKey: 'nav.teams' },
    { id: 'clanwar',   labelKey: 'nav.clanwar' },
    { id: 'profile',   labelKey: 'nav.profile' },
    { id: 'admin',     labelKey: 'nav.admin' },
];

function getTabFromHash() {
    const hash = window.location.hash.replace('#', '') || 'home';
    return TABS.find(t => t.id === hash) ? hash : 'home';
}

// ── Главная страница (Hero + описание) ────────────────────────────────────────
function HomePage() {
    useLang(); // подписка на смену языка
    return (
        <div className="animate-fade-in">
            {/* Описание лиги */}
            <div className="card-elevated" style={{ padding: 'var(--spacing-xxl)', marginBottom: 'var(--spacing-xl)' }}>
                <h3 style={{ color: 'var(--color-accent-primary)', marginBottom: 'var(--spacing-md)' }}>
                    🎮 {t('hero.subtitle')}
                </h3>
                <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.8, marginBottom: 'var(--spacing-md)' }}>
                    {t('hero.desc1')}
                </p>
                <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.8, marginBottom: 'var(--spacing-xl)' }}>
                    {t('hero.desc2')}
                </p>
                <div style={{ color: 'var(--color-accent-secondary)', fontWeight: 700, fontSize: '1.05em' }}>
                    {t('hero.stage')}
                </div>
            </div>

            {/* Система очков */}
            <div className="card-elevated" style={{ padding: 'var(--spacing-xxl)' }}>
                <h3 style={{ color: 'var(--color-accent-primary)', marginBottom: 'var(--spacing-lg)' }}>
                    📊 {t('hero.points_title')}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--spacing-md)' }}>
                    {[
                        { key: 'hero.win_strong',  color: 'var(--color-success)' },
                        { key: 'hero.win_equal',   color: 'var(--color-success-light)' },
                        { key: 'hero.win_weak',    color: 'var(--color-success-light)' },
                        { key: 'hero.loss_strong', color: 'var(--color-error-light)' },
                        { key: 'hero.loss_equal',  color: 'var(--color-error)' },
                        { key: 'hero.loss_weak',   color: 'var(--color-error)' },
                    ].map(item => (
                        <div key={item.key} style={{
                            background: 'rgba(0,0,0,0.25)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '10px 16px',
                            color: item.color,
                            fontWeight: 600,
                            fontSize: '0.95em',
                        }}>
                            {t(item.key)}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
    const [tab,           setTab]           = React.useState(getTabFromHash);
    const [recruitTarget, setRecruitTarget] = React.useState(null); // { teamId, teamName, clanWarId? }
    useLang(); // подписка на смену языка

    // Синхронизация хэша с табом
    React.useEffect(() => {
        const onHash = () => {
            setTab(getTabFromHash());
            setRecruitTarget(null);
        };
        window.addEventListener('hashchange', onHash);
        return () => window.removeEventListener('hashchange', onHash);
    }, []);

    const navigate = (id) => {
        window.location.hash = id;
        setTab(id);
        setRecruitTarget(null);
    };

    const openDraft = (target) => {
        // target = { teamId, teamName, clanWarId }
        setRecruitTarget(target);
    };

    const closeDraft = () => {
        setRecruitTarget(null);
    };

    const toggleLang = () => setLang(getLang() === 'ru' ? 'en' : 'ru');

    return (
        <div>
            {/* Header */}
            <div className="header">
                <div className="header-content">
                    <h1 className="league-title">{t('hero.title')}</h1>
                    <p style={{ color: 'var(--color-text-muted)', marginTop: 8 }}>
                        {t('hero.subtitle')}
                    </p>
                </div>
            </div>

            {/* Nav */}
            <nav className="nav">
                <div className="nav-container">
                    {TABS.map(tab_item => (
                        <button
                            key={tab_item.id}
                            className={`nav-btn${tab === tab_item.id ? ' active' : ''}`}
                            onClick={() => navigate(tab_item.id)}
                        >
                            <span>{t(tab_item.labelKey)}</span>
                        </button>
                    ))}
                    {/* Переключатель языка */}
                    <button
                        className="nav-btn"
                        onClick={toggleLang}
                        style={{ marginLeft: 'var(--spacing-lg)', minWidth: 48 }}
                        title="Switch language"
                    >
                        <span>{t('nav.lang')}</span>
                    </button>
                </div>
            </nav>

            {/* Content */}
            <div className="app">
                {tab === 'home'      && <HomePage />}
                {tab === 'standings' && <Standings />}
                {tab === 'teams'     && (
                    recruitTarget
                        ? <TeamRecruitView
                            teamId={recruitTarget.teamId}
                            teamName={recruitTarget.teamName}
                            clanWarId={recruitTarget.clanWarId}
                            onBack={closeDraft}
                          />
                        : <Teams onOpenDraft={openDraft} />
                )}
                {tab === 'clanwar'   && <ClanWar />}
                {tab === 'profile'   && <Profile />}
                {tab === 'admin'     && <Admin />}
            </div>
        </div>
    );
}

ReactDOM.render(<App />, document.getElementById('root'));
