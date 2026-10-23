import AnimatedNumber from './AnimatedNumber.jsx';

export default function StatsBar({ stats }) {
  const cards = [
    { label: 'Mensagens', value: stats.totalMessages, icon: '💬', cls: 'green' },
    { label: 'Recebidas', value: stats.inbound, icon: '📥', cls: 'blue' },
    { label: 'Enviadas', value: stats.outbound, icon: '📤', cls: 'teal' },
    { label: 'Contatos', value: stats.contacts, icon: '👥', cls: 'purple' },
  ];
  return (
    <div className="stats-grid">
      {cards.map((c) => (
        <div key={c.label} className={`stat-card ${c.cls}`}>
          <div className="stat-icon">{c.icon}</div>
          <div className="stat-value">
            <AnimatedNumber value={c.value} />
          </div>
          <div className="stat-label">{c.label}</div>
        </div>
      ))}
    </div>
  );
}
