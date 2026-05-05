const tr = (ru, en) => getLang() === 'en' ? en : ru;

function renderBnlPlayers(players) {
    const list = Array.isArray(players) ? players.filter(Boolean) : [];
    if (!list.length) return <span className="bnl-vs-all-empty">-</span>;
    return (
        <div className="bnl-vs-all-players">
            {list.map((player, index) => (
                <span key={`${player}-${index}`} className="bnl-vs-all-player">{player}</span>
            ))}
        </div>
    );
}

function BnlVsAll() {
    useLang();
    const [matches, setMatches] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    React.useEffect(() => {
        fetch('/api/bnl-vs-all')
            .then(response => response.json())
            .then(data => {
                setMatches(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, []);

    if (error) return <div style={{ color: 'var(--color-error)', padding: 32, textAlign: 'center' }}>{error}</div>;

    return (
        <div className="animate-fade-in wow-section-page">
            <WoWSectionTitle>BNL vs All</WoWSectionTitle>

            {loading ? (
                <div className="bnl-vs-all-list">
                    {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 'var(--radius-md)' }} />)}
                </div>
            ) : matches.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 48 }}>
                    {tr('Матчей BNL vs All пока нет', 'No BNL vs All matches yet')}
                </p>
            ) : (
                <div className="bnl-vs-all-list">
                    {matches.map(match => {
                        const bnlWon = match.winner === 'bnl';
                        const opponentWon = match.winner === 'opponent';
                        const date = match.date ? new Date(match.date).toLocaleDateString(getLang() === 'en' ? 'en-US' : 'ru-RU') : null;

                        return (
                            <div key={match.id} className="bnl-vs-all-card">
                                <div className="bnl-vs-all-top">
                                    <div className={`bnl-vs-all-team${bnlWon ? ' is-winner' : ''}`}>
                                        <div className="bnl-vs-all-logo">BNL</div>
                                        <div>
                                            <div className="bnl-vs-all-name">{match.bnlTeamName || 'BNL'}</div>
                                            <div className="bnl-vs-all-meta">{tr('Наш состав', 'Our lineup')}</div>
                                        </div>
                                    </div>

                                    <div className="bnl-vs-all-score">
                                        <span className={bnlWon ? 'is-win' : ''}>{match.score?.bnl ?? 0}</span>
                                        <span>:</span>
                                        <span className={opponentWon ? 'is-win' : ''}>{match.score?.opponent ?? 0}</span>
                                    </div>

                                    <div className={`bnl-vs-all-team bnl-vs-all-team--right${opponentWon ? ' is-winner' : ''}`}>
                                        <div>
                                            <div className="bnl-vs-all-name">{match.opponentName}</div>
                                            <div className="bnl-vs-all-meta">{tr('Соперник', 'Opponent')}</div>
                                        </div>
                                        <div className="bnl-vs-all-logo bnl-vs-all-logo--opponent">{(match.opponentName || '?').slice(0, 3).toUpperCase()}</div>
                                    </div>
                                </div>

                                <div className="bnl-vs-all-body">
                                    <div>
                                        <div className="bnl-vs-all-label">{tr('Игроки BNL', 'BNL players')}</div>
                                        {renderBnlPlayers(match.bnlPlayers)}
                                    </div>
                                    <div>
                                        <div className="bnl-vs-all-label">{tr('Игроки соперника', 'Opponent players')}</div>
                                        {renderBnlPlayers(match.opponentPlayers)}
                                    </div>
                                </div>

                                {(date || match.season || match.note) && (
                                    <div className="bnl-vs-all-footer">
                                        {date && <span>{date}</span>}
                                        {match.season && <span>{tr('Сезон', 'Season')} {match.season}</span>}
                                        {match.note && <span>{match.note}</span>}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
