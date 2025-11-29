-- Оновлення типів агентів для Node Guardian та Node Steward

-- NODE 1
UPDATE agents
SET kind = 'node_guardian'
WHERE id = 'monitor-node1';

UPDATE agents
SET kind = 'node_steward'
WHERE id = 'node-steward-node1';

-- NODE 2
UPDATE agents
SET kind = 'node_guardian'
WHERE id = 'monitor-node2';

UPDATE agents
SET kind = 'node_steward'
WHERE id = 'node-steward-node2';

-- Додати теги (опціонально, якщо колонка tags існує і це масив текстів)
-- UPDATE agents SET tags = array_append(tags, 'role:guardian') WHERE id = 'monitor-node1' AND NOT ('role:guardian' = ANY(tags));

