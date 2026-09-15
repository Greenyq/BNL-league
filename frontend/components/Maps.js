// Maps — public downloadable Warcraft III maps grouped by managed labels

function Maps() {
    useLang();
    const tr = (ru, en) => getLang() === 'en' ? en : ru;
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
                            <section key={label.id} className={`map-biome-section${label.kind === 'arena' ? ' is-arena' : ''}`}>
                                <button
                                    type="button"
                                    onClick={() => toggleLabel(label.id)}
                                    aria-expanded={isExpanded}
                                    className="map-biome-header"
                                >
                                    <span>
                                        <small>{label.season || 'Season 1'} · {label.kind === 'arena' ? tr('Специальный пул', 'Special pool') : tr('Биом', 'Biome')}</small>
                                        <strong>{label.name}</strong>
                                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9em' }}>
                                            {maps.length} · {isExpanded ? t('maps.hide') : t('maps.show')}
                                        </span>
                                    </span>
                                    <span style={{ color: 'var(--color-accent-primary)', fontSize: '1.2em', lineHeight: 1 }}>
                                        {isExpanded ? '−' : '+'}
                                    </span>
                                </button>

                                {isExpanded && (
                                    <div className="map-gallery-grid">
                                        {maps.map(map => (
                                            <article key={map.id} className="map-gallery-card">
                                                {map.previewImageUrl
                                                    ? <img src={map.previewImageUrl} alt={map.title} />
                                                    : <div className="map-gallery-placeholder">WARCRAFT III</div>}
                                                <div className="map-gallery-copy">
                                                    <div>
                                                        <h4>{map.title}</h4>
                                                        {map.description && (
                                                            <p>{map.description}</p>
                                                        )}
                                                        <small>{map.originalName ? `${map.originalName} · ${globalThis.formatMapSize(map.size)}` : tr('Игровой файл скоро', 'Game file coming soon')}</small>
                                                    </div>
                                                    {map.originalName && <a
                                                        className="btn btn-primary"
                                                        href={`/api/maps/${map.id}/download`}
                                                        download
                                                    >
                                                        {t('maps.download')}
                                                    </a>}
                                                </div>
                                            </article>
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
