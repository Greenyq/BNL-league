import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { playersApi, matchesApi } from '../api'
import { useCountUp } from '../hooks/useCountUp'
import RaceIcon from '../components/RaceIcon'

const GOLD = '#c89b3c'
const BLUE = '#4a9eff'
const SURFACE = '#12121a'
const BORDER = '#2a2a3a'

// ------- Animated Counter Stat -------
function StatBubble({ label, value, color = GOLD }) {
  const count = useCountUp(value ?? 0, 1800)
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        flex: 1,
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        padding: '20px 24px',
        textAlign: 'center',
        minWidth: 140,
      }}
    >
      <div style={{ fontSize: 36, fontWeight: 900, color, textShadow: `0 0 20px ${color}60` }}>
        {count}
      </div>
      <div style={{ fontSize: 12, color: '#8a7a5a', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {label}
      </div>
    </motion.div>
  )
}

// ------- Podium Card -------
function PodiumCard({ player, rank, delay = 0 }) {
  const heights = [180, 140, 110]
  const colors = [GOLD, '#a8a8b8', '#cd7f32']
  const labels = ['🥇', '🥈', '🥉']
  const h = heights[rank - 1] ?? 100
  const c = colors[rank - 1] ?? GOLD

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, type: 'spring', stiffness: 120 }}
      whileHover={{ y: -6, boxShadow: `0 0 30px ${c}60, 0 8px 30px rgba(0,0,0,0.5)` }}
      style={{
        width: 160,
        background: SURFACE,
        border: `1px solid ${c}55`,
        borderRadius: 16,
        padding: '20px 16px',
        textAlign: 'center',
        cursor: 'default',
        transition: 'box-shadow 0.3s',
        boxShadow: `0 0 15px ${c}30`,
        alignSelf: 'flex-end',
        marginBottom: rank === 1 ? 0 : rank === 2 ? 40 : 70,
      }}
    >
      <div style={{ fontSize: 32, marginBottom: 8 }}>{labels[rank - 1]}</div>
      <div style={{
        width: 48, height: 48,
        background: `linear-gradient(135deg, ${c}40, ${c}20)`,
        border: `2px solid ${c}`,
        borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 12px',
        fontSize: 20,
        boxShadow: `0 0 12px ${c}50`,
      }}>
        <RaceIcon race={player?.mainRace ?? player?.race} size={22} />
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: c, marginBottom: 4, wordBreak: 'break-word' }}>
        {player?.battleTag?.split('#')[0] ?? '—'}
      </div>
      <div style={{ fontSize: 11, color: '#8a7a5a' }}>
        {player?.stats?.points ?? 0} очков
      </div>
      <div style={{ fontSize: 11, color: '#8a7a5a', marginTop: 2 }}>
        {player?.stats?.wins ?? 0}W / {player?.stats?.losses ?? 0}L
      </div>
    </motion.div>
  )
}

// ------- Match Feed Card -------
function MatchCard({ match, players, delay = 0 }) {
  const find = (id) => players.find(p => p.id === id || p._id === id)
  const p1 = find(match.player1Id)
  const p2 = find(match.player2Id)
  const winner = find(match.winnerId)
  const winnerTag = winner?.battleTag?.split('#')[0]

  const formatDate = (d) => {
    if (!d) return ''
    const dt = new Date(d)
    return dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ x: 4, borderColor: `${GOLD}55` }}
      style={{
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        transition: 'border-color 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
        <RaceIcon race={p1?.mainRace ?? p1?.race} size={18} />
        <span style={{
          fontSize: 14, fontWeight: 600,
          color: match.winnerId === (p1?.id ?? p1?._id) ? GOLD : '#e8d5a3',
        }}>
          {p1?.battleTag?.split('#')[0] ?? 'Игрок 1'}
        </span>
      </div>
      <div style={{ textAlign: 'center', padding: '0 12px' }}>
        <div style={{ fontSize: 11, color: GOLD, fontWeight: 700, letterSpacing: '0.15em' }}>VS</div>
        <div style={{ fontSize: 10, color: '#8a7a5a', marginTop: 2 }}>{formatDate(match.scheduledDate ?? match.createdAt)}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end' }}>
        <span style={{
          fontSize: 14, fontWeight: 600,
          color: match.winnerId === (p2?.id ?? p2?._id) ? GOLD : '#e8d5a3',
        }}>
          {p2?.battleTag?.split('#')[0] ?? 'Игрок 2'}
        </span>
        <RaceIcon race={p2?.mainRace ?? p2?.race} size={18} />
      </div>
      {match.status === 'completed' && winnerTag && (
        <div style={{
          background: `${GOLD}20`,
          border: `1px solid ${GOLD}50`,
          borderRadius: 6,
          padding: '2px 8px',
          fontSize: 11, color: GOLD, fontWeight: 600,
          whiteSpace: 'nowrap',
        }}>
          ✓ {winnerTag}
        </div>
      )}
    </motion.div>
  )
}

export default function Home() {
  const [players, setPlayers] = useState([])
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const [pRes, mRes] = await Promise.allSettled([
        playersApi.getAll(),
        matchesApi.getAll(),
      ])
      if (pRes.status === 'fulfilled') setPlayers(pRes.value.data ?? [])
      if (mRes.status === 'fulfilled') {
        const raw = mRes.value.data ?? []
        setMatches(Array.isArray(raw) ? raw : raw.matches ?? [])
      }
    } catch (e) {
      // silently degrade
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const timer = setInterval(load, 60000)
    return () => clearInterval(timer)
  }, [])

  // Sort by points for podium
  const sorted = [...players].sort((a, b) => (b.stats?.points ?? 0) - (a.stats?.points ?? 0))
  const top3 = sorted.slice(0, 3)

  const recentMatches = [...matches]
    .sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0))
    .slice(0, 5)

  const totalMatches = matches.length
  const completedMatches = matches.filter(m => m.status === 'completed').length

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px' }}>

      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 64 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          <motion.h1
            style={{
              fontSize: 'clamp(36px, 6vw, 72px)',
              fontWeight: 900,
              color: GOLD,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              textShadow: `0 0 40px ${GOLD}60`,
              marginBottom: 16,
            }}
          >
            BNL — Battle Newbie League
          </motion.h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          style={{ fontSize: 18, color: '#8a7a5a', marginBottom: 40, letterSpacing: '0.05em' }}
        >
          Соревновательная лига по Warcraft III Reforged
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}
        >
          <Link to="/standings" style={{ textDecoration: 'none' }}>
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: `0 0 25px ${GOLD}60` }}
              whileTap={{ scale: 0.97 }}
              style={{
                background: `linear-gradient(135deg, ${GOLD}, #a07830)`,
                color: '#0a0a0f', fontWeight: 800,
                padding: '14px 32px', borderRadius: 10,
                border: 'none', cursor: 'pointer', fontSize: 15,
              }}
            >
              Таблица standings
            </motion.button>
          </Link>
          <Link to="/matches" style={{ textDecoration: 'none' }}>
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: `0 0 20px ${BLUE}50` }}
              whileTap={{ scale: 0.97 }}
              style={{
                background: 'transparent',
                color: BLUE, fontWeight: 700,
                padding: '14px 32px', borderRadius: 10,
                border: `1px solid ${BLUE}`, cursor: 'pointer', fontSize: 15,
              }}
            >
              Все матчи
            </motion.button>
          </Link>
        </motion.div>
      </div>

      {/* Stats bar */}
      {!loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{ display: 'flex', gap: 16, marginBottom: 64, flexWrap: 'wrap' }}
        >
          <StatBubble label="Игроков" value={players.length} color={GOLD} />
          <StatBubble label="Матчей" value={totalMatches} color={BLUE} />
          <StatBubble label="Завершено" value={completedMatches} color="#4ade80" />
        </motion.div>
      )}

      {/* Podium */}
      {top3.length > 0 && (
        <div style={{ marginBottom: 64 }}>
          <motion.h2
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            style={{ fontSize: 24, fontWeight: 800, color: GOLD, marginBottom: 32, letterSpacing: '0.05em' }}
          >
            🏆 Топ игроков
          </motion.h2>
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            gap: 20,
            flexWrap: 'wrap',
          }}>
            {top3.length >= 2 && <PodiumCard player={top3[1]} rank={2} delay={0.1} />}
            {top3.length >= 1 && <PodiumCard player={top3[0]} rank={1} delay={0} />}
            {top3.length >= 3 && <PodiumCard player={top3[2]} rank={3} delay={0.2} />}
          </div>
        </div>
      )}

      {/* Recent matches */}
      <div>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}
        >
          <h2 style={{ fontSize: 24, fontWeight: 800, color: GOLD }}>
            🎮 Последние матчи
          </h2>
          <Link to="/matches" style={{ textDecoration: 'none', color: BLUE, fontSize: 13 }}>
            Все матчи →
          </Link>
        </motion.div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#8a7a5a', padding: 40 }}>Загрузка...</div>
        ) : recentMatches.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#8a7a5a', padding: 40 }}>Матчи не найдены</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentMatches.map((m, i) => (
              <MatchCard key={m._id ?? m.id ?? i} match={m} players={players} delay={i * 0.08} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
