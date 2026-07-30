DELETE FROM promotions WHERE name LIKE 'Promo E2E %';
DELETE FROM dishes WHERE name LIKE 'Plato E2E %';

-- Defensive restoration if a browser/process interruption occurred during the cross-system test.
UPDATE dishes
SET name = 'Croquetas de jamón'
WHERE id = 'dish_tapas_croquetas' AND name LIKE 'Croquetas sincronizadas %';

DELETE FROM sessions WHERE user_id = 'user_e2e';
DELETE FROM sessions WHERE user_id = 'user_staff_e2e';
DELETE FROM verifications WHERE identifier LIKE '%e2e@test.local%';
