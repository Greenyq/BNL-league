// Maps — public downloadable Warcraft III maps grouped by managed labels

function Maps() {
    useLang();
    const [labels, setLabels] = React.useState([]);
    const [expandedLabels, setExpandedLabels] = React.useState({});
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    React.useEffect(() => {
        setLoading(true);
        fetch('/api/maps')
            .then(r => r.json().then(data => ({ ok: r.ok, data })))
            .then(({ ok, data }) => {
                if (!ok) throw new Error(data.error || 'Failed to load maps');
                setLabels(Array.isArray(data) ? data : []);
                setError(null);
            })
            .catch(err => {
                setLabels([]);
                setError(err.message);
            })
            .finally(() => setLoading(false));
    }, []);

    const totalMaps = labels.reduce((sum, label) => sum + (label.maps || []).length, 0);
    const toggleLabel = (labelId) => {
        setExpandedLabels(prev => ({
            ...prev,
            [labelId]: !prev[labelId],
        }));
    };

    return (
        <div className="animate-fade-in wow-section-page">
            <WoWSectionTitle>{t('maps.title')}</WoWSectionTitle>

            {loading ? (
                <div style={{ padding: '48px 20px' }}>
                    <div className="skeleton" style={{ height: 40, maxWidth: 260, marginBottom: 18 }} />
                    <div className="skeleton" style={{ height: 96, marginBottom: 12 }} />
                    <div className="skeleton" style={{ height: 96 }} />
                </div>
            ) : error ? (
                <div className="card-elevated" style={{ padding: 'var(--spacing-xl)', color: 'var(--color-error)' }}>
                    {error}
                </div>
            ) : totalMaps === 0 ? (
                <div className="card-elevated" style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    {t('maps.empty')}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xxl)' }}>
                    {labels.filter(label => (label.maps || []).length > 0).map(label => {
                        const maps = label.maps || [];
                        const isExpanded = !!expandedLabels[label.id];

                        return (
                            <section key={label.id}>
                                <button
                                    type="button"
                                    onClick={() => toggleLabel(label.id)}
                                    aria-expanded={isExpanded}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 'var(--spacing-md)',
                                        marginBottom: isExpanded ? 'var(--spacing-lg)' : 0,
                                        padding: 'var(--spacing-lg) var(--spacing-xl)',
                                        background: 'rgba(20, 16, 10, 0.7)',
                                        border: '1px solid rgba(238, 221, 161, 0.2)',
                                        borderRadius: 'var(--radius-lg)',
                                        color: 'var(--color-text-primary)',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                    }}
                                >
                                    <span>
                                        <strong style={{ display: 'block', marginBottom: 6, color: 'var(--color-accent-primary)' }}>{label.name}</strong>
                                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9em' }}>
                                            {maps.length} · {isExpanded ? t('maps.hide') : t('maps.show')}
                                        </span>
                                    </span>
                                    <span style={{ color: 'var(--color-accent-primary)', fontSize: '1.2em', lineHeight: 1 }}>
                                        {isExpanded ? '−' : '+'}
                                    </span>
                                </button>

                                {isExpanded && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                                        {maps.map(map => (
                                            <div key={map.id} className="card-elevated" style={{ padding: 'var(--spacing-lg)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                                                    <div style={{ flex: '1 1 220px', minWidth: 0, overflowWrap: 'anywhere' }}>
                                                        <h4 style={{ marginBottom: 6, color: 'var(--color-text-primary)', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{map.title}</h4>
                                                        {map.description && (
                                                            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 8, lineHeight: 1.5 }}>
                                                                {map.description}
                                                            </p>
                                                        )}
                                                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.86em', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                                                            {map.originalName} · {globalThis.formatMapSize(map.size)}
                                                        </div>
                                                    </div>
                                                    <a
                                                        className="btn btn-primary"
                                                        href={`/api/maps/${map.id}/download`}
                                                        download
                                                        style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}
                                                    >
                                                        {t('maps.download')}
                                                    </a>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
