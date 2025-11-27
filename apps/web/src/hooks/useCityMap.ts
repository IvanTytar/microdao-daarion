"use client";

import { useState, useEffect, useCallback } from "react";

export interface CityMapRoom {
  id: string;
  slug: string;
  name: string;
  description?: string;
  room_type: string;
  zone: string;
  icon?: string;
  color?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  matrix_room_id?: string;
}

export interface CityMapConfig {
  grid_width: number;
  grid_height: number;
  cell_size: number;
  background_url?: string;
}

export interface CityMapData {
  config: CityMapConfig;
  rooms: CityMapRoom[];
}

export function useCityMap() {
  const [data, setData] = useState<CityMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMap = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/city/map");

      if (!res.ok) {
        throw new Error(`Failed to fetch city map: ${res.status}`);
      }

      const mapData: CityMapData = await res.json();
      setData(mapData);
    } catch (err) {
      console.error("Error fetching city map:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMap();
  }, [fetchMap]);

  return {
    config: data?.config ?? null,
    rooms: data?.rooms ?? [],
    loading,
    error,
    refetch: fetchMap,
  };
}

