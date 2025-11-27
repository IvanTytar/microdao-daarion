import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { OnboardingPage } from './pages/OnboardingPage';
import { ConsolePage } from './pages/ConsolePage';
import { NodesPage } from './pages/NodesPage';
import { NodeCabinetPage } from './pages/NodeCabinetPage';
import { ChatPage } from './pages/ChatPage';
import { TeamPage } from './pages/TeamPage';
import { MicroDaoCabinetPage } from './pages/MicroDaoCabinetPage';
import { DaarionCabinetPage } from './pages/DaarionCabinetPage';
import { GreenfoodCabinetPage } from './pages/GreenfoodCabinetPage';
import { EnergyUnionCabinetPage } from './pages/EnergyUnionCabinetPage';
import { YaromirCabinetPage } from './pages/YaromirCabinetPage';
import { DagiMonitorPage } from './pages/DagiMonitorPage';
import { AgentCabinetPage } from './pages/AgentCabinetPage';
import { ChatDemoPage } from './pages/ChatDemoPage';
import NetworkPageSimple from './pages/NetworkPageSimple';
import ConnectNodePage from './pages/ConnectNodePage';
import { MonitorChat } from './components/monitor/MonitorChat';
// City Dashboard
import { CityDashboard } from './features/city-dashboard/CityDashboard';
import { CityPage } from './features/city/CityPage';
import { SpaceDashboard } from './features/space-dashboard/SpaceDashboard';
// Messenger
import { MessengerPage } from './features/messenger/MessengerPage';
// Agent Hub
import { AgentHubPage } from './features/agentHub/AgentHubPage';
import { AgentCabinet } from './features/agentHub/AgentCabinet';
// MicroDAO Console
import { MicrodaoListPage } from './features/microdao/MicrodaoListPage';
import { MicrodaoConsolePage } from './features/microdao/MicrodaoConsolePage';
// DAO Dashboard (Phase 8)
import { DaoListPage } from './features/dao/DaoListPage';
import { DaoDashboardPage } from './features/dao/DaoDashboardPage';
// Living Map (Phase 9B)
import { LivingMapPage } from './features/livingMap/LivingMapPage';
// Follow-ups & Projects (Phase 1)
import { FollowupsPage } from './features/followups/FollowupsPage';
import { ProjectsPage } from './features/projects/ProjectsPage';
import { SettingsPage } from './pages/SettingsPage';
// Phase 3 Finisher: City Rooms, Presence, Second Me
import { CityRoomsPage } from './features/city/rooms/CityRoomsPage';
import { CityRoomView } from './features/city/rooms/CityRoomView';
import { SecondMePage } from './features/secondme/SecondMePage';

function App() {
  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/city" element={<CityDashboard />} />
          <Route path="/city-v2" element={<CityPage />} />
          <Route path="/city/rooms" element={<CityRoomsPage />} />
          <Route path="/city/rooms/:roomId" element={<CityRoomView />} />
          <Route path="/secondme" element={<SecondMePage />} />
          <Route path="/space" element={<SpaceDashboard />} />
          <Route path="/messenger" element={<MessengerPage />} />
          <Route path="/agent-hub" element={<AgentHubPage />} />
          <Route path="/agent/:agentId" element={<AgentCabinet />} />
          <Route path="/microdao" element={<MicrodaoListPage />} />
          <Route path="/microdao/:slug" element={<MicrodaoConsolePage />} />
          <Route path="/dao" element={<DaoListPage />} />
          <Route path="/dao/:slug" element={<DaoDashboardPage />} />
          <Route path="/living-map" element={<LivingMapPage />} />
          <Route path="/followups" element={<FollowupsPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:projectId" element={<ProjectsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/console" element={<ConsolePage />} />
          <Route path="/nodes" element={<NodesPage />} />
          <Route path="/admin/nodes" element={<NodesPage />} />
          <Route path="/teams/:teamId" element={<TeamPage />} />
          <Route path="/teams/:teamId/channels/:channelId" element={<ChatPage />} />
          <Route path="/nodes/:nodeId" element={<NodeCabinetPage />} />
          <Route path="/microdao/:microDaoId" element={<MicroDaoCabinetPage />} />
          <Route path="/microdao/daarion" element={<DaarionCabinetPage />} />
          <Route path="/microdao/greenfood" element={<GreenfoodCabinetPage />} />
          <Route path="/microdao/energy-union" element={<EnergyUnionCabinetPage />} />
          <Route path="/microdao/yaromir" element={<YaromirCabinetPage />} />
          <Route path="/dagi-monitor" element={<DagiMonitorPage />} />
          <Route path="/agent/:agentId" element={<AgentCabinetPage />} />
          <Route path="/chat-demo" element={<ChatDemoPage />} />
          <Route path="/network" element={<NetworkPageSimple />} />
          <Route path="/connect-node" element={<ConnectNodePage />} />
        </Routes>
      </Layout>
      <MonitorChat />
    </>
  );
}

export default App;

