import { useState, useCallback, FormEvent } from 'react';

interface Props {
  onSend: (text: string) => Promise<void>;
  disabled?: boolean;
}

export function MessageComposer({ onSend, disabled }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!text.trim() || sending || disabled) return;

      try {
        setSending(true);
        await onSend(text.trim());
        setText('');
      } catch (err) {
        console.error('Failed to send message:', err);
      } finally {
        setSending(false);
      }
    },
    [text, sending, disabled, onSend]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e as unknown as FormEvent);
      }
    },
    [handleSubmit]
  );

  return (
    <form onSubmit={handleSubmit} className="border-t border-white/10 p-4">
      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Shift+Enter for new line)"
          disabled={sending || disabled}
          className="
            flex-1 min-h-[60px] max-h-[200px] px-4 py-3 rounded-lg
            bg-slate-800 text-white placeholder-slate-500
            border border-white/10 focus:border-indigo-500 focus:outline-none
            resize-none disabled:opacity-50 disabled:cursor-not-allowed
          "
          rows={2}
        />
        <button
          type="submit"
          disabled={!text.trim() || sending || disabled}
          className="
            px-6 py-3 rounded-lg font-medium
            bg-indigo-600 text-white hover:bg-indigo-700
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          "
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </div>
      <div className="mt-2 text-xs text-slate-500">
        Press Enter to send, Shift+Enter for new line
      </div>
    </form>
  );
}





