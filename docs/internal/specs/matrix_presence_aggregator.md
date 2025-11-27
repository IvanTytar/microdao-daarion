# Matrix Presence Aggregator Spec (v2)

## Огляд
Aggregator збирає дані з Matrix Synapse + PostgreSQL (agents) і транслює їх через REST/SSE.

## Потік даних
1. `rooms_source` читає `city_rooms` (`matrix_room_id`, координати).
2. `agents_source` читає `agents` (online/busy/offline, `current_room_id`).
3. `MatrixClient` полить членів кімнат (`/_matrix/client/v3/rooms/.../members`).
4. Presence API (`/_matrix/client/v3/presence/.../status`) → з Heartbeat hook у фронті.
5. Snapshot → `GET /presence/summary`, `GET /presence/stream` (SSE).

## Формат Snapshot
```json
{
  "type": "presence_update",
  "timestamp": "2025-11-27T15:10:00Z",
  "city": {
    "online_total": 7,
    "rooms_online": 4,
    "agents_online": 3
  },
  "rooms": [
    {
      "room_id": "room_city_general",
      "matrix_room_id": "!abc:daarion.space",
      "online": 5,
      "typing": 1,
      "agents": [ { "agent_id": "ag_atlas", "status": "online" } ]
    }
  ],
  "agents": [ ... ]
}
```

## План розвитку
- Presence diffs (щоб зменшити трафік SSE).
- Aggregated analytics (average online per room).
- Події для Agent Presence v2 (агент перемістився).

