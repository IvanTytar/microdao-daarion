import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { OnboardingPage } from './pages/OnboardingPage';
import { ConsolePage } from './pages/ConsolePage';

function App() {
  return (
    <Routes>
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/console" element={<ConsolePage />} />
      <Route path="/" element={<div>Home - Coming soon</div>} />
    </Routes>
  );
}

export default App;

