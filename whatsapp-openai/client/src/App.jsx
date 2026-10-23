import { useDashboard } from './hooks/useDashboard.js';
import TopBar from './components/TopBar.jsx';
import ConversationList from './components/ConversationList.jsx';
import ChatPanel from './components/ChatPanel.jsx';
import SidePanel from './components/SidePanel.jsx';

export default function App() {
  const [state, actions] = useDashboard();
  return (
    <div className="app">
      <TopBar state={state} actions={actions} />
      <div className="main">
        <ConversationList state={state} actions={actions} />
        <ChatPanel state={state} />
        <SidePanel state={state} />
      </div>
    </div>
  );
}
