'use client';

import { MatrixChatRoom } from '@/components/chat/MatrixChatRoom';

type CityChatWidgetProps = {
  roomSlug: string;
};

/**
 * Обгортка для MatrixChatRoom, яка використовується на сторінці громадянина.
 * Показує inline Matrix-чат у рамках профілю.
 */
export function CityChatWidget({ roomSlug }: CityChatWidgetProps) {
  if (!roomSlug) {
    return (
      <div className="text-sm text-white/60">
        Для цього громадянина ще не налаштована публічна кімната чату.
      </div>
    );
  }

  return (
    <div className="border border-white/10 rounded-2xl overflow-hidden bg-slate-900/50 min-h-[400px] max-h-[600px] flex flex-col">
      <MatrixChatRoom roomSlug={roomSlug} />
    </div>
  );
}

