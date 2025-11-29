'use client';

import { MatrixChatRoom } from '@/components/chat/MatrixChatRoom';

type CityChatWidgetProps = {
  roomSlug: string;
  title?: string;
  compact?: boolean;
};

/**
 * Обгортка для MatrixChatRoom, яка використовується на сторінці громадянина та MicroDAO.
 * Показує inline Matrix-чат.
 */
export function CityChatWidget({ roomSlug, title, compact }: CityChatWidgetProps) {
  if (!roomSlug) {
    return (
      <div className="text-sm text-white/60">
        Кімната чату не налаштована.
      </div>
    );
  }

  return (
    <div className={`border border-white/10 rounded-2xl overflow-hidden bg-slate-900/50 flex flex-col ${
      compact ? 'min-h-[300px] max-h-[400px]' : 'min-h-[400px] max-h-[600px]'
    }`}>
      {title && (
        <div className="bg-white/5 px-4 py-2 border-b border-white/10 text-sm font-medium text-white/80">
          {title}
        </div>
      )}
      <MatrixChatRoom roomSlug={roomSlug} />
    </div>
  );
}
