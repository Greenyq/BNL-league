import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { matchesApi, playersApi } from '../api'
import RaceIcon from '../components/RaceIcon'

const GOLD = '#c89b3c'
const BLUE = '#4a9eff'
const SURFACE = '#12121a'
const SURFACE2 = '#1a1a28'
const BORDER = '#2a2a3a'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function MatchCard({ match, players, delay = 0 }) {
  const [open, setOpen] = useState(false)

  const find = (id) => players.find(p => (p.id ?? p._id) === id)
  const p1 = find(match.player1Id)
  const p2 = find(match.player2Id)
  const winner = find(match.winnerId)

  const isCompleted = match.status === 'completed'
  const p1Won = match.winnerId && match.winnerId === (p1?.id ?? p1?._id)
  const p2Won = match.winnerId && match.winnerId === (p2?.id ?? p2?._id)

  const tag = (p) => p?.battleTag?.split('#')[0] ?? '—'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.05, duration: 0.4 }}
      layout
      style={{
        background: SURFACE,
        border: `1px solid ${open ? `${GOLD}50` : BORDER}`,
        borderRadius: 14,
        overflow: 'hidden',
        transition: 'border-color 0.3s',
        cursor: 'pointer',
      }}
      onClick={() => setOpen(o => !o)}
      whileHover={{ boxShadow: `0 0 20px ${GOLD}20, 0 4px 20px rgba(0,0,0,0.4)`, y: -2 }}
    >
      {/* Header */}
      <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Status badge */}
        <div style={{
          padding: '3px 10px',
          borderRadius: 20,
          fontSize: 11,
          fontWeight: 700,
          background: isCompleted ? 'rgba(74,222,128,0.15)' : 'rgba(74,158,255,0.15)',
          color: isCompleted ? '#4ade80' : BLUE,
          border: `1px solid ${isCompleted ? '#4ade8050' : `${BLUE}50`}`,
          whiteSpace: 'nowrap',
        }}>
          {isCompleted ? 'Завершён' : 'Запланирован'}
        </div>

        {/* Player 1 */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
          <span style={{
            fontWeight: p1Won ? 800 : 500,
            color: p1Won ? GOLD : '#e8d5a3',
            fontSize: 15,
            textShadow: p1Won ? `0 0 10px ${GOLD}50` : 'none',
          }}>
            {tag(p1)}
          </span>
          <RaceIcon race={p1?.mainRace ?? p1?.race} size={20} />
        </div>

        {/* VS */}
        <div style={{ textAlign: 'center', minWidth: 60 }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: GOLD, letterSpacing: '0.2em' }}>VS</div>
          {match.points != null && (
            <div style={{ fontSize: 10, color: '#8a7a5a', marginTop: 2 }}>+{match.points} pts</div>
          )}
        </div>

        {/* Player 2 */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
          <RaceIcon race={p2?.mainRace ?? p2?.race} size={20} />
          <span style={{
            fontWeight: p2Won ? 800 : 500,
            color: p2Won ? GOLD : '#e8d5a3',
            fontSize: 15,
            textShadow: p2Won ? `0 0 10px ${GOLD}50` : 'none',
          }}>
            {tag(p2)}
          </span>
        </div>

        {/* Date + expand */}
        <div style={{ textAlign: 'right', minWidth: 100 }}>
          <div style={{ fontSize: 12, color: '#8a7a5a' }}>{formatDate(match.scheduledDate ?? match.createdAt)}</div>
          {match.scheduledTime && (
            <div style={{ fontSize: 11, color: BLUE }}>{match.scheduledTime}</div>
          )}
        </div>
        <div style={{ color: '#8a7a5a', fontSize: 18, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}>
          ▾
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              borderTop: `1px solid ${BORDER}`,
              background: SURFACE2,
              padding: '16px 20px',
              display: 'flex',
              gap: 24,
              flexWrap: 'wrap',
            }}>
              {winner && (
                <div>
                  <div style={{ fontSize: 11, color: '#8a7a5a', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Победитель</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: GOLD, fontWeight: 700 }}>
                    🏆 {tag(winner)}
                  </div>
                </div>
              )}
              {match.notes && (
                <div>
                  <div style={{ fontSize: 11, color: '#8a7a5a', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Заметки</div>
                  <div style={{ fontSize: 13, color: '#e8d5a3' }}>{match.notes}</div>
                </div>
              )}
              {match.w3championsMatchId && (
                <div>
                  <div style={{ fontSize: 11, color: '#8a7a5a', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>W3C ID</div>
                  <div style={{ fontSize: 13, color: BLUE, fontFamily: 'monospace' }}>{match.w3championsMatchId}</div>
                </div>
              )}
              {match.points != null && (
                <div>
                  <div style={{ fontSize: 11, color: '#8a7a5a', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Очки</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: GOLD }}>+{match.pointsOverride ?? match.points}</div>
                </div>
              )}
              {p1 && (
                <div>
                  <div style={{ fontSize: 11, color: '#8a7a5a', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Игрок 1</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <RaceIcon race={p1.mainRace ?? p1.race} size={16} />
                    <span style={{ fontSize: 13 }}>{p1.battleTag}</span>
                  </div>
                </div>
              )}
              {p2 && (
                <div>
                  <div style={{ fontSize: 11, color: '#8a7a5a', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Игрок 2</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <RaceIcon race={p2.mainRace ?? p2.race} size={16} />
                    <span style={{ fontSize: 13 }}>{p2.battleTag}</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function Matches() {
  const [matches, setMatches] = useState([])
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all' | 'completed' | 'upcoming'

  useEffect(() => {
    Promise.allSettled([matchesApi.getAll(), playersApi.getAll()])
      .then(([mRes, pRes]) => {
        if (mRes.status === 'fulfilled') {
          const raw = mRes.value.data
          setMatches(Array.isArray(raw) ? raw : raw?.matches ?? [])
        }
        if (pRes.status === 'fulfilled') setPlayers(pRes.value.data ?? [])
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = matches
    .filter(m => filter === 'all' || m.status === filter)
    .sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0))

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px' }}>

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 36, fontWeight: 900, color: GOLD, textShadow: `0 0 30px ${GOLD}50`, marginBottom: 8 }}>
          Матчи
        </h1>
        <p style={{ color: '#8a7a5a' }}>{matches.length} матчей в базе</p>
      </motion.div>

      {/* Filter tabs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        style={{ display: 'flex', gap: 10, marginBottom: 28 }}
      >
        {[
          { key: 'all', label: 'Все' },
          { key: 'completed', label: 'Завершённые' },
          { key: 'upcoming', label: 'Предстоящие' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              border: `1px solid ${filter === tab.key ? GOLD : BORDER}`,
              background: filter === tab.key ? `${GOLD}20` : SURFACE,
              color: filter === tab.key ? GOLD : '#8a7a5a',
              cursor: 'pointer',
              fontWeight: filter === tab.key ? 700 : 500,
              fontSize: 14,
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Match list */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#8a7a5a', padding: 60 }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            style={{ width: 32, height: 32, border: `3px solid ${GOLD}`, borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px' }}
          />
          Загрузка...
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ textAlign: 'center', color: '#8a7a5a', padding: 60,
            background: SURFACE, borderRadius: 16, border: `1px solid ${BORDER}` }}
        >
          Матчи не найдены
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((m, i) => (
            <MatchCard
              key={m._id ?? m.id ?? i}
              match={m}
              players={players}
              delay={i}
            />
          ))}
        </div>
      )}
    </div>
  )
}
