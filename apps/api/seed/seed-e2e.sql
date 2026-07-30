-- Fixed-OTP Playwright account. Re-runnable after the public-menu seed.
DELETE FROM restaurant_users WHERE id IN ('ru_tapas_e2e', 'ru_tapas_staff_e2e');
DELETE FROM users
WHERE id IN ('user_e2e', 'user_staff_e2e') OR email IN ('e2e@test.local', 'staff.e2e@test.local');

INSERT INTO users (id, name, email, email_verified, created_at, updated_at)
VALUES ('user_e2e', 'E2E Test', 'e2e@test.local', 1, unixepoch() * 1000, unixepoch() * 1000);

INSERT INTO restaurant_users (id, restaurant_id, user_id, role_code)
VALUES ('ru_tapas_e2e', 'rest_tapas', 'user_e2e', 'owner');

INSERT INTO users (id, name, email, email_verified, created_at, updated_at)
VALUES ('user_staff_e2e', 'E2E Staff', 'staff.e2e@test.local', 1, unixepoch() * 1000, unixepoch() * 1000);

INSERT INTO restaurant_users (id, restaurant_id, user_id, role_code)
VALUES ('ru_tapas_staff_e2e', 'rest_tapas', 'user_staff_e2e', 'staff');
