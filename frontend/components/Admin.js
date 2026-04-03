// Admin component — login-gated panel for managing players, teams, matches
// All write operations require x-session-id header (set after login).


// ── Auth helpers ──────────────────────────────────────────────────────────────
const SESSION_KEY = 'bnl_admin_session';
const getSession  = () => localStorage.getItem(SESSION_KEY);
const setSession  = (id) => localStorage.setItem(SESSION_KEY, id);
const clearSession = () => localStorage.removeItem(SESSION_KEY);

async function apiFetch(url, options = {}) {
    const sessionId = getSession();
    const headers = { 'Content-Type': 'application/json', ...(sessionId ? { 'x-session-id': sessionId } : {}), ...(options.headers || {}) };
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || res.statusText); }
    return res.json();
}

// ── Login form ────────────────────────────────────────────────────────────────
function LoginForm({ onLogin }) {
    const [login, setLogin]       = React.useState('');
    const [password, setPassword] = React.useState('');
    const [error, setError]       = React.useState(null);

    const submit = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            const data = await apiFetch('/api/admin/login', { method: 'POST', body: JSON.stringify({ login, password }) });
            setSession(data.sessionId);
            onLogin();
        } catch (err) {
            setError(err.message);
        }
    };

    return React.createElement('form', { className: 'login-form', onSubmit: submit },
        React.createElement('h2', null, 'Admin Login'),
        error && React.createElement('p', { className: 'error' }, error),
        React.createElement('input', { type: 'text',     placeholder: 'Login',    value: login,    onChange: e => setLogin(e.target.value) }),
        React.createElement('input', { type: 'password', placeholder: 'Password', value: password, onChange: e => setPassword(e.target.value) }),
        React.createElement('button', { type: 'submit' }, 'Sign in'),
    );
}

// ── Admin panel (authenticated) ───────────────────────────────────────────────
function AdminPanel({ onLogout }) {
    const [tab, setTab]         = React.useState('players');
    const [players, setPlayers] = React.useState([]);
    const [teams,   setTeams]   = React.useState([]);
    const [msg,     setMsg]     = React.useState(null);

    const load = React.useCallback(async () => {
        const [p, t] = await Promise.all([apiFetch('/api/players'), apiFetch('/api/teams')]);
        setPlayers(p); setTeams(t);
    }, []);

    React.useEffect(() => { load(); }, [load]);

    const logout = async () => {
        try { await apiFetch('/api/admin/logout', { method: 'POST' }); } catch {}
        clearSession(); onLogout();
    };

    const recalc = async () => {
        setMsg('Recalculating…');
        try {
            const r = await apiFetch('/api/players/admin/recalculate', { method: 'POST' });
            setMsg(`Done: ${r.updated}/${r.total} players updated`);
        } catch (err) { setMsg(`Error: ${err.message}`); }
    };

    const deletePlayer = async (id) => {
        if (!confirm('Delete this player?')) return;
        await apiFetch(`/api/players/${id}`, { method: 'DELETE' });
        load();
    };

    const deleteTeam = async (id) => {
        if (!confirm('Delete this team?')) return;
        await apiFetch(`/api/teams/${id}`, { method: 'DELETE' });
        load();
    };

    return React.createElement('div', { className: 'admin-panel' },
        React.createElement('div', { className: 'admin-header' },
            React.createElement('h2', null, 'Admin Panel'),
            React.createElement('button', { onClick: logout }, 'Logout'),
        ),

        msg && React.createElement('p', { className: 'admin-msg' }, msg),

        React.createElement('div', { className: 'admin-tabs' },
            ['players', 'teams', 'tools'].map(t =>
                React.createElement('button', { key: t, className: tab === t ? 'active' : '', onClick: () => setTab(t) },
                    t.charAt(0).toUpperCase() + t.slice(1)
                )
            )
        ),

        // Players tab
        tab === 'players' && React.createElement('div', { className: 'admin-section' },
            React.createElement('h3', null, 'Players'),
            React.createElement('table', null,
                React.createElement('thead', null, React.createElement('tr', null,
                    ['BattleTag', 'Name', 'MMR', 'Team', ''].map(h => React.createElement('th', { key: h }, h))
                )),
                React.createElement('tbody', null,
                    players.map(p => React.createElement('tr', { key: p.id },
                        React.createElement('td', null, p.battleTag),
                        React.createElement('td', null, p.name),
                        React.createElement('td', null, p.currentMmr || '—'),
                        React.createElement('td', null, teams.find(t => t.id === p.teamId)?.name || '—'),
                        React.createElement('td', null, React.createElement('button', { onClick: () => deletePlayer(p.id) }, '✕')),
                    ))
                )
            )
        ),

        // Teams tab
        tab === 'teams' && React.createElement('div', { className: 'admin-section' },
            React.createElement('h3', null, 'Teams'),
            React.createElement('table', null,
                React.createElement('thead', null, React.createElement('tr', null,
                    ['Name', 'Captain', 'Players', ''].map(h => React.createElement('th', { key: h }, h))
                )),
                React.createElement('tbody', null,
                    teams.map(t => React.createElement('tr', { key: t.id },
                        React.createElement('td', null, `${t.emoji || ''} ${t.name}`),
                        React.createElement('td', null, players.find(p => p.id === t.captainId)?.name || t.captainId || '—'),
                        React.createElement('td', null, players.filter(p => p.teamId === t.id).length),
                        React.createElement('td', null, React.createElement('button', { onClick: () => deleteTeam(t.id) }, '✕')),
                    ))
                )
            )
        ),

        // Tools tab
        tab === 'tools' && React.createElement('div', { className: 'admin-section' },
            React.createElement('h3', null, 'Tools'),
            React.createElement('button', { onClick: recalc }, '🔄 Recalculate all stats'),
        )
    );
}

// ── Admin (top-level) ─────────────────────────────────────────────────────────
function Admin() {
    const [authed, setAuthed] = React.useState(false);
    const [checking, setChecking] = React.useState(true);

    React.useEffect(() => {
        const sessionId = getSession();
        if (!sessionId) { setChecking(false); return; }
        fetch('/api/admin/verify', { headers: { 'x-session-id': sessionId } })
            .then(r => r.json())
            .then(d => { setAuthed(d.isAuthenticated); setChecking(false); })
            .catch(() => setChecking(false));
    }, []);

    if (checking) return React.createElement('p', null, 'Verifying session…');
    if (!authed)  return React.createElement(LoginForm, { onLogin: () => setAuthed(true) });
    return React.createElement(AdminPanel, { onLogout: () => setAuthed(false) });
}
