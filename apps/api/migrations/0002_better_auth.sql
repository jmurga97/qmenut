CREATE TABLE users (
    id            TEXT    PRIMARY KEY,
    name          TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE,
    email_verified INTEGER NOT NULL DEFAULT 0,
    image         TEXT,
    created_at    INTEGER NOT NULL,
    updated_at    INTEGER NOT NULL
);

CREATE TABLE sessions (
    id         TEXT    PRIMARY KEY,
    expires_at INTEGER NOT NULL,
    token      TEXT    NOT NULL UNIQUE,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    user_id    TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user ON sessions(user_id);

CREATE TABLE accounts (
    id                      TEXT    PRIMARY KEY,
    account_id              TEXT    NOT NULL,
    provider_id             TEXT    NOT NULL,
    user_id                 TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token            TEXT,
    refresh_token           TEXT,
    id_token                TEXT,
    access_token_expires_at INTEGER,
    refresh_token_expires_at INTEGER,
    scope                   TEXT,
    password                TEXT,
    created_at              INTEGER NOT NULL,
    updated_at              INTEGER NOT NULL
);

CREATE INDEX idx_accounts_user ON accounts(user_id);

CREATE TABLE verifications (
    id         TEXT    PRIMARY KEY,
    identifier TEXT    NOT NULL,
    value      TEXT    NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER,
    updated_at INTEGER
);

CREATE INDEX idx_verifications_identifier ON verifications(identifier);
