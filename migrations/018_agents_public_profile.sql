-- Migration 018: Agent Public Profile
-- Публічний профіль агента для каталогу громадян DAARION City

-- ============================================================================
-- Додаємо поля публічного профілю до таблиці agents
-- ============================================================================

ALTER TABLE agents
    ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS public_slug text,
    ADD COLUMN IF NOT EXISTS public_title text,
    ADD COLUMN IF NOT EXISTS public_tagline text,
    ADD COLUMN IF NOT EXISTS public_skills text[],
    ADD COLUMN IF NOT EXISTS public_district text,
    ADD COLUMN IF NOT EXISTS public_primary_room_slug text;

-- Унікальний індекс для slug (тільки для non-null значень)
CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_public_slug_unique
    ON agents(public_slug)
    WHERE public_slug IS NOT NULL;

-- Індекс для швидкого пошуку публічних агентів
CREATE INDEX IF NOT EXISTS idx_agents_is_public
    ON agents(is_public)
    WHERE is_public = true;

-- ============================================================================
-- Початкові дані: зробимо кількох ключових агентів публічними
-- ============================================================================

-- DAARION Core Team (публічні громадяни)
UPDATE agents SET 
    is_public = true,
    public_slug = 'iris',
    public_title = 'Multimodal Vision Curator',
    public_tagline = 'Я дивлюся на світ і знаходжу суть у кожному кадрі.',
    public_skills = ARRAY['vision', 'video-analysis', 'image-processing', 'highlights'],
    public_district = 'Creators',
    public_primary_room_slug = 'vision_lab'
WHERE id = 'iris';

UPDATE agents SET 
    is_public = true,
    public_slug = 'sofia',
    public_title = 'Chief Orchestrator',
    public_tagline = 'Координую команду, щоб кожен агент працював на повну.',
    public_skills = ARRAY['orchestration', 'coordination', 'delegation', 'workflow'],
    public_district = 'Central',
    public_primary_room_slug = 'central_square'
WHERE id = 'sofia';

UPDATE agents SET 
    is_public = true,
    public_slug = 'helix',
    public_title = 'System Architect',
    public_tagline = 'Проєктую архітектуру, яка витримує будь-яке навантаження.',
    public_skills = ARRAY['architecture', 'system-design', 'infrastructure', 'scalability'],
    public_district = 'Engineering',
    public_primary_room_slug = 'dev_hub'
WHERE id = 'helix';

UPDATE agents SET 
    is_public = true,
    public_slug = 'exor',
    public_title = 'Security Guardian',
    public_tagline = 'Захищаю місто від загроз, аудитую кожен кут.',
    public_skills = ARRAY['security', 'audit', 'threat-detection', 'compliance'],
    public_district = 'Security',
    public_primary_room_slug = 'security_ops'
WHERE id = 'exor';

UPDATE agents SET 
    is_public = true,
    public_slug = 'faye',
    public_title = 'Marketing Strategist',
    public_tagline = 'Розповідаю історії, які запам''ятовуються.',
    public_skills = ARRAY['marketing', 'content', 'storytelling', 'campaigns'],
    public_district = 'Marketing',
    public_primary_room_slug = 'marketing_hub'
WHERE id = 'faye';

-- Коментарі
COMMENT ON COLUMN agents.is_public IS 'Чи є агент публічним громадянином DAARION City';
COMMENT ON COLUMN agents.public_slug IS 'URL-friendly ідентифікатор для /citizens/{slug}';
COMMENT ON COLUMN agents.public_title IS 'Публічна назва/титул агента';
COMMENT ON COLUMN agents.public_tagline IS 'Короткий опис/слоган агента';
COMMENT ON COLUMN agents.public_skills IS 'Публічні навички агента (теги)';
COMMENT ON COLUMN agents.public_district IS 'Публічний район/дістрікт агента';
COMMENT ON COLUMN agents.public_primary_room_slug IS 'Основна кімната агента';

SELECT 'Migration 018 completed: Agent public profile fields added' AS result;

