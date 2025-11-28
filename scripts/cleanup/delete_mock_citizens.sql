-- Delete Mock Citizens Script
-- This script marks mock/test citizens (agents) as deleted
-- Run with caution in production!

-- Preview: Show agents that would be affected
-- (agents without node_id or without primary_microdao_id, and not already marked as test)
SELECT id, display_name, kind, node_id, primary_microdao_id, is_public
FROM agents
WHERE (
    node_id IS NULL 
    OR primary_microdao_id IS NULL
)
AND COALESCE(is_test, false) = false
AND COALESCE(is_archived, false) = false
AND deleted_at IS NULL;

-- Uncomment to execute soft delete:
-- UPDATE agents
-- SET 
--     is_test = true,
--     deleted_at = NOW()
-- WHERE (
--     node_id IS NULL 
--     OR primary_microdao_id IS NULL
-- )
-- AND COALESCE(is_test, false) = false
-- AND COALESCE(is_archived, false) = false
-- AND deleted_at IS NULL;

-- Verify: Count remaining active agents
SELECT 
    COUNT(*) as total_active_agents,
    COUNT(*) FILTER (WHERE is_public = true) as public_citizens,
    COUNT(*) FILTER (WHERE node_id IS NOT NULL) as agents_with_node,
    COUNT(*) FILTER (WHERE primary_microdao_id IS NOT NULL) as agents_with_microdao
FROM agents
WHERE COALESCE(is_test, false) = false
AND COALESCE(is_archived, false) = false
AND deleted_at IS NULL;

