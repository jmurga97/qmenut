-- Fixed-OTP Playwright account. Re-runnable after the public-menu seed.
DELETE FROM restaurant_users
WHERE id IN ('ru_tapas_e2e', 'ru_tapas_staff_e2e', 'ru_tapas_admin_e2e', 'ru_fine_owner_e2e')
   OR user_id = 'user_invite_e2e';
DELETE FROM users
WHERE id IN ('user_e2e', 'user_staff_e2e', 'user_admin_e2e', 'user_fine_owner_e2e', 'user_invite_e2e')
   OR email IN (
     'e2e@test.local',
     'staff.e2e@test.local',
     'admin.e2e@test.local',
     'owner.fine@test.local',
     'invite.e2e@test.local'
   );

INSERT INTO users (id, name, email, email_verified, created_at, updated_at)
VALUES ('user_e2e', 'E2E Test', 'e2e@test.local', 1, unixepoch() * 1000, unixepoch() * 1000);

INSERT INTO restaurant_users (id, restaurant_id, user_id, role_code)
VALUES ('ru_tapas_e2e', 'rest_tapas', 'user_e2e', 'owner');

INSERT INTO users (id, name, email, email_verified, created_at, updated_at)
VALUES ('user_staff_e2e', 'E2E Staff', 'staff.e2e@test.local', 1, unixepoch() * 1000, unixepoch() * 1000);

INSERT INTO restaurant_users (id, restaurant_id, user_id, role_code)
VALUES ('ru_tapas_staff_e2e', 'rest_tapas', 'user_staff_e2e', 'staff');

INSERT INTO users (id, name, email, email_verified, created_at, updated_at)
VALUES ('user_admin_e2e', 'E2E Admin', 'admin.e2e@test.local', 1, unixepoch() * 1000, unixepoch() * 1000);

INSERT INTO restaurant_users (id, restaurant_id, user_id, role_code)
VALUES ('ru_tapas_admin_e2e', 'rest_tapas', 'user_admin_e2e', 'admin');

INSERT INTO users (id, name, email, email_verified, created_at, updated_at)
VALUES ('user_fine_owner_e2e', 'E2E Fine Owner', 'owner.fine@test.local', 1, unixepoch() * 1000, unixepoch() * 1000);

INSERT INTO restaurant_users (id, restaurant_id, user_id, role_code)
VALUES ('ru_fine_owner_e2e', 'rest_fine', 'user_fine_owner_e2e', 'owner');

-- Existing global account used to verify provisioning without replacing its canonical name.
INSERT INTO users (id, name, email, email_verified, created_at, updated_at)
VALUES ('user_invite_e2e', 'Cuenta e2e existente', 'invite.e2e@test.local', 1, unixepoch() * 1000, unixepoch() * 1000);

-- Extra branches make every public template reachable through the same Worker and exercise the
-- admin branch selector. The no-domain branch deliberately covers resolveBranchHost's guard.
INSERT INTO branches (id, restaurant_id, name, address, phone, custom_domain)
VALUES
  ('branch_her', 'rest_tapas', 'Mesón Herencia', 'Calle Mayor 4, Logroño', '+34941000101', 'her.localhost'),
  ('branch_fast', 'rest_tapas', 'Tasca Express', 'Avenida de la Paz 18, Logroño', '+34941000102', 'fast.localhost'),
  ('branch_nodomain', 'rest_tapas', 'Sucursal sin dominio', 'Plaza del Mercado 1, Logroño', '+34941000103', NULL);

INSERT INTO categories (id, restaurant_id, branch_id, name, description, position) VALUES
  ('cat_her_guisos', 'rest_tapas', 'branch_her', 'Guisos de la casa', 'Recetas de siempre', 0),
  ('cat_fast_favoritos', 'rest_tapas', 'branch_fast', 'Favoritos rápidos', 'Listos para recoger', 0);

INSERT INTO dishes
  (id, restaurant_id, branch_id, category_id, name, description, price, position, is_recommended, is_featured)
VALUES
  ('dish_her_callos', 'rest_tapas', 'branch_her', 'cat_her_guisos', 'Callos a la riojana', 'Guiso lento y picante', 1050, 0, 1, 1),
  ('dish_her_pochas', 'rest_tapas', 'branch_her', 'cat_her_guisos', 'Pochas con verduras', 'Producto de temporada', 950, 1, 0, 0),
  ('dish_fast_bocata', 'rest_tapas', 'branch_fast', 'cat_fast_favoritos', 'Bocata de calamares', 'Pan crujiente y limón', 790, 0, 1, 1),
  ('dish_fast_burger', 'rest_tapas', 'branch_fast', 'cat_fast_favoritos', 'Burger Tasca', 'Ternera, queso y salsa brava', 990, 1, 0, 0);

INSERT INTO loyalty_programs
  (restaurant_id, type, points_per_currency_unit, points_per_visit, stamps_per_visit, is_active, created_at, updated_at)
VALUES ('rest_tapas', 'stamps', 0, 0, 1, 1, unixepoch() * 1000, unixepoch() * 1000);

INSERT INTO loyalty_rewards
  (id, restaurant_id, name, description, cost, type, percentage, free_dish_id, is_active, created_at, updated_at)
VALUES
  ('reward_tapas_discount', 'rest_tapas', 'Descuento del 10%', 'Descuento en tu próxima visita', 2, 'percentage_discount', 10, NULL, 1, unixepoch() * 1000, unixepoch() * 1000),
  ('reward_tapas_croquetas', 'rest_tapas', 'Croquetas gratis', 'Una ración de croquetas', 1, 'free_dish', NULL, 'dish_tapas_croquetas', 1, unixepoch() * 1000, unixepoch() * 1000);

-- Existing cards without a consent record must be forced through the current consent flow again.
INSERT INTO customers (id, email, created_at, updated_at)
VALUES ('customer_legacy_consent', 'legacy-consent.e2e@test.local', unixepoch() * 1000, unixepoch() * 1000);

INSERT INTO customer_restaurants
  (customer_id, restaurant_id, points_balance, stamps_balance, created_at, updated_at)
VALUES ('customer_legacy_consent', 'rest_tapas', 0, 0, unixepoch() * 1000, unixepoch() * 1000);

-- Independent accounts for selector and UI provisioning journeys.
DELETE FROM restaurant_users WHERE user_id IN ('user_multi_e2e', 'user_journey_e2e');
DELETE FROM users WHERE id IN ('user_multi_e2e', 'user_journey_e2e');
INSERT INTO users (id, name, email, email_verified, created_at, updated_at) VALUES
  ('user_multi_e2e', 'E2E Multi', 'multi.e2e@test.local', 1, unixepoch() * 1000, unixepoch() * 1000),
  ('user_journey_e2e', 'E2E Journey', 'journey.staff.e2e@test.local', 1, unixepoch() * 1000, unixepoch() * 1000);
INSERT INTO restaurant_users (id, restaurant_id, user_id, role_code) VALUES
  ('ru_multi_tapas_e2e', 'rest_tapas', 'user_multi_e2e', 'admin'),
  ('ru_multi_fine_e2e', 'rest_fine', 'user_multi_e2e', 'admin');

-- Complete English content across the restaurant: partial locales are not public.
WITH english(entity_type, entity_id, field, source_text, value) AS (VALUES
  ('category', 'cat_tapas_tapas', 'name', 'Tapas', 'Tapas'),
  ('category', 'cat_tapas_tapas', 'description', 'Para picar en la barra', 'Bar bites'),
  ('category', 'cat_tapas_raciones', 'name', 'Raciones', 'Sharing plates'),
  ('category', 'cat_tapas_raciones', 'description', 'Para compartir', 'To share'),
  ('dish', 'dish_tapas_bravas', 'name', 'Patatas bravas', 'Spicy potatoes'),
  ('dish', 'dish_tapas_bravas', 'description', 'Salsa brava casera y alioli', 'House brava sauce and aioli'),
  ('dish', 'dish_tapas_croquetas', 'name', 'Croquetas de jamón', 'Ham croquettes'),
  ('dish', 'dish_tapas_croquetas', 'description', 'Cremosas, de jamón ibérico', 'Creamy Iberian ham croquettes'),
  ('dish', 'dish_tapas_tortilla', 'name', 'Tortilla de patatas', 'Spanish omelette'),
  ('dish', 'dish_tapas_tortilla', 'description', 'Jugosa, con cebolla', 'Soft and juicy, with onion'),
  ('dish', 'dish_tapas_gambas', 'name', 'Gambas al ajillo', 'Garlic prawns'),
  ('dish', 'dish_tapas_gambas', 'description', 'Con guindilla y aceite de oliva', 'With chilli and olive oil'),
  ('dish', 'dish_tapas_calamares', 'name', 'Calamares a la romana', 'Battered squid'),
  ('dish', 'dish_tapas_calamares', 'description', 'Rebozado fino, limón', 'Light batter and lemon'),
  ('ingredient', 'ing_tapas_pan', 'name', 'Pan con tomate', 'Bread with tomato'),
  ('ingredient', 'ing_tapas_alioli', 'name', 'Alioli extra', 'Extra aioli'),
  ('promotion', 'promo_tapas_bravas', 'name', 'Happy tapa -20%', 'Happy tapa -20%'),
  ('category', 'cat_her_guisos', 'name', 'Guisos de la casa', 'House stews'),
  ('category', 'cat_her_guisos', 'description', 'Recetas de siempre', 'Traditional recipes'),
  ('category', 'cat_fast_favoritos', 'name', 'Favoritos rápidos', 'Quick favourites'),
  ('category', 'cat_fast_favoritos', 'description', 'Listos para recoger', 'Ready to collect'),
  ('dish', 'dish_her_callos', 'name', 'Callos a la riojana', 'Rioja-style tripe'),
  ('dish', 'dish_her_callos', 'description', 'Guiso lento y picante', 'Slow-cooked spicy stew'),
  ('dish', 'dish_her_pochas', 'name', 'Pochas con verduras', 'White beans with vegetables'),
  ('dish', 'dish_her_pochas', 'description', 'Producto de temporada', 'Seasonal produce'),
  ('dish', 'dish_fast_bocata', 'name', 'Bocata de calamares', 'Squid sandwich'),
  ('dish', 'dish_fast_bocata', 'description', 'Pan crujiente y limón', 'Crusty bread and lemon'),
  ('dish', 'dish_fast_burger', 'name', 'Burger Tasca', 'Tasca burger'),
  ('dish', 'dish_fast_burger', 'description', 'Ternera, queso y salsa brava', 'Beef, cheese and brava sauce'),
  ('reward', 'reward_tapas_discount', 'name', 'Descuento del 10%', '10% discount'),
  ('reward', 'reward_tapas_discount', 'description', 'Descuento en tu próxima visita', 'A discount on your next visit'),
  ('reward', 'reward_tapas_croquetas', 'name', 'Croquetas gratis', 'Free croquettes'),
  ('reward', 'reward_tapas_croquetas', 'description', 'Una ración de croquetas', 'A portion of croquettes'),
  ('branch', 'branch_tapas', 'tagline', 'Tapas de barrio desde 1987', 'Neighbourhood tapas since 1987'),
  ('branch', 'branch_her', 'tagline', 'Recetas con historia', 'Recipes with history'),
  ('branch', 'branch_fast', 'tagline', 'Sabor de barrio, sin esperas', 'Neighbourhood flavours, without the wait')
)
INSERT INTO translations (id, restaurant_id, entity_type, entity_id, language_code, field, source_text, value)
SELECT 'e2e_en_' || entity_id || '_' || field, 'rest_tapas', entity_type, entity_id, 'en', field, source_text, value
FROM english WHERE true
ON CONFLICT (entity_type, entity_id, language_code, field)
DO UPDATE SET source_text = excluded.source_text, value = excluded.value, is_manual = 0;
