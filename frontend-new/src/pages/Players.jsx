import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { playersApi } from '../api'
import RaceIcon, { raceName } from '../components/RaceIcon'

const GOLD = '#c89b3c'
const BLUE = '#4a9eff'
const SURFACE = '#12121a'
const SURFACE2 = '#1a1a28'
const BORDER = '#2a2a3a'

function StatRow({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${BORDER}` }}>
      <span style={{ color: '#8a7a5a', fontSize: 13 }}>{label}</span>
      <span style={{ color: color ?? '#e8d5a3', fontWeight: 700, fontSize: 14 }}>{value ?? '—'}</span>
    </div>
  )
}

function StatsModal({ player, onClose }) {
  if (!player) return null
  const s = player.stats ?? {}
  const tag = player.battleTag?.split('#')[0] ?? player.battleTag
  const wins = s.wins ?? 0
  const losses = s.losses ?? 0
  const total = wins + losses

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}
      >
        <motion.div
          initial={{ scale: 0.85, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.85, y: 30, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          onClick={e => e.stopPropagation()}
          style={{
            background: SURFACE,
            border: `1px solid ${GOLD}50`,
            borderRadius: 20,
            padding: 32,
            width: '100%',
            maxWidth: 520,
            boxShadow: `0 0 40px ${GOLD}25, 0 20px 60px rgba(0,0,0,0.6)`,
            maxHeight: '90vh',
            overflowY: 'auto',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
            <div style={{
              width: 64, height: 64,
              background: `linear-gradient(135deg, ${GOLD}30, ${GOLD}10)`,
              border: `2px solid ${GOLD}70`,
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 20px ${GOLD}40`,
            }}>
              <RaceIcon race={player.mainRace ?? player.race} size={32} />
            </div>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: GOLD, marginBottom: 2 }}>{tag}</h2>
              <div style={{ fontSize: 13, color: '#8a7a5a' }}>{player.battleTag}</div>
              {player.discordTag && (
                <div style={{ fontSize: 12, color: BLUE, marginTop: 2 }}>Discord: {player.discordTag}</div>
              )}
            </div>
            <button
              onClick={onClose}
              style={{
                marginLeft: 'auto', background: 'transparent', border: 'none',
                color: '#8a7a5a', fontSize: 22, cursor: 'pointer', padding: 4,
              }}
            >✕</button>
          </div>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Очки', value: s.points ?? 0, color: GOLD },
              { label: 'MMR', value: s.mmr ?? player.currentMmr ?? 0, color: BLUE },
              { label: 'Побед', value: wins, color: '#4ade80' },
              { label: 'Поражений', value: losses, color: '#f87171' },
            ].map(stat => (
              <div key={stat.label} style={{
                background: SURFACE2, borderRadius: 10,
                border: `1px solid ${BORDER}`,
                padding: '14px 16px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 26, fontWeight: 900, color: stat.color, marginBottom: 4 }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 11, color: '#8a7a5a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Details */}
          <div style={{ marginBottom: 24 }}>
            <StatRow label="Раса" value={raceName(player.mainRace ?? player.race)} />
            {total > 0 && <StatRow label="Винрейт" value={`${Math.round(wins / total * 100)}%`} color="#4ade80" />}
            {s.maxPointsAchieved != null && (
              <StatRow label="Макс. очков" value={s.maxPointsAchieved} color={GOLD} />
            )}
          </div>

          {/* Race breakdown */}
          {Array.isArray(s.raceStats) && s.raceStats.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: '#8a7a5a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                По расам
              </div>
              {s.raceStats.filter(r => (r.wins ?? 0) + (r.losses ?? 0) > 0).map((rs, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0',
                  borderBottom: `1px solid ${BORDER}`,
                }}>
                  <RaceIcon race={rs.race} size={20} />
                  <span style={{ fontSize: 13, color: '#e8d5a3', flex: 1 }}>{raceName(rs.race)}</span>
                  <span style={{ color: '#4ade80', fontSize: 13, fontWeight: 700 }}>{rs.wins ?? 0}W</span>
                  <span style={{ color: '#8a7a5a', fontSize: 12 }}>/</span>
                  <span style={{ color: '#f87171', fontSize: 13, fontWeight: 700 }}>{rs.losses ?? 0}L</span>
                  {rs.mmr && <span style={{ color: BLUE, fontSize: 12 }}>{rs.mmr} MMR</span>}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function PlayerCard({ player, rank, delay, onClick }) {
  const tag = player.battleTag?.split('#')[0] ?? '—'
  const s = player.stats ?? {}
  const wins = s.wins ?? 0
  const losses = s.losses ?? 0
  const total = wins + losses

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: delay * 0.04, duration: 0.4 }}
      whileHover={{
        y: -6,
        boxShadow: `0 0 30px ${GOLD}30, 0 8px 30px rgba(0,0,0,0.5)`,
        borderColor: `${GOLD}55`,
      }}
      onClick={onClick}
      style={{
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        padding: '20px',
        cursor: 'pointer',
        transition: 'border-color 0.3s',
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 60, height: 60,
        background: `linear-gradient(135deg, ${GOLD}25, ${GOLD}10)`,
        border: `1.5px solid ${GOLD}50`,
        borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 12px',
        boxShadow: `0 0 15px ${GOLD}25`,
        fontSize: 28,
      }}>
        <RaceIcon race={player.mainRace ?? player.race} size={28} />
      </div>

      {/* Rank badge */}
      {rank <= 3 && (
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 18 }}>
            {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
          </span>
        </div>
      )}

      {/* Name */}
      <div style={{
        textAlign: 'center',
        fontWeight: 800,
        fontSize: 15,
        color: rank <= 3 ? GOLD : '#e8d5a3',
        marginBottom: 4,
        wordBreak: 'break-word',
      }}>
        {tag}
      </div>

      <div style={{ textAlign: 'center', fontSize: 11, color: '#8a7a5a', marginBottom: 14 }}>
        {raceName(player.mainRace ?? player.race)}
      </div>

      {/* Mini stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ textAlign: 'center', flex: 1, background: SURFACE2, borderRadius: 8, padding: '8px 4px' }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: GOLD }}>{s.points ?? 0}</div>
          <div style={{ fontSize: 9, color: '#8a7a5a', textTransform: 'uppercase' }}>Очки</div>
        </div>
        <div style={{ textAlign: 'center', flex: 1, background: SURFACE2, borderRadius: 8, padding: '8px 4px' }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            <span style={{ color: '#4ade80' }}>{wins}</span>
            <span style={{ color: '#8a7a5a', fontSize: 11 }}>/</span>
            <span style={{ color: '#f87171' }}>{losses}</span>
          </div>
          <div style={{ fontSize: 9, color: '#8a7a5a', textTransform: 'uppercase' }}>W/L</div>
        </div>
        <div style={{ textAlign: 'center', flex: 1, background: SURFACE2, borderRadius: 8, padding: '8px 4px' }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: BLUE }}>{s.mmr ?? player.currentMmr ?? '—'}</div>
          <div style={{ fontSize: 9, color: '#8a7a5a', textTransform: 'uppercase' }}>MMR</div>
        </div>
      </div>

      {total > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ height: 4, background: '#2a2a3a', borderRadius: 2, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(wins / total * 100)}%` }}
              transition={{ delay: delay * 0.04 + 0.3, duration: 0.8 }}
              style={{ height: '100%', background: `linear-gradient(90deg, #4ade80, ${GOLD})`, borderRadius: 2 }}
            />
          </div>
          <div style={{ fontSize: 10, color: '#8a7a5a', marginTop: 3, textAlign: 'right' }}>
            {Math.round(wins / total * 100)}% WR
          </div>
        </div>
      )}
    </motion.div>
  )
}

export default function Players() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [raceFilter, setRaceFilter] = useState(0)

  useEffect(() => {
    playersApi.getAll()
      .then(r => setPlayers(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const sorted = [...players].sort((a, b) => (b.stats?.points ?? 0) - (a.stats?.points ?? 0))

  const filtered = sorted.filter(p => {
    const tag = (p.battleTag ?? '').toLowerCase()
    const matchSearch = tag.includes(search.toLowerCase())
    const matchRace = raceFilter === 0 || (p.mainRace ?? p.race) === raceFilter
    return matchSearch && matchRace
  })

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px' }}>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 36, fontWeight: 900, color: GOLD, textShadow: `0 0 30px ${GOLD}50`, marginBottom: 8 }}>
          Игроки
        </h1>
        <p style={{ color: '#8a7a5a' }}>{players.length} игроков в лиге</p>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap', alignItems: 'center' }}
      >
        <input
          placeholder="Поиск по нику..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: 220, flex: 'none',
            background: SURFACE, border: `1px solid ${BORDER}`,
            borderRadius: 8, color: '#e8d5a3', padding: '8px 14px',
            outline: 'none', fontSize: 14,
          }}
        />
        {[
          { id: 0, label: 'Все расы' },
          { id: 1, label: '⚔️ Люди' },
          { id: 2, label: '🔥 Орки' },
          { id: 4, label: '🌿 НЭ' },
          { id: 8, label: '💀 Нежить' },
        ].map(r => (
          <button
            key={r.id}
            onClick={() => setRaceFilter(r.id)}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: `1px solid ${raceFilter === r.id ? GOLD : BORDER}`,
              background: raceFilter === r.id ? `${GOLD}20` : SURFACE,
              color: raceFilter === r.id ? GOLD : '#8a7a5a',
              cursor: 'pointer',
              fontWeight: raceFilter === r.id ? 700 : 500,
              fontSize: 13,
              transition: 'all 0.2s',
            }}
          >
            {r.label}
          </button>
        ))}
      </motion.div>

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#8a7a5a', padding: 60 }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            style={{ width: 32, height: 32, border: `3px solid ${GOLD}`, borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px' }}
          />
          Загрузка...
        </div>
      ) : (
        <motion.div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 16,
          }}
        >
          {filtered.map((p, i) => (
            <PlayerCard
              key={p._id ?? p.id ?? i}
              player={p}
              rank={sorted.indexOf(p) + 1}
              delay={i}
              onClick={() => setSelected(p)}
            />
          ))}
          {filtered.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#8a7a5a', padding: 40 }}>
              Игроки не найдены
            </div>
          )}
        </motion.div>
      )}

      {selected && <StatsModal player={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
