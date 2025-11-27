import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plug,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  RefreshCcw,
  Unplug,
} from 'lucide-react';
import {
  fetchTelegramBotStatus,
  registerTelegramBot,
  unregisterTelegramBot,
} from '../../api/telegramGateway';

interface TelegramBotConnectionCardProps {
  agentId: string;
}

export function TelegramBotConnectionCard({
  agentId,
}: TelegramBotConnectionCardProps) {
  const queryClient = useQueryClient();
  const [botToken, setBotToken] = useState('');

  const {
    data: status,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['telegram-bot-status', agentId],
    queryFn: () => fetchTelegramBotStatus(agentId),
    enabled: !!agentId,
    refetchInterval: 20000,
  });

  const registerMutation = useMutation({
    mutationFn: (token: string) => registerTelegramBot(agentId, token),
    onSuccess: () => {
      setBotToken('');
      queryClient.invalidateQueries({ queryKey: ['telegram-bot-status', agentId] });
    },
  });

  const unregisterMutation = useMutation({
    mutationFn: () => unregisterTelegramBot(agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegram-bot-status', agentId] });
    },
  });

  const isConnected = status?.registered && status?.polling;

  const handleRegister = () => {
    if (!botToken.trim()) return;
    registerMutation.mutate(botToken.trim());
  };

  const handleUnregister = () => {
    if (!status?.registered) return;
    unregisterMutation.mutate();
  };

  return (
    <div className="bg-white rounded-lg shadow border border-purple-100">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Plug className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Інтеграція</p>
            <h3 className="text-lg font-semibold text-gray-900">
              Підключення до Telegram бота
            </h3>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 text-gray-500 hover:text-purple-600 rounded-lg transition-colors disabled:opacity-50"
          disabled={isRefetching}
          title="Оновити статус"
        >
          {isRefetching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCcw className="w-4 h-4" />
          )}
        </button>
      </div>

      <div className="p-6 space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-3 text-gray-500">
            <Activity className="w-5 h-5 animate-spin" />
            <span>Перевіряємо статус підключення...</span>
          </div>
        ) : isConnected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <ShieldCheck className="w-5 h-5" />
              <span className="font-medium">Підключено та активний polling</span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <p className="text-xs uppercase text-gray-400">Agent ID</p>
                <p className="font-mono text-gray-800">{status?.agent_id}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-400">Token</p>
                <p className="font-mono text-gray-800">
                  {status?.token_prefix}••••
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-400">Polling</p>
                <p className="text-gray-800">Active</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-400">Task</p>
                <p className="text-gray-800">
                  {status?.task_cancelled ? 'Очікує перезапуск' : 'Працює'}
                </p>
              </div>
            </div>

            <button
              onClick={handleUnregister}
              disabled={unregisterMutation.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-700 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {unregisterMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Unplug className="w-4 h-4" />
              )}
              Від'єднати бота
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-amber-600">
              <ShieldAlert className="w-5 h-5" />
              <span className="font-medium">Бот не підключений</span>
            </div>
            <p className="text-sm text-gray-600">
              Вкажіть токен від @BotFather, щоб підключити Telegram бота для агента{' '}
              <strong>{agentId}</strong>.
            </p>
            <div className="space-y-2">
              <label className="text-xs uppercase font-medium text-gray-500">
                Bot Token
              </label>
              <input
                type="text"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="1234567890:AAFx..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
              />
            </div>
            <button
              onClick={handleRegister}
              disabled={!botToken.trim() || registerMutation.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {registerMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plug className="w-4 h-4" />
              )}
              Підключити бота
            </button>
            {registerMutation.isError && (
              <p className="text-sm text-red-600">
                {registerMutation.error instanceof Error
                  ? registerMutation.error.message
                  : 'Помилка підключення бота'}
              </p>
            )}
          </div>
        )}

        {!isLoading && status?.registered && !status?.polling && (
          <div className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="font-semibold">Потрібен перезапуск</p>
            <p>
              Polling задачі зупинені. Спробуйте відʼєднати та заново підключити
              бота.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

