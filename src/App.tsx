import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { OnboardingPage } from './pages/OnboardingPage';

function App() {
  return (
    <Routes>
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/" element={<div>Home - Coming soon</div>} />
    </Routes>
  );
}

export default App;

