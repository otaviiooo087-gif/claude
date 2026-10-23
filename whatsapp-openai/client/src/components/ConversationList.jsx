import { motion, AnimatePresence } from 'framer-motion';

const time = (ts) =>
  new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export default function ConversationList({ state, actions }) {
  const list = Object.values(state.conversations).sort((a, b) => b.lastTs - a.lastTs);

  return (
    <aside className="panel conv-list">
      <div className="panel-head">
        <h2>Conversas</h2>
        <span className="count-pill">{list.length}</span>
      </div>

      <div className="conv-scroll">
        <AnimatePresence initial={false}>
          {list.map((c) => {
            const typing = state.typing[c.id];
            const selected = c.id === state.selectedId;
            return (
              <motion.button
                key={c.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                className={`conv-item ${selected ? 'selected' : ''}`}
                onClick={() => actions.select(c.id)}
              >
                <span className="avatar" style={{ background: c.color }}>
                  {c.avatarText}
                </span>
                <span className="conv-body">
                  <span className="conv-top">
                    <span className="conv-name">{c.name}</span>
                    <span className="conv-time">{time(c.lastTs)}</span>
                  </span>
                  <span className="conv-bottom">
                    <span className="conv-last">
                      {typing ? <em className="typing-text">digitando…</em> : c.lastText}
                    </span>
                    {!selected && c.unread > 0 && <span className="unread">{c.unread}</span>}
                  </span>
                </span>
              </motion.button>
            );
          })}
        </AnimatePresence>

        {list.length === 0 && (
          <div className="empty-hint">
            Nenhuma conversa ainda.
            <br />
            Inicie o <b>modo demo</b> ou conecte o WhatsApp.
          </div>
        )}
      </div>
    </aside>
  );
}
