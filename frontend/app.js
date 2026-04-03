// BNL League — main app entry point (React via CDN, no build step)
// Loaded by pages/index.html after React, ReactDOM, and component scripts.


// ── Route map ─────────────────────────────────────────────────────────────────
// Simple hash-based router so the CDN React setup needs no build tooling.

function App() {
    const [page, setPage] = React.useState(window.location.hash || '#standings');

    React.useEffect(() => {
        const onHash = () => setPage(window.location.hash || '#standings');
        window.addEventListener('hashchange', onHash);
        return () => window.removeEventListener('hashchange', onHash);
    }, []);

    const nav = (hash) => (e) => { e.preventDefault(); window.location.hash = hash; };

    return React.createElement('div', { className: 'app' },
        // ── Navigation ────────────────────────────────────────────────────────
        React.createElement('nav', { className: 'nav' },
            React.createElement('a', { href: '#standings', onClick: nav('#standings'), className: page === '#standings' ? 'active' : '' }, 'Standings'),
            React.createElement('a', { href: '#teams',     onClick: nav('#teams'),     className: page === '#teams'     ? 'active' : '' }, 'Teams'),
            React.createElement('a', { href: '#clan-war',  onClick: nav('#clan-war'),  className: page === '#clan-war'  ? 'active' : '' }, 'Clan War'),
            React.createElement('a', { href: '#admin',     onClick: nav('#admin'),     className: page === '#admin'     ? 'active' : '' }, 'Admin'),
        ),
        // ── Page content ──────────────────────────────────────────────────────
        React.createElement('main', { className: 'main' },
            page === '#standings' && React.createElement(Standings),
            page === '#teams'     && React.createElement(Teams),
            page === '#clan-war'  && React.createElement(ClanWar),
            page === '#admin'     && React.createElement(Admin),
        )
    );
}

ReactDOM.render(React.createElement(App), document.getElementById('root'));
