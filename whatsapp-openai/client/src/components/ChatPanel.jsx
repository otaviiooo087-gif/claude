import { useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import MessageBubble from './MessageBubble.jsx';
import TypingDots from './TypingDots.jsx';
import QRPanel from './QRPanel.jsx';

export default function ChatPanel({ state }) {
  const { selectedId, conversations, messages, typing, qr, connection, demo } = state;
  const conv = selectedId ? conversations[selectedId] : null;
  const list = selectedId ? messages[selectedId] || [] : [];
  const isTyping = selectedId ? typing[selectedId] : false;

  const scrollRef = useRef(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [list.length, isTyping, selectedId]);

  if (!conv) {
    return (
      <section className="panel chat-panel center">
        <QRPanel qr={qr} status={connection.status} demo={demo} />
      </section>
    );
  }

  return (
    <section className="panel chat-panel">
      <div className="chat-head">
        <span className="avatar" style={{ background: conv.color }}>
          {conv.avatarText}
        </span>
        <div className="chat-head-info">
          <div className="chat-name">{conv.name}</div>
          <div className="chat-status">
            {isTyping ? (
              <span className="typing-text">digitando…</span>
            ) : (
              `${conv.count} mensagens`
            )}
          </div>
        </div>
      </div>

      <div className="chat-scroll" ref={scrollRef}>
        <AnimatePresence initial={false}>
          {list.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
        </AnimatePresence>
        {isTyping && <TypingDots />}
      </div>

      <div className="chat-input">
        <span>🤖 O assistente responde automaticamente</span>
      </div>
    </section>
  );
}
