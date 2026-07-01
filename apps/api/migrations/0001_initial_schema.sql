-- =============================================================================
-- QMenut · Esquema inicial · Cloudflare D1 (SQLite)
-- Migración: 0001_initial_schema  (v2 — endurecida)
-- =============================================================================
-- Cambios respecto a la primera pasada (revisión de integridad):
--   * Integridad multi-tenant BLINDADA en la DB: las tablas que llevan branch_id
--     + restaurant_id usan FK COMPUESTA contra branches(id, restaurant_id), de
--     modo que branch_id y restaurant_id SIEMPRE se corresponden. Se extiende un
--     nivel más: dishes↔categories y promotions↔plato/categoría por sucursal.
--   * Unicidades parciales para no chocar con soft delete (clerk_org_id) y para
--     reglas de negocio (1 sub no cancelada por sucursal, 1 idioma por defecto).
--   * stripe_account_id único. CHECKs en importes, cantidades, %, radios, etc.
--   * promotions: destino tipado (dish_id | category_id) con FK real, ya no
--     polimórfico. translations sigue polimórfica (decisión consciente, ver doc).
--
-- Convenciones: snake_case, tablas en plural, sin prefijos. PK = TEXT UUID(v7)
-- generado en el Worker; INTEGER rowid en tablas append-only. Dinero en céntimos
-- (INTEGER). Timestamps INTEGER epoch ms. Estados/tipos como slugs en inglés.
-- En el Worker:  PRAGMA foreign_keys = ON;
-- =============================================================================


-- =============================================================================
-- 1. TENANCY
-- =============================================================================

CREATE TABLE restaurants (
    id                    TEXT    PRIMARY KEY,            -- UUID
    clerk_org_id          TEXT    NOT NULL,               -- único entre vivos (índice parcial abajo)
    name                  TEXT    NOT NULL,
    default_language_code TEXT    NOT NULL DEFAULT 'es',
    default_currency      TEXT    NOT NULL DEFAULT 'EUR' CHECK (length(default_currency) = 3),
    -- Identidad de envío de email GLOBAL del restaurante (Cloudflare Email Workers).
    -- Un único dominio para todo el restaurante, p.ej. from = noreply@lahamburguesa.com.
    -- El DNS/DKIM/SPF se gestiona en Cloudflare; aquí solo la identidad visible.
    email_from_name       TEXT,                           -- nombre mostrado, p.ej. "La Hamburguesa"
    email_from_address    TEXT,                           -- p.ej. noreply@lahamburguesa.com
    email_reply_to        TEXT,                           -- opcional
    created_at            INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at            INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    deleted_at            INTEGER
);
-- Único solo entre restaurantes vivos: permite recrear/restaurar tras soft delete.
CREATE UNIQUE INDEX ux_restaurants_clerk_org ON restaurants(clerk_org_id) WHERE deleted_at IS NULL;

CREATE TABLE branches (
    id                TEXT    PRIMARY KEY,
    restaurant_id     TEXT    NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name              TEXT    NOT NULL,
    address           TEXT,
    phone             TEXT,
    whatsapp          TEXT,
    social_links_json TEXT,
    -- Dominio del sitio de menú de la sucursal. El ALTA/SSL/estado se administran en
    -- Cloudflare; aquí solo se guarda el mapeo host -> sucursal para que el Worker
    -- resuelva el tenant a partir del host entrante. Quitar si se usa metadata de
    -- Cloudflare for SaaS (custom hostname) para llevar el branch_id.
    custom_domain     TEXT,
    currency          TEXT    NOT NULL DEFAULT 'EUR' CHECK (length(currency) = 3),
    plan_code         TEXT    NOT NULL DEFAULT 'basic'
                              CHECK (plan_code IN ('basic','business')),
    is_active         INTEGER NOT NULL DEFAULT 1,
    created_at        INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at        INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    deleted_at        INTEGER,
    -- clave compuesta para que las tablas hijas anclen (branch_id, restaurant_id):
    UNIQUE (id, restaurant_id)
);
CREATE INDEX idx_branches_restaurant ON branches(restaurant_id) WHERE deleted_at IS NULL;
-- Resolución host -> sucursal (un dominio apunta a una sola sucursal):
CREATE UNIQUE INDEX ux_branches_custom_domain ON branches(custom_domain) WHERE custom_domain IS NOT NULL;

CREATE TABLE branch_photos (
    id         TEXT    PRIMARY KEY,
    branch_id  TEXT    NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    url        TEXT    NOT NULL,
    position   INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX idx_branch_photos_branch ON branch_photos(branch_id);

CREATE TABLE branch_schedules (
    id           TEXT    PRIMARY KEY,
    branch_id    TEXT    NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    day_of_week  INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),  -- 1=lunes ISO
    open_minute  INTEGER NOT NULL CHECK (open_minute  BETWEEN 0 AND 1439),
    close_minute INTEGER NOT NULL CHECK (close_minute BETWEEN 0 AND 1439)
);
CREATE INDEX idx_branch_schedules_branch ON branch_schedules(branch_id, day_of_week);

CREATE TABLE restaurant_users (
    id            TEXT    PRIMARY KEY,
    restaurant_id TEXT    NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    clerk_user_id TEXT    NOT NULL,
    role_code     TEXT    NOT NULL DEFAULT 'staff'
                          CHECK (role_code IN ('owner','admin','staff')),
    is_driver     INTEGER NOT NULL DEFAULT 0,
    is_active     INTEGER NOT NULL DEFAULT 1,
    created_at    INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at    INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    UNIQUE (restaurant_id, clerk_user_id)
);
CREATE INDEX idx_restaurant_users_clerk ON restaurant_users(clerk_user_id);

CREATE TABLE branch_subscriptions (
    id                     TEXT    PRIMARY KEY,
    restaurant_id          TEXT    NOT NULL,
    branch_id              TEXT    NOT NULL,
    plan_code              TEXT    NOT NULL CHECK (plan_code IN ('basic','business')),
    status                 TEXT    NOT NULL DEFAULT 'trialing'
                                   CHECK (status IN ('trialing','active','past_due','canceled')),
    stripe_subscription_id TEXT,
    current_period_end     INTEGER,
    created_at             INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at             INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    FOREIGN KEY (branch_id, restaurant_id) REFERENCES branches(id, restaurant_id) ON DELETE CASCADE
);
CREATE INDEX idx_branch_subscriptions_restaurant ON branch_subscriptions(restaurant_id);
-- Como máximo UNA suscripción no cancelada por sucursal:
CREATE UNIQUE INDEX ux_branch_subscriptions_active ON branch_subscriptions(branch_id) WHERE status <> 'canceled';

CREATE TABLE restaurant_stripe_accounts (
    restaurant_id     TEXT    PRIMARY KEY REFERENCES restaurants(id) ON DELETE CASCADE,
    stripe_account_id TEXT    NOT NULL UNIQUE,            -- una cuenta Stripe = un restaurante
    status            TEXT    NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','connected','disabled')),
    created_at        INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at        INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- =============================================================================
-- 2. IDIOMAS ACTIVADOS
-- =============================================================================
CREATE TABLE restaurant_languages (
    restaurant_id TEXT    NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    language_code TEXT    NOT NULL,
    is_default    INTEGER NOT NULL DEFAULT 0,
    is_active     INTEGER NOT NULL DEFAULT 1,
    created_at    INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    PRIMARY KEY (restaurant_id, language_code)
);
-- Como máximo UN idioma por defecto por restaurante:
CREATE UNIQUE INDEX ux_restaurant_languages_default ON restaurant_languages(restaurant_id) WHERE is_default = 1;


-- =============================================================================
-- 3. MENÚ
-- =============================================================================

CREATE TABLE categories (
    id            TEXT    PRIMARY KEY,
    restaurant_id TEXT    NOT NULL,
    branch_id     TEXT    NOT NULL,
    name          TEXT    NOT NULL,
    description   TEXT,
    image_url     TEXT,
    position      INTEGER NOT NULL DEFAULT 0,
    is_active     INTEGER NOT NULL DEFAULT 1,
    created_at    INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at    INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    deleted_at    INTEGER,
    FOREIGN KEY (branch_id, restaurant_id) REFERENCES branches(id, restaurant_id) ON DELETE CASCADE,
    -- permite que los platos anclen (category_id, branch_id):
    UNIQUE (id, branch_id)
);
CREATE INDEX idx_categories_branch ON categories(branch_id, position) WHERE deleted_at IS NULL;

CREATE TABLE dishes (
    id             TEXT    PRIMARY KEY,
    restaurant_id  TEXT    NOT NULL,
    branch_id      TEXT    NOT NULL,
    category_id    TEXT    NOT NULL,
    name           TEXT    NOT NULL,
    description    TEXT,
    price          INTEGER NOT NULL CHECK (price >= 0),   -- céntimos
    image_url      TEXT,
    position       INTEGER NOT NULL DEFAULT 0,
    is_active      INTEGER NOT NULL DEFAULT 1,
    is_recommended INTEGER NOT NULL DEFAULT 0,
    is_featured    INTEGER NOT NULL DEFAULT 0,
    created_at     INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at     INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    deleted_at     INTEGER,
    FOREIGN KEY (branch_id, restaurant_id) REFERENCES branches(id, restaurant_id) ON DELETE CASCADE,
    -- la categoría debe ser de la MISMA sucursal:
    FOREIGN KEY (category_id, branch_id) REFERENCES categories(id, branch_id) ON DELETE CASCADE
);
CREATE INDEX idx_dishes_category ON dishes(category_id, position) WHERE deleted_at IS NULL;
CREATE INDEX idx_dishes_branch ON dishes(branch_id) WHERE deleted_at IS NULL;

CREATE TABLE dish_availability_windows (
    id           TEXT    PRIMARY KEY,
    dish_id      TEXT    NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
    day_of_week  INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    start_minute INTEGER NOT NULL CHECK (start_minute BETWEEN 0 AND 1439),
    end_minute   INTEGER NOT NULL CHECK (end_minute   BETWEEN 0 AND 1439)
);
CREATE INDEX idx_dish_availability_dish ON dish_availability_windows(dish_id);

CREATE TABLE dish_variant_groups (
    id             TEXT    PRIMARY KEY,
    dish_id        TEXT    NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
    name           TEXT    NOT NULL,
    selection_type TEXT    NOT NULL CHECK (selection_type IN ('single','multiple')),
    is_required    INTEGER NOT NULL DEFAULT 0,
    min_select     INTEGER NOT NULL DEFAULT 0 CHECK (min_select >= 0),
    max_select     INTEGER,                               -- NULL = sin tope
    position       INTEGER NOT NULL DEFAULT 0,
    created_at     INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at     INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    CHECK (max_select IS NULL OR max_select >= min_select)
);
CREATE INDEX idx_variant_groups_dish ON dish_variant_groups(dish_id, position);

CREATE TABLE dish_variant_options (
    id          TEXT    PRIMARY KEY,
    group_id    TEXT    NOT NULL REFERENCES dish_variant_groups(id) ON DELETE CASCADE,
    name        TEXT    NOT NULL,
    price_delta INTEGER NOT NULL DEFAULT 0 CHECK (price_delta >= 0), -- regla de negocio: extras no restan
    position    INTEGER NOT NULL DEFAULT 0,
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at  INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX idx_variant_options_group ON dish_variant_options(group_id, position);

CREATE TABLE tags (
    id            TEXT    PRIMARY KEY,
    restaurant_id TEXT    REFERENCES restaurants(id) ON DELETE CASCADE,  -- NULL = tag de sistema
    code          TEXT,
    label         TEXT,
    color         TEXT,
    is_system     INTEGER NOT NULL DEFAULT 0,
    created_at    INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    CHECK ( (is_system = 1 AND code IS NOT NULL AND restaurant_id IS NULL)
         OR (is_system = 0 AND label IS NOT NULL AND restaurant_id IS NOT NULL) )
);
CREATE UNIQUE INDEX idx_tags_system_code ON tags(code) WHERE is_system = 1;
CREATE INDEX idx_tags_restaurant ON tags(restaurant_id) WHERE is_system = 0;

CREATE TABLE dish_tags (
    dish_id TEXT NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
    tag_id  TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (dish_id, tag_id)
);
CREATE INDEX idx_dish_tags_tag ON dish_tags(tag_id);

CREATE TABLE allergens (
    id   INTEGER PRIMARY KEY,
    code TEXT    NOT NULL UNIQUE
);

CREATE TABLE dish_allergens (
    dish_id     TEXT    NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
    allergen_id INTEGER NOT NULL REFERENCES allergens(id) ON DELETE CASCADE,
    PRIMARY KEY (dish_id, allergen_id)
);
CREATE INDEX idx_dish_allergens_allergen ON dish_allergens(allergen_id);


-- =============================================================================
-- 4. TRADUCCIONES (polimórfica, agnóstica al proveedor)
-- =============================================================================
-- DECISIÓN CONSCIENTE: entity_id no lleva FK (apunta a varias tablas). Como los
-- platos/categorías se borran por SOFT DELETE, no se generan huérfanos en el flujo
-- normal; las traducciones se eliminan junto a la entidad en el JOB DE PURGA de
-- soft-deleted. Si se prefiere integridad garantizada por la DB, partir en
-- dish_translations / category_translations con FK + cascada (ver DATABASE_DESIGN.md).
CREATE TABLE translations (
    id            TEXT    PRIMARY KEY,
    restaurant_id TEXT    NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    entity_type   TEXT    NOT NULL CHECK (entity_type IN ('dish','category','variant_group','variant_option')),
    entity_id     TEXT    NOT NULL,
    language_code TEXT    NOT NULL,
    field         TEXT    NOT NULL,
    value         TEXT    NOT NULL,
    status        TEXT    NOT NULL DEFAULT 'ok' CHECK (status IN ('ok','pending_update')),
    source        TEXT    NOT NULL DEFAULT 'machine' CHECK (source IN ('machine','manual')),
    created_at    INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at    INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    UNIQUE (entity_type, entity_id, language_code, field)
);
CREATE INDEX idx_translations_lookup ON translations(entity_type, entity_id, language_code);
CREATE INDEX idx_translations_pending ON translations(restaurant_id, status);


-- =============================================================================
-- 5. PROMOCIONES  (+ recálculo de precio)
-- =============================================================================
-- A QUÉ afecta lo define `scope`:
--   * 'info'     -> banner informativo, NO recalcula precio.
--   * 'branch'   -> a todos los platos de la sucursal.
--   * 'category' -> a los platos de las categorías listadas en promotion_targets.
--   * 'dish'     -> a los platos listados en promotion_targets.
-- CÓMO recalcula lo define `type` + sus valores (un CHECK obliga a que cada promo
-- lleve el dato necesario, salvo scope='info'):
--   * percentage_discount -> precio * (100 - percentage) / 100
--   * special_price       -> special_price (precio fijo por unidad)
--   * daily_menu          -> special_price (precio del menú)
--   * happy_hour          -> special_price si existe; si no, percentage
--   * two_for_one         -> buy_quantity/paid_quantity (descuento por cantidad, en carrito)
-- El precio efectivo NO se almacena (las promos son temporales): lo computa el
-- Worker. La vista v_dish_promotion_prices deja resuelto el precio unitario por
-- plato; el filtro "activa ahora" (fechas/día/hora) y el desempate (priority, luego
-- menor precio) los aplica el Worker.
CREATE TABLE promotions (
    id              TEXT    PRIMARY KEY,
    restaurant_id   TEXT    NOT NULL,
    branch_id       TEXT    NOT NULL,
    type            TEXT    NOT NULL CHECK (type IN ('percentage_discount','special_price','daily_menu','happy_hour','two_for_one')),
    scope           TEXT    NOT NULL DEFAULT 'info' CHECK (scope IN ('info','branch','category','dish')),
    name            TEXT    NOT NULL,
    description     TEXT,
    percentage      INTEGER CHECK (percentage IS NULL OR percentage BETWEEN 0 AND 100),
    special_price   INTEGER CHECK (special_price IS NULL OR special_price >= 0),   -- céntimos
    buy_quantity    INTEGER CHECK (buy_quantity  IS NULL OR buy_quantity  > 0),    -- p.ej. 2 en 2x1
    paid_quantity   INTEGER CHECK (paid_quantity IS NULL OR paid_quantity > 0),    -- p.ej. 1 en 2x1
    priority        INTEGER NOT NULL DEFAULT 0,            -- mayor gana al resolver solapes
    starts_at       INTEGER,
    ends_at         INTEGER,
    is_recurring    INTEGER NOT NULL DEFAULT 0,
    recurring_days  TEXT,                                  -- CSV ISO "4,5" = jue,vie
    recurring_start_minute INTEGER CHECK (recurring_start_minute IS NULL OR recurring_start_minute BETWEEN 0 AND 1439),
    recurring_end_minute   INTEGER CHECK (recurring_end_minute   IS NULL OR recurring_end_minute   BETWEEN 0 AND 1439),
    status          TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','expired')),
    created_at      INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at      INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    deleted_at      INTEGER,
    -- toda promo que recalcula lleva el dato que necesita su tipo:
    CHECK (
        scope = 'info'
        OR (type = 'percentage_discount' AND percentage IS NOT NULL)
        OR (type IN ('special_price','daily_menu') AND special_price IS NOT NULL)
        OR (type = 'happy_hour' AND (percentage IS NOT NULL OR special_price IS NOT NULL))
        OR (type = 'two_for_one' AND buy_quantity IS NOT NULL AND paid_quantity IS NOT NULL AND paid_quantity <= buy_quantity)
    ),
    FOREIGN KEY (branch_id, restaurant_id) REFERENCES branches(id, restaurant_id) ON DELETE CASCADE
);
CREATE INDEX idx_promotions_branch ON promotions(branch_id, status, scope) WHERE deleted_at IS NULL;

-- Platos/categorías concretos a los que aplica la promo (scope 'category' o 'dish').
-- Vacío para 'info'/'branch'. Polimórfico sin FK (coherente con la decisión previa);
-- borrar la promo limpia sus targets por cascada.
CREATE TABLE promotion_targets (
    promotion_id TEXT NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    target_type  TEXT NOT NULL CHECK (target_type IN ('dish','category')),
    target_id    TEXT NOT NULL,                            -- dish_id o category_id
    PRIMARY KEY (promotion_id, target_type, target_id)
);
-- "¿qué promos apuntan a este plato/categoría?" (clave para recalcular por plato):
CREATE INDEX idx_promotion_targets_target ON promotion_targets(target_type, target_id);

-- Vista de recálculo: por cada plato vivo devuelve los CANDIDATOS de promo que le
-- aplican por scope y su precio unitario efectivo. NO filtra por tiempo (el Worker
-- aplica fechas/recurrencia con "now") ni resuelve solapes (priority, luego menor
-- precio). two_for_one no cambia el precio unitario: es lógica de cantidad en carrito.
CREATE VIEW v_dish_promotion_prices AS
SELECT
    d.id        AS dish_id,
    d.branch_id AS branch_id,
    d.price     AS base_price,
    p.id        AS promotion_id,
    p.type      AS promotion_type,
    p.scope     AS promotion_scope,
    p.priority  AS priority,
    CASE
        WHEN p.type = 'percentage_discount'
            THEN CAST(ROUND(d.price * (100 - p.percentage) / 100.0) AS INTEGER)
        WHEN p.type IN ('special_price','daily_menu')
            THEN p.special_price
        WHEN p.type = 'happy_hour'
            THEN COALESCE(p.special_price, CAST(ROUND(d.price * (100 - p.percentage) / 100.0) AS INTEGER))
        ELSE d.price
    END         AS effective_unit_price,
    p.buy_quantity,
    p.paid_quantity,
    p.starts_at,
    p.ends_at,
    p.is_recurring,
    p.recurring_days,
    p.recurring_start_minute,
    p.recurring_end_minute
FROM dishes d
JOIN promotions p
  ON p.branch_id = d.branch_id
 AND p.deleted_at IS NULL
 AND p.status = 'active'
 AND p.scope <> 'info'
WHERE d.deleted_at IS NULL
  AND (
        p.scope = 'branch'
     OR (p.scope = 'dish'     AND EXISTS (SELECT 1 FROM promotion_targets t
                                          WHERE t.promotion_id = p.id AND t.target_type = 'dish'     AND t.target_id = d.id))
     OR (p.scope = 'category' AND EXISTS (SELECT 1 FROM promotion_targets t
                                          WHERE t.promotion_id = p.id AND t.target_type = 'category' AND t.target_id = d.category_id))
      );


-- =============================================================================
-- 6. CLIENTES
-- =============================================================================
CREATE TABLE customers (
    id         TEXT    PRIMARY KEY,
    email      TEXT    NOT NULL UNIQUE,                    -- sin soft delete → único pleno
    name       TEXT,
    birthdate  TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE customer_restaurants (
    customer_id     TEXT    NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    restaurant_id   TEXT    NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    points_balance  INTEGER NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
    stamps_balance  INTEGER NOT NULL DEFAULT 0 CHECK (stamps_balance >= 0),
    first_visit_at  INTEGER,
    last_visit_at   INTEGER,
    created_at      INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at      INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    PRIMARY KEY (customer_id, restaurant_id)
);
CREATE INDEX idx_customer_restaurants_restaurant ON customer_restaurants(restaurant_id);

CREATE TABLE customer_visits (
    id            INTEGER PRIMARY KEY,
    customer_id   TEXT    NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    restaurant_id TEXT    NOT NULL,
    branch_id     TEXT    NOT NULL,
    source        TEXT    NOT NULL CHECK (source IN ('qr','direct','domain','order')),
    created_at    INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    FOREIGN KEY (branch_id, restaurant_id) REFERENCES branches(id, restaurant_id) ON DELETE CASCADE
);
CREATE INDEX idx_customer_visits_customer ON customer_visits(customer_id, created_at);
CREATE INDEX idx_customer_visits_branch ON customer_visits(branch_id, created_at);


-- =============================================================================
-- 7. FIDELIZACIÓN
-- =============================================================================
CREATE TABLE loyalty_programs (
    restaurant_id            TEXT    PRIMARY KEY REFERENCES restaurants(id) ON DELETE CASCADE,
    type                     TEXT    NOT NULL CHECK (type IN ('points','stamps')),
    points_per_currency_unit INTEGER NOT NULL DEFAULT 0 CHECK (points_per_currency_unit >= 0),
    points_per_visit         INTEGER NOT NULL DEFAULT 0 CHECK (points_per_visit >= 0),
    stamps_per_visit         INTEGER NOT NULL DEFAULT 0 CHECK (stamps_per_visit >= 0),
    rules_json               TEXT,
    is_active                INTEGER NOT NULL DEFAULT 1,
    created_at               INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at               INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE loyalty_rewards (
    id            TEXT    PRIMARY KEY,
    restaurant_id TEXT    NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name          TEXT    NOT NULL,
    description   TEXT,
    cost          INTEGER NOT NULL CHECK (cost >= 0),
    type          TEXT    NOT NULL CHECK (type IN ('percentage_discount','free_dish','special_price')),
    percentage    INTEGER CHECK (percentage IS NULL OR percentage BETWEEN 0 AND 100),
    special_price INTEGER CHECK (special_price IS NULL OR special_price >= 0),
    free_dish_id  TEXT    REFERENCES dishes(id) ON DELETE SET NULL,
    is_active     INTEGER NOT NULL DEFAULT 1,
    created_at    INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at    INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    deleted_at    INTEGER
);
CREATE INDEX idx_loyalty_rewards_restaurant ON loyalty_rewards(restaurant_id) WHERE deleted_at IS NULL;

CREATE TABLE loyalty_transactions (
    id            INTEGER PRIMARY KEY,
    customer_id   TEXT    NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    restaurant_id TEXT    NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    branch_id     TEXT    REFERENCES branches(id) ON DELETE SET NULL,
    type          TEXT    NOT NULL CHECK (type IN ('earn','redeem','adjust','expire')),
    points        INTEGER NOT NULL,                        -- +/- (puede ser negativo)
    reason_code   TEXT,
    order_id      TEXT,
    redemption_id TEXT,
    created_at    INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX idx_loyalty_tx_customer ON loyalty_transactions(customer_id, restaurant_id, created_at);

CREATE TABLE loyalty_redemptions (
    id            TEXT    PRIMARY KEY,
    customer_id   TEXT    NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    restaurant_id TEXT    NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    branch_id     TEXT    REFERENCES branches(id) ON DELETE SET NULL,
    reward_id     TEXT    NOT NULL REFERENCES loyalty_rewards(id),
    cost          INTEGER NOT NULL CHECK (cost >= 0),
    status        TEXT    NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','validated','rejected','expired')),
    validated_by  TEXT    REFERENCES restaurant_users(id) ON DELETE SET NULL,
    validated_at  INTEGER,
    created_at    INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at    INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX idx_loyalty_redemptions_customer ON loyalty_redemptions(customer_id, restaurant_id, created_at);
CREATE INDEX idx_loyalty_redemptions_status ON loyalty_redemptions(restaurant_id, status);


-- =============================================================================
-- 8. CAMPAÑAS (solo Business)
-- =============================================================================
CREATE TABLE campaigns (
    id               TEXT    PRIMARY KEY,
    restaurant_id    TEXT    NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    type             TEXT    NOT NULL CHECK (type IN ('reactivation','birthday','points_level')),
    name             TEXT    NOT NULL,
    inactivity_days  INTEGER CHECK (inactivity_days IS NULL OR inactivity_days > 0),
    points_threshold INTEGER CHECK (points_threshold IS NULL OR points_threshold >= 0),
    trigger_config   TEXT,
    email_subject    TEXT    NOT NULL,
    email_body       TEXT    NOT NULL,
    reward_id        TEXT    REFERENCES loyalty_rewards(id) ON DELETE SET NULL,
    status           TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused')),
    created_at       INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at       INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    deleted_at       INTEGER
);
CREATE INDEX idx_campaigns_restaurant ON campaigns(restaurant_id, status) WHERE deleted_at IS NULL;

CREATE TABLE campaign_sends (
    id          INTEGER PRIMARY KEY,
    campaign_id TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    customer_id TEXT    NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    status      TEXT    NOT NULL DEFAULT 'queued'
                        CHECK (status IN ('queued','sent','opened','redeemed','failed')),
    sent_at     INTEGER,
    opened_at   INTEGER,
    redeemed_at INTEGER,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX idx_campaign_sends_campaign ON campaign_sends(campaign_id, status);
CREATE INDEX idx_campaign_sends_customer ON campaign_sends(customer_id);


-- =============================================================================
-- 9. DELIVERY (solo Business)
-- =============================================================================
CREATE TABLE delivery_zones (
    id               TEXT    PRIMARY KEY,
    restaurant_id    TEXT    NOT NULL,
    branch_id        TEXT    NOT NULL,
    name             TEXT    NOT NULL,
    radius_km        REAL    NOT NULL CHECK (radius_km > 0),
    delivery_fee     INTEGER NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
    min_order_amount INTEGER NOT NULL DEFAULT 0 CHECK (min_order_amount >= 0),
    is_active        INTEGER NOT NULL DEFAULT 1,
    created_at       INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at       INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    FOREIGN KEY (branch_id, restaurant_id) REFERENCES branches(id, restaurant_id) ON DELETE CASCADE
);
CREATE INDEX idx_delivery_zones_branch ON delivery_zones(branch_id);

CREATE TABLE orders (
    id               TEXT    PRIMARY KEY,
    restaurant_id    TEXT    NOT NULL,
    branch_id        TEXT    NOT NULL,
    customer_id      TEXT    REFERENCES customers(id) ON DELETE SET NULL,
    mode             TEXT    NOT NULL CHECK (mode IN ('pickup','delivery')),
    status           TEXT    NOT NULL DEFAULT 'received'
                             CHECK (status IN ('received','preparing','ready','on_the_way','delivered','canceled')),
    delivery_address TEXT,
    delivery_zone_id TEXT    REFERENCES delivery_zones(id) ON DELETE SET NULL,
    delivery_fee     INTEGER NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
    subtotal         INTEGER NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    total            INTEGER NOT NULL DEFAULT 0 CHECK (total >= 0),
    currency         TEXT    NOT NULL DEFAULT 'EUR' CHECK (length(currency) = 3),
    desired_time     INTEGER,
    kitchen_note     TEXT,
    driver_id        TEXT    REFERENCES restaurant_users(id) ON DELETE SET NULL,
    created_at       INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at       INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    FOREIGN KEY (branch_id, restaurant_id) REFERENCES branches(id, restaurant_id) ON DELETE CASCADE,
    -- permite que payments ancle (order_id, restaurant_id):
    UNIQUE (id, restaurant_id)
);
CREATE INDEX idx_orders_branch_status ON orders(branch_id, status, created_at);
CREATE INDEX idx_orders_customer ON orders(customer_id, created_at);
CREATE INDEX idx_orders_driver ON orders(driver_id, status);

CREATE TABLE order_items (
    id                    TEXT    PRIMARY KEY,
    order_id              TEXT    NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    dish_id               TEXT    REFERENCES dishes(id) ON DELETE SET NULL,
    dish_name             TEXT    NOT NULL,
    selected_options_json TEXT,
    quantity              INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price            INTEGER NOT NULL CHECK (unit_price >= 0),
    line_total            INTEGER NOT NULL CHECK (line_total >= 0)
);
CREATE INDEX idx_order_items_order ON order_items(order_id);


-- =============================================================================
-- 10. PAGOS (solo Business)
-- =============================================================================
CREATE TABLE payments (
    id                       TEXT    PRIMARY KEY,
    restaurant_id            TEXT    NOT NULL,
    order_id                 TEXT    NOT NULL,
    stripe_payment_intent_id TEXT    NOT NULL,
    status                   TEXT    NOT NULL DEFAULT 'requires_payment'
                                     CHECK (status IN ('requires_payment','processing','succeeded','failed','refunded')),
    amount                   INTEGER NOT NULL CHECK (amount >= 0),
    currency                 TEXT    NOT NULL DEFAULT 'EUR' CHECK (length(currency) = 3),
    created_at               INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at               INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    -- el pago pertenece al MISMO restaurante que el pedido:
    FOREIGN KEY (order_id, restaurant_id) REFERENCES orders(id, restaurant_id) ON DELETE CASCADE
);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE UNIQUE INDEX idx_payments_intent ON payments(stripe_payment_intent_id);


-- =============================================================================
-- 11. ANALYTICS (rollups diarios; eventos RAW → Analytics Engine)
-- =============================================================================
CREATE TABLE menu_view_daily (
    branch_id     TEXT    NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    day           TEXT    NOT NULL,                        -- 'YYYY-MM-DD'
    language_code TEXT    NOT NULL DEFAULT 'all',
    source        TEXT    NOT NULL DEFAULT 'all',
    views         INTEGER NOT NULL DEFAULT 0 CHECK (views >= 0),
    PRIMARY KEY (branch_id, day, language_code, source)
);

CREATE TABLE dish_view_daily (
    dish_id   TEXT    NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
    branch_id TEXT    NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    day       TEXT    NOT NULL,
    views     INTEGER NOT NULL DEFAULT 0 CHECK (views >= 0),
    PRIMARY KEY (dish_id, day)
);
CREATE INDEX idx_dish_view_daily_branch ON dish_view_daily(branch_id, day);


-- =============================================================================
-- 12. CRM INTERNO QMENUT
-- =============================================================================
CREATE TABLE plan_change_logs (
    id                       INTEGER PRIMARY KEY,
    restaurant_id            TEXT    NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    branch_id                TEXT    REFERENCES branches(id) ON DELETE SET NULL,
    from_plan                TEXT,
    to_plan                  TEXT    NOT NULL,
    changed_by_clerk_user_id TEXT,
    note                     TEXT,
    created_at               INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX idx_plan_change_logs_restaurant ON plan_change_logs(restaurant_id, created_at);

CREATE TABLE internal_alerts (
    id            INTEGER PRIMARY KEY,
    type          TEXT    NOT NULL CHECK (type IN ('domain_renewal','inactive_restaurant','plan_issue','other')),
    restaurant_id TEXT    REFERENCES restaurants(id) ON DELETE CASCADE,
    branch_id     TEXT    REFERENCES branches(id) ON DELETE SET NULL,
    severity      TEXT    NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
    status        TEXT    NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','dismissed')),
    message_code  TEXT    NOT NULL,
    payload_json  TEXT,
    created_at    INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    resolved_at   INTEGER
);
CREATE INDEX idx_internal_alerts_status ON internal_alerts(status, type, created_at);


-- =============================================================================
-- 13. SEED de catálogos fijos
-- =============================================================================
INSERT INTO allergens (id, code) VALUES
    (1,'gluten'),(2,'crustaceans'),(3,'eggs'),(4,'fish'),(5,'peanuts'),
    (6,'soybeans'),(7,'milk'),(8,'nuts'),(9,'celery'),(10,'mustard'),
    (11,'sesame'),(12,'sulphites'),(13,'lupin'),(14,'molluscs');

INSERT INTO tags (id, restaurant_id, code, label, is_system) VALUES
    ('00000000-0000-0000-0000-000000000001', NULL, 'vegan',            NULL, 1),
    ('00000000-0000-0000-0000-000000000002', NULL, 'gluten_free',      NULL, 1),
    ('00000000-0000-0000-0000-000000000003', NULL, 'lactose_free',     NULL, 1),
    ('00000000-0000-0000-0000-000000000004', NULL, 'spicy',            NULL, 1),
    ('00000000-0000-0000-0000-000000000005', NULL, 'contains_alcohol', NULL, 1),
    ('00000000-0000-0000-0000-000000000006', NULL, 'new',              NULL, 1),
    ('00000000-0000-0000-0000-000000000007', NULL, 'seasonal',         NULL, 1);
