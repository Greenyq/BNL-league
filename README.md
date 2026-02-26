# BNL - Battle Newbie League | Warcraft 3

Сайт лиги по Warcraft 3: Reforged с интеграцией W3Champions API, подсчетом очков по MMR и админ-панелью для управления командными турнирами.

## Структура проекта

```
BNL-league/
├── src/
│   ├── backend/            # Node.js API сервер
│   │   ├── server.js       # Точка входа
│   │   ├── routes.js       # API endpoints
│   │   ├── models.js       # MongoDB модели
│   │   ├── middleware.js    # Middleware (auth, CORS)
│   │   └── scheduler.js    # Фоновые задачи
│   ├── migrations/         # Миграции БД
│   └── stats-processor/    # Go микросервис для статистики
│       ├── main.go         # Go stats processor
│       ├── go.mod
│       ├── go.sum
│       └── Dockerfile
├── public/                 # Фронтенд (React CDN)
│   ├── index.html
│   ├── app.js
│   ├── admin-components.js
│   ├── admin-cache.js
│   └── styles.css
├── scripts/                # Утилиты
├── data/                   # JSON хранилище
├── docker-compose.yml
└── package.json
```

## Запуск

### Docker (рекомендуется)

```bash
cp .env.example .env
# Заполните .env своими значениями
docker-compose up -d
```

Сервисы:
- **Node.js API**: http://localhost:3000
- **Go Stats Processor**: http://localhost:3001
- **MongoDB**: localhost:27017

### Локальная разработка

```bash
npm install
npm start
# http://localhost:3000
```

Go stats processor (опционально):
```bash
cd src/stats-processor
go mod download
export MONGO_URL=mongodb://localhost:27017/gnl_league
go run main.go
```

## Система очков

### W3Champions Points (автоматически)

Очки начисляются на основе разницы MMR:
- Победа vs сильный противник (+20 MMR): 30 очков
- Победа vs равный (+-20 MMR): 50 очков
- Победа vs слабый (-20 MMR): 70 очков
- Поражение: -20 до -40 очков (минимум 0)

Бонусы за достижения: Centurion (100 побед), Warrior (50 побед), Gold Rush (1000+ очков).

### Custom Points (ручное управление)

Админ создает командные матчи, назначает победителя и количество очков. Отдельный рейтинг для специальных турниров.

## Админ-панель

Вход через UI с логином/паролем (задаются в `.env`).

Возможности:
- Управление командами (название, логотип, капитан)
- Добавление игроков через поиск W3Champions
- Создание командных матчей с назначением очков
- Управление рейтингом команд

## API

| Endpoint | Метод | Описание |
|----------|-------|----------|
| `/api/matches/:battleTag` | GET | Матчи игрока из W3Champions |
| `/api/players/with-cache` | GET | Статистика игроков (с кэшем) |
| `/health` (порт 3001) | GET | Health check Go процессора |
| `/compute-stats` (порт 3001) | POST | Расчет статистики (Go) |

## Переменные окружения

```bash
ADMIN_LOGIN=your_login
ADMIN_PASSWORD=your_password
MONGO_URL=mongodb://localhost:27017/gnl_league
GO_WORKER_URL=http://localhost:3001  # или http://stats-processor:3001 в Docker
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.com
```

## Технологии

- **Backend**: Node.js + Express + MongoDB (Mongoose)
- **Frontend**: React (CDN) + Custom CSS
- **Stats Processor**: Go + goroutines (параллельная обработка 100+ игроков)
- **API**: W3Champions Matches API
- **Инфраструктура**: Docker Compose

## Лицензия

MIT
