import React from 'react';

interface StepWelcomeProps {
  onNext: () => void;
}

export function StepWelcome({ onNext }: StepWelcomeProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-bold text-slate-900 mb-6">
          Ласкаво просимо до MicroDAO
        </h1>
        <p className="text-lg text-slate-600 mb-4 leading-relaxed">
          MicroDAO — приватна мережа ШІ-агентів для малих спільнот.
        </p>
        <p className="text-lg text-slate-600 mb-8 leading-relaxed">
          За 3 кроки ти створиш власну micro-DAO: спільноту, перший канал і свого агента.
        </p>
        <button
          onClick={onNext}
          className="px-8 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
        >
          Почати
        </button>
      </div>
    </div>
  );
}

