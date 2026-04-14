import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ParticleBackground from './ParticleBackground'

const NAV_ITEMS = [
  { path: '/', label: 'Главная' },
  { path: '/standings', label: 'Таблица' },
  { path: '/matches', label: 'Матчи' },
  { path: '/players', label: 'Игроки' },
  { path: '/admin', label: 'Админ' },
]

export default function Layout({ children }) {
  const location = useLocation()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ParticleBackground />

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,10,15,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #2a2a3a',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          {/* Logo */}
          <Link to="/" style={{ textDecoration: 'none' }}>
            <motion.div
              whileHover={{ scale: 1.05 }}
              style={{ display: 'flex', alignItems: 'center', gap: 12 }}
            >
              <div style={{
                width: 36, height: 36,
                background: 'linear-gradient(135deg, #c89b3c, #a07830)',
                borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: 16, color: '#0a0a0f',
                boxShadow: '0 0 15px rgba(200,155,60,0.5)',
              }}>B</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, color: '#c89b3c', letterSpacing: '0.05em', textShadow: '0 0 20px rgba(200,155,60,0.5)' }}>BNL</div>
                <div style={{ fontSize: 10, color: '#8a7a5a', letterSpacing: '0.15em', textTransform: 'uppercase' }}>League</div>
              </div>
            </motion.div>
          </Link>

          {/* Nav */}
          <nav style={{ display: 'flex', gap: 4 }}>
            {NAV_ITEMS.map((item) => {
              const active = item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path)
              return (
                <Link key={item.path} to={item.path} style={{ textDecoration: 'none' }}>
                  <motion.div
                    whileHover={{ color: '#c89b3c' }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: active ? 700 : 500,
                      color: active ? '#c89b3c' : '#8a7a5a',
                      borderBottom: active ? '2px solid #c89b3c' : '2px solid transparent',
                      transition: 'all 0.2s',
                    }}
                  >
                    {item.label}
                  </motion.div>
                </Link>
              )
            })}
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main style={{ flex: 1, position: 'relative', zIndex: 1 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid #2a2a3a',
        padding: '24px',
        textAlign: 'center',
        color: '#8a7a5a',
        fontSize: 13,
        background: '#12121a',
      }}>
        <span style={{ color: '#c89b3c', fontWeight: 700 }}>BNL</span> — Battle Newbie League · Warcraft III Reforged
      </footer>
    </div>
  )
}
