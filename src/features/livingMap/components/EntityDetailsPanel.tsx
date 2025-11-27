/**
 * Entity Details Panel Component
 * Phase 9B: Shows details of selected entity
 */
import type { LivingMapSnapshot } from '../hooks/useLivingMapFull';
import type { LayerType } from '../hooks/useLivingMapLite';

interface EntityDetailsPanelProps {
  snapshot: LivingMapSnapshot | null;
  selectedLayer: LayerType;
  selectedEntityId: string | null;
}

export function EntityDetailsPanel(props: EntityDetailsPanelProps) {
  const { snapshot, selectedLayer, selectedEntityId } = props;
  
  if (!selectedEntityId || !snapshot) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">👆</div>
          <p>Click on an entity to view details</p>
        </div>
      </div>
    );
  }
  
  // Find entity in snapshot
  const layer = snapshot.layers[selectedLayer];
  let entity = null;
  
  if (layer && 'items' in layer) {
    entity = (layer as any).items.find((item: any) => item.id === selectedEntityId);
  } else if (layer && 'planets' in layer) {
    entity = (layer as any).planets.find((item: any) => item.id === selectedEntityId);
    if (!entity) {
      entity = (layer as any).nodes.find((item: any) => item.id === selectedEntityId);
    }
  }
  
  if (!entity) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center text-gray-500">
        <p>Entity not found</p>
      </div>
    );
  }
  
  return (
    <div className="flex-1 p-4 overflow-y-auto">
      <div className="space-y-4">
        {/* Header */}
        <div>
          <div className="text-xs text-gray-500 uppercase mb-1">
            {selectedLayer} entity
          </div>
          <h3 className="text-xl font-bold text-white">
            {entity.name || 'Unknown'}
          </h3>
        </div>
        
        {/* Status */}
        <div>
          <div className="text-xs text-gray-500 mb-1">Status</div>
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
            entity.status === 'active' || entity.status === 'online'
              ? 'bg-green-900/50 text-green-400'
              : 'bg-gray-800 text-gray-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              entity.status === 'active' || entity.status === 'online'
                ? 'bg-green-400'
                : 'bg-gray-400'
            }`}></span>
            {entity.status || 'unknown'}
          </div>
        </div>
        
        {/* Layer-specific details */}
        {selectedLayer === 'city' && (
          <div className="space-y-3">
            <DetailRow label="Members" value={entity.members || 0} />
            <DetailRow label="Agents" value={entity.agents || 0} />
            <DetailRow label="Nodes" value={entity.nodes || 0} />
            {entity.description && (
              <div>
                <div className="text-xs text-gray-500 mb-1">Description</div>
                <p className="text-sm text-gray-300">{entity.description}</p>
              </div>
            )}
          </div>
        )}
        
        {selectedLayer === 'agents' && (
          <div className="space-y-3">
            <DetailRow label="Kind" value={entity.kind || 'unknown'} />
            <DetailRow label="Model" value={entity.model || 'N/A'} />
            {entity.usage && (
              <>
                <DetailRow label="LLM Calls (24h)" value={entity.usage.llm_calls_24h || 0} />
                <DetailRow label="Tokens (24h)" value={entity.usage.tokens_24h || 0} />
              </>
            )}
          </div>
        )}
        
        {selectedLayer === 'nodes' && entity.metrics && (
          <div className="space-y-3">
            <DetailRow 
              label="CPU" 
              value={`${Math.round((entity.metrics.cpu || 0) * 100)}%`} 
            />
            <DetailRow 
              label="GPU" 
              value={`${Math.round((entity.metrics.gpu || 0) * 100)}%`} 
            />
            <DetailRow 
              label="RAM" 
              value={`${Math.round((entity.metrics.ram || 0) * 100)}%`} 
            />
          </div>
        )}
        
        {selectedLayer === 'space' && (
          <div className="space-y-3">
            <DetailRow label="Type" value={entity.type || 'unknown'} />
            {entity.orbits && (
              <DetailRow label="Orbiting Nodes" value={entity.orbits.length} />
            )}
            {entity.active_proposals !== undefined && (
              <DetailRow label="Active Proposals" value={entity.active_proposals} />
            )}
          </div>
        )}
        
        {/* Raw Data (Debug) */}
        <details className="mt-6">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
            Raw Data
          </summary>
          <pre className="mt-2 text-xs text-gray-400 overflow-x-auto bg-gray-950 p-2 rounded">
            {JSON.stringify(entity, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-sm font-medium text-white">{value}</div>
    </div>
  );
}

