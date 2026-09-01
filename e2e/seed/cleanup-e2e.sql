DELETE FROM promotions WHERE name LIKE 'Promo E2E %';
DELETE FROM dishes WHERE name LIKE 'Plato E2E %';
DELETE FROM categories WHERE name LIKE 'Cat E2E %';
DELETE FROM ingredients WHERE name LIKE 'Ingrediente E2E %';

DELETE FROM loyalty_transactions
WHERE customer_id IN (SELECT id FROM customers WHERE email LIKE '%e2e@test.local');
DELETE FROM loyalty_redemptions
WHERE customer_id IN (SELECT id FROM customers WHERE email LIKE '%e2e@test.local');
DELETE FROM customer_visits
WHERE customer_id IN (SELECT id FROM customers WHERE email LIKE '%e2e@test.local');
DELETE FROM customer_restaurants
WHERE customer_id IN (SELECT id FROM customers WHERE email LIKE '%e2e@test.local');
DELETE FROM customers WHERE email LIKE '%e2e@test.local';

DELETE FROM translations
WHERE restaurant_id = 'rest_tapas' AND language_code IN ('fr', 'de');
DELETE FROM restaurant_languages
WHERE restaurant_id = 'rest_tapas' AND language_code IN ('fr', 'de');

-- Defensive restoration if a browser/process interruption occurred during the cross-system test.
UPDATE dishes
SET name = 'Croquetas de jamón'
WHERE id = 'dish_tapas_croquetas' AND name LIKE 'Croquetas sincronizadas %';

DELETE FROM sessions WHERE user_id = 'user_e2e';
DELETE FROM sessions WHERE user_id = 'user_staff_e2e';
DELETE FROM sessions WHERE user_id = 'user_admin_e2e';
DELETE FROM sessions WHERE user_id = 'user_fine_owner_e2e';
DELETE FROM restaurant_users WHERE user_id = 'user_invite_e2e';
DELETE FROM users WHERE id = 'user_invite_e2e';
DELETE FROM verifications WHERE identifier LIKE '%e2e@test.local%';
DELETE FROM verifications WHERE identifier = 'owner.fine@test.local';
