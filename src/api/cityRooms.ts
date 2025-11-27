/**
 * API для City Public Rooms
 */

import { apiGet, apiPost, apiPatch, apiDelete } from './client';

export interface CityRoom {
  id: string;
  name: string;
  description?: string;
  members_online: number;
  last_event?: string;
  created_at: string;
  updated_at: string;
}

export interface CityRoomMessage {
  id: string;
  room_id: string;
  user_id: string;
  username: string;
  text: string;
  created_at: string;
}

export interface CityRoomDetail extends CityRoom {
  messages: CityRoomMessage[];
  online_members: string[];
}

export interface CreateRoomPayload {
  name: string;
  description?: string;
}

export interface SendMessagePayload {
  text: string;
}

/**
 * Отримати список всіх публічних кімнат міста
 */
export async function getCityRooms(): Promise<CityRoom[]> {
  try {
    return await apiGet('/v1/city/rooms');
  } catch (error) {
    console.error('Failed to get city rooms:', error);
    // Fallback до mock даних
    return [
      {
        id: 'city_general',
        name: 'General',
        description: 'Головна кімната міста',
        members_online: 42,
        last_event: 'Новий учасник приєднався',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'city_science',
        name: 'Science',
        description: 'Наукова спільнота DAARION',
        members_online: 15,
        last_event: 'Обговорення нового проєкту',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'city_energy',
        name: 'Energy Union',
        description: 'Енергетична спільнота',
        members_online: 28,
        last_event: 'Оновлення метрик',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
  }
}

/**
 * Отримати деталі кімнати з повідомленнями
 */
export async function getCityRoom(roomId: string): Promise<CityRoomDetail> {
  try {
    return await apiGet(`/v1/city/rooms/${roomId}`);
  } catch (error) {
    console.error('Failed to get city room:', error);
    // Fallback до mock даних
    return {
      id: roomId,
      name: 'General',
      description: 'Головна кімната міста',
      members_online: 42,
      messages: [
        {
          id: '1',
          room_id: roomId,
          user_id: 'user-1',
          username: 'Sofia',
          text: 'Вітаю всіх у DAARION City!',
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: '2',
          room_id: roomId,
          user_id: 'user-2',
          username: 'Yaromir',
          text: 'Привіт! Хто працює над новими проєктами?',
          created_at: new Date(Date.now() - 1800000).toISOString(),
        },
      ],
      online_members: ['user-1', 'user-2', 'user-3'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
}

/**
 * Створити нову публічну кімнату
 */
export async function createCityRoom(payload: CreateRoomPayload): Promise<CityRoom> {
  return apiPost('/v1/city/rooms', payload);
}

/**
 * Надіслати повідомлення в кімнату
 */
export async function sendCityRoomMessage(
  roomId: string,
  payload: SendMessagePayload
): Promise<CityRoomMessage> {
  return apiPost(`/v1/city/rooms/${roomId}/messages`, payload);
}

/**
 * Приєднатися до кімнати
 */
export async function joinCityRoom(roomId: string): Promise<void> {
  return apiPost(`/v1/city/rooms/${roomId}/join`, {});
}

/**
 * Покинути кімнату
 */
export async function leaveCityRoom(roomId: string): Promise<void> {
  return apiPost(`/v1/city/rooms/${roomId}/leave`, {});
}

