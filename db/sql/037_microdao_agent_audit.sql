-- Публічні агенти без microDAO
SELECT id, display_name, node_id, is_public, public_slug
FROM agents
WHERE is_public = true
  AND (id NOT IN (
    SELECT agent_id FROM microdao_agents
  ));

-- Публічні агенти без node_id
SELECT id, display_name, is_public, public_slug
FROM agents
WHERE is_public = true
  AND (node_id IS NULL OR node_id = '');

-- Публічні агенти без public_slug
SELECT id, display_name, is_public
FROM agents
WHERE is_public = true
  AND (public_slug IS NULL OR public_slug = '');

-- Кімнати без microDAO, але з matrix_room_id (кандидати на привʼязку)
SELECT id, slug, name, matrix_room_id
FROM city_rooms
WHERE microdao_id IS NULL
  AND matrix_room_id IS NOT NULL;

-- MicroDAO без жодної кімнати
SELECT m.id, m.slug, m.name
FROM microdaos m
LEFT JOIN city_rooms r ON r.microdao_id = m.id
GROUP BY m.id, m.slug, m.name
HAVING COUNT(r.id) = 0;

-- MicroDAO з кількома primary-кімнатами
SELECT m.slug, COUNT(*)
FROM city_rooms r
JOIN microdaos m ON m.id = r.microdao_id
WHERE r.room_role = 'primary'
GROUP BY m.slug
HAVING COUNT(*) > 1;
