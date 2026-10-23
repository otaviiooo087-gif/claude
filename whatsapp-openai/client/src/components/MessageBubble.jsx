import { motion } from 'framer-motion';

const time = (ts) =>
  new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export default function MessageBubble({ message }) {
  const out = message.dir === 'out';
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 34 }}
      className={`bubble ${out ? 'out' : 'in'}`}
    >
      <span className="bubble-text">{message.text}</span>
      <span className="bubble-time">
        {time(message.ts)}
        {out && <span className="ticks"> ✓✓</span>}
      </span>
    </motion.div>
  );
}
