import { motion } from 'framer-motion';
import ConnectionBadge from './ConnectionBadge.jsx';

export default function TopBar({ state, actions }) {
  const { connection, me, demo, aiAvailable, botName } = state;
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-logo">💬</div>
        <div>
          <h1>
            {botName} <span className="brand-sub">· WhatsApp AI</span>
          </h1>
          <div className="brand-meta">
            {aiAvailable ? (
              <span className="chip chip-ai">● IA ativa</span>
            ) : (
              <span className="chip chip-warn">● modo fallback</span>
            )}
            {me?.number && <span className="chip">+{me.number}</span>}
          </div>
        </div>
      </div>

      <div className="topbar-right">
        <ConnectionBadge status={demo ? 'demo' : connection.status} />
        <motion.button
          className={`demo-btn ${demo ? 'on' : ''}`}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => actions.toggleDemo(!demo)}
        >
          {demo ? '■ Parar demo' : '▶ Modo demo'}
        </motion.button>
      </div>
    </header>
  );
}
