# Laravel API

See the [root README](../README.md) for PostgreSQL setup, demo accounts, authentication, API contracts and test commands. Application setup uses migrations; never apply docs/schema.sql to the same database.

Run `php artisan test` only with the dedicated PostgreSQL `_test` database. Tests enforce this guard before resetting tables.
