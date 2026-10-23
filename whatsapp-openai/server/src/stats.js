import { getState } from './store.js';

// Recalcula as estatísticas a partir do estado atual (mensagens + conversas).
export function computeStats() {
  const { conversations, messages } = getState();

  let inbound = 0;
  let outbound = 0;
  const perHour = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    label: `${String(h).padStart(2, '0')}h`,
    count: 0,
  }));
  const perContact = {};

  for (const [cid, list] of Object.entries(messages)) {
    for (const m of list) {
      if (m.dir === 'in') inbound++;
      else outbound++;
      perHour[new Date(m.ts).getHours()].count++;
      perContact[cid] = (perContact[cid] || 0) + 1;
    }
  }

  const topContacts = Object.entries(perContact)
    .map(([cid, count]) => ({
      name: conversations[cid]?.name || cid,
      color: conversations[cid]?.color || '#00a884',
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalMessages: inbound + outbound,
    inbound,
    outbound,
    contacts: Object.keys(conversations).length,
    perHour,
    topContacts,
  };
}
