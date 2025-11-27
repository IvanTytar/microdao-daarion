/**
 * Сторінка налаштувань користувача
 */

import { useState } from 'react';

interface UserSettings {
  displayName: string;
  email: string;
  language: 'uk' | 'en';
  notifications: {
    email: boolean;
    push: boolean;
    mentions: boolean;
    followups: boolean;
  };
  privacy: {
    showOnlineStatus: boolean;
    allowDirectMessages: boolean;
  };
  appearance: {
    theme: 'light' | 'dark' | 'auto';
    compactMode: boolean;
  };
}

export function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>({
    displayName: 'User',
    email: 'user@microdao.xyz',
    language: 'uk',
    notifications: {
      email: true,
      push: true,
      mentions: true,
      followups: true,
    },
    privacy: {
      showOnlineStatus: true,
      allowDirectMessages: true,
    },
    appearance: {
      theme: 'light',
      compactMode: false,
    },
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: API call to save settings
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Налаштування збережено!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Помилка збереження налаштувань');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Налаштування</h1>

      <div className="space-y-8">
        {/* Профіль */}
        <section className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Профіль</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Ім'я</label>
              <input
                type="text"
                value={settings.displayName}
                onChange={(e) => setSettings({ ...settings, displayName: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Мова</label>
              <select
                value={settings.language}
                onChange={(e) => setSettings({ ...settings, language: e.target.value as 'uk' | 'en' })}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="uk">Українська</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </section>

        {/* Сповіщення */}
        <section className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Сповіщення</h2>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span>Email сповіщення</span>
              <input
                type="checkbox"
                checked={settings.notifications.email}
                onChange={(e) => setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, email: e.target.checked }
                })}
                className="w-5 h-5"
              />
            </label>
            <label className="flex items-center justify-between">
              <span>Push сповіщення</span>
              <input
                type="checkbox"
                checked={settings.notifications.push}
                onChange={(e) => setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, push: e.target.checked }
                })}
                className="w-5 h-5"
              />
            </label>
            <label className="flex items-center justify-between">
              <span>Згадування в повідомленнях</span>
              <input
                type="checkbox"
                checked={settings.notifications.mentions}
                onChange={(e) => setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, mentions: e.target.checked }
                })}
                className="w-5 h-5"
              />
            </label>
            <label className="flex items-center justify-between">
              <span>Follow-ups</span>
              <input
                type="checkbox"
                checked={settings.notifications.followups}
                onChange={(e) => setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, followups: e.target.checked }
                })}
                className="w-5 h-5"
              />
            </label>
          </div>
        </section>

        {/* Конфіденційність */}
        <section className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Конфіденційність</h2>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span>Показувати онлайн статус</span>
              <input
                type="checkbox"
                checked={settings.privacy.showOnlineStatus}
                onChange={(e) => setSettings({
                  ...settings,
                  privacy: { ...settings.privacy, showOnlineStatus: e.target.checked }
                })}
                className="w-5 h-5"
              />
            </label>
            <label className="flex items-center justify-between">
              <span>Дозволити прямі повідомлення</span>
              <input
                type="checkbox"
                checked={settings.privacy.allowDirectMessages}
                onChange={(e) => setSettings({
                  ...settings,
                  privacy: { ...settings.privacy, allowDirectMessages: e.target.checked }
                })}
                className="w-5 h-5"
              />
            </label>
          </div>
        </section>

        {/* Зовнішній вигляд */}
        <section className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Зовнішній вигляд</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Тема</label>
              <select
                value={settings.appearance.theme}
                onChange={(e) => setSettings({
                  ...settings,
                  appearance: { ...settings.appearance, theme: e.target.value as 'light' | 'dark' | 'auto' }
                })}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="light">Світла</option>
                <option value="dark">Темна</option>
                <option value="auto">Автоматично</option>
              </select>
            </div>
            <label className="flex items-center justify-between">
              <span>Компактний режим</span>
              <input
                type="checkbox"
                checked={settings.appearance.compactMode}
                onChange={(e) => setSettings({
                  ...settings,
                  appearance: { ...settings.appearance, compactMode: e.target.checked }
                })}
                className="w-5 h-5"
              />
            </label>
          </div>
        </section>

        {/* Кнопка збереження */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isSaving ? 'Збереження...' : 'Зберегти налаштування'}
          </button>
        </div>
      </div>
    </div>
  );
}

