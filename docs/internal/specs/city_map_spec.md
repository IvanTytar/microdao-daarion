# City Map Spec (2D MVP)

## Дані
- Таблиця `city_rooms`: `map_x`, `map_y`, `map_w`, `map_h`, `room_type`, `zone`, `color`, `icon`.
- API `GET /city/map` → `{ config, rooms[] }` з кешем (30 c).
- Presence з aggregator додає `online`, `typing`, `agents`.

## Фронтенд
- Компонент `CityMap` (Next.js) з SVG / CSS grid.
- Тайли кімнат + online indicator + typing.
- Agent badges (до 3, потім `+N`).
- Перемикач "Map / List" на `/city`.

## Подальші кроки
1. **Zone layers:** відображення районів міста.
2. **Events overlay:** показ останніх подій (NATS) на мапі.
3. **3D режим:** pivot до WebGL після стабілізації presence v2.

