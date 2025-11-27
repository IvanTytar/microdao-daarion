/**
 * Living Map Page
 * Phase 9B: Main page for Living Map 2D visualization
 */
import { useLivingMapLite } from './hooks/useLivingMapLite';
import { LivingMapCanvas } from './components/LivingMapCanvas';
import { LayerSwitcher } from './components/LayerSwitcher';
import { EntityDetailsPanel } from './components/EntityDetailsPanel';

export function LivingMapPage() {
  const {
    snapshot,
    isLoading,
    error,
    connectionStatus,
    selectedLayer,
    setSelectedLayer,
    selectedEntityId,
    setSelectedEntityId,
    refetch
  } = useLivingMapLite();
  
  return (
    <div className="flex h-full w-full bg-gray-950">
      {/* Canvas Area */}
      <div className="flex-1 relative">
        {/* Loading State */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-950">
            <div className="text-center">
              <div className="text-6xl mb-4">🗺️</div>
              <div className="text-xl text-white font-semibold mb-2">
                Loading Living Map...
              </div>
              <div className="text-sm text-gray-400">
                Aggregating network state
              </div>
            </div>
          </div>
        )}
        
        {/* Error State */}
        {error && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-950">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-4">⚠️</div>
              <div className="text-xl text-white font-semibold mb-2">
                Failed to load Living Map
              </div>
              <div className="text-sm text-gray-400 mb-4">{error}</div>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        
        {/* Canvas */}
        {!isLoading && !error && (
          <LivingMapCanvas
            snapshot={snapshot}
            selectedLayer={selectedLayer}
            selectedEntityId={selectedEntityId}
            onSelectEntity={setSelectedEntityId}
          />
        )}
        
        {/* Connection Status Badge */}
        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-2 bg-gray-900/90 backdrop-blur-sm rounded-lg border border-gray-700">
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'open' ? 'bg-green-400' :
            connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' :
            'bg-red-400'
          }`}></div>
          <span className="text-xs text-gray-300">
            {connectionStatus === 'open' ? 'Connected' :
             connectionStatus === 'connecting' ? 'Connecting...' :
             'Disconnected'}
          </span>
        </div>
        
        {/* Legend */}
        <div className="absolute bottom-4 left-4 px-3 py-2 bg-gray-900/90 backdrop-blur-sm rounded-lg border border-gray-700">
          <div className="text-xs text-gray-400 mb-2">Legend</div>
          <div className="space-y-1 text-xs text-gray-300">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Active / Online</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-500 rounded"></div>
              <span>Inactive / Offline</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Selected</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Side Panel */}
      <div className="w-96 bg-gray-900 border-l border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            🗺️ Living Map
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            DAARION Network Visualization
          </p>
        </div>
        
        {/* Layer Switcher */}
        <LayerSwitcher value={selectedLayer} onChange={setSelectedLayer} />
        
        {/* Entity Details */}
        <EntityDetailsPanel
          snapshot={snapshot}
          selectedLayer={selectedLayer}
          selectedEntityId={selectedEntityId}
        />
        
        {/* Stats Footer */}
        {snapshot && (
          <div className="p-4 border-t border-gray-700 text-xs text-gray-400">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-gray-500">Total Agents</div>
                <div className="text-white font-semibold">
                  {snapshot.layers?.agents?.total_agents || 0}
                </div>
              </div>
              <div>
                <div className="text-gray-500">microDAOs</div>
                <div className="text-white font-semibold">
                  {snapshot.layers?.city?.microdaos_total || 0}
                </div>
              </div>
            </div>
            <div className="mt-2 text-gray-600">
              Last updated: {new Date(snapshot.generated_at).toLocaleTimeString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

