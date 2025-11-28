import type {
  SpaceScene,
  SpaceSourceData,
  SpaceCluster,
  StarObject,
  PlanetObject,
  MoonObject,
  GatewayObject,
  AnomalyObject,
} from '../types/space';
import type {
  NodeInfo as CityNodeInfo,
  MicroDAOInfo,
  AgentInfo,
  CityEvent,
} from '../../city-dashboard/types/city';

const GALAXY_CENTER = { x: 480, y: 320 };
const STAR_RING_RADIUS = 240;
const STAR_BASE_RADIUS = 58;

const CLUSTER_PRESETS = [
  {
    key: 'core',
    id: 'cluster-core',
    clusterId: 'constellation-core',
    name: 'Core Infrastructure',
    description: 'Hetzner, Supabase та базові дата-центри',
    position: { x: 360, y: 320, radius: 240 },
  },
  {
    key: 'frontier',
    id: 'cluster-frontier',
    clusterId: 'constellation-frontier',
    name: 'Frontier & Edge',
    description: 'MacBook / Edge вузли, польові лабораторії',
    position: { x: 660, y: 260, radius: 200 },
  },
] as const;

type ClusterKey = (typeof CLUSTER_PRESETS)[number]['key'];

const MIN_HEALTH = 18;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normaliseNodeIdentifier(
  value: string | undefined,
  nodes: CityNodeInfo[],
): string | null {
  if (!value) return null;
  const lowered = value.toLowerCase();
  const direct = nodes.find(
    (node) =>
      node.id.toLowerCase() === lowered || node.name.toLowerCase() === lowered,
  );
  if (direct) {
    return direct.id;
  }

  const partial = nodes.find(
    (node) =>
      lowered.includes(node.id.toLowerCase()) ||
      node.id.toLowerCase().includes(lowered) ||
      lowered.includes(node.name.toLowerCase()),
  );
  return partial ? partial.id : null;
}

function detectClusterKey(node: CityNodeInfo): ClusterKey {
  const haystack = `${node.name} ${node.location}`.toLowerCase();
  if (haystack.includes('hetzner') || haystack.includes('core')) {
    return 'core';
  }
  return 'frontier';
}

function statusFromNodeStatus(status: CityNodeInfo['status']) {
  switch (status) {
    case 'online':
      return 'stable';
    case 'degraded':
    case 'maintenance':
      return 'warning';
    default:
      return 'critical';
  }
}

function statusFromMicroDaoStatus(
  status: MicroDAOInfo['status'],
): SpaceCluster['status'] {
  switch (status) {
    case 'active':
      return 'stable';
    case 'forming':
      return 'warning';
    default:
      return 'critical';
  }
}

function statusFromAgentStatus(status: AgentInfo['status']) {
  switch (status) {
    case 'active':
      return 'stable';
    case 'idle':
      return 'warning';
    default:
      return 'critical';
  }
}

function severityFromPriority(event: CityEvent['priority']) {
  switch (event) {
    case 'critical':
      return 'high';
    case 'high':
      return 'medium';
    default:
      return 'low';
  }
}

function buildMicroDaoHostMap(
  microDaos: MicroDAOInfo[],
  agents: AgentInfo[],
  nodes: CityNodeInfo[],
) {
  const assignment = new Map<string, string>();

  microDaos.forEach((microDao, index) => {
    const matchingAgents = agents.filter((agent) => {
      if (!agent.microDao) return false;
      const target = agent.microDao.toLowerCase();
      return (
        target === microDao.id.toLowerCase() ||
        target === microDao.name.toLowerCase() ||
        target.includes(microDao.id.toLowerCase()) ||
        microDao.name.toLowerCase().includes(target)
      );
    });

    const nodeCounts = new Map<string, number>();
    matchingAgents.forEach((agent) => {
      const resolved = normaliseNodeIdentifier(agent.node, nodes);
      if (!resolved) return;
      nodeCounts.set(resolved, (nodeCounts.get(resolved) ?? 0) + 1);
    });

    if (nodeCounts.size) {
      const [bestNode] = [...nodeCounts.entries()].sort(
        (a, b) => b[1] - a[1],
      )[0];
      assignment.set(microDao.id, bestNode);
    } else if (nodes.length) {
      assignment.set(microDao.id, nodes[index % nodes.length].id);
    }
  });

  return assignment;
}

function computeStarPosition(index: number, total: number) {
  if (total <= 1) {
    return { x: GALAXY_CENTER.x, y: GALAXY_CENTER.y, radius: STAR_BASE_RADIUS };
  }

  const angle = (index / total) * Math.PI * 2;
  const eccentricity = 0.65;
  return {
    x: GALAXY_CENTER.x + Math.cos(angle) * STAR_RING_RADIUS,
    y: GALAXY_CENTER.y + Math.sin(angle) * STAR_RING_RADIUS * eccentricity,
    radius: STAR_BASE_RADIUS,
  };
}

function buildClusters(
  nodes: CityNodeInfo[],
  microDaos: MicroDAOInfo[],
  agents: AgentInfo[],
  microDaoAssignments: Map<string, string>,
): SpaceCluster[] {
  const nodeGroups = new Map<ClusterKey, CityNodeInfo[]>();
  const microDaoGroups = new Map<ClusterKey, number>();
  const agentGroups = new Map<ClusterKey, number>();
  const nodeClusterMap = new Map<string, ClusterKey>();

  nodes.forEach((node) => {
    const clusterKey = detectClusterKey(node);
    nodeClusterMap.set(node.id, clusterKey);
    const list = nodeGroups.get(clusterKey) ?? [];
    list.push(node);
    nodeGroups.set(clusterKey, list);
  });

  microDaos.forEach((microDao) => {
    const hostNodeId = microDaoAssignments.get(microDao.id);
    const clusterKey = hostNodeId
      ? nodeClusterMap.get(hostNodeId) ?? 'frontier'
      : 'frontier';
    microDaoGroups.set(
      clusterKey,
      (microDaoGroups.get(clusterKey) ?? 0) + 1,
    );
  });

  agents.forEach((agent) => {
    const nodeId = normaliseNodeIdentifier(agent.node, nodes);
    const clusterKey = nodeId
      ? nodeClusterMap.get(nodeId) ?? 'frontier'
      : 'frontier';
    agentGroups.set(clusterKey, (agentGroups.get(clusterKey) ?? 0) + 1);
  });

  return CLUSTER_PRESETS.map((preset) => {
    const nodeCount = nodeGroups.get(preset.key)?.length ?? 0;
    const microCount = microDaoGroups.get(preset.key) ?? 0;
    const agentCount = agentGroups.get(preset.key) ?? 0;
    const density = clamp(
      (nodeCount + microCount * 0.35 + agentCount * 0.02) /
        Math.max(nodes.length || 1, 1),
      0,
      1,
    );
    const status =
      density >= 0.75
        ? 'stable'
        : density >= 0.4
          ? ('warning' as const)
          : ('critical' as const);

    return {
      id: preset.id,
      type: 'cluster',
      clusterId: preset.clusterId,
      name: preset.name,
      description: preset.description,
      nodes: nodeCount,
      microDaos: microCount,
      agents: agentCount,
      density,
      status,
      position: preset.position,
    };
  });
}

function buildStars(
  nodes: CityNodeInfo[],
  microDaos: MicroDAOInfo[],
  agents: AgentInfo[],
  microDaoAssignments: Map<string, string>,
): StarObject[] {
  return nodes.map((node, index) => {
    const position = computeStarPosition(index, nodes.length);
    const assignedMicroDaos = microDaos.filter(
      (microDao) => microDaoAssignments.get(microDao.id) === node.id,
    );
    const assignedAgents = agents.filter((agent) =>
      (normaliseNodeIdentifier(agent.node, nodes) ?? '') === node.id,
    );

    const health =
      node.metrics && node.metrics.cpuUsage !== undefined
        ? clamp(
            100 -
              (node.metrics.cpuUsage * 0.4 +
                node.metrics.ramUsage * 0.35 +
                (node.metrics.diskUsage ?? 30) * 0.15),
            MIN_HEALTH,
            100,
          )
        : 80;

    return {
      id: `star-${node.id}`,
      type: 'star',
      name: node.name,
      nodeId: node.id,
      health,
      microDaos: assignedMicroDaos.length,
      agents: assignedAgents.length || node.agents || 0,
      status: statusFromNodeStatus(node.status),
      position,
    };
  });
}

function buildPlanets(
  microDaos: MicroDAOInfo[],
  microDaoAssignments: Map<string, string>,
  stars: StarObject[],
) {
  const planets: PlanetObject[] = [];
  const planetsByStar = new Map<string, MicroDAOInfo[]>();

  microDaos.forEach((microDao) => {
    const hostNodeId =
      microDaoAssignments.get(microDao.id) ??
      stars[0]?.nodeId ??
      microDao.id;
    const arr = planetsByStar.get(hostNodeId) ?? [];
    arr.push(microDao);
    planetsByStar.set(hostNodeId, arr);
  });

  planetsByStar.forEach((daoList, nodeId) => {
    const star = stars.find((s) => s.nodeId === nodeId);
    if (!star) return;

    daoList.forEach((microDao, index) => {
      const orbitRadius = 110 + index * 45;
      const angle = (index / Math.max(daoList.length, 1)) * Math.PI * 2;
      const position = {
        x: star.position.x + Math.cos(angle) * orbitRadius,
        y: star.position.y + Math.sin(angle) * orbitRadius,
      };

      planets.push({
        id: `planet-${microDao.id}`,
        type: 'planet',
        name: microDao.name,
        microDaoId: microDao.id,
        population: microDao.members,
        agents: microDao.agents,
        orbitRadius,
        starId: star.id,
        status: statusFromMicroDaoStatus(microDao.status),
        position,
      });
    });
  });

  return planets;
}

function buildMoons(
  agents: AgentInfo[],
  planets: PlanetObject[],
  microDaos: MicroDAOInfo[],
) {
  const moons: MoonObject[] = [];
  const agentsByMicroDao = new Map<string, AgentInfo[]>();

  agents.forEach((agent) => {
    if (!agent.microDao) return;
    const target = agent.microDao.toLowerCase();
    const microDao =
      microDaos.find(
        (dao) =>
          dao.id.toLowerCase() === target ||
          dao.name.toLowerCase() === target ||
          target.includes(dao.id.toLowerCase()),
      ) ?? null;
    if (!microDao) return;
    const list = agentsByMicroDao.get(microDao.id) ?? [];
    list.push(agent);
    agentsByMicroDao.set(microDao.id, list);
  });

  planets.forEach((planet) => {
    const list = agentsByMicroDao.get(planet.microDaoId)?.slice(0, 4) ?? [];
    list.forEach((agent, index) => {
      const orbitRadius = 20 + index * 6;
      const angle = (index / Math.max(list.length, 1)) * Math.PI * 2;
      const position = {
        x: planet.position.x + Math.cos(angle) * (orbitRadius + 16),
        y: planet.position.y + Math.sin(angle) * (orbitRadius + 16),
      };

      moons.push({
        id: `moon-${agent.id}`,
        type: 'moon',
        name: agent.name,
        agentId: agent.id,
        focus: agent.role,
        planetId: planet.id,
        orbitRadius,
        status: statusFromAgentStatus(agent.status),
        position,
      });
    });
  });

  return moons;
}

function buildGateways(agents: AgentInfo[]): GatewayObject[] {
  const integrations = agents
    .filter(
      (agent) =>
        agent.type === 'service-agent' ||
        agent.type === 'platform-agent' ||
        /bridge|gateway|connector|monitor/i.test(agent.role),
    )
    .slice(0, 3);

  if (!integrations.length) {
    return [
      {
        id: 'gateway-matrix',
        type: 'gateway',
        name: 'Matrix Bridge',
        integration: 'Matrix',
        position: { x: 520, y: 160 },
        status: 'stable',
      },
    ];
  }

  const basePositions = [
    { x: 520, y: 160 },
    { x: 220, y: 180 },
    { x: 780, y: 200 },
  ];

  return integrations.map((agent, index) => ({
    id: `gateway-${agent.id}`,
    type: 'gateway',
    name: agent.name,
    integration: agent.role,
    position: basePositions[index] ?? { x: 520 + index * 80, y: 160 },
    status: statusFromAgentStatus(agent.status),
  }));
}

function buildAnomalies(events: CityEvent[]): AnomalyObject[] {
  const alertEvents = events
    .filter(
      (event) =>
        event.type.startsWith('alerts') ||
        event.type.startsWith('metrics.reconciled') ||
        event.priority === 'high' ||
        event.priority === 'critical',
    )
    .slice(0, 3);

  return alertEvents.map((event, index) => ({
    id: `anomaly-${event.id}`,
    type: 'anomaly',
    name: event.title,
    severity: severityFromPriority(event.priority),
    description: event.description,
    status: 'warning',
    position: { x: 220 + index * 180, y: 480 - index * 60 },
  }));
}

export function buildSpaceScene(source: SpaceSourceData): SpaceScene {
  const nodes = source.nodes ?? [];
  const microDaos = source.microDaos ?? [];
  const agents = source.agents ?? [];
  const events = source.events ?? [];

  const microDaoAssignments = buildMicroDaoHostMap(microDaos, agents, nodes);
  const stars = buildStars(nodes, microDaos, agents, microDaoAssignments);
  const planets = buildPlanets(microDaos, microDaoAssignments, stars);
  const moons = buildMoons(agents, planets, microDaos);
  const clusters = buildClusters(
    nodes,
    microDaos,
    agents,
    microDaoAssignments,
  );
  const gateways = buildGateways(agents);
  const anomalies = buildAnomalies(events);

  return {
    clusters,
    stars,
    planets,
    moons,
    gateways,
    anomalies,
  };
}

