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
    var steps = [
        { titleKey: 'hero.how1_title', descKey: 'hero.how1_desc', icon: '/images/wow/icon-3.png' },
        { titleKey: 'hero.how2_title', descKey: 'hero.how2_desc', icon: '/images/wow/icon-2.png' },
        { titleKey: 'hero.how3_title', descKey: 'hero.how3_desc', icon: '/images/wow/icon-7.png' },
        { titleKey: 'hero.how4_title', descKey: 'hero.how4_desc', icon: '/images/wow/icon-6.png' },
    ];
    return (
        <div className="animate-fade-in">
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
                        captainId={recruitTarget.captainId}
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
