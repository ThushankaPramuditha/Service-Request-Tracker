-- Service Request Tracker: PostgreSQL reference schema.
-- Use a NEW EMPTY reference database. This script does not create roles/databases.
-- Example: psql -v ON_ERROR_STOP=1 -d tracker_reference -f docs/schema.sql
-- Normal application setup uses Laravel migrations and seeders INSTEAD.
-- Do not run both this file and Laravel migrations against the same database.
-- No DROP statements, no real secrets, no plaintext or precomputed demo passwords.
-- Not a Laravel schema dump: deliberately contains no migrations ledger.
-- Eloquent must maintain updated_at; no database update triggers are installed.

BEGIN;

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    email_verified_at TIMESTAMPTZ NULL,
    password VARCHAR(255) NOT NULL,
    remember_token VARCHAR(100) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_email_unique UNIQUE (email)
);

-- Laravel database-session driver compatible. Session payloads are private.
CREATE TABLE sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id BIGINT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    payload TEXT NOT NULL,
    last_activity INTEGER NOT NULL,
    CONSTRAINT sessions_user_id_foreign
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX sessions_user_id_index ON sessions (user_id);
CREATE INDEX sessions_last_activity_index ON sessions (last_activity);

CREATE TABLE service_requests (
    id BIGSERIAL PRIMARY KEY,
    created_by BIGINT NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(6) NOT NULL,
    status VARCHAR(11) NOT NULL DEFAULT 'OPEN',
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT service_requests_created_by_foreign
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT service_requests_title_length_check
        CHECK (char_length(title) BETWEEN 3 AND 100),
    CONSTRAINT service_requests_description_length_check
        CHECK (char_length(description) BETWEEN 10 AND 500),
    CONSTRAINT service_requests_priority_check
        CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
    CONSTRAINT service_requests_status_check
        CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED')),
    CONSTRAINT service_requests_version_check CHECK (version >= 1)
);

CREATE INDEX service_requests_owner_created_index
    ON service_requests (created_by, created_at DESC, id DESC);

CREATE TABLE request_status_histories (
    id BIGSERIAL PRIMARY KEY,
    service_request_id BIGINT NOT NULL,
    actor_user_id BIGINT NOT NULL,
    from_status VARCHAR(11) NOT NULL,
    to_status VARCHAR(11) NOT NULL,
    remark TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT request_status_histories_request_foreign
        FOREIGN KEY (service_request_id) REFERENCES service_requests(id)
        ON DELETE RESTRICT,
    CONSTRAINT request_status_histories_actor_foreign
        FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT request_status_histories_from_status_check
        CHECK (from_status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED')),
    CONSTRAINT request_status_histories_to_status_check
        CHECK (to_status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED')),
    CONSTRAINT request_status_histories_transition_check CHECK (
        (from_status = 'OPEN' AND to_status = 'IN_PROGRESS')
        OR (from_status = 'IN_PROGRESS' AND to_status = 'RESOLVED')
    ),
    CONSTRAINT request_status_histories_remark_length_check
        CHECK (remark IS NULL OR char_length(remark) <= 500)
);

CREATE INDEX request_status_histories_request_created_index
    ON request_status_histories (service_request_id, created_at, id);
CREATE INDEX request_status_histories_actor_index
    ON request_status_histories (actor_user_id);

COMMIT;

-- Seed two local users with Laravel Hash::make in DatabaseSeeder, then create
-- their sample requests through Eloquent. Never store plaintext passwords here.
-- Authentication, ownership, atomic version increments and exactly-one audit
-- insertion are application obligations; this DDL alone does not implement them.
