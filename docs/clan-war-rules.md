# BNL Clan War Format

Клан-вар играется до 3 побед одной из команд. / A clan war is played until one team reaches 3 wins.
Каждый матч внутри — BO3. / Each internal match is BO3.

## Порядок матчей / Match order

| # | Формат / Format | Описание / Description |
|---|------------------|------------------------|
| 1 | 1v1 | Дуэль A / Duel A |
| 2 | 1v1 | Дуэль B / Duel B |
| 3 | 2v2 | Командный бой / Team battle |
| 4 | 1v1 | *(только если счёт 2–1 / only if the score is 2–1)* |
| 5 | 1v1 / 2v2 / 3v3 | Тай-брейк / Tiebreak *(если счёт 2–2, формат согласовывается заранее / if the score is 2–2, the format is agreed in advance)* |

## Правила / Rules

- Победитель клан-вара — первая команда, набравшая **3 победы** в матчах. / The clan-war winner is the first team to reach **3 match wins**.
- Каждый отдельный матч играется в формате **BO3** (best of 3 games). / Each individual match is played as **BO3**.
- Формат тай-брейка (матч 5) согласовывается **до** начала клан-вара. / The tiebreak format (match 5) is agreed **before** the clan war starts.
- Результаты каждой игры (карта + победитель) фиксируются в системе. / The result of each game (map + winner) is stored in the system.

## Статусы клан-вара / Clan-war statuses

- `upcoming` — анонсирован, дата определена, ещё не начался / announced, dated, not started yet
- `ongoing` — идёт в данный момент / currently in progress
- `completed` — завершён, победитель определён / finished, winner determined

## Статусы внутренних матчей / Internal match statuses

- Счёт указывается как `a : b` (победы первой и второй стороны в BO3). / The score is stored as `a : b` (wins for side one and side two in BO3).
- Победитель матча (`winner: 'a'` или `'b'`) фиксируется после завершения. / The match winner (`winner: 'a'` or `'b'`) is set after completion.
- Все сыгранные игры хранятся в поле `games[]` с указанием карты и победителя. / All played games are stored in `games[]` with the map and winner.
