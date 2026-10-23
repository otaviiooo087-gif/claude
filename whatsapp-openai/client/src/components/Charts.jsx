import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  CartesianGrid,
} from 'recharts';

const tooltipStyle = {
  background: '#111b21',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  color: '#e9edef',
  fontSize: 12,
};

export default function Charts({ stats }) {
  const perHour = stats.perHour || [];
  const top = stats.topContacts || [];

  return (
    <div className="charts">
      <div className="chart-card">
        <h3>Mensagens por hora</h3>
        <ResponsiveContainer width="100%" height={150}>
          <AreaChart data={perHour} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00a884" stopOpacity={0.7} />
                <stop offset="100%" stopColor="#00a884" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: '#8696a0', fontSize: 10 }}
              interval={3}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#8696a0', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              width={28}
            />
            <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#00a884', strokeOpacity: 0.25 }} />
            <Area type="monotone" dataKey="count" stroke="#00a884" strokeWidth={2} fill="url(#areaFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card">
        <h3>Contatos mais ativos</h3>
        {top.length === 0 ? (
          <div className="chart-empty">Sem dados ainda</div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(120, top.length * 44)}>
            <BarChart data={top} layout="vertical" margin={{ top: 4, right: 18, left: 6, bottom: 4 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={92}
                tick={{ fill: '#e9edef', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18}>
                {top.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
