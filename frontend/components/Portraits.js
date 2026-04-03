// Portraits — выбор портрета для игрока (бесплатно, без требований к очкам)
// Игрок ищет себя по BattleTag, выбирает портрет — сохраняется через API.

const PRESET_PORTRAITS = [
    { id: 'human',     label: 'Human',     src: '/images/human.jpg' },
    { id: 'orc',       label: 'Orc',       src: '/images/orc.jpg' },
    { id: 'nightelf',  label: 'Night Elf', src: '/images/nightelf.jpg' },
    { id: 'undead',    label: 'Undead',    src: '/images/undead.jpg' },
];

function Portraits() {
    useLang();
    const [tag,       setTag]       = React.useState('');
    const [player,    setPlayer]    = React.useState(null);
    const [notFound,  setNotFound]  = React.useState(false);
    const [searching, setSearching] = React.useState(false);
    const [selected,  setSelected]  = React.useState(null);
    const [saving,    setSaving]    = React.useState(false);
    const [saved,     setSaved]     = React.useState(false);

    const search = async (e) => {
        e.preventDefault();
        setNotFound(false);
        setPlayer(null);
        setSaved(false);
        setSearching(true);
        try {
            const res  = await fetch(`/api/players/${encodeURIComponent(tag.trim())}`);
            const data = await res.json();
            if (!res.ok || data.error) { setNotFound(true); }
            else { setPlayer(data); setSelected(data.selectedPortrait || null); }
        } catch {
            setNotFound(true);
        } finally {
            setSearching(false);
        }
    };

    const save = async () => {
        if (!player || !selected) return;
        setSaving(true);
        try {
            await fetch(`/api/players/${player.id}/portrait`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ portrait: selected }),
            });
            setSaved(true);
            setPlayer({ ...player, selectedPortrait: selected });
        } catch {}
        setSaving(false);
    };

    return (
        <div className="animate-fade-in">
            <h2 style={{ marginBottom: 'var(--spacing-md)' }}>{t('portraits.title')}</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xl)' }}>
                {t('portraits.desc')}
            </p>

            {/* Поиск игрока */}
            <div className="card-elevated" style={{ padding: 'var(--spacing-xl)', marginBottom: 'var(--spacing-xl)', maxWidth: 480 }}>
                <h4 style={{ marginBottom: 'var(--spacing-md)' }}>{t('portraits.find')}</h4>
                <form onSubmit={search} style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        placeholder={t('portraits.tag')}
                        value={tag}
                        onChange={e => setTag(e.target.value)}
                        style={{ flex: 1, minWidth: 200 }}
                    />
                    <button type="submit" className="btn btn-primary" disabled={searching || !tag.trim()}>
                        {searching ? '...' : t('portraits.search')}
                    </button>
                </form>
                {notFound && (
                    <p style={{ color: 'var(--color-error)', marginTop: 'var(--spacing-md)' }}>
                        {t('portraits.not_found')}
                    </p>
                )}
            </div>

            {/* Выбор портрета */}
            {player && (
                <div className="card-elevated" style={{ padding: 'var(--spacing-xl)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-xl)' }}>
                        {selected && (
                            <img src={selected} alt="portrait" style={{
                                width: 72, height: 72, borderRadius: '50%', objectFit: 'cover',
                                border: '3px solid var(--color-accent-primary)',
                                boxShadow: '0 4px 20px rgba(212,175,55,0.5)',
                            }} />
                        )}
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '1.2em', color: 'var(--color-text-primary)' }}>
                                {player.name || player.battleTag}
                            </div>
                            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85em' }}>{player.battleTag}</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--spacing-lg)', flexWrap: 'wrap', marginBottom: 'var(--spacing-xl)' }}>
                        {PRESET_PORTRAITS.map(p => (
                            <div
                                key={p.id}
                                onClick={() => setSelected(p.src)}
                                style={{
                                    cursor: 'pointer',
                                    textAlign: 'center',
                                    transition: 'transform 0.2s',
                                }}
                            >
                                <img src={p.src} alt={p.label} style={{
                                    width: 80, height: 80,
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: selected === p.src
                                        ? '3px solid var(--color-accent-primary)'
                                        : '3px solid rgba(255,255,255,0.1)',
                                    boxShadow: selected === p.src ? '0 0 20px rgba(212,175,55,0.6)' : 'none',
                                    transform: selected === p.src ? 'scale(1.08)' : 'scale(1)',
                                    transition: 'all 0.2s',
                                }} />
                                <div style={{
                                    fontSize: '0.8em',
                                    marginTop: 6,
                                    color: selected === p.src ? 'var(--color-accent-primary)' : 'var(--color-text-muted)',
                                    fontWeight: selected === p.src ? 700 : 400,
                                }}>
                                    {p.label}
                                </div>
                            </div>
                        ))}
                    </div>

                    {saved && (
                        <div style={{ color: 'var(--color-success)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                            ✅ {t('portraits.saved')}
                        </div>
                    )}

                    <button
                        className="btn btn-primary"
                        onClick={save}
                        disabled={saving || !selected}
                    >
                        {saving ? '...' : t('portraits.select')}
                    </button>
                </div>
            )}
        </div>
    );
}
