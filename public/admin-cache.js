const API_BASE = '';

// ==================== ADMIN CACHE ====================
function AdminCache({ sessionId, onUpdate }) {
    const [loading, setLoading] = React.useState(false);
    const [message, setMessage] = React.useState('');
    const [error, setError] = React.useState('');

    const handleClearAllCache = async () => {
        if (!confirm('Вы уверены, что хотите очистить весь кэш? Следующая загрузка будет медленнее.')) {
            return;
        }

        setLoading(true);
        setMessage('');
        setError('');

        try {
            const response = await fetch(`${API_BASE}/api/admin/players/cache`, {
                method: 'DELETE',
                headers: {
                    'x-session-id': sessionId
                }
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(data.message || 'Кэш успешно очищен!');
                setTimeout(() => {
                    onUpdate();
                    window.location.reload();
                }, 1500);
            } else {
                setError(data.error || 'Ошибка при очистке кэша');
            }
        } catch (error) {
            setError('Ошибка подключения к серверу');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h3 style={{ fontSize: '1.5em', marginBottom: '20px', color: '#c9a961' }}>
                🔄 Управление кэшем
            </h3>

            <div style={{
                background: '#1a1a1a',
                padding: '30px',
                borderRadius: '15px',
                border: '2px solid #c9a961',
                maxWidth: '600px'
            }}>
                <div style={{ marginBottom: '25px' }}>
                    <h4 style={{ color: '#c9a961', marginBottom: '10px' }}>
                        💡 Что такое кэш?
                    </h4>
                    <p style={{ color: '#e0e0e0', lineHeight: '1.6', marginBottom: '15px' }}>
                        Для ускорения загрузки страницы, данные матчей с W3Champions сохраняются в базе данных на 10 минут.
                        Это значительно ускоряет работу сайта.
                    </p>
                    <p style={{ color: '#888', lineHeight: '1.6', fontSize: '0.9em' }}>
                        Кэш автоматически обновляется каждые 10 минут. Если нужно принудительно обновить данные
                        (например, только что добавили нового игрока), очистите кэш вручную.
                    </p>
                </div>

                {message && (
                    <div style={{
                        padding: '15px',
                        background: 'rgba(76, 175, 80, 0.1)',
                        border: '1px solid #4caf50',
                        borderRadius: '8px',
                        color: '#4caf50',
                        marginBottom: '20px'
                    }}>
                        {message}
                    </div>
                )}

                {error && (
                    <div style={{
                        padding: '15px',
                        background: 'rgba(244, 67, 54, 0.1)',
                        border: '1px solid #f44336',
                        borderRadius: '8px',
                        color: '#f44336',
                        marginBottom: '20px'
                    }}>
                        {error}
                    </div>
                )}

                <button
                    onClick={handleClearAllCache}
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '15px',
                        borderRadius: '8px',
                        background: loading ? '#666' : '#ff9800',
                        color: '#fff',
                        border: 'none',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontWeight: '600',
                        fontSize: '1.1em',
                        transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => !loading && (e.target.style.background = '#f57c00')}
                    onMouseOut={(e) => !loading && (e.target.style.background = '#ff9800')}
                >
                    {loading ? '⏳ Очистка...' : '🗑️ Очистить весь кэш'}
                </button>

                <div style={{
                    marginTop: '20px',
                    padding: '15px',
                    background: '#2a2a2a',
                    borderRadius: '8px'
                }}>
                    <p style={{ color: '#888', fontSize: '0.9em', margin: 0 }}>
                        ⚠️ После очистки кэша страница автоматически перезагрузится и данные будут загружены заново с W3Champions.
                        Это может занять некоторое время.
                    </p>
                </div>
            </div>
        </div>
    );
}
