import { useState } from 'react';
import type { Team, Channel, Agent } from '../types/api';

export interface OnboardingState {
  // Step 2: Create Team
  teamName: string;
  teamDescription: string;
  team: Team | null;
  
  // Step 3: Select Mode
  teamMode: 'public' | 'confidential';
  
  // Step 4: Create Channel
  channelName: string;
  channelType: 'public' | 'group';
  channel: Channel | null;
  
  // Step 5: Agent Settings
  agentEnabled: boolean;
  agentLanguage: 'uk' | 'en';
  agentFocus: 'general' | 'business' | 'it' | 'creative';
  useCoMemory: boolean;
  agent: Agent | null;
}

const initialState: OnboardingState = {
  teamName: '',
  teamDescription: '',
  team: null,
  teamMode: 'public',
  channelName: '',
  channelType: 'public',
  channel: null,
  agentEnabled: false,
  agentLanguage: 'uk',
  agentFocus: 'general',
  useCoMemory: false,
  agent: null,
};

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>(initialState);

  const updateState = (updates: Partial<OnboardingState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const reset = () => {
    setState(initialState);
  };

  return {
    state,
    updateState,
    reset,
  };
}

