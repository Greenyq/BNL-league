import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { playersApi } from '../api'
import RaceIcon from '../components/RaceIcon'
import { useCountUp } from '../hooks/useCountUp'

const GOLD = '#c89b3c'
const BLUE = '#4a9eff'
const SURFACE = '#12121a'
const BORDER = '#2a2a3a'

const RANK_STYLES = [
  { bg: 'rgba(200,155,60,0.12)', border: 'rgba(200,155,60,0.5)', text: GOLD, medal: '🥇' },
  { bg: 'rgba(168,168,184,0.12)', border: 'rgba(168,168,184,0.5)', text: '#a8a8b8', medal: '🥈' },
  { bg: 'rgba(205,127,50,0.12)', border: 'rgba(205,127,50,0.5)', text: '#cd7f32', medal: '🥉' },
]

function AnimatedNumber({ value }) {
  const n = useCountUp(value ?? 0, 1200)
  return <>{n}</>
}

function PlayerRow({ player, rank, delay }) {
  const rs = rank <= 3 ? RANK_STYLES[rank - 1] : null
  const tag = player.battleTag?.split('#')[0] ?? player.battleTag ?? '—'
  const pts = player.stats?.points ?? 0
  const wins = player.stats?.wins ?? 0
  const losses = player.stats?.losses ?? 0
  const mmr = player.stats?.mmr ?? player.currentMmr ?? 0
  const total = wins + losses

  return (
    <motion.tr
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay * 0.06, duration: 0.4, ease: 'easeOut' }}
      whileHover={{ scale: 1.005 }}
      style={{
        background: rs ? rs.bg : (rank % 2 === 0 ? 'rgba(26,26,40,0.4)' : 'transparent'),
        cursor: 'default',
      }}
    >
      {/* Rank */}
      <td style={{
        padding: '14px 12px',
        borderRadius: '8px 0 0 8px',
        borderLeft: rs ? `3px solid ${rs.border}` : '3px solid transparent',
        width: 60,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {rs ? (
            <span style={{ fontSize: 18 }}>{rs.medal}</span>
          ) : (
            <span style={{ color: '#8a7a5a', fontWeight: 700, fontSize: 15 }}>#{rank}</span>
          )}
        </div>
      </td>

      {/* Player */}
      <td style={{ padding: '14px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34,
            background: rs ? `${rs.border}30` : '#2a2a3a',
            border: `1px solid ${rs ? rs.border : BORDER}`,
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <RaceIcon race={player.mainRace ?? player.race} size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 700, color: rs ? rs.text : '#e8d5a3', fontSize: 14 }}>
              {tag}
            </div>
            <div style={{ fontSize: 11, color: '#8a7a5a' }}>
              {player.battleTag?.includes('#') ? player.battleTag : ''}
            </div>
          </div>
        </div>
      </td>

      {/* Race */}
      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
        <RaceIcon race={player.mainRace ?? player.race} size={20} showLabel={false} />
      </td>

      {/* W/L */}
      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
        <span style={{ color: '#4ade80', fontWeight: 700 }}>{wins}</span>
        <span style={{ color: '#8a7a5a', margin: '0 4px' }}>/</span>
        <span style={{ color: '#f87171', fontWeight: 700 }}>{losses}</span>
        {total > 0 && (
          <div style={{ fontSize: 10, color: '#8a7a5a', marginTop: 2 }}>
            {Math.round(wins / total * 100)}% WR
          </div>
        )}
      </td>

      {/* MMR */}
      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
        <span style={{ color: BLUE, fontWeight: 700 }}>
          <AnimatedNumber value={mmr} />
        </span>
      </td>

      {/* Points */}
      <td style={{ padding: '14px 12px', textAlign: 'right', borderRadius: '0 8px 8px 0', paddingRight: 20 }}>
        <span style={{
          color: rs ? rs.text : GOLD,
          fontWeight: 900, fontSize: 17,
          textShadow: rs ? `0 0 10px ${rs.text}40` : 'none',
        }}>
          <AnimatedNumber value={pts} />
        </span>
        <span style={{ color: '#8a7a5a', fontSize: 11, marginLeft: 4 }}>pts</span>
      </td>
    </motion.tr>
  )
}

export default function Standings() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('points') // 'points' | 'mmr'
  const [search, setSearch] = useState('')

  useEffect(() => {
    playersApi.getAll()
      .then(r => setPlayers(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = players
    .filter(p => {
      const tag = (p.battleTag ?? '').toLowerCase()
      return tag.includes(search.toLowerCase())
    })
    .sort((a, b) => {
      if (filter === 'mmr') return (b.stats?.mmr ?? b.currentMmr ?? 0) - (a.stats?.mmr ?? a.currentMmr ?? 0)
      return (b.stats?.points ?? 0) - (a.stats?.points ?? 0)
    })

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px' }}>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 32 }}
      >
        <h1 style={{
          fontSize: 36, fontWeight: 900, color: GOLD,
          textShadow: `0 0 30px ${GOLD}50`,
          marginBottom: 8,
        }}>
          Таблица лидеров
        </h1>
        <p style={{ color: '#8a7a5a', fontSize: 15 }}>
          {players.length} игроков в лиге
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}
      >
        {[
          { key: 'points', label: 'По очкам' },
          { key: 'mmr', label: 'По MMR' },
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

        <input
          placeholder="Поиск по нику..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: 200, flex: 'none',
            background: SURFACE,
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            color: '#e8d5a3',
            padding: '8px 14px',
            outline: 'none',
            fontSize: 14,
          }}
        />
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        style={{
          background: SURFACE,
          border: `1px solid ${BORDER}`,
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
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
          <div style={{ textAlign: 'center', color: '#8a7a5a', padding: 60 }}>Игроки не найдены</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 2px' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {['#', 'Игрок', 'Раса', 'W / L', 'MMR', 'Очки'].map((h, i) => (
                  <th key={h} style={{
                    padding: '14px 12px',
                    textAlign: i >= 3 ? 'center' : 'left',
                    color: '#8a7a5a',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    fontWeight: 600,
                    paddingRight: i === 5 ? 20 : undefined,
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((player, i) => (
                  <PlayerRow
                    key={player._id ?? player.id ?? i}
                    player={player}
                    rank={i + 1}
                    delay={i}
                  />
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </motion.div>
    </div>
  )
}
