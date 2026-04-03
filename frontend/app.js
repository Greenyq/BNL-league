// BNL League — app entry point (JSX via Babel CDN)

const TABS = [
    { id: 'standings', label: 'Рейтинг' },
    { id: 'teams',     label: 'Команды' },
    { id: 'clanwar',   label: 'Клан-вар' },
    { id: 'admin',     label: 'Админ' },
];

function App() {
    const [tab, setTab] = React.useState('standings');

    return (
        <div>
            {/* Header */}
            <div className="header">
                <div className="header-content">
                    <h1 className="league-title">⚔ BNL LEAGUE ⚔</h1>
                    <p style={{ color: 'var(--color-text-muted)', marginTop: 8 }}>
                        Breaking New Limits · Warcraft III
                    </p>
                </div>
            </div>

            {/* Nav */}
            <nav className="nav">
                <div className="nav-container">
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            className={`nav-btn${tab === t.id ? ' active' : ''}`}
                            onClick={() => setTab(t.id)}
                        >
                            <span>{t.label}</span>
                        </button>
                    ))}
                </div>
            </nav>

            {/* Content */}
            <div className="app">
                {tab === 'standings' && <Standings />}
                {tab === 'teams'     && <Teams />}
                {tab === 'clanwar'   && <ClanWar />}
                {tab === 'admin'     && <Admin />}
            </div>
        </div>
    );
}

ReactDOM.render(<App />, document.getElementById('root'));
