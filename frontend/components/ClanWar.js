// ClanWar — клан-вары (первый до 3 побед, BO3 каждый матч)

function ClanWarCard({ cw }) {
    const [open, setOpen] = React.useState(false);

    const statusClass = {
        upcoming:  'status-upcoming',
        ongoing:   'status-ongoing',
        completed: 'status-completed',
    }[cw.status] || '';

    const statusLabel = {
        upcoming:  'Предстоит',
        ongoing:   'Идёт',
        completed: 'Завершён',
    }[cw.status] || cw.status;

    return (
        <div className="cw-card">
            <div className="cw-header" onClick={() => setOpen(!open)}>
                <span className={`cw-status ${statusClass}`}>{statusLabel}</span>
                <span className="cw-teams">
                    {cw.teamA?.name || 'Команда A'} &nbsp;vs&nbsp; {cw.teamB?.name || 'Команда B'}
                </span>
                <span className="cw-score-display">
                    {cw.clanWarScore?.a ?? 0} — {cw.clanWarScore?.b ?? 0}
                </span>
                {cw.winner && (
                    <span className="cw-winner-badge">
                        🏆 {cw.winner === 'a' ? cw.teamA?.name : cw.teamB?.name}
                    </span>
                )}
                <span className="cw-toggle">{open ? '▲' : '▼'}</span>
            </div>

            {open && (
                <div className="cw-matches-list">
                    {(cw.matches || []).length === 0 ? (
                        <p style={{ color: 'var(--color-text-muted)', padding: 8 }}>Матчи не добавлены</p>
                    ) : (cw.matches || []).map((m, i) => (
                        <div key={m._id || i} className={`cw-match-row${m.winner ? ' done' : ''}`}>
                            <span className="cw-match-label">{m.label || `Матч ${m.order}`}</span>
                            <span className="cw-match-fmt">{m.format}</span>
                            <span className="cw-match-players">
                                {m.playerA || '?'} <span style={{ color: 'var(--color-text-muted)' }}>vs</span> {m.playerB || '?'}
                            </span>
                            <span className="cw-match-score">{m.score?.a ?? 0} : {m.score?.b ?? 0}</span>
                            {m.winner && (
                                <span className="cw-match-winner-badge">
                                    ✓ {m.winner === 'a' ? cw.teamA?.name : cw.teamB?.name}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function ClanWar() {
    const [wars,    setWars]    = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error,   setError]   = React.useState(null);
    const [filter,  setFilter]  = React.useState('all');

    React.useEffect(() => {
        const q = filter !== 'all' ? `?status=${filter}` : '';
        fetch(`/api/clan-wars${q}`)
            .then(r => r.json())
            .then(data => { setWars(data); setLoading(false); })
            .catch(err  => { setError(err.message); setLoading(false); });
    }, [filter]);

    const filters = [
        { id: 'all',       label: 'Все' },
        { id: 'upcoming',  label: 'Предстоят' },
        { id: 'ongoing',   label: 'Идут' },
        { id: 'completed', label: 'Завершены' },
    ];

    if (loading) return (
        <div className="cw-list">
            {[1,2,3].map(i => (
                <div key={i} className="skeleton skeleton-card" style={{ height: 64 }} />
            ))}
        </div>
    );

    if (error) return (
        <div style={{ padding: 32, color: 'var(--color-error)', textAlign: 'center' }}>
            ⚠ Ошибка: {error}
        </div>
    );

    return (
        <div className="animate-fade-in">
            <h2 style={{ marginBottom: 'var(--spacing-xl)' }}>⚔ Клан-вары</h2>

            <div className="cw-filters">
                {filters.map(f => (
                    <button
                        key={f.id}
                        className={`nav-btn${filter === f.id ? ' active' : ''}`}
                        style={{ padding: '8px 18px', fontSize: '0.85em' }}
                        onClick={() => { setLoading(true); setFilter(f.id); }}
                    >
                        <span>{f.label}</span>
                    </button>
                ))}
            </div>

            {wars.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 48 }}>
                    Клан-варов нет
                </p>
            ) : (
                <div className="cw-list">
                    {wars.map(cw => (
                        <ClanWarCard key={cw.id || cw._id} cw={cw} />
                    ))}
                </div>
            )}
        </div>
    );
}
