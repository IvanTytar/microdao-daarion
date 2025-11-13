import React from 'react';
import { Check } from 'lucide-react';

interface Step {
  number: number;
  title: string;
}

interface OnboardingStepperProps {
  currentStep: number;
  totalSteps: number;
}

const steps: Step[] = [
  { number: 1, title: 'Ласкаво просимо' },
  { number: 2, title: 'Створити спільноту' },
  { number: 3, title: 'Режим приватності' },
  { number: 4, title: 'Перший канал' },
  { number: 5, title: 'Агент та пам\'ять' },
  { number: 6, title: 'Запросити команду' },
];

export function OnboardingStepper({ currentStep, totalSteps }: OnboardingStepperProps) {
  return (
    <div className="w-full max-w-4xl mx-auto mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = step.number < currentStep;
          const isCurrent = step.number === currentStep;
          const isLast = index === steps.length - 1;

          return (
            <React.Fragment key={step.number}>
              <div className="flex flex-col items-center flex-1">
                <div className="flex items-center w-full">
                  {/* Step Circle */}
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                      isCompleted
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-white border-slate-300 text-slate-400'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <span className="text-sm font-semibold">{step.number}</span>
                    )}
                  </div>
                  {/* Step Title */}
                  <div className="ml-3 flex-1">
                    <div
                      className={`text-sm font-medium ${
                        isCurrent ? 'text-slate-900' : isCompleted ? 'text-slate-600' : 'text-slate-400'
                      }`}
                    >
                      {step.title}
                    </div>
                  </div>
                </div>
              </div>
              {/* Connector Line */}
              {!isLast && (
                <div
                  className={`h-0.5 flex-1 mx-4 ${
                    isCompleted ? 'bg-emerald-600' : 'bg-slate-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

