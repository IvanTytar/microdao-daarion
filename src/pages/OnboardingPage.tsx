/**
 * OnboardingPage - Redirects to new agent-first onboarding
 * 
 * ПРИМІТКА: Старий step-based онбординг збережено для сумісності.
 * Новий агентський онбординг доступний за маршрутом /onboarding
 */

import React from 'react';

// Import the new agent-first onboarding
import { OnboardingPage as NewOnboardingPage } from '../features/onboarding/OnboardingPage';

export function OnboardingPage() {
  // Використовуємо нову версію агентського онбордингу
  return <NewOnboardingPage />;
}
