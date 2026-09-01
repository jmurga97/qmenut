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
