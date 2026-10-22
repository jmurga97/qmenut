-- Plan gating starts reading branches.plan_code. Every tenant created before it had the full
-- product, so it keeps Business; only branches paying a Stripe subscription keep the plan Stripe set.
UPDATE `branches` SET `plan_code` = 'business', `updated_at` = unixepoch() * 1000
WHERE `plan_code` <> 'business'
  AND NOT EXISTS (
    SELECT 1 FROM `branch_subscriptions` s
    WHERE s.`branch_id` = `branches`.`id` AND s.`stripe_subscription_id` IS NOT NULL
  );--> statement-breakpoint
UPDATE `branch_subscriptions` SET `plan_code` = 'business', `updated_at` = unixepoch() * 1000
WHERE `plan_code` <> 'business' AND `stripe_subscription_id` IS NULL;
