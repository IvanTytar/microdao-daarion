import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import NodesPage from './pages/NodesPage';
import NodeDetailPage from './pages/NodeDetailPage';
import ConnectNodePage from './pages/ConnectNodePage';
import MetricsPage from './pages/MetricsPage';
import AgentsPage from './pages/AgentsPage';
import AgentDetailPage from './pages/AgentDetailPage';
import StackPage from './pages/StackPage';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/nodes" element={<NodesPage />} />
        <Route path="/nodes/:nodeId" element={<NodeDetailPage />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/agents/:agentId" element={<AgentDetailPage />} />
        <Route path="/connect" element={<ConnectNodePage />} />
        <Route path="/metrics" element={<MetricsPage />} />
        <Route path="/stack" element={<StackPage />} />
      </Routes>
    </Layout>
  );
}

export default App;

