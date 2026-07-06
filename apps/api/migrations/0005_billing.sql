-- =============================================================================
-- QMenut · Migración: 0005_billing
-- =============================================================================
-- Suscripción SaaS por sucursal (Stripe Checkout + Customer Portal).
--   * stripe_customers: un cliente Stripe por restaurante (quién paga a QMenut).
--     No se reutiliza restaurant_stripe_accounts (eso es Stripe Connect / MVP2).
--   * branch_subscriptions: se amplía con el price y el flag de cancelación al fin
--     de periodo, y se garantiza 1 fila por sucursal y unicidad de la sub Stripe.
-- =============================================================================

CREATE TABLE stripe_customers (
    restaurant_id      TEXT    PRIMARY KEY REFERENCES restaurants(id) ON DELETE CASCADE,
    stripe_customer_id TEXT    NOT NULL UNIQUE,
    created_at         INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at         INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

ALTER TABLE branch_subscriptions ADD COLUMN stripe_price_id TEXT;
ALTER TABLE branch_subscriptions ADD COLUMN cancel_at_period_end INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX ux_branch_subscriptions_branch ON branch_subscriptions(branch_id);
CREATE UNIQUE INDEX ux_branch_subscriptions_stripe_sub
    ON branch_subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
