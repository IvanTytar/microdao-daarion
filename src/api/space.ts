import { ApiError, apiGet } from './client';
import { fetchCityNodes, fetchCityMicroDAOs, fetchCityAgents, fetchCityEventsSnapshot } from './city';
import { buildSpaceScene } from '../features/space-dashboard/lib/buildSpaceScene';
import type { SpaceScene } from '../features/space-dashboard/types/space';
import { getPlanets } from './space/getPlanets';
import { getNodes } from './space/getNodes';
import { getSpaceEvents } from './space/getSpaceEvents';

export { getPlanets, getNodes, getSpaceEvents };

/**
 * Fetches Space scene from backend or falls back to locally assembled data.
 */
export async function fetchSpaceScene(): Promise<SpaceScene> {
  try {
    return await apiGet<SpaceScene>('/space/planets/nodes/events');
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 0 || error.status === 404 || error.status === 500)
    ) {
      const [nodes, microDaos, agents, events] = await Promise.all([
        fetchCityNodes(),
        fetchCityMicroDAOs(),
        fetchCityAgents(new URLSearchParams()),
        fetchCityEventsSnapshot(),
      ]);

      return buildSpaceScene({
        nodes: nodes.items,
        microDaos: microDaos.items,
        agents: agents.items,
        events: events.items,
      });
    }
    throw error;
  }
}

