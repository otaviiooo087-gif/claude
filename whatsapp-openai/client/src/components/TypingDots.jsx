import { motion } from 'framer-motion';

export default function TypingDots() {
  return (
    <div className="bubble in typing-bubble">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="dot"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </div>
  );
}
