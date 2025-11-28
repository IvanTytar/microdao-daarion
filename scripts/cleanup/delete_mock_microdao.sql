-- Delete Mock MicroDAO Script
-- This script marks mock/test microDAOs as deleted
-- Run with caution in production!

-- Preview: Show microDAOs that would be affected
-- (microDAOs with 0 agents or without orchestrator)
SELECT 
    m.id, 
    m.slug, 
    m.name,
    m.orchestrator_agent_id,
    COUNT(ma.agent_id) as agent_count
FROM microdaos m
LEFT JOIN microdao_agents ma ON ma.microdao_id = m.id
WHERE COALESCE(m.is_test, false) = false
AND COALESCE(m.is_archived, false) = false
AND m.deleted_at IS NULL
GROUP BY m.id
HAVING COUNT(ma.agent_id) = 0 OR m.orchestrator_agent_id IS NULL;

-- Uncomment to execute soft delete:
-- UPDATE microdaos
-- SET 
--     is_test = true,
--     deleted_at = NOW()
-- WHERE id IN (
--     SELECT m.id
--     FROM microdaos m
--     LEFT JOIN microdao_agents ma ON ma.microdao_id = m.id
--     WHERE COALESCE(m.is_test, false) = false
--     AND COALESCE(m.is_archived, false) = false
--     AND m.deleted_at IS NULL
--     GROUP BY m.id
--     HAVING COUNT(ma.agent_id) = 0 OR m.orchestrator_agent_id IS NULL
-- );

-- Verify: Count remaining active microDAOs
SELECT 
    COUNT(*) as total_active_microdaos,
    COUNT(*) FILTER (WHERE is_public = true) as public_microdaos,
    COUNT(*) FILTER (WHERE is_platform = true) as platforms,
    COUNT(*) FILTER (WHERE orchestrator_agent_id IS NOT NULL) as with_orchestrator
FROM microdaos
WHERE COALESCE(is_test, false) = false
AND COALESCE(is_archived, false) = false
AND deleted_at IS NULL;

