/**
 * Layer Switcher Component
 * Phase 9B: UI for switching between layers
 */
import type { LayerType } from '../hooks/useLivingMapLite';

interface LayerSwitcherProps {
  value: LayerType;
  onChange: (layer: LayerType) => void;
}

const LAYERS: Array<{ value: LayerType; label: string; icon: string }> = [
  { value: 'city', label: 'City', icon: '🏙️' },
  { value: 'space', label: 'Space', icon: '🌌' },
  { value: 'nodes', label: 'Nodes', icon: '💻' },
  { value: 'agents', label: 'Agents', icon: '🤖' }
];

export function LayerSwitcher(props: LayerSwitcherProps) {
  const { value, onChange } = props;
  
  return (
    <div className="flex flex-col gap-2 p-4 bg-gray-900 border-b border-gray-700">
      <div className="text-sm font-medium text-gray-400 mb-1">Layers</div>
      <div className="grid grid-cols-2 gap-2">
        {LAYERS.map((layer) => (
          <button
            key={layer.value}
            onClick={() => onChange(layer.value)}
            className={`
              px-4 py-3 rounded-lg flex items-center justify-center gap-2
              transition-all duration-200
              ${
                value === layer.value
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/50'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }
            `}
          >
            <span className="text-lg">{layer.icon}</span>
            <span className="font-medium">{layer.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

