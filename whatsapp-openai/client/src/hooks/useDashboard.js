import { useEffect, useReducer } from 'react';
import { socket } from '../socket.js';

const emptyStats = {
  totalMessages: 0,
  inbound: 0,
  outbound: 0,
  contacts: 0,
  perHour: [],
  topContacts: [],
};

const initial = {
  connected: false, // socket conectado?
  connection: { status: 'connecting' }, // status do WhatsApp
  me: null,
  qr: null,
  demo: false,
  aiAvailable: false,
  botName: 'Bot',
  conversations: {},
  messages: {},
  typing: {},
  stats: emptyStats,
  selectedId: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'socket':
      return { ...state, connected: action.connected };

    case 'bootstrap': {
      const s = action.payload;
      const conversations = {};
      for (const c of s.conversations || []) conversations[c.id] = c;
      return {
        ...state,
        connection: s.connection || state.connection,
        me: s.me,
        qr: s.qr,
        demo: s.demo,
        aiAvailable: s.aiAvailable,
        botName: s.botName || 'Bot',
        conversations,
        messages: s.messages || {},
        stats: s.stats || emptyStats,
        selectedId: state.selectedId || s.conversations?.[0]?.id || null,
      };
    }

    case 'wa:connection':
      return {
        ...state,
        connection: { status: action.payload.status },
        me: action.payload.me || state.me,
      };

    case 'wa:qr':
      return { ...state, qr: action.payload.dataUrl };

    case 'conversation': {
      const c = action.payload;
      return {
        ...state,
        conversations: { ...state.conversations, [c.id]: c },
        selectedId: state.selectedId || c.id,
      };
    }

    case 'message': {
      const { conversationId, message } = action.payload;
      const prev = state.messages[conversationId] || [];
      return {
        ...state,
        messages: { ...state.messages, [conversationId]: [...prev, message] },
        selectedId: state.selectedId || conversationId,
      };
    }

    case 'typing':
      return {
        ...state,
        typing: { ...state.typing, [action.payload.conversationId]: action.payload.on },
      };

    case 'stats':
      return { ...state, stats: action.payload };

    case 'demo':
      return { ...state, demo: action.payload.on };

    case 'select': {
      const conv = state.conversations[action.id];
      const conversations = conv
        ? { ...state.conversations, [action.id]: { ...conv, unread: 0 } }
        : state.conversations;
      return { ...state, selectedId: action.id, conversations };
    }

    default:
      return state;
  }
}

const EVENTS = ['bootstrap', 'wa:connection', 'wa:qr', 'conversation', 'message', 'typing', 'stats', 'demo'];

export function useDashboard() {
  const [state, dispatch] = useReducer(reducer, initial);

  useEffect(() => {
    const onConnect = () => dispatch({ type: 'socket', connected: true });
    const onDisconnect = () => dispatch({ type: 'socket', connected: false });
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) onConnect();

    const handlers = {};
    for (const ev of EVENTS) {
      handlers[ev] = (payload) => dispatch({ type: ev, payload });
      socket.on(ev, handlers[ev]);
    }
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      for (const ev of EVENTS) socket.off(ev, handlers[ev]);
    };
  }, []);

  const actions = {
    select: (id) => dispatch({ type: 'select', id }),
    toggleDemo: (on) => socket.emit('demo:toggle', on),
  };

  return [state, actions];
}
