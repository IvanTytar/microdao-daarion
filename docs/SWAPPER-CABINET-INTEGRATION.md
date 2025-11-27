# Swapper Service - Cabinet Integration Guide

**Version:** 1.0.0  
**Last Updated:** 2025-11-22  
**Status:** ✅ Ready for Integration

---

## Overview

This document describes how to integrate Swapper Service status and metrics into Node #1 and Node #2 admin consoles (cabinet interfaces).

---

## API Endpoints for Cabinets

### 1. GET /api/cabinet/swapper/status

Get complete Swapper Service status for cabinet display.

**Response:**
```json
{
  "service": "swapper-service",
  "status": "healthy",
  "mode": "single-active",
  "active_model": {
    "name": "deepseek-r1-70b",
    "uptime_hours": 1.5,
    "request_count": 42,
    "loaded_at": "2025-11-22T10:30:00"
  },
  "total_models": 8,
  "available_models": ["deepseek-r1-70b", "qwen2.5-coder-32b", ...],
  "loaded_models": ["deepseek-r1-70b"],
  "models": [
    {
      "name": "deepseek-r1-70b",
      "ollama_name": "deepseek-r1:70b",
      "type": "llm",
      "size_gb": 42,
      "priority": "high",
      "status": "loaded",
      "is_active": true,
      "uptime_hours": 1.5,
      "request_count": 42,
      "total_uptime_seconds": 5400.0
    }
  ],
  "timestamp": "2025-11-22T12:00:00"
}
```

### 2. GET /api/cabinet/swapper/models

Get detailed information about all models.

**Response:**
```json
{
  "models": [
    {
      "name": "deepseek-r1-70b",
      "ollama_name": "deepseek-r1:70b",
      "type": "llm",
      "size_gb": 42,
      "priority": "high",
      "status": "loaded",
      "is_active": true,
      "can_load": false,
      "can_unload": true,
      "uptime_hours": 1.5,
      "request_count": 42,
      "total_uptime_seconds": 5400.0,
      "loaded_at": "2025-11-22T10:30:00"
    }
  ],
  "total": 8,
  "active_count": 1,
  "timestamp": "2025-11-22T12:00:00"
}
```

### 3. GET /api/cabinet/swapper/metrics/summary

Get summary metrics for dashboard.

**Response:**
```json
{
  "summary": {
    "total_models": 8,
    "active_models": 1,
    "available_models": 8,
    "total_uptime_hours": 24.5,
    "total_requests": 150
  },
  "most_used_model": {
    "name": "deepseek-r1-70b",
    "uptime_hours": 12.3,
    "request_count": 85
  },
  "active_model": {
    "name": "deepseek-r1-70b",
    "uptime_hours": 1.5
  },
  "timestamp": "2025-11-22T12:00:00"
}
```

---

## Frontend Integration Examples

### React Component Example

```tsx
import React, { useEffect, useState } from 'react';

interface SwapperStatus {
  service: string;
  status: string;
  mode: string;
  active_model: {
    name: string;
    uptime_hours: number;
    request_count: number;
    loaded_at: string;
  } | null;
  total_models: number;
  models: Array<{
    name: string;
    type: string;
    size_gb: number;
    status: string;
    is_active: boolean;
    uptime_hours: number;
  }>;
}

export const SwapperStatusCard: React.FC = () => {
  const [status, setStatus] = useState<SwapperStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('http://localhost:8890/api/cabinet/swapper/status');
        const data = await response.json();
        setStatus(data);
      } catch (error) {
        console.error('Error fetching Swapper status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!status) return <div>Error loading status</div>;

  return (
    <div className="swapper-status-card">
      <h3>Swapper Service</h3>
      <div className="status-info">
        <p>Status: <span className={status.status}>{status.status}</span></p>
        <p>Mode: {status.mode}</p>
        <p>Total Models: {status.total_models}</p>
      </div>
      
      {status.active_model && (
        <div className="active-model">
          <h4>Active Model</h4>
          <p>Name: {status.active_model.name}</p>
          <p>Uptime: {status.active_model.uptime_hours.toFixed(2)} hours</p>
          <p>Requests: {status.active_model.request_count}</p>
        </div>
      )}

      <div className="models-list">
        <h4>Available Models</h4>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Size (GB)</th>
              <th>Status</th>
              <th>Uptime (hours)</th>
            </tr>
          </thead>
          <tbody>
            {status.models.map((model) => (
              <tr key={model.name} className={model.is_active ? 'active' : ''}>
                <td>{model.name}</td>
                <td>{model.type}</td>
                <td>{model.size_gb}</td>
                <td>{model.status}</td>
                <td>{model.uptime_hours.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

### Vue Component Example

```vue
<template>
  <div class="swapper-status-card">
    <h3>Swapper Service</h3>
    
    <div class="status-info">
      <p>Status: <span :class="status.status">{{ status.status }}</span></p>
      <p>Mode: {{ status.mode }}</p>
      <p>Total Models: {{ status.total_models }}</p>
    </div>
    
    <div v-if="status.active_model" class="active-model">
      <h4>Active Model</h4>
      <p>Name: {{ status.active_model.name }}</p>
      <p>Uptime: {{ status.active_model.uptime_hours.toFixed(2) }} hours</p>
      <p>Requests: {{ status.active_model.request_count }}</p>
    </div>
    
    <div class="models-list">
      <h4>Available Models</h4>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Size (GB)</th>
            <th>Status</th>
            <th>Uptime (hours)</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="model in status.models" 
            :key="model.name"
            :class="{ active: model.is_active }"
          >
            <td>{{ model.name }}</td>
            <td>{{ model.type }}</td>
            <td>{{ model.size_gb }}</td>
            <td>{{ model.status }}</td>
            <td>{{ model.uptime_hours.toFixed(2) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

interface SwapperStatus {
  service: string;
  status: string;
  mode: string;
  active_model: {
    name: string;
    uptime_hours: number;
    request_count: number;
  } | null;
  total_models: number;
  models: Array<{
    name: string;
    type: string;
    size_gb: number;
    status: string;
    is_active: boolean;
    uptime_hours: number;
  }>;
}

const status = ref<SwapperStatus | null>(null);
const loading = ref(true);

const fetchStatus = async () => {
  try {
    const response = await fetch('http://localhost:8890/api/cabinet/swapper/status');
    const data = await response.json();
    status.value = data;
  } catch (error) {
    console.error('Error fetching Swapper status:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchStatus();
  const interval = setInterval(fetchStatus, 30000);
  
  onUnmounted(() => clearInterval(interval));
});
</script>
```

---

## Dashboard Widgets

### Widget 1: Active Model Display

```tsx
<Widget title="Active Model">
  {activeModel ? (
    <div>
      <h4>{activeModel.name}</h4>
      <p>Uptime: {activeModel.uptime_hours.toFixed(2)} hours</p>
      <p>Requests: {activeModel.request_count}</p>
      <p>Loaded: {new Date(activeModel.loaded_at).toLocaleString()}</p>
    </div>
  ) : (
    <p>No model loaded</p>
  )}
</Widget>
```

### Widget 2: Model List with Actions

```tsx
<Widget title="Models">
  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Status</th>
        <th>Uptime</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {models.map(model => (
        <tr key={model.name}>
          <td>{model.name}</td>
          <td>
            <Badge status={model.status}>
              {model.is_active ? 'Active' : model.status}
            </Badge>
          </td>
          <td>{model.uptime_hours.toFixed(2)}h</td>
          <td>
            {model.can_load && (
              <Button onClick={() => loadModel(model.name)}>
                Load
              </Button>
            )}
            {model.can_unload && (
              <Button onClick={() => unloadModel(model.name)}>
                Unload
              </Button>
            )}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</Widget>
```

### Widget 3: Metrics Summary

```tsx
<Widget title="Metrics Summary">
  <div className="metrics-grid">
    <MetricCard 
      label="Total Models" 
      value={summary.total_models} 
    />
    <MetricCard 
      label="Active Models" 
      value={summary.active_models} 
    />
    <MetricCard 
      label="Total Uptime" 
      value={`${summary.total_uptime_hours.toFixed(2)}h`} 
    />
    <MetricCard 
      label="Total Requests" 
      value={summary.total_requests} 
    />
  </div>
  
  {mostUsedModel && (
    <div className="most-used">
      <h4>Most Used Model</h4>
      <p>{mostUsedModel.name}</p>
      <p>{mostUsedModel.uptime_hours.toFixed(2)} hours</p>
    </div>
  )}
</Widget>
```

---

## Integration Steps

### Step 1: Add API Client

Create a service to fetch Swapper data:

```typescript
// services/swapperService.ts
export const swapperService = {
  async getStatus() {
    const response = await fetch('http://localhost:8890/api/cabinet/swapper/status');
    return response.json();
  },
  
  async getModels() {
    const response = await fetch('http://localhost:8890/api/cabinet/swapper/models');
    return response.json();
  },
  
  async getMetricsSummary() {
    const response = await fetch('http://localhost:8890/api/cabinet/swapper/metrics/summary');
    return response.json();
  },
  
  async loadModel(modelName: string) {
    const response = await fetch(
      `http://localhost:8890/models/${modelName}/load`,
      { method: 'POST' }
    );
    return response.json();
  },
  
  async unloadModel(modelName: string) {
    const response = await fetch(
      `http://localhost:8890/models/${modelName}/unload`,
      { method: 'POST' }
    );
    return response.json();
  }
};
```

### Step 2: Add to Admin Console

Add Swapper section to admin console sidebar:

```typescript
// Admin Console Sidebar
const menuItems = [
  { id: 'overview', label: 'Overview', icon: 'dashboard' },
  { id: 'members', label: 'Members & Roles', icon: 'users' },
  { id: 'agents', label: 'Agents', icon: 'robot' },
  { id: 'swapper', label: 'Swapper Service', icon: 'swap' }, // Add this
  { id: 'settings', label: 'Settings', icon: 'settings' },
];
```

### Step 3: Create Swapper Page

```tsx
// pages/SwapperPage.tsx
export const SwapperPage: React.FC = () => {
  return (
    <div className="swapper-page">
      <PageHeader title="Swapper Service" />
      
      <div className="swapper-grid">
        <SwapperStatusCard />
        <SwapperMetricsSummary />
        <SwapperModelsList />
      </div>
    </div>
  );
};
```

---

## Node-Specific Configuration

### Node #1 (Production Server)

```typescript
const SWAPPER_URL = 'http://swapper-service:8890'; // Internal Docker network
```

### Node #2 (MacBook Development)

```typescript
const SWAPPER_URL = 'http://localhost:8890'; // Local development
```

---

## Error Handling

```typescript
try {
  const status = await swapperService.getStatus();
  // Handle success
} catch (error) {
  if (error.status === 503) {
    // Service unavailable
    showError('Swapper Service is not available');
  } else if (error.status === 404) {
    // Model not found
    showError('Model not found');
  } else {
    // Generic error
    showError('Error loading Swapper status');
  }
}
```

---

## Real-time Updates

Use polling or WebSocket for real-time updates:

```typescript
// Polling example
useEffect(() => {
  const interval = setInterval(async () => {
    const status = await swapperService.getStatus();
    setStatus(status);
  }, 30000); // Update every 30 seconds
  
  return () => clearInterval(interval);
}, []);
```

---

## Styling Recommendations

```css
.swapper-status-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.active-model {
  background: #e8f5e9;
  padding: 15px;
  border-radius: 4px;
  margin: 15px 0;
}

.models-list table {
  width: 100%;
  border-collapse: collapse;
}

.models-list tr.active {
  background: #fff3e0;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.status-badge.loaded {
  background: #4caf50;
  color: white;
}

.status-badge.unloaded {
  background: #9e9e9e;
  color: white;
}
```

---

## Testing

```typescript
// Test Swapper API integration
describe('Swapper Service Integration', () => {
  it('should fetch status', async () => {
    const status = await swapperService.getStatus();
    expect(status).toHaveProperty('service', 'swapper-service');
    expect(status).toHaveProperty('status', 'healthy');
  });
  
  it('should load model', async () => {
    const result = await swapperService.loadModel('deepseek-r1-70b');
    expect(result.status).toBe('success');
  });
});
```

---

**Last Updated:** 2025-11-22  
**Maintained by:** Ivan Tytar & DAARION Team  
**Status:** ✅ Ready for Integration

