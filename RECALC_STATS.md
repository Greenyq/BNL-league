# Пересчет статистики игроков

После обновления кода, который влияет на статистику (например, добавление matchHistory), нужно пересчитать статистику для всех игроков.

## Вариант 1: Локально

Если у вас есть доступ к серверу или запускаете локально:

```bash
npm run recalc-stats
```

## Вариант 2: Через API (для Render)

### Шаг 1: Настроить переменную окружения в Render

1. Зайдите в Dashboard вашего Web Service на Render
2. Перейдите в **Environment**
3. Добавьте новую переменную:
   - **Key**: `RECALC_SECRET_TOKEN`
   - **Value**: любой случайный токен (например: `my-secret-token-12345` или используйте [генератор](https://www.uuidgenerator.net/))
4. Сохраните и задеплойте изменения

### Шаг 2: Вызвать API endpoint

После деплоя выполните команду (замените YOUR_TOKEN и YOUR_DOMAIN):

```bash
curl -X POST https://YOUR_DOMAIN.onrender.com/api/recalc-stats \
  -H "X-Recalc-Token: YOUR_TOKEN"
```

**Пример:**
```bash
curl -X POST https://bnl-league.onrender.com/api/recalc-stats \
  -H "X-Recalc-Token: my-secret-token-12345"
```

### Ответ

Успешный ответ:
```json
{
  "success": true,
  "message": "Stats recalculation completed",
  "updated": 150,
  "elapsed": 1234
}
```

## Безопасность

⚠️ **ВАЖНО**: Всегда устанавливайте `RECALC_SECRET_TOKEN` в production!

- Если токен **НЕ установлен** - endpoint доступен всем (только для dev)
- Если токен **установлен** - требуется правильный токен в заголовке

## Когда нужно пересчитывать статистику?

- После изменения логики подсчета очков
- После добавления новых полей (например, matchHistory)
- После изменения achievement условий
- После миграции/импорта данных
