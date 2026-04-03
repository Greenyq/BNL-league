// ClanWar — клан-вары (первый до 3 побед, BO3 каждый матч)

function ClanWarCard({ cw }) {
    useLang();
    const [open, setOpen] = React.useState(false);

    const statusLabel = t(`cw.status.${cw.status}`) || cw.status;
    const statusClass  = { upcoming: 'status-upcoming', ongoing: 'status-ongoing', completed: 'status-completed' }[cw.status] || '';

    const nameA = cw.teamA?.name || 'Team A';
    const nameB = cw.teamB?.name || 'Team B';

    return (
        <div className="cw-card">
            <div className="cw-header" onClick={() => setOpen(!open)}>
                <span className={`cw-status ${statusClass}`}>{statusLabel}</span>
                <span className="cw-teams">{nameA} &nbsp;vs&nbsp; {nameB}</span>
                <span className="cw-score-display">
                    {cw.clanWarScore?.a ?? 0} — {cw.clanWarScore?.b ?? 0}
                </span>
                {cw.winner && (
                    <span className="cw-winner-badge">
                        🏆 {cw.winner === 'a' ? nameA : nameB}
                    </span>
                )}
                <span className="cw-toggle">{open ? '▲' : '▼'}</span>
            </div>

            {open && (
                <div className="cw-matches-list">
                    {(cw.matches || []).length === 0
                        ? <p style={{ color: 'var(--color-text-muted)', padding: 8 }}>—</p>
                        : (cw.matches || []).map((m, i) => (
                            <div key={m._id || i} className={`cw-match-row${m.winner ? ' done' : ''}`}>
                                <span className="cw-match-label">{m.label || `${t('cw.match_fmt')} ${m.order}`}</span>
                                <span className="cw-match-fmt">{m.format}</span>
                                <span className="cw-match-players">
                                    {m.playerA || '?'} <span style={{ color: 'var(--color-text-muted)' }}>vs</span> {m.playerB || '?'}
                                </span>
                                <span className="cw-match-score">{m.score?.a ?? 0} : {m.score?.b ?? 0}</span>
                                {m.winner && (
                                    <span className="cw-match-winner-badge">
                                        ✓ {m.winner === 'a' ? nameA : nameB}
                                    </span>
                                )}
                            </div>
                        ))
                    }
                </div>
            )}
        </div>
    );
}

function ClanWar() {
    useLang();
    const [wars,    setWars]    = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error,   setError]   = React.useState(null);
    const [filter,  setFilter]  = React.useState('all');

    React.useEffect(() => {
        setLoading(true);
        const q = filter !== 'all' ? `?status=${filter}` : '';
        fetch(`/api/clan-wars${q}`)
            .then(r => r.json())
            .then(data => { setWars(data); setLoading(false); })
            .catch(err  => { setError(err.message); setLoading(false); });
    }, [filter]);

    const FILTERS = [
        { id: 'all',       key: 'cw.all' },
        { id: 'upcoming',  key: 'cw.upcoming' },
        { id: 'ongoing',   key: 'cw.ongoing' },
        { id: 'completed', key: 'cw.completed' },
    ];

    if (error) return <div style={{ color: 'var(--color-error)', padding: 32, textAlign: 'center' }}>⚠ {error}</div>;

    return (
        <div className="animate-fade-in">
            <h2 style={{ marginBottom: 'var(--spacing-xl)' }}>{t('cw.title')}</h2>

            <div className="cw-filters">
                {FILTERS.map(f => (
                    <button
                        key={f.id}
                        className={`nav-btn${filter === f.id ? ' active' : ''}`}
                        style={{ padding: '8px 18px', fontSize: '0.85em' }}
                        onClick={() => setFilter(f.id)}
                    >
                        <span>{t(f.key)}</span>
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="cw-list">
                    {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 64, marginBottom: 12, borderRadius: 'var(--radius-md)' }} />)}
                </div>
            ) : wars.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 48 }}>{t('cw.empty')}</p>
            ) : (
                <div className="cw-list">
                    {wars.map(cw => <ClanWarCard key={cw.id || cw._id} cw={cw} />)}
                </div>
            )}
        </div>
    );
}
