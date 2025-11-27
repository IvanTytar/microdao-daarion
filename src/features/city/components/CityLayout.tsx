/**
 * CityLayout Component
 * 
 * Основний layout для City Dashboard
 */

import type { CitySnapshot } from '../types/city';
import { CityHud } from './CityHud';
import { CitySectorMap } from './CitySectorMap';
import { CityMetricsGrid } from './CityMetricsGrid';
import { CityMicroDAOPanel } from './CityMicroDAOPanel';
import { CityNodesSummary } from './CityNodesSummary';
import { CityAgentPanel } from './CityAgentPanel';
import { CityQuestPanel } from './CityQuestPanel';
import { CityEventsFeed } from './CityEventsFeed';

interface CityLayoutProps {
  snapshot: CitySnapshot;
}

export function CityLayout({ snapshot }: CityLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 relative overflow-hidden">
      <CityHud snapshot={snapshot} />

      <main className="pt-6 px-6 pb-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Top: Map + Metrics */}
          <section className="col-span-7 h-[320px]">
            <CitySectorMap snapshot={snapshot} />
          </section>
          <section className="col-span-5 h-[320px]">
            <CityMetricsGrid metrics={snapshot.metrics} />
          </section>

          {/* Middle: microDAO + Nodes */}
          <section className="col-span-5 h-[260px]">
            <CityMicroDAOPanel microdao={snapshot.microdao} />
          </section>
          <section className="col-span-7 h-[260px]">
            <CityNodesSummary nodes={snapshot.nodes} />
          </section>

          {/* Bottom: Agent + Quests + Events */}
          <section className="col-span-4 h-[220px]">
            <CityAgentPanel agent={snapshot.agents[0] || null} />
          </section>
          <section className="col-span-4 h-[220px]">
            <CityQuestPanel quests={snapshot.quests} />
          </section>
          <section className="col-span-4 h-[220px]">
            <CityEventsFeed events={snapshot.events} />
          </section>
        </div>
      </main>
    </div>
  );
}





