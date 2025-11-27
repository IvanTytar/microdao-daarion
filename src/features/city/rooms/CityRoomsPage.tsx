/**
 * Сторінка Public Rooms міста
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getCityRooms,
  createCityRoom,
  type CityRoom,
  type CreateRoomPayload
} from '../../../api/cityRooms';

export function CityRoomsPage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<CityRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newRoom, setNewRoom] = useState<CreateRoomPayload>({
    name: '',
    description: '',
  });

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    setIsLoading(true);
    try {
      const data = await getCityRooms();
      setRooms(data);
    } catch (error) {
      console.error('Failed to load city rooms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRoom = async () => {
    if (!newRoom.name) {
      alert('Введіть назву кімнати!');
      return;
    }

    try {
      await createCityRoom(newRoom);
      setNewRoom({ name: '', description: '' });
      setIsCreating(false);
      loadRooms();
    } catch (error) {
      console.error('Failed to create room:', error);
      alert('Помилка створення кімнати');
    }
  };

  const handleRoomClick = (roomId: string) => {
    navigate(`/city/rooms/${roomId}`);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">City Rooms</h1>
          <p className="text-gray-600 mt-1">Публічні кімнати DAARION City</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Створити кімнату
        </button>
      </div>

      {/* Форма створення */}
      {isCreating && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-xl font-bold mb-4">Нова кімната</h3>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Назва кімнати *"
              value={newRoom.name}
              onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            />
            <textarea
              placeholder="Опис"
              value={newRoom.description}
              onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateRoom}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Створити
              </button>
              <button
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Скасувати
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Список кімнат */}
      {isLoading ? (
        <div className="text-center py-12">Завантаження...</div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Немає кімнат. Створіть першу!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <div
              key={room.id}
              onClick={() => handleRoomClick(room.id)}
              className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition cursor-pointer"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-xl font-bold">{room.name}</h3>
                <span className="flex items-center gap-1 text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  {room.members_online}
                </span>
              </div>
              {room.description && (
                <p className="text-gray-600 mb-3 text-sm">{room.description}</p>
              )}
              {room.last_event && (
                <div className="text-xs text-gray-500 border-t pt-2">
                  Остання подія: {room.last_event}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

