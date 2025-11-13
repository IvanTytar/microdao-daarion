import React, { useState } from 'react';
import { Copy, Check, QrCode } from 'lucide-react';
import type { Team, Channel } from '../../types/api';

interface StepInviteProps {
  team: Team;
  channel: Channel;
  onComplete: () => void;
}

export function StepInvite({ team, channel, onComplete }: StepInviteProps) {
  const [copied, setCopied] = useState(false);
  
  // TODO: Отримати реальне посилання-запрошення з API
  const inviteLink = `${window.location.origin}/invite/${team.id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4">
      <h2 className="text-2xl font-bold text-slate-900 mb-2">
        Все готово!
      </h2>
      <p className="text-slate-600 mb-6">
        Залишилось запросити команду в твою спільноту.
      </p>

      <div className="space-y-4 mb-6">
        {/* Invite Link */}
        <div className="p-4 border border-slate-200 rounded-lg bg-slate-50">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Посилання-запрошення
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inviteLink}
              readOnly
              className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            <button
              onClick={handleCopyLink}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 flex items-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Скопійовано
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Копіювати
                </>
              )}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              // TODO: Показати QR код (модалка)
              alert('QR код буде доступний пізніше');
            }}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 flex items-center justify-center gap-2"
          >
            <QrCode className="w-4 h-4" />
            Показати QR
          </button>
          <button
            onClick={onComplete}
            className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
          >
            Перейти в чат
          </button>
        </div>
      </div>

      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
        <p className="text-sm text-emerald-800">
          <strong>Спільнота "{team.name}"</strong> створена успішно! Тепер ти можеш почати спілкування в каналі <strong>#{channel.name}</strong>.
        </p>
      </div>
    </div>
  );
}

