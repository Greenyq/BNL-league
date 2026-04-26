// Maps — public downloadable Warcraft III maps grouped by managed labels

function formatMapSize(bytes) {
    var size = Number(bytes) || 0;
    if (size >= 1024 * 1024) return (size / 1024 / 1024).toFixed(1) + ' MB';
    if (size >= 1024) return Math.round(size / 1024) + ' KB';
    return size + ' B';
}

function Maps() {
    useLang();
    const [labels, setLabels] = React.useState([]);
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

    return (
        <div className="animate-fade-in">
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
                    {labels.filter(label => (label.maps || []).length > 0).map(label => (
                        <section key={label.id}>
                            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                                <h3 style={{ marginBottom: 6, color: 'var(--color-accent-primary)' }}>{label.name}</h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                                {(label.maps || []).map(map => (
                                    <div key={map.id} className="card-elevated" style={{ padding: 'var(--spacing-lg)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                                            <div style={{ flex: 1, minWidth: 220 }}>
                                                <h4 style={{ marginBottom: 6, color: 'var(--color-text-primary)' }}>{map.title}</h4>
                                                {map.description && (
                                                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: 8, lineHeight: 1.5 }}>
                                                        {map.description}
                                                    </p>
                                                )}
                                                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.86em' }}>
                                                    {map.originalName} · {formatMapSize(map.size)}
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
                        </section>
                    ))}
                </div>
            )}
        </div>
    );
}
