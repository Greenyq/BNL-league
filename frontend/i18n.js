// BNL League i18n — поддержка RU / EN
// Использование: t('key') — возвращает строку на текущем языке.
// Смена языка: setLang('en') / setLang('ru')

const LANGS = {
    ru: {
        // Nav
        'nav.home':       '🏠 Главная',
        'nav.standings':  'Рейтинг',
        'nav.teams':      'Команды',
        'nav.clanwar':    'Клан-вары',
        'nav.portraits':  'Портреты',
        'nav.admin':      'Админ',
        'nav.lang':       'EN',

        // Hero
        'hero.title':     '⚔ BNL LEAGUE ⚔',
        'hero.subtitle':  'Breaking New Limits · Warcraft III',
        'hero.desc1':     'Лига Warcraft 3: Reforged для любителей варкрафта. Игроки соревнуются в ладдере, командных баталиях и клан-варах.',
        'hero.desc2':     'Очки начисляются автоматически по данным W3Champions на основе разницы MMR. Достижения дают дополнительные бонусы.',
        'hero.stage':     '📅 Сезон 24 · Этап 1: 9–22 февраля 2026',
        'hero.points_title': 'Система очков',
        'hero.win_strong':  '+70 очков — победа над более сильным (+20 MMR)',
        'hero.win_equal':   '+50 очков — победа над равным (±20 MMR)',
        'hero.win_weak':    '+30 очков — победа над слабым (−20 MMR)',
        'hero.loss_weak':   '−40 очков — поражение от слабого',
        'hero.loss_equal':  '−30 очков — поражение от равного',
        'hero.loss_strong': '−20 очков — поражение от сильного',

        // Standings
        'standings.title':   '🏆 Рейтинг',
        'standings.rank':    '#',
        'standings.player':  'Игрок',
        'standings.race':    'Раса',
        'standings.mmr':     'MMR',
        'standings.wins':    'Победы',
        'standings.losses':  'Поражения',
        'standings.points':  'Очки',
        'standings.empty':   'Нет данных',
        'standings.loading': 'Загрузка рейтинга...',
        'race.all':   'Все расы',
        'race.0':     'Случайная',
        'race.1':     'Люди',
        'race.2':     'Орки',
        'race.4':     'Ночные эльфы',
        'race.8':     'Нежить',

        // Teams
        'teams.title':    '🛡 Команды',
        'teams.captain':  'Капитан',
        'teams.empty':    'Команды не добавлены',
        'teams.loading':  'Загрузка команд...',
        'teams.players_count': 'игроков',

        // ClanWar
        'cw.title':     '⚔ Клан-вары',
        'cw.all':       'Все',
        'cw.upcoming':  'Предстоят',
        'cw.ongoing':   'Идут',
        'cw.completed': 'Завершены',
        'cw.empty':     'Клан-варов нет',
        'cw.loading':   'Загрузка...',
        'cw.match_fmt': 'Матч',
        'cw.winner':    'Победитель',
        'cw.status.upcoming':  'Предстоит',
        'cw.status.ongoing':   'Идёт',
        'cw.status.completed': 'Завершён',

        // Portraits
        'portraits.title':  '🖼 Портреты',
        'portraits.desc':   'Выберите портрет для своего профиля. Все портреты доступны бесплатно.',
        'portraits.select': 'Выбрать',
        'portraits.find':   'Найти игрока',
        'portraits.tag':    'BattleTag (например Player#1234)',
        'portraits.search': 'Найти',
        'portraits.saved':  'Портрет сохранён!',
        'portraits.not_found': 'Игрок не найден',

        // Admin
        'admin.title':      '⚙ Панель управления',
        'admin.login':      '🔐 Вход в панель',
        'admin.loginBtn':   'Войти',
        'admin.logout':     'Выйти',
        'admin.tab.players':'👤 Игроки',
        'admin.tab.teams':  '🛡 Команды',
        'admin.tab.tools':  '🔧 Инструменты',
        'admin.addPlayer':  'Добавить игрока',
        'admin.addTeam':    'Создать команду',
        'admin.search_w3c': 'Поиск W3Champions',
        'admin.searching':  'Поиск...',
        'admin.found':      'Найден',
        'admin.not_found':  'Не найден',
        'admin.save':       'Сохранить',
        'admin.cancel':     'Отмена',
        'admin.delete':     'Удалить',
        'admin.assign_team':'Команда',
        'admin.recalc':     '🔄 Пересчитать статистику',
        'admin.recalcing':  'Пересчёт...',
        'admin.login_label':'Логин',
        'admin.pass_label': 'Пароль',
    },

    en: {
        // Nav
        'nav.home':       '🏠 Home',
        'nav.standings':  'Standings',
        'nav.teams':      'Teams',
        'nav.clanwar':    'Clan Wars',
        'nav.portraits':  'Portraits',
        'nav.admin':      'Admin',
        'nav.lang':       'RU',

        // Hero
        'hero.title':     '⚔ BNL LEAGUE ⚔',
        'hero.subtitle':  'Breaking New Limits · Warcraft III',
        'hero.desc1':     'A Warcraft 3: Reforged league for dedicated players. Compete in ladder, team battles, and clan wars.',
        'hero.desc2':     'Points are calculated automatically from W3Champions data based on MMR difference. Achievements grant bonus points.',
        'hero.stage':     '📅 Season 24 · Stage 1: Feb 9–22, 2026',
        'hero.points_title': 'Points System',
        'hero.win_strong':  '+70 pts — win vs stronger (+20 MMR)',
        'hero.win_equal':   '+50 pts — win vs equal (±20 MMR)',
        'hero.win_weak':    '+30 pts — win vs weaker (−20 MMR)',
        'hero.loss_weak':   '−40 pts — loss to weaker',
        'hero.loss_equal':  '−30 pts — loss to equal',
        'hero.loss_strong': '−20 pts — loss to stronger',

        // Standings
        'standings.title':   '🏆 Standings',
        'standings.rank':    '#',
        'standings.player':  'Player',
        'standings.race':    'Race',
        'standings.mmr':     'MMR',
        'standings.wins':    'Wins',
        'standings.losses':  'Losses',
        'standings.points':  'Points',
        'standings.empty':   'No data',
        'standings.loading': 'Loading standings...',
        'race.all':   'All races',
        'race.0':     'Random',
        'race.1':     'Human',
        'race.2':     'Orc',
        'race.4':     'Night Elf',
        'race.8':     'Undead',

        // Teams
        'teams.title':    '🛡 Teams',
        'teams.captain':  'Captain',
        'teams.empty':    'No teams yet',
        'teams.loading':  'Loading teams...',
        'teams.players_count': 'players',

        // ClanWar
        'cw.title':     '⚔ Clan Wars',
        'cw.all':       'All',
        'cw.upcoming':  'Upcoming',
        'cw.ongoing':   'Ongoing',
        'cw.completed': 'Completed',
        'cw.empty':     'No clan wars',
        'cw.loading':   'Loading...',
        'cw.match_fmt': 'Match',
        'cw.winner':    'Winner',
        'cw.status.upcoming':  'Upcoming',
        'cw.status.ongoing':   'Ongoing',
        'cw.status.completed': 'Completed',

        // Portraits
        'portraits.title':  '🖼 Portraits',
        'portraits.desc':   'Choose a portrait for your profile. All portraits are free.',
        'portraits.select': 'Select',
        'portraits.find':   'Find player',
        'portraits.tag':    'BattleTag (e.g. Player#1234)',
        'portraits.search': 'Search',
        'portraits.saved':  'Portrait saved!',
        'portraits.not_found': 'Player not found',

        // Admin
        'admin.title':      '⚙ Admin Panel',
        'admin.login':      '🔐 Admin Login',
        'admin.loginBtn':   'Sign in',
        'admin.logout':     'Logout',
        'admin.tab.players':'👤 Players',
        'admin.tab.teams':  '🛡 Teams',
        'admin.tab.tools':  '🔧 Tools',
        'admin.addPlayer':  'Add player',
        'admin.addTeam':    'Create team',
        'admin.search_w3c': 'Search W3Champions',
        'admin.searching':  'Searching...',
        'admin.found':      'Found',
        'admin.not_found':  'Not found',
        'admin.save':       'Save',
        'admin.cancel':     'Cancel',
        'admin.delete':     'Delete',
        'admin.assign_team':'Team',
        'admin.recalc':     '🔄 Recalculate stats',
        'admin.recalcing':  'Recalculating...',
        'admin.login_label':'Login',
        'admin.pass_label': 'Password',
    }
};

// ── Глобальный стейт языка ─────────────────────────────────────────────────
let _lang = localStorage.getItem('bnl_lang') || 'ru';

function getLang() { return _lang; }

function setLang(lang) {
    _lang = lang;
    localStorage.setItem('bnl_lang', lang);
    // Триггер ре-рендер через кастомное событие
    window.dispatchEvent(new Event('bnl_lang_change'));
}

function t(key) {
    return (LANGS[_lang] && LANGS[_lang][key]) || (LANGS['ru'] && LANGS['ru'][key]) || key;
}

// React hook для подписки на смену языка
function useLang() {
    const [lang, setLangState] = React.useState(getLang());
    React.useEffect(() => {
        const handler = () => setLangState(getLang());
        window.addEventListener('bnl_lang_change', handler);
        return () => window.removeEventListener('bnl_lang_change', handler);
    }, []);
    return lang;
}
