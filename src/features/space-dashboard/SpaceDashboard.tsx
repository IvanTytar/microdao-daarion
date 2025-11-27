import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GalaxyView } from './components/GalaxyView';
import { StarSystemView } from './components/StarSystemView';
import { useSpaceScene } from './hooks/useSpaceScene';
import type { SpaceCluster, SpaceObjectBase } from './types/space';
import { UniversalAgentCabinet } from '../../components/UniversalAgentCabinet';
import type { AgentBlueprint } from '../../types/agent';

type SpaceEntity = SpaceObjectBase | SpaceCluster;

export function SpaceDashboard() {
  const navigate = useNavigate();
  const { scene, loading, error, refetch } = useSpaceScene();
  const [mode, setMode] = useState<'galaxy' | 'cosmos'>('galaxy');
  const [selectedEntity, setSelectedEntity] = useState<SpaceEntity | null>(null);

  // Обробка кліків по entities для переходу
  const handleEntityClick = (entity: SpaceEntity) => {
    setSelectedEntity(entity);

    // Навігація залежно від типу entity
    if (entity.type === 'planet') {
      // Перехід до microDAO
      const daoId = entity.id.replace('planet:', 'microdao:');
      console.log('[Space] Navigate to DAO:', daoId);
      // navigate(`/microdao/${daoId}`);
    } else if (entity.type === 'star') {
      // Перехід до Node
      const nodeId = entity.id.replace('star:', 'node:');
      console.log('[Space] Navigate to Node:', nodeId);
      // navigate(`/nodes/${nodeId}`);
    } else if (entity.type === 'moon') {
      // Перехід до Agent
      const agentId = entity.id.replace('moon:', 'agent:');
      console.log('[Space] Navigate to Agent:', agentId);
      // navigate(`/agent/${agentId}`);
    }
  };

  const placeholderBlueprint: AgentBlueprint | null = useMemo(() => {
    if (!selectedEntity) return null;

    return {
      entityId: `space:${selectedEntity.id}`,
      agentKind:
        selectedEntity.type === 'star'
          ? 'node-agent'
          : selectedEntity.type === 'planet'
            ? 'dao-agent'
            : selectedEntity.type === 'cluster'
              ? 'core-agent'
            : 'core-agent',
      name: selectedEntity.name,
      version: '0.1.0',
      coreRole: 'space-monitor',
      description: 'Космічний об’єкт мережі DAARION',
      models: [],
      memory: [],
      channels: [],
      tools: [],
      nodes: [],
      context: `Об’єкт: ${selectedEntity.type}`,
    };
  }, [selectedEntity]);

  const modeButtons = [
    { key: 'galaxy' as const, label: 'Galaxy View' },
    { key: 'cosmos' as const, label: 'Star System View' },
  ];

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-white/10 bg-gradient-to-r from-indigo-900/60 to-slate-900/80 p-8 shadow-2xl shadow-indigo-800/30">
        <p className="text-sm uppercase tracking-[0.3em] text-indigo-300/80">
          DAARION SPACE GRID
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-white">
          Space Dashboard
        </h1>
        <p className="mt-3 max-w-3xl text-lg text-indigo-100/80">
          Космічна проекція інфраструктури: зірки — ноди, планети —
          microDAO, супутники — агенти. Обирай об’єкт для швидкого переходу
          у відповідний кабінет.
        </p>
      </header>

      {loading && (
        <div className="rounded-3xl border border-white/10 bg-slate-900/40 p-6 text-slate-300">
          Завантаження сцени...
        </div>
      )}

      {error && (
        <div className="rounded-3xl border border-red-500/30 bg-red-900/20 p-6 text-red-200">
          Не вдалося завантажити Space сцену: {error}
        </div>
      )}

      {scene && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {modeButtons.map((button) => (
              <button
                key={button.key}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  mode === button.key
                    ? 'bg-indigo-500 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
                onClick={() => setMode(button.key)}
              >
                {button.label}
              </button>
            ))}
            <button
              className="rounded-full border border-white/20 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white/80 hover:border-white/40"
              onClick={() => refetch()}
            >
              Оновити дані
            </button>
            <button
              className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-cyan-300 transition-colors hover:bg-cyan-500/20"
              onClick={() => navigate('/city-v2')}
            >
              🏙️ Go to City
            </button>
          </div>

          {mode === 'galaxy' ? (
            <GalaxyView
              scene={scene}
              onSelect={(cluster) => handleEntityClick(cluster)}
            />
          ) : (
            <StarSystemView
              scene={scene}
              onSelect={(entity) => handleEntityClick(entity)}
            />
          )}
        </div>
      )}

      {placeholderBlueprint && (
        <UniversalAgentCabinet
          blueprint={placeholderBlueprint}
          metrics={{
            availability: 99.2,
            performance: 93.4,
            reliability: 97.1,
            load: 42,
          }}
          humanSummary={`Обраний об’єкт: ${selectedEntity?.name ?? ''}`}
          engineerSummary="Space Dashboard ще під’єднується до реальних даних."
        />
      )}
    </div>
  );
}

