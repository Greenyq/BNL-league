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

// ── Главная страница ──────────────────────────────────────────────────────────
function HomePage() {
    useLang();
    return (
        <div className="animate-fade-in" style={{ textAlign: 'center', padding: '10px 0 30px' }}>

            {/* Заголовок в стиле WoW */}
            <div className="wow-section-title" style={{ fontSize: 26, marginBottom: 6 }}>
                {t('hero.how_title')}
            </div>
            <div style={{ color: '#a87a48', fontSize: 13, marginBottom: 28, letterSpacing: '0.05em' }}>
                {t('hero.stage')}
            </div>

            {/* Три карточки */}
            <div className="bnl-info-grid">
                {[
                    { titleKey: 'hero.how1_title', descKey: 'hero.how1_desc' },
                    { titleKey: 'hero.how2_title', descKey: 'hero.how2_desc' },
                    { titleKey: 'hero.how3_title', descKey: 'hero.how3_desc' },
                ].map(item => (
                    <div key={item.titleKey} className="bnl-info-card">
                        <div className="bnl-info-card-title">{t(item.titleKey)}</div>
                        <div className="bnl-info-card-text">{t(item.descKey)}</div>
                    </div>
                ))}
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
