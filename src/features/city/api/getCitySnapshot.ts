/**
 * City Snapshot API
 * 
 * Отримання повного знімку стану міста
 */

import type { CitySnapshot } from '../types/city';
import { apiGet } from '../../../api/client';

/**
 * Отримати повний знімок міста
 */
export async function getCitySnapshot(): Promise<CitySnapshot> {
  return await apiGet<CitySnapshot>('/city/snapshot');
}




