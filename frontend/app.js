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
            {/* Как работает лига */}
            <div className="card-elevated" style={{ padding: 'var(--spacing-xxl)' }}>
                <h3 style={{ color: 'var(--color-accent-primary)', marginBottom: 'var(--spacing-lg)' }}>
                    ⚙ {t('hero.how_title')}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--spacing-lg)' }}>
                    {[
                        { titleKey: 'hero.how1_title', descKey: 'hero.how1_desc', icon: '👤' },
                        { titleKey: 'hero.how2_title', descKey: 'hero.how2_desc', icon: '🔔' },
                        { titleKey: 'hero.how3_title', descKey: 'hero.how3_desc', icon: '⚔' },
                    ].map(item => (
                        <div key={item.titleKey} style={{
                            background: 'rgba(0,0,0,0.25)',
                            borderRadius: 'var(--radius-sm)',
                            padding: 'var(--spacing-lg)',
                        }}>
                            <div style={{ color: 'var(--color-accent-secondary)', fontWeight: 700, marginBottom: 'var(--spacing-sm)', fontSize: '0.95em' }}>
                                {item.icon} {t(item.titleKey)}
                            </div>
                            <div style={{ color: 'var(--color-text-secondary)', lineHeight: 1.7, fontSize: '0.88em' }}>
                                {t(item.descKey)}
                            </div>
                        </div>
                    ))}
                </div>
                <div style={{ marginTop: 'var(--spacing-xl)', color: 'var(--color-accent-secondary)', fontWeight: 700, fontSize: '1.05em' }}>
                    {t('hero.stage')}
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
                        clanWarId={recruitTarget.clanWarId}
                        onBack={closeDraft}
                      />
                    : <Teams onOpenDraft={openDraft} />
            )}
            {tab === 'clanwar'   && <ClanWar />}
            {tab === 'profile'   && <Profile />}
            {tab === 'admin'     && <Admin />}
        </div>
    );
}

ReactDOM.render(<App />, document.getElementById('root'));
