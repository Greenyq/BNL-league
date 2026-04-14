import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { adminApi, playersApi, teamsApi, matchesApi } from '../api'
import RaceIcon, { raceName } from '../components/RaceIcon'

const GOLD = '#c89b3c'
const BLUE = '#4a9eff'
const SURFACE = '#12121a'
const SURFACE2 = '#1a1a28'
const BORDER = '#2a2a3a'
const SUCCESS = '#4ade80'
const DANGER = '#f87171'

// ---- Reusable UI ----
function Btn({ children, onClick, variant = 'primary', disabled, style }) {
  const styles = {
    primary: { background: `linear-gradient(135deg, ${GOLD}, #a07830)`, color: '#0a0a0f', border: 'none' },
    secondary: { background: 'transparent', color: GOLD, border: `1px solid ${GOLD}` },
    danger: { background: `linear-gradient(135deg, #f87171, #dc2626)`, color: '#fff', border: 'none' },
    blue: { background: `linear-gradient(135deg, ${BLUE}, #2563eb)`, color: '#fff', border: 'none' },
  }
  return (
    <motion.button
      whileHover={{ scale: 1.03, opacity: 0.9 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '9px 22px',
        borderRadius: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 700,
        fontSize: 14,
        opacity: disabled ? 0.5 : 1,
        ...styles[variant],
        ...style,
      }}
    >
      {children}
    </motion.button>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, color: '#8a7a5a', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        background: SURFACE2, border: `1px solid ${BORDER}`,
        borderRadius: 8, color: '#e8d5a3', padding: '10px 14px',
        outline: 'none', width: '100%', fontSize: 14,
        transition: 'border-color 0.2s',
      }}
      onFocus={e => e.target.style.borderColor = GOLD}
      onBlur={e => e.target.style.borderColor = BORDER}
    />
  )
}

function Select({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        background: SURFACE2, border: `1px solid ${BORDER}`,
        borderRadius: 8, color: '#e8d5a3', padding: '10px 14px',
        outline: 'none', width: '100%', fontSize: 14,
      }}
    >
      {children}
    </select>
  )
}

function Alert({ msg, type = 'success' }) {
  if (!msg) return null
  const color = type === 'success' ? SUCCESS : DANGER
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      style={{
        background: `${color}15`,
        border: `1px solid ${color}50`,
        borderRadius: 8,
        padding: '10px 16px',
        color,
        fontSize: 13,
        marginBottom: 16,
      }}
    >
      {msg}
    </motion.div>
  )
}

// ---- Login ----
function LoginForm({ onLogin }) {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErr('')
    try {
      const res = await adminApi.login(login, password)
      const sessionId = res.data?.sessionId ?? res.data?.session
      if (sessionId) {
        localStorage.setItem('adminSession', sessionId)
        onLogin(sessionId)
      } else {
        setErr('Неверный ответ сервера')
      }
    } catch (e) {
      setErr(e.response?.data?.message ?? 'Неверный логин или пароль')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: '0 24px' }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: SURFACE,
          border: `1px solid ${GOLD}40`,
          borderRadius: 20,
          padding: 36,
          boxShadow: `0 0 40px ${GOLD}20`,
        }}
      >
        <h1 style={{ fontSize: 28, fontWeight: 900, color: GOLD, marginBottom: 8, textAlign: 'center' }}>
          Вход в панель
        </h1>
        <p style={{ color: '#8a7a5a', fontSize: 14, textAlign: 'center', marginBottom: 28 }}>
          BNL League Administration
        </p>

        <AnimatePresence>{err && <Alert msg={err} type="error" />}</AnimatePresence>

        <form onSubmit={submit}>
          <Field label="Логин">
            <Input value={login} onChange={setLogin} placeholder="admin" />
          </Field>
          <Field label="Пароль">
            <Input value={password} onChange={setPassword} placeholder="••••••••" type="password" />
          </Field>
          <Btn style={{ width: '100%', marginTop: 8 }} disabled={loading}>
            {loading ? 'Вход...' : 'Войти'}
          </Btn>
        </form>
      </motion.div>
    </div>
  )
}

// ---- Admin Panel Sections ----
function PlayersSection({ players, onRefresh }) {
  const [form, setForm] = useState({ battleTag: '', race: '1', mainRace: '1' })
  const [msg, setMsg] = useState({ text: '', type: 'success' })
  const [search, setSearch] = useState('')
  const [computing, setComputing] = useState(false)

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg({ text: '', type: 'success' }), 3000)
  }

  const create = async (e) => {
    e.preventDefault()
    try {
      await adminApi.createPlayer({
        battleTag: form.battleTag,
        race: Number(form.race),
        mainRace: Number(form.mainRace),
      })
      setForm({ battleTag: '', race: '1', mainRace: '1' })
      showMsg('Игрок добавлен')
      onRefresh()
    } catch (e) {
      showMsg(e.response?.data?.message ?? 'Ошибка', 'error')
    }
  }

  const remove = async (id) => {
    if (!confirm('Удалить игрока?')) return
    try {
      await adminApi.deletePlayer(id)
      showMsg('Удалён')
      onRefresh()
    } catch (e) {
      showMsg('Ошибка удаления', 'error')
    }
  }

  const computeStats = async () => {
    setComputing(true)
    try {
      await adminApi.computeStats()
      showMsg('Статистика пересчитана')
      onRefresh()
    } catch (e) {
      showMsg('Ошибка пересчёта', 'error')
    } finally {
      setComputing(false)
    }
  }

  const filtered = players.filter(p =>
    (p.battleTag ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: GOLD }}>Управление игроками</h2>
        <Btn variant="blue" onClick={computeStats} disabled={computing}>
          {computing ? '⏳ Пересчёт...' : '🔄 Пересчитать статы'}
        </Btn>
      </div>

      <AnimatePresence>{msg.text && <Alert msg={msg.text} type={msg.type} />}</AnimatePresence>

      {/* Add player form */}
      <div style={{ background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20, marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#e8d5a3', marginBottom: 16 }}>Добавить игрока</h3>
        <form onSubmit={create}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'flex-end' }}>
            <Field label="BattleTag">
              <Input value={form.battleTag} onChange={v => setForm(f => ({ ...f, battleTag: v }))} placeholder="Player#1234" />
            </Field>
            <Field label="Раса">
              <Select value={form.race} onChange={v => setForm(f => ({ ...f, race: v }))}>
                <option value="1">⚔️ Люди</option>
                <option value="2">🔥 Орки</option>
                <option value="4">🌿 Ночные эльфы</option>
                <option value="8">💀 Нежить</option>
                <option value="16">🎲 Случайная</option>
              </Select>
            </Field>
            <Field label="Основная раса">
              <Select value={form.mainRace} onChange={v => setForm(f => ({ ...f, mainRace: v }))}>
                <option value="1">⚔️ Люди</option>
                <option value="2">🔥 Орки</option>
                <option value="4">🌿 Ночные эльфы</option>
                <option value="8">💀 Нежить</option>
                <option value="16">🎲 Случайная</option>
              </Select>
            </Field>
            <div style={{ paddingBottom: 0 }}>
              <Btn>Добавить</Btn>
            </div>
          </div>
        </form>
      </div>

      {/* Player list */}
      <div style={{ marginBottom: 12 }}>
        <Input value={search} onChange={setSearch} placeholder="Поиск игрока..." />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {filtered.slice(0, 50).map(p => (
          <div key={p._id ?? p.id} style={{
            background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 8,
            padding: '10px 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <RaceIcon race={p.mainRace ?? p.race} size={18} />
              <span style={{ fontWeight: 600, fontSize: 14 }}>{p.battleTag}</span>
              <span style={{ color: '#8a7a5a', fontSize: 12 }}>{p.stats?.points ?? 0} pts</span>
            </div>
            <Btn variant="danger" style={{ padding: '5px 12px', fontSize: 12 }}
              onClick={() => remove(p._id ?? p.id)}>
              Удалить
            </Btn>
          </div>
        ))}
      </div>
    </div>
  )
}

function MatchesSection({ players, onRefresh }) {
  const [form, setForm] = useState({
    player1Id: '', player2Id: '', winnerId: '', points: '3',
    status: 'completed', scheduledDate: '', notes: '',
  })
  const [msg, setMsg] = useState({ text: '', type: 'success' })
  const [matches, setMatches] = useState([])

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg({ text: '', type: 'success' }), 3000)
  }

  useEffect(() => {
    matchesApi.getAll()
      .then(r => {
        const raw = r.data
        setMatches(Array.isArray(raw) ? raw : raw?.matches ?? [])
      })
      .catch(() => {})
  }, [])

  const create = async (e) => {
    e.preventDefault()
    try {
      await adminApi.createMatch({
        player1Id: form.player1Id,
        player2Id: form.player2Id,
        winnerId: form.winnerId || undefined,
        points: Number(form.points) || 3,
        status: form.status,
        scheduledDate: form.scheduledDate || undefined,
        notes: form.notes || undefined,
      })
      setForm({ player1Id: '', player2Id: '', winnerId: '', points: '3', status: 'completed', scheduledDate: '', notes: '' })
      showMsg('Матч создан')
      onRefresh()
      matchesApi.getAll().then(r => {
        const raw = r.data
        setMatches(Array.isArray(raw) ? raw : raw?.matches ?? [])
      })
    } catch (e) {
      showMsg(e.response?.data?.message ?? 'Ошибка', 'error')
    }
  }

  const remove = async (id) => {
    if (!confirm('Удалить матч?')) return
    try {
      await adminApi.deleteMatch(id)
      showMsg('Матч удалён')
      setMatches(m => m.filter(x => (x._id ?? x.id) !== id))
    } catch (e) {
      showMsg('Ошибка', 'error')
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: GOLD, marginBottom: 20 }}>Управление матчами</h2>
      <AnimatePresence>{msg.text && <Alert msg={msg.text} type={msg.type} />}</AnimatePresence>

      <div style={{ background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20, marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#e8d5a3', marginBottom: 16 }}>Создать матч</h3>
        <form onSubmit={create}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Игрок 1">
              <Select value={form.player1Id} onChange={v => setForm(f => ({ ...f, player1Id: v }))}>
                <option value="">— Выбрать —</option>
                {players.map(p => (
                  <option key={p._id ?? p.id} value={p._id ?? p.id}>{p.battleTag}</option>
                ))}
              </Select>
            </Field>
            <Field label="Игрок 2">
              <Select value={form.player2Id} onChange={v => setForm(f => ({ ...f, player2Id: v }))}>
                <option value="">— Выбрать —</option>
                {players.map(p => (
                  <option key={p._id ?? p.id} value={p._id ?? p.id}>{p.battleTag}</option>
                ))}
              </Select>
            </Field>
            <Field label="Победитель">
              <Select value={form.winnerId} onChange={v => setForm(f => ({ ...f, winnerId: v }))}>
                <option value="">— Нет победителя —</option>
                {[form.player1Id, form.player2Id].filter(Boolean).map(id => {
                  const p = players.find(x => (x._id ?? x.id) === id)
                  return p ? (
                    <option key={id} value={id}>{p.battleTag}</option>
                  ) : null
                })}
              </Select>
            </Field>
            <Field label="Очки">
              <Input value={form.points} onChange={v => setForm(f => ({ ...f, points: v }))} placeholder="3" type="number" />
            </Field>
            <Field label="Статус">
              <Select value={form.status} onChange={v => setForm(f => ({ ...f, status: v }))}>
                <option value="completed">Завершён</option>
                <option value="upcoming">Запланирован</option>
              </Select>
            </Field>
            <Field label="Дата">
              <Input value={form.scheduledDate} onChange={v => setForm(f => ({ ...f, scheduledDate: v }))} type="date" />
            </Field>
            <Field label="Заметки" style={{ gridColumn: '1/-1' }}>
              <Input value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} placeholder="Примечания..." />
            </Field>
          </div>
          <Btn style={{ marginTop: 8 }}>Создать матч</Btn>
        </form>
      </div>

      {/* Recent matches */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {[...matches].sort((a,b) => new Date(b.createdAt??0) - new Date(a.createdAt??0)).slice(0, 20).map(m => {
          const p1 = players.find(p => (p._id ?? p.id) === m.player1Id)
          const p2 = players.find(p => (p._id ?? p.id) === m.player2Id)
          return (
            <div key={m._id ?? m.id} style={{
              background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 8,
              padding: '10px 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            }}>
              <span style={{ fontSize: 14 }}>
                <span style={{ color: m.winnerId === (p1?._id ?? p1?.id) ? GOLD : '#e8d5a3', fontWeight: 600 }}>
                  {p1?.battleTag?.split('#')[0] ?? '—'}
                </span>
                <span style={{ color: '#8a7a5a', margin: '0 8px' }}>vs</span>
                <span style={{ color: m.winnerId === (p2?._id ?? p2?.id) ? GOLD : '#e8d5a3', fontWeight: 600 }}>
                  {p2?.battleTag?.split('#')[0] ?? '—'}
                </span>
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 11,
                  color: m.status === 'completed' ? SUCCESS : BLUE,
                  background: m.status === 'completed' ? `${SUCCESS}15` : `${BLUE}15`,
                  border: `1px solid ${m.status === 'completed' ? `${SUCCESS}40` : `${BLUE}40`}`,
                  borderRadius: 4, padding: '2px 8px',
                }}>
                  {m.status === 'completed' ? 'Завершён' : 'Запланирован'}
                </span>
                <Btn variant="danger" style={{ padding: '4px 10px', fontSize: 12 }}
                  onClick={() => remove(m._id ?? m.id)}>
                  ✕
                </Btn>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---- Main Admin Panel ----
export default function Admin() {
  const [session, setSession] = useState(localStorage.getItem('adminSession'))
  const [tab, setTab] = useState('players')
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!session) return
    // Verify session
    adminApi.verify().catch(() => {
      localStorage.removeItem('adminSession')
      setSession(null)
    })
  }, [session])

  const loadPlayers = () => {
    setLoading(true)
    playersApi.getAll()
      .then(r => setPlayers(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (session) loadPlayers()
  }, [session])

  const logout = () => {
    adminApi.logout().catch(() => {})
    localStorage.removeItem('adminSession')
    setSession(null)
  }

  if (!session) return <LoginForm onLogin={setSession} />

  const TABS = [
    { key: 'players', label: 'Игроки' },
    { key: 'matches', label: 'Матчи' },
  ]

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px' }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}
      >
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: GOLD, marginBottom: 4 }}>Панель администратора</h1>
          <p style={{ color: '#8a7a5a', fontSize: 14 }}>BNL League Management</p>
        </div>
        <Btn variant="secondary" onClick={logout}>Выйти</Btn>
      </motion.div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28, borderBottom: `1px solid ${BORDER}`, paddingBottom: 0 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '10px 20px',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              borderBottom: tab === t.key ? `2px solid ${GOLD}` : '2px solid transparent',
              background: tab === t.key ? `${GOLD}10` : 'transparent',
              color: tab === t.key ? GOLD : '#8a7a5a',
              cursor: 'pointer',
              fontWeight: tab === t.key ? 700 : 500,
              fontSize: 14,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {tab === 'players' && <PlayersSection players={players} onRefresh={loadPlayers} />}
          {tab === 'matches' && <MatchesSection players={players} onRefresh={loadPlayers} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
