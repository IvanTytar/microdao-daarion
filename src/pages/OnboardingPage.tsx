import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingStepper } from '../components/onboarding/OnboardingStepper';
import { StepWelcome } from '../components/onboarding/StepWelcome';
import { StepCreateTeam } from '../components/onboarding/StepCreateTeam';
import { StepSelectMode } from '../components/onboarding/StepSelectMode';
import { StepCreateChannel } from '../components/onboarding/StepCreateChannel';
import { StepAgentSettings } from '../components/onboarding/StepAgentSettings';
import { StepInvite } from '../components/onboarding/StepInvite';
import { useOnboarding } from '../hooks/useOnboarding';
import type { Team, Channel, Agent } from '../types/api';

const TOTAL_STEPS = 6;

export function OnboardingPage() {
  const navigate = useNavigate();
  const { state, updateState } = useOnboarding();
  const [currentStep, setCurrentStep] = useState(1);

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleStep2Complete = (team: Team) => {
    updateState({ team, teamName: team.name, teamDescription: team.description || '' });
    setCurrentStep(3);
  };

  const handleStep3Complete = (team: Team) => {
    updateState({ team, teamMode: team.mode });
    setCurrentStep(4);
  };

  const handleStep4Complete = (channel: Channel) => {
    updateState({ channel, channelName: channel.name, channelType: channel.type });
    setCurrentStep(5);
  };

  const handleStep5Complete = (agent: Agent | null) => {
    updateState({ agent });
    setCurrentStep(6);
  };

  const handleComplete = () => {
    // Перенаправляємо на головну сторінку чату з створеним каналом
    if (state.channel) {
      navigate(`/teams/${state.team?.id}/channels/${state.channel.id}`);
    } else if (state.team) {
      navigate(`/teams/${state.team.id}`);
    } else {
      navigate('/');
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <StepWelcome onNext={handleNext} />;

      case 2:
        return (
          <StepCreateTeam
            teamName={state.teamName}
            teamDescription={state.teamDescription}
            onUpdate={(updates) => updateState(updates)}
            onNext={handleStep2Complete}
          />
        );

      case 3:
        if (!state.team) {
          // Якщо команда не створена, повертаємось на крок 2
          setCurrentStep(2);
          return null;
        }
        return (
          <StepSelectMode
            team={state.team}
            selectedMode={state.teamMode}
            onUpdate={(mode) => updateState({ teamMode: mode })}
            onNext={handleStep3Complete}
          />
        );

      case 4:
        if (!state.team) {
          setCurrentStep(2);
          return null;
        }
        return (
          <StepCreateChannel
            team={state.team}
            channelName={state.channelName}
            channelType={state.channelType}
            onUpdate={(updates) => updateState(updates)}
            onNext={handleStep4Complete}
          />
        );

      case 5:
        if (!state.team) {
          setCurrentStep(2);
          return null;
        }
        return (
          <StepAgentSettings
            team={state.team}
            agentEnabled={state.agentEnabled}
            agentLanguage={state.agentLanguage}
            agentFocus={state.agentFocus}
            useCoMemory={state.useCoMemory}
            onUpdate={(updates) => updateState(updates)}
            onNext={handleStep5Complete}
          />
        );

      case 6:
        if (!state.team || !state.channel) {
          setCurrentStep(2);
          return null;
        }
        return (
          <StepInvite
            team={state.team}
            channel={state.channel}
            onComplete={handleComplete}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        {/* Stepper */}
        {currentStep > 1 && (
          <OnboardingStepper currentStep={currentStep} totalSteps={TOTAL_STEPS} />
        )}

        {/* Step Content */}
        <div className="mt-8">{renderStep()}</div>
      </div>
    </div>
  );
}

