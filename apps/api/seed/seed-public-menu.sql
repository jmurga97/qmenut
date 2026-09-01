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

INSERT INTO restaurants (id, name, country_code, default_language_code, source_currency, legal_name, tax_id, legal_address, data_protection_email)
VALUES ('rest_tapas', 'Bar La Tasca', 'ESP', 'es', 'EUR', 'La Tasca Hostelería S.L.', 'B12345678', 'Calle del Laurel 12, Logroño', 'privacidad@latasca.example');

INSERT INTO restaurant_users (id, restaurant_id, user_id, role_code)
VALUES ('ru_tapas_owner', 'rest_tapas', 'user_seed_owner', 'owner');

INSERT INTO restaurant_languages (restaurant_id, language_code, is_default) VALUES
    ('rest_tapas', 'es', 1),
    ('rest_tapas', 'en', 0);

INSERT INTO branches (id, restaurant_id, name, address, phone, custom_domain)
VALUES ('branch_tapas', 'rest_tapas', 'Bar La Tasca', 'Calle del Laurel 12, Logroño', '+34941222333', 'tapas.localhost');

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

INSERT INTO restaurants (id, name, country_code, default_language_code, source_currency, legal_name, tax_id, legal_address, data_protection_email)
VALUES ('rest_fine', 'Aurum', 'ESP', 'es', 'EUR', 'Aurum Gastronomía S.L.', 'B87654321', 'Paseo de Gracia 88, Barcelona', 'privacidad@aurum.example');

INSERT INTO restaurant_languages (restaurant_id, language_code, is_default) VALUES
    ('rest_fine', 'es', 1),
    ('rest_fine', 'en', 0);

INSERT INTO branches (
    id,
    restaurant_id,
    name,
    address,
    latitude,
    longitude,
    phone,
    whatsapp,
    social_links_json,
    custom_domain
) VALUES
    (
        'branch_fine',
        'rest_fine',
        'Aurum Passeig de Gràcia',
        'Passeig de Gràcia 88, Barcelona',
        41.3954,
        2.1619,
        '+34932111444',
        '+34600111222',
        '{"instagram":"https://www.instagram.com/aurum"}',
        'fine.localhost'
    ),
    (
        'branch_fine_born',
        'rest_fine',
        'Aurum El Born',
        'Carrer de Montcada 15, Barcelona',
        41.3852,
        2.1809,
        '+34932111555',
        '+34600111333',
        '{"instagram":"https://www.instagram.com/aurum"}',
        NULL
    ),
    (
        'branch_fine_sarria',
        'rest_fine',
        'Aurum Sarrià',
        'Carrer Major de Sarrià 93, Barcelona',
        41.4012,
        2.1285,
        '+34932111666',
        '+34600111444',
        '{"instagram":"https://www.instagram.com/aurum"}',
        NULL
    );

INSERT INTO branch_photos (id, branch_id, url, position) VALUES
    ('bp_fine_1', 'branch_fine', 'https://images.unsplash.com/photo-1542018508502-daaee0fb76c2?auto=format&fit=crop&w=1200&q=82', 0),
    ('bp_fine_2', 'branch_fine', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=82', 1),
    ('bp_fine_3', 'branch_fine', 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=1200&q=82', 2),
    ('bp_fine_4', 'branch_fine', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=82', 3);

INSERT INTO branch_schedules (id, branch_id, day_of_week, open_minute, close_minute) VALUES
    ('bs_fine_5', 'branch_fine', 5, 780, 1380),
    ('bs_fine_6', 'branch_fine', 6, 780, 1380),
    ('bs_fine_born_5', 'branch_fine_born', 5, 720, 1439),
    ('bs_fine_born_6', 'branch_fine_born', 6, 720, 1439),
    ('bs_fine_sarria_5', 'branch_fine_sarria', 5, 780, 1380),
    ('bs_fine_sarria_6', 'branch_fine_sarria', 6, 780, 1380);

INSERT INTO categories (id, restaurant_id, branch_id, name, description, position) VALUES
    ('cat_fine_classics', 'rest_fine', 'branch_fine', 'Clásicas', 'Las pizzas que siempre funcionan.', 0),
    ('cat_fine_signature', 'rest_fine', 'branch_fine', 'Signature', 'Combinaciones grandes, bordes dorados y mucho queso.', 1),
    ('cat_fine_sides', 'rest_fine', 'branch_fine', 'Entrantes', 'Para abrir la caja y compartir.', 2),
    ('cat_fine_desserts', 'rest_fine', 'branch_fine', 'Dulces', 'El último trozo siempre se comparte.', 3);

INSERT INTO dishes (
    id, restaurant_id, branch_id, category_id, name, description, price, image_url, position, is_recommended, is_featured
) VALUES
    ('dish_fine_margherita', 'rest_fine', 'branch_fine', 'cat_fine_classics', 'Margherita', 'Tomate, mozzarella 100%, albahaca y aceite de oliva.', 1099, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=82', 0, 0, 0),
    ('dish_fine_pepperoni', 'rest_fine', 'branch_fine', 'cat_fine_classics', 'Pepperoni', 'Tomate, mozzarella y doble pepperoni crujiente.', 1399, 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=1200&q=82', 1, 0, 1),
    ('dish_fine_bbq_chicken', 'rest_fine', 'branch_fine', 'cat_fine_classics', 'Pollo BBQ', 'Salsa barbacoa, pollo asado, bacon, cebolla roja y mozzarella.', 1599, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=82', 2, 0, 0),
    ('dish_fine_truffle_bacon', 'rest_fine', 'branch_fine', 'cat_fine_signature', 'Trufa y panceta', 'Crema de trufa, mozzarella, panceta ahumada y parmesano.', 1799, 'https://images.unsplash.com/photo-1717883235373-ef10b2a745a3?auto=format&fit=crop&w=1200&q=82', 0, 1, 0),
    ('dish_fine_goat_onion', 'rest_fine', 'branch_fine', 'cat_fine_signature', 'Cabra y cebolla caramelizada', 'Queso de cabra, cebolla caramelizada, nueces y miel.', 1699, 'https://images.unsplash.com/photo-1634629377376-6c6bae2d8bcf?auto=format&fit=crop&w=1200&q=82', 1, 0, 0),
    ('dish_fine_nduja', 'rest_fine', 'branch_fine', 'cat_fine_signature', '’Nduja picante', 'Tomate, mozzarella, ’nduja, salami picante y miel de chile.', 1649, 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=1200&q=82', 2, 0, 0),
    ('dish_fine_cajun_fries', 'rest_fine', 'branch_fine', 'cat_fine_sides', 'Patatas cajún', 'Patatas crujientes, especias cajún y salsa de queso.', 499, 'https://images.unsplash.com/photo-1518013431117-eb1465fa5752?auto=format&fit=crop&w=1200&q=82', 0, 0, 0),
    ('dish_fine_bbq_wings', 'rest_fine', 'branch_fine', 'cat_fine_sides', 'Alitas BBQ', 'Ocho alitas asadas, glaseado barbacoa y cebollino.', 799, 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=1200&q=82', 1, 0, 0),
    ('dish_fine_cheese_bread', 'rest_fine', 'branch_fine', 'cat_fine_sides', 'Pan de queso', 'Bocados horneados con mozzarella, ajo y orégano.', 599, 'https://images.unsplash.com/photo-1559141680-d0bd7bc5af84?auto=format&fit=crop&w=1200&q=82', 2, 0, 0),
    ('dish_fine_brownie_cookie', 'rest_fine', 'branch_fine', 'cat_fine_desserts', 'Brownie-cookie', 'Brownie de chocolate y cookie con centro fundente.', 549, 'https://images.unsplash.com/photo-1654796605330-8a1248a2cb07?auto=format&fit=crop&w=1200&q=82', 0, 0, 0),
    ('dish_fine_chocolate_pizza', 'rest_fine', 'branch_fine', 'cat_fine_desserts', 'Pizza de chocolate', 'Masa dulce, crema de cacao, avellanas y nubes tostadas.', 649, 'https://images.unsplash.com/photo-1767114916329-9b5649724379?auto=format&fit=crop&w=1200&q=82', 1, 0, 0),
    ('dish_fine_cheesecake', 'rest_fine', 'branch_fine', 'cat_fine_desserts', 'Cheesecake', 'Tarta de queso cremosa y salsa de frutos rojos.', 599, 'https://images.unsplash.com/photo-1578775887804-699de7086ff9?auto=format&fit=crop&w=1200&q=82', 2, 1, 0);

INSERT INTO ingredients (id, restaurant_id, name, price) VALUES
    ('ing_fine_extra_cheese', 'rest_fine', 'Extra de mozzarella', 180),
    ('ing_fine_pepperoni', 'rest_fine', 'Pepperoni extra', 200),
    ('ing_fine_jalapeno', 'rest_fine', 'Jalapeño', 120),
    ('ing_fine_bbq_dip', 'rest_fine', 'Salsa BBQ', 90);

INSERT INTO dish_extras (dish_id, ingredient_id, position) VALUES
    ('dish_fine_margherita', 'ing_fine_extra_cheese', 0),
    ('dish_fine_margherita', 'ing_fine_jalapeno', 1),
    ('dish_fine_pepperoni', 'ing_fine_extra_cheese', 0),
    ('dish_fine_pepperoni', 'ing_fine_pepperoni', 1),
    ('dish_fine_pepperoni', 'ing_fine_jalapeno', 2),
    ('dish_fine_bbq_chicken', 'ing_fine_extra_cheese', 0),
    ('dish_fine_bbq_chicken', 'ing_fine_bbq_dip', 1),
    ('dish_fine_truffle_bacon', 'ing_fine_extra_cheese', 0),
    ('dish_fine_cajun_fries', 'ing_fine_bbq_dip', 0),
    ('dish_fine_bbq_wings', 'ing_fine_bbq_dip', 0),
    ('dish_fine_cheese_bread', 'ing_fine_bbq_dip', 0);

INSERT INTO dish_allergens (dish_id, allergen_id) VALUES
    ('dish_fine_margherita', 1), ('dish_fine_margherita', 7),
    ('dish_fine_pepperoni', 1), ('dish_fine_pepperoni', 7),
    ('dish_fine_bbq_chicken', 1), ('dish_fine_bbq_chicken', 7),
    ('dish_fine_truffle_bacon', 1), ('dish_fine_truffle_bacon', 7),
    ('dish_fine_goat_onion', 1), ('dish_fine_goat_onion', 7), ('dish_fine_goat_onion', 8),
    ('dish_fine_nduja', 1), ('dish_fine_nduja', 7),
    ('dish_fine_cajun_fries', 7),
    ('dish_fine_bbq_wings', 6), ('dish_fine_bbq_wings', 10),
    ('dish_fine_cheese_bread', 1), ('dish_fine_cheese_bread', 7),
    ('dish_fine_brownie_cookie', 1), ('dish_fine_brownie_cookie', 3), ('dish_fine_brownie_cookie', 7), ('dish_fine_brownie_cookie', 8),
    ('dish_fine_chocolate_pizza', 1), ('dish_fine_chocolate_pizza', 7), ('dish_fine_chocolate_pizza', 8),
    ('dish_fine_cheesecake', 1), ('dish_fine_cheesecake', 3), ('dish_fine_cheesecake', 7);

INSERT INTO dish_tags (dish_id, tag_id) VALUES
    ('dish_fine_nduja', '00000000-0000-0000-0000-000000000004'),
    ('dish_fine_cajun_fries', '00000000-0000-0000-0000-000000000004'),
    ('dish_fine_cajun_fries', '00000000-0000-0000-0000-000000000002');

INSERT INTO dish_variant_groups (id, dish_id, name, selection_type, is_required, min_select, max_select, position) VALUES
    ('vgroup_fine_margherita_size', 'dish_fine_margherita', 'Tamaño', 'single', 1, 1, 1, 0),
    ('vgroup_fine_margherita_dough', 'dish_fine_margherita', 'Masa', 'single', 1, 1, 1, 1),
    ('vgroup_fine_pepperoni_size', 'dish_fine_pepperoni', 'Tamaño', 'single', 1, 1, 1, 0),
    ('vgroup_fine_bbq_size', 'dish_fine_bbq_chicken', 'Tamaño', 'single', 1, 1, 1, 0),
    ('vgroup_fine_truffle_size', 'dish_fine_truffle_bacon', 'Tamaño', 'single', 1, 1, 1, 0);

INSERT INTO dish_variant_options (id, group_id, name, price_delta, position) VALUES
    ('voption_fine_margherita_medium', 'vgroup_fine_margherita_size', 'Mediana', 0, 0),
    ('voption_fine_margherita_family', 'vgroup_fine_margherita_size', 'Familiar', 450, 1),
    ('voption_fine_margherita_original', 'vgroup_fine_margherita_dough', 'Original', 0, 0),
    ('voption_fine_margherita_thin', 'vgroup_fine_margherita_dough', 'Fina y crujiente', 0, 1),
    ('voption_fine_pepperoni_medium', 'vgroup_fine_pepperoni_size', 'Mediana', 0, 0),
    ('voption_fine_pepperoni_family', 'vgroup_fine_pepperoni_size', 'Familiar', 450, 1),
    ('voption_fine_bbq_medium', 'vgroup_fine_bbq_size', 'Mediana', 0, 0),
    ('voption_fine_bbq_family', 'vgroup_fine_bbq_size', 'Familiar', 450, 1),
    ('voption_fine_truffle_medium', 'vgroup_fine_truffle_size', 'Mediana', 0, 0),
    ('voption_fine_truffle_family', 'vgroup_fine_truffle_size', 'Familiar', 450, 1);

INSERT INTO promotions (id, restaurant_id, branch_id, type, scope, name, description, percentage, special_price, buy_quantity, paid_quantity, priority, is_recurring, status) VALUES
    ('promo_fine_classics', 'rest_fine', 'branch_fine', 'two_for_one', 'category', 'Martes 2x1 en clásicas', 'Pide dos pizzas clásicas medianas y paga una.', NULL, NULL, 2, 1, 30, 0, 'active'),
    ('promo_fine_sides', 'rest_fine', 'branch_fine', 'happy_hour', 'category', 'Happy entrantes −20%', 'Todos los entrantes con descuento.', 20, NULL, NULL, NULL, 20, 0, 'active'),
    ('promo_fine_pack', 'rest_fine', 'branch_fine', 'special_price', 'info', 'Pack familiar', 'Una pizza familiar, un entrante y dos bebidas.', NULL, 2999, NULL, NULL, 10, 0, 'active');

INSERT INTO promotion_targets (promotion_id, target_type, target_id) VALUES
    ('promo_fine_classics', 'category', 'cat_fine_classics'),
    ('promo_fine_sides', 'category', 'cat_fine_sides');

INSERT INTO translations (id, restaurant_id, entity_type, entity_id, language_code, field, value) VALUES
    ('tr_fine_cat1_name', 'rest_fine', 'category', 'cat_fine_classics', 'en', 'name', 'Classics'),
    ('tr_fine_cat2_name', 'rest_fine', 'category', 'cat_fine_signature', 'en', 'name', 'Signature'),
    ('tr_fine_cat3_name', 'rest_fine', 'category', 'cat_fine_sides', 'en', 'name', 'Starters'),
    ('tr_fine_cat4_name', 'rest_fine', 'category', 'cat_fine_desserts', 'en', 'name', 'Desserts'),
    ('tr_fine_margherita_name', 'rest_fine', 'dish', 'dish_fine_margherita', 'en', 'name', 'Margherita'),
    ('tr_fine_pepperoni_name', 'rest_fine', 'dish', 'dish_fine_pepperoni', 'en', 'name', 'Pepperoni'),
    ('tr_fine_bbq_name', 'rest_fine', 'dish', 'dish_fine_bbq_chicken', 'en', 'name', 'BBQ chicken'),
    ('tr_fine_truffle_name', 'rest_fine', 'dish', 'dish_fine_truffle_bacon', 'en', 'name', 'Truffle and bacon'),
    ('tr_fine_cajun_name', 'rest_fine', 'dish', 'dish_fine_cajun_fries', 'en', 'name', 'Cajun fries'),
    ('tr_fine_cheesecake_name', 'rest_fine', 'dish', 'dish_fine_cheesecake', 'en', 'name', 'Cheesecake');

-- =============================================================================
-- TENANT 3 · Café Brote · cafe.localhost · template default (sin entrada KV)
-- =============================================================================

INSERT INTO restaurants (id, name, country_code, default_language_code, source_currency)
VALUES ('rest_cafe', 'Café Brote', 'ESP', 'es', 'EUR');

INSERT INTO restaurant_languages (restaurant_id, language_code, is_default) VALUES
    ('rest_cafe', 'es', 1),
    ('rest_cafe', 'en', 0);

INSERT INTO branches (id, restaurant_id, name, address, phone, custom_domain)
VALUES ('branch_cafe', 'rest_cafe', 'Café Brote', 'Calle Fuencarral 45, Madrid', '+34915666777', 'cafe.localhost');

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

-- =============================================================================
-- TENANT 4 · Sazón Caracas · ven.localhost · Venezuela
-- =============================================================================

INSERT INTO restaurants (id, name, country_code, default_language_code, source_currency, legal_name, tax_id, legal_address, data_protection_email)
VALUES ('rest_ven', 'Sazón Caracas', 'VEN', 'es', 'USD', 'Sazón Caracas C.A.', 'J-12345678-9', 'Av. Francisco de Miranda 100, Caracas', 'privacidad@sazon.example');

INSERT INTO restaurant_languages (restaurant_id, language_code, is_default) VALUES
    ('rest_ven', 'es', 1),
    ('rest_ven', 'en', 0);

INSERT INTO branches (id, restaurant_id, name, address, phone, custom_domain)
VALUES ('branch_ven', 'rest_ven', 'Sazón Caracas', 'Av. Francisco de Miranda 100, Caracas', '+582129990000', 'ven.localhost');
