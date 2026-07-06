-- =============================================================================
-- QMenut · Seed local del POC multi-tenant (tapas/fine/cafe .localhost)
-- Ejecutar con: wrangler d1 execute DB --local --file seed/seed-public-menu.sql
-- Re-ejecutable: borra primero los tenants del POC (cascada limpia hijos).
-- =============================================================================

DELETE FROM restaurants WHERE id IN ('rest_tapas', 'rest_fine', 'rest_cafe');
DELETE FROM users WHERE id = 'user_seed_owner';

-- Usuario Better Auth para el panel de administración (el auth tiene
-- disableSignUp: el login OTP solo funciona con usuarios ya existentes).
INSERT INTO users (id, name, email, email_verified, created_at, updated_at)
VALUES ('user_seed_owner', 'Juan', 'juanmurga97@gmail.com', 1, unixepoch() * 1000, unixepoch() * 1000);

-- =============================================================================
-- TENANT 1 · Bar La Tasca · tapas.localhost · template "tapas"
-- =============================================================================

INSERT INTO restaurants (id, name, default_language_code, default_currency)
VALUES ('rest_tapas', 'Bar La Tasca', 'es', 'EUR');

INSERT INTO restaurant_users (id, restaurant_id, user_id, role_code)
VALUES ('ru_tapas_owner', 'rest_tapas', 'user_seed_owner', 'owner');

INSERT INTO restaurant_languages (restaurant_id, language_code, is_default) VALUES
    ('rest_tapas', 'es', 1),
    ('rest_tapas', 'en', 0);

INSERT INTO branches (id, restaurant_id, name, address, phone, custom_domain, currency)
VALUES ('branch_tapas', 'rest_tapas', 'Bar La Tasca', 'Calle del Laurel 12, Logroño', '+34941222333', 'tapas.localhost', 'EUR');

INSERT INTO branch_photos (id, branch_id, url, position) VALUES
    ('bp_tapas_1', 'branch_tapas', 'https://picsum.photos/seed/qmenut-tasca/800/600', 0);

INSERT INTO branch_schedules (id, branch_id, day_of_week, open_minute, close_minute) VALUES
    ('bs_tapas_5', 'branch_tapas', 5, 720, 1439),
    ('bs_tapas_6', 'branch_tapas', 6, 720, 1439);

INSERT INTO categories (id, restaurant_id, branch_id, name, description, position) VALUES
    ('cat_tapas_tapas',    'rest_tapas', 'branch_tapas', 'Tapas',    'Para picar en la barra', 0),
    ('cat_tapas_raciones', 'rest_tapas', 'branch_tapas', 'Raciones', 'Para compartir',         1);

INSERT INTO dishes (id, restaurant_id, branch_id, category_id, name, description, price, image_url, position, is_recommended, is_featured) VALUES
    ('dish_tapas_bravas',    'rest_tapas', 'branch_tapas', 'cat_tapas_tapas',    'Patatas bravas',        'Salsa brava casera y alioli',            650,  'https://picsum.photos/seed/qmenut-bravas/200/200',    0, 0, 1),
    ('dish_tapas_croquetas', 'rest_tapas', 'branch_tapas', 'cat_tapas_tapas',    'Croquetas de jamón',    'Cremosas, de jamón ibérico',             800,  'https://picsum.photos/seed/qmenut-croquetas/200/200', 1, 1, 0),
    ('dish_tapas_tortilla',  'rest_tapas', 'branch_tapas', 'cat_tapas_tapas',    'Tortilla de patatas',   'Jugosa, con cebolla',                    450,  'https://picsum.photos/seed/qmenut-tortilla/200/200',  2, 0, 0),
    ('dish_tapas_gambas',    'rest_tapas', 'branch_tapas', 'cat_tapas_raciones', 'Gambas al ajillo',      'Con guindilla y aceite de oliva',        1250, 'https://picsum.photos/seed/qmenut-gambas/200/200',    0, 0, 0),
    ('dish_tapas_calamares', 'rest_tapas', 'branch_tapas', 'cat_tapas_raciones', 'Calamares a la romana', 'Rebozado fino, limón',                   1100, 'https://picsum.photos/seed/qmenut-calamares/200/200', 1, 0, 0);

INSERT INTO dish_allergens (dish_id, allergen_id) VALUES
    ('dish_tapas_croquetas', 1),  -- gluten
    ('dish_tapas_croquetas', 7),  -- milk
    ('dish_tapas_croquetas', 3),  -- eggs
    ('dish_tapas_tortilla',  3),
    ('dish_tapas_gambas',    2),  -- crustaceans
    ('dish_tapas_calamares', 1),
    ('dish_tapas_calamares', 14); -- molluscs

INSERT INTO dish_tags (dish_id, tag_id) VALUES
    ('dish_tapas_bravas', '00000000-0000-0000-0000-000000000004'); -- spicy

INSERT INTO ingredients (id, restaurant_id, name, price) VALUES
    ('ing_tapas_pan',    'rest_tapas', 'Pan con tomate', 150),
    ('ing_tapas_alioli', 'rest_tapas', 'Alioli extra',   100);

INSERT INTO dish_extras (dish_id, ingredient_id, position) VALUES
    ('dish_tapas_bravas',    'ing_tapas_alioli', 0),
    ('dish_tapas_croquetas', 'ing_tapas_pan',    0);

INSERT INTO promotions (id, restaurant_id, branch_id, type, scope, name, percentage, status)
VALUES ('promo_tapas_bravas', 'rest_tapas', 'branch_tapas', 'percentage_discount', 'dish', 'Happy tapa -20%', 20, 'active');

INSERT INTO promotion_targets (promotion_id, target_type, target_id)
VALUES ('promo_tapas_bravas', 'dish', 'dish_tapas_bravas');

INSERT INTO translations (id, restaurant_id, entity_type, entity_id, language_code, field, value) VALUES
    ('tr_tapas_cat1_name',     'rest_tapas', 'category', 'cat_tapas_tapas',      'en', 'name',        'Tapas'),
    ('tr_tapas_cat1_desc',     'rest_tapas', 'category', 'cat_tapas_tapas',      'en', 'description', 'Bar bites'),
    ('tr_tapas_cat2_name',     'rest_tapas', 'category', 'cat_tapas_raciones',   'en', 'name',        'Sharing plates'),
    ('tr_tapas_bravas_name',   'rest_tapas', 'dish',     'dish_tapas_bravas',    'en', 'name',        'Spicy potatoes'),
    ('tr_tapas_bravas_desc',   'rest_tapas', 'dish',     'dish_tapas_bravas',    'en', 'description', 'House brava sauce and aioli'),
    ('tr_tapas_croq_name',     'rest_tapas', 'dish',     'dish_tapas_croquetas', 'en', 'name',        'Ham croquettes'),
    ('tr_tapas_gambas_name',   'rest_tapas', 'dish',     'dish_tapas_gambas',    'en', 'name',        'Garlic prawns'),
    ('tr_tapas_tortilla_name', 'rest_tapas', 'dish',     'dish_tapas_tortilla',  'en', 'name',        'Spanish omelette');

-- =============================================================================
-- TENANT 2 · Aurum · fine.localhost · template "fine"
-- =============================================================================

INSERT INTO restaurants (id, name, default_language_code, default_currency)
VALUES ('rest_fine', 'Aurum', 'es', 'EUR');

INSERT INTO restaurant_languages (restaurant_id, language_code, is_default) VALUES
    ('rest_fine', 'es', 1),
    ('rest_fine', 'en', 0);

INSERT INTO branches (id, restaurant_id, name, address, phone, custom_domain, currency)
VALUES ('branch_fine', 'rest_fine', 'Aurum', 'Paseo de Gracia 88, Barcelona', '+34932111444', 'fine.localhost', 'EUR');

INSERT INTO branch_photos (id, branch_id, url, position) VALUES
    ('bp_fine_1', 'branch_fine', 'https://picsum.photos/seed/qmenut-aurum/800/600', 0);

INSERT INTO branch_schedules (id, branch_id, day_of_week, open_minute, close_minute) VALUES
    ('bs_fine_5', 'branch_fine', 5, 780, 1380),
    ('bs_fine_6', 'branch_fine', 6, 780, 1380);

INSERT INTO categories (id, restaurant_id, branch_id, name, description, position) VALUES
    ('cat_fine_entrantes',   'rest_fine', 'branch_fine', 'Entrantes',   'Primeros pasos del menú',  0),
    ('cat_fine_principales', 'rest_fine', 'branch_fine', 'Principales', 'Producto de temporada',    1),
    ('cat_fine_postres',     'rest_fine', 'branch_fine', 'Postres',     'El cierre dulce',          2);

INSERT INTO dishes (id, restaurant_id, branch_id, category_id, name, description, price, position, is_recommended, is_featured) VALUES
    ('dish_fine_ostra',   'rest_fine', 'branch_fine', 'cat_fine_entrantes',   'Ostra al aliño cítrico',  'Emulsión de yuzu y manzana verde',     980,  0, 0, 1),
    ('dish_fine_tartar',  'rest_fine', 'branch_fine', 'cat_fine_entrantes',   'Tartar de atún rojo',     'Almadraba, huevas de trucha',          2400, 1, 1, 0),
    ('dish_fine_lubina',  'rest_fine', 'branch_fine', 'cat_fine_principales', 'Lubina salvaje',          'Pil-pil de sus espinas, hinojo',       3200, 0, 0, 0),
    ('dish_fine_pichon',  'rest_fine', 'branch_fine', 'cat_fine_principales', 'Pichón asado',            'Remolacha, mole de frutos rojos',      3600, 1, 0, 0),
    ('dish_fine_esfera',  'rest_fine', 'branch_fine', 'cat_fine_postres',     'Esfera de chocolate',     'Caramelo salado, helado de vainilla',  1400, 0, 0, 0);

INSERT INTO dish_allergens (dish_id, allergen_id) VALUES
    ('dish_fine_ostra',  14),
    ('dish_fine_tartar', 4),
    ('dish_fine_lubina', 4),
    ('dish_fine_esfera', 7),
    ('dish_fine_esfera', 3);

INSERT INTO translations (id, restaurant_id, entity_type, entity_id, language_code, field, value) VALUES
    ('tr_fine_cat1_name',   'rest_fine', 'category', 'cat_fine_entrantes',   'en', 'name',        'Starters'),
    ('tr_fine_cat2_name',   'rest_fine', 'category', 'cat_fine_principales', 'en', 'name',        'Mains'),
    ('tr_fine_cat3_name',   'rest_fine', 'category', 'cat_fine_postres',     'en', 'name',        'Desserts'),
    ('tr_fine_ostra_name',  'rest_fine', 'dish',     'dish_fine_ostra',      'en', 'name',        'Oyster, citrus dressing'),
    ('tr_fine_tartar_name', 'rest_fine', 'dish',     'dish_fine_tartar',     'en', 'name',        'Bluefin tuna tartare'),
    ('tr_fine_lubina_name', 'rest_fine', 'dish',     'dish_fine_lubina',     'en', 'name',        'Wild sea bass');

-- =============================================================================
-- TENANT 3 · Café Brote · cafe.localhost · template default (sin entrada KV)
-- =============================================================================

INSERT INTO restaurants (id, name, default_language_code, default_currency)
VALUES ('rest_cafe', 'Café Brote', 'es', 'EUR');

INSERT INTO restaurant_languages (restaurant_id, language_code, is_default) VALUES
    ('rest_cafe', 'es', 1),
    ('rest_cafe', 'en', 0);

INSERT INTO branches (id, restaurant_id, name, address, phone, custom_domain, currency)
VALUES ('branch_cafe', 'rest_cafe', 'Café Brote', 'Calle Fuencarral 45, Madrid', '+34915666777', 'cafe.localhost', 'EUR');

INSERT INTO branch_photos (id, branch_id, url, position) VALUES
    ('bp_cafe_1', 'branch_cafe', 'https://picsum.photos/seed/qmenut-brote/800/600', 0);

INSERT INTO branch_schedules (id, branch_id, day_of_week, open_minute, close_minute) VALUES
    ('bs_cafe_1', 'branch_cafe', 1, 480, 1080),
    ('bs_cafe_6', 'branch_cafe', 6, 540, 1140);

INSERT INTO categories (id, restaurant_id, branch_id, name, description, position) VALUES
    ('cat_cafe_brunch', 'rest_cafe', 'branch_cafe', 'Brunch', 'Hasta las 13:00',       0),
    ('cat_cafe_cafe',   'rest_cafe', 'branch_cafe', 'Café',   'Especialidad de origen', 1);

INSERT INTO dishes (id, restaurant_id, branch_id, category_id, name, description, price, image_url, position, is_recommended, is_featured) VALUES
    ('dish_cafe_tostada',  'rest_cafe', 'branch_cafe', 'cat_cafe_brunch', 'Tostada de aguacate', 'Pan de masa madre, huevo poché',        850, 'https://picsum.photos/seed/qmenut-tostada/600/450',  0, 0, 1),
    ('dish_cafe_pancakes', 'rest_cafe', 'branch_cafe', 'cat_cafe_brunch', 'Pancakes',            'Arándanos, sirope de arce',             900, 'https://picsum.photos/seed/qmenut-pancakes/200/200', 1, 1, 0),
    ('dish_cafe_acai',     'rest_cafe', 'branch_cafe', 'cat_cafe_brunch', 'Açaí bowl',           'Granola casera, fruta de temporada',    950, 'https://picsum.photos/seed/qmenut-acai/200/200',     2, 0, 0),
    ('dish_cafe_flat',     'rest_cafe', 'branch_cafe', 'cat_cafe_cafe',   'Flat white',          'Doble ristretto, leche microespumada',  320, 'https://picsum.photos/seed/qmenut-flat/200/200',     0, 0, 0),
    ('dish_cafe_carrot',   'rest_cafe', 'branch_cafe', 'cat_cafe_cafe',   'Carrot cake',         'Nueces, frosting de queso',             520, 'https://picsum.photos/seed/qmenut-carrot/200/200',   1, 0, 0);

INSERT INTO dish_allergens (dish_id, allergen_id) VALUES
    ('dish_cafe_tostada',  1),
    ('dish_cafe_tostada',  3),
    ('dish_cafe_pancakes', 1),
    ('dish_cafe_pancakes', 7),
    ('dish_cafe_pancakes', 3),
    ('dish_cafe_flat',     7),
    ('dish_cafe_carrot',   1),
    ('dish_cafe_carrot',   8),
    ('dish_cafe_carrot',   7);

INSERT INTO dish_tags (dish_id, tag_id) VALUES
    ('dish_cafe_acai', '00000000-0000-0000-0000-000000000006'); -- new

INSERT INTO ingredients (id, restaurant_id, name, price) VALUES
    ('ing_cafe_huevo', 'rest_cafe', 'Huevo poché extra', 120),
    ('ing_cafe_shot',  'rest_cafe', 'Shot de espresso',   80);

INSERT INTO dish_extras (dish_id, ingredient_id, position) VALUES
    ('dish_cafe_tostada', 'ing_cafe_huevo', 0),
    ('dish_cafe_flat',    'ing_cafe_shot',  0);

INSERT INTO promotions (id, restaurant_id, branch_id, type, scope, name, special_price, status)
VALUES ('promo_cafe_pancakes', 'rest_cafe', 'branch_cafe', 'special_price', 'dish', 'Brunch deal', 750, 'active');

INSERT INTO promotion_targets (promotion_id, target_type, target_id)
VALUES ('promo_cafe_pancakes', 'dish', 'dish_cafe_pancakes');

INSERT INTO translations (id, restaurant_id, entity_type, entity_id, language_code, field, value) VALUES
    ('tr_cafe_cat1_name',     'rest_cafe', 'category', 'cat_cafe_brunch',    'en', 'name',        'Brunch'),
    ('tr_cafe_cat1_desc',     'rest_cafe', 'category', 'cat_cafe_brunch',    'en', 'description', 'Served until 1pm'),
    ('tr_cafe_cat2_name',     'rest_cafe', 'category', 'cat_cafe_cafe',      'en', 'name',        'Coffee'),
    ('tr_cafe_tostada_name',  'rest_cafe', 'dish',     'dish_cafe_tostada',  'en', 'name',        'Avocado toast'),
    ('tr_cafe_tostada_desc',  'rest_cafe', 'dish',     'dish_cafe_tostada',  'en', 'description', 'Sourdough, poached egg'),
    ('tr_cafe_carrot_name',   'rest_cafe', 'dish',     'dish_cafe_carrot',   'en', 'name',        'Carrot cake');
