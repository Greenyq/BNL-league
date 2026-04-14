// WC3 race IDs: 1=Human, 2=Orc, 4=NightElf, 8=Undead, 16=Random
const RACES = {
  1:  { label: 'Люди',       emoji: '⚔️',  color: '#4a9eff' },
  2:  { label: 'Орки',       emoji: '🔥',  color: '#e05c2a' },
  4:  { label: 'Ночные эльфы', emoji: '🌿', color: '#4ade80' },
  8:  { label: 'Нежить',     emoji: '💀',  color: '#a78bfa' },
  16: { label: 'Случайная',  emoji: '🎲',  color: '#8a7a5a' },
}

export function raceName(id) {
  return RACES[id]?.label ?? '—'
}

export default function RaceIcon({ race, size = 20, showLabel = false }) {
  const r = RACES[race] ?? RACES[16]
  return (
    <span
      title={r.label}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: size,
        filter: `drop-shadow(0 0 4px ${r.color}80)`,
      }}
    >
      {r.emoji}
      {showLabel && <span style={{ fontSize: size * 0.65, color: r.color }}>{r.label}</span>}
    </span>
  )
}
