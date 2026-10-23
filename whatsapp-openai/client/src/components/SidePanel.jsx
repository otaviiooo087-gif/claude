import StatsBar from './StatsBar.jsx';
import Charts from './Charts.jsx';

export default function SidePanel({ state }) {
  return (
    <aside className="panel side-panel">
      <div className="panel-head">
        <h2>Estatísticas</h2>
      </div>
      <div className="side-scroll">
        <StatsBar stats={state.stats} />
        <Charts stats={state.stats} />
      </div>
    </aside>
  );
}
