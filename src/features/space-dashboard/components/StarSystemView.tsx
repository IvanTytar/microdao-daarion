import { useEffect, useMemo, useState } from 'react';
import type { SpaceScene, StarObject, PlanetObject, SpaceObjectBase } from '../types/space';
import { CosmosView } from './CosmosView';

interface StarSystemViewProps {
  scene: SpaceScene;
  onSelect?: (entity: SpaceObjectBase) => void;
}

export function StarSystemView({ scene, onSelect }: StarSystemViewProps) {
  const [selectedStarId, setSelectedStarId] = useState<string | null>(null);
  const [selectedPlanetId, setSelectedPlanetId] = useState<string | null>(null);

  const stars = scene.stars ?? [];

  useEffect(() => {
    if (!selectedStarId && stars.length > 0) {
      setSelectedStarId(stars[0].id);
    }
  }, [stars, selectedStarId]);

  const selectedStar: StarObject | null = useMemo(
    () => stars.find((star) => star.id === selectedStarId) ?? stars[0] ?? null,
    [stars, selectedStarId],
  );

  const systemPlanets: PlanetObject[] = useMemo(() => {
    if (!selectedStar) return [];
    return (scene.planets ?? []).filter((planet) => planet.starId === selectedStar.id);
  }, [scene.planets, selectedStar]);

  useEffect(() => {
    if (systemPlanets.length === 0) {
      setSelectedPlanetId(null);
      return;
    }
    if (!selectedPlanetId || !systemPlanets.some((p) => p.id === selectedPlanetId)) {
      setSelectedPlanetId(systemPlanets[0].id);
    }
  }, [systemPlanets, selectedPlanetId]);

  const selectedPlanet = useMemo(
    () => systemPlanets.find((planet) => planet.id === selectedPlanetId) ?? null,
    [systemPlanets, selectedPlanetId],
  );

  const planetMoons = useMemo(
    () =>
      (scene.moons ?? []).filter((moon) =>
        selectedPlanet ? moon.planetId === selectedPlanet.id : systemPlanets.some((p) => p.id === moon.planetId),
      ),
    [scene.moons, selectedPlanet, systemPlanets],
  );

  const filteredScene = useMemo<SpaceScene>(
    () => ({
      clusters: [],
      stars: selectedStar ? [selectedStar] : [],
      planets: systemPlanets,
      moons: planetMoons,
      gateways: scene.gateways ?? [],
      anomalies: scene.anomalies ?? [],
    }),
    [selectedStar, systemPlanets, planetMoons, scene.gateways, scene.anomalies],
  );

  const systemMetrics = useMemo(() => {
    if (!selectedStar) {
      return {
        health: 0,
        microDaos: 0,
        agents: 0,
        alerts: 0,
      };
    }
    const alerts =
      scene.anomalies?.filter((anomaly) => {
        // поки немає прив'язки до конкретної ноди, показуємо всі
        return anomaly.status !== 'stable';
      }).length ?? 0;

    return {
      health: selectedStar.health,
      microDaos: systemPlanets.length,
      agents: systemPlanets.reduce((acc, planet) => acc + planet.agents, 0),
      alerts,
    };
  }, [selectedStar, systemPlanets, scene.anomalies]);

  const starButtonClass = (star: StarObject) =>
    `rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
      selectedStar && selectedStar.id === star.id
        ? 'border-indigo-400 bg-indigo-500/20 text-white'
        : 'border-white/20 text-white/70 hover:border-white/40'
    }`;

  const planetButtonClass = (planet: PlanetObject) =>
    `flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
      selectedPlanet && selectedPlanet.id === planet.id
        ? 'border-cyan-400/60 bg-cyan-500/10 text-white'
        : 'border-white/10 bg-white/5 text-white/80 hover:border-white/30'
    }`;

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-[0_15px_90px_rgba(15,23,42,0.8)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase text-indigo-400/70">Режим</p>
          <h3 className="text-2xl font-semibold text-white">Star System View</h3>
          {selectedStar && (
            <p className="mt-1 text-sm text-indigo-100/70">
              Центральна нода: <span className="font-semibold">{selectedStar.name}</span>
            </p>
          )}
        </div>
        <div className="flex gap-3">
          {[
            { label: 'Health', value: `${Math.round(systemMetrics.health)}%` },
            { label: 'microDAO', value: systemMetrics.microDaos },
            { label: 'Агенти', value: systemMetrics.agents },
            { label: 'Alerts', value: systemMetrics.alerts },
          ].map((metric) => (
            <div
              key={metric.label}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-center text-sm text-white backdrop-blur"
            >
              <p className="text-xs uppercase tracking-widest text-white/50">{metric.label}</p>
              <p className="text-lg font-semibold text-white">{metric.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div>
          <div className="flex flex-wrap gap-2">
            {stars.map((star) => (
              <button
                key={star.id}
                className={starButtonClass(star)}
                onClick={() => {
                  setSelectedStarId(star.id);
                  onSelect?.(star);
                }}
              >
                {star.name}
              </button>
            ))}
          </div>

          <div className="mt-4">
            <CosmosView
              scene={filteredScene}
              onSelect={(entity) => {
                setSelectedPlanetId(entity.type === 'planet' ? entity.id : selectedPlanetId);
                onSelect?.(entity);
              }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-inner shadow-black/30">
          <h4 className="text-sm uppercase tracking-[0.3em] text-white/60">Орбіти microDAO</h4>
          <div className="mt-3 space-y-3">
            {systemPlanets.length === 0 && (
              <p className="text-sm text-white/50">Для цієї ноди ще не під’єднано microDAO.</p>
            )}
            {systemPlanets.map((planet) => (
              <button
                key={planet.id}
                className={planetButtonClass(planet)}
                onClick={() => {
                  setSelectedPlanetId(planet.id);
                  onSelect?.(planet);
                }}
              >
                <div>
                  <p className="text-base font-semibold">{planet.name}</p>
                  <p className="text-xs text-white/60">
                    Населення {planet.population} · Агенти {planet.agents}
                  </p>
                </div>
                <span className="text-sm text-white/70">
                  Орбіта {planet.orbitRadius}
                </span>
              </button>
            ))}
          </div>

          {selectedPlanet && (
            <div className="mt-5 rounded-2xl border border-white/5 bg-slate-950/60 p-4">
              <p className="text-sm uppercase tracking-[0.3em] text-white/50">Супутники / агенти</p>
              {planetMoons.length === 0 ? (
                <p className="mt-2 text-sm text-white/60">Немає активних агентів на цій орбіті.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {planetMoons.map((moon) => (
                    <button
                      key={moon.id}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-white/80 hover:border-white/30"
                      onClick={() => onSelect?.(moon)}
                    >
                      <div className="font-semibold text-white">{moon.name}</div>
                      <div className="text-xs text-white/60">{moon.focus}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}





