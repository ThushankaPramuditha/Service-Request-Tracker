# Service Request Tracker

A local Laravel API and Next.js application for employees to create, view and advance their own service requests. PostgreSQL enforces the data constraints; Laravel owns authentication, authorization and the transactional audit trail.

## Prerequisites and versions

Verified on Windows with PHP **8.3.33**, Node **22.14.0**, npm **10.9.2**, PostgreSQL **17.2**, Laravel **13.43.0**, Sanctum **4.5.0**, Next.js **16.4.6**, React **19.3.0**, PHPUnit **12.5.44**, and Playwright **1.65.1** using installed Microsoft Edge. Dependency versions are pinned by `backend/composer.lock` and `frontend/package-lock.json`.

Use PHP 8.3+ with PDO PostgreSQL, mbstring, OpenSSL, fileinfo, curl, DOM/XML and the usual Laravel extensions; Composer; Node 20.9+; PostgreSQL; and Edge for the supplied browser configuration. This workspace used an existing Composer 2.11-dev PHAR because Composer was not on PATH. No global runtime was upgraded.

## Fresh setup

The examples use PowerShell. Create **new** databases using your PostgreSQL administrator account; enter its password interactively. Do not reuse an existing database containing unrelated work.

```powershell
createdb -h localhost -U postgres service_request_tracker
createdb -h localhost -U postgres service_request_tracker_test
cd backend
composer install
Copy-Item .env.example .env
```

Edit `backend/.env` privately: set `DB_HOST`, `DB_PORT`, `DB_USERNAME`, and `DB_PASSWORD` for your local PostgreSQL instance. Keep `DB_DATABASE=service_request_tracker`. Do not put these values in frontend files or Git.

```powershell
php artisan key:generate
php artisan migrate --seed
php artisan serve --host=localhost --port=8000
```

In a second terminal from the repository root:

```powershell
cd frontend
npm ci
Copy-Item .env.example .env.local
npm.cmd run dev -- --hostname localhost
```

Open **http://localhost:3000**. Use `localhost` for both apps; do not mix it with `127.0.0.1`. The frontend's only public environment variable is `NEXT_PUBLIC_API_URL=http://localhost:8000`.

Laravel migrations are the application setup mechanism. `docs/schema.sql` is an equivalent standalone reference, **not a second setup step**. Never execute it and migrations against the same database. A test checks that its application DDL equals the migration DDL.

### This workspace's isolated runtime

The existing PostgreSQL service was not accessible without credentials. Verification therefore used an ignored, separate cluster at `.local/pgdata`, listening only on `127.0.0.1:55432`, with local role `tracker` and trust authentication. It contains development, `_test`, and `service_request_tracker_setup_verify` databases. It is a local verification convenience, not deployment configuration.

To restart that already initialized cluster from the repository root:

```powershell
& 'C:/Program Files/PostgreSQL/17/bin/pg_ctl.exe' -D .local/pgdata -l .local/postgres.log -o '-p 55432 -h 127.0.0.1' start
```

The installed PHP originally had no php.ini. Its extensions were enabled through ignored `.local/php.ini`. In this workspace, use:

```powershell
# From the repository root, for CLI commands:
$env:PHPRC = (Resolve-Path .local/php.ini).Path
cd backend
php artisan migrate --seed
php artisan test

# Composer fallback when it is absent from PATH:
php "$env:APPDATA/Composer/latest.phar" install
```

`artisan serve` did not propagate this private PHP configuration to its child on this machine. The verified alternative is to run PHP directly, **from backend/public**:

```powershell
cd backend/public  # from the repository root
php -c ../../.local/php.ini -S localhost:8000 ../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php
```

For another Windows checkout with the same PHP distribution, create the private PHP configuration before the CLI steps:

```powershell
New-Item -ItemType Directory -Force .local | Out-Null
$phpDir = Split-Path (Get-Command php).Source
@("extension_dir=`"$phpDir/ext`"", 'extension=openssl', 'extension=mbstring',
  'extension=pdo_pgsql', 'extension=pgsql', 'extension=fileinfo', 'extension=curl',
  'extension=zip', 'extension=intl', 'extension=sodium') | Set-Content .local/php.ini
$env:PHPRC = (Resolve-Path .local/php.ini).Path
php -m
```

## Demo accounts

Local/testing only; the seeder refuses other environments. It hashes passwords with Laravel's hasher and can be rerun without duplicating users or sample requests.

| Email | Password |
| --- | --- |
| Kasun@gmail.com | DemoPassword!2026 |
| Nuwan@gmail.com | DemoPassword!2026 |

Each starts with one owned OPEN request at version 1 and no status history. Browser verification creates additional clearly named requests. These are demo credentials, not production secrets.

## Tests and verification

The backend suite requires PostgreSQL and a resolved database name ending in `_test`; it refuses other databases before migration setup. Tests reset the dedicated test database. Never point them at your development database. `phpunit.xml` selects `service_request_tracker_test`; host/port/user/password come from your private environment. If needed, copy `.env` to ignored `.env.testing` and set its database name to `service_request_tracker_test`.

```powershell
cd backend
php artisan config:clear
php artisan test
php vendor/bin/pint --test

cd ../frontend
npm run lint
npm run typecheck
npm run build
# With both local servers running and demo data seeded:
npm run test:browser
```

The browser configuration uses installed Edge (`channel: msedge`). For a different browser, change that explicit local setting and install the matching Playwright browser; cross-browser results are not claimed. Tests intentionally abort selected network requests to check failure recovery. They use real Laravel sessions and PostgreSQL data, not mocked authentication. Repeated rapid runs can hit the real five-attempts-per-minute login throttle; wait for its window rather than disabling it.

To run the separate real idle-expiry check, keep both servers running with uncached local configuration, then run from the repository root:

```powershell
./scripts/verify-expiry.ps1
```

This temporarily sets `SESSION_LIFETIME=1`, waits 65 seconds without requests, verifies redirect to login, and restores the original 120-minute configuration in `finally`. The normal browser command excludes this special check. Do not run concurrent browser suites while changing lifetime.

Actual results: **18 backend tests / 147 assertions passed**; frontend lint, TypeScript and production build passed; **4 production-browser tests passed**. A separate real 65-second idle-expiry check also passed. Fresh migrations/seeding were verified on a new database. Phase results, failures and corrections are recorded in [docs/VERIFICATION.md](docs/VERIFICATION.md).

## Authentication walkthrough

1. The browser calls Laravel's `/sanctum/csrf-cookie` with credentials. Laravel sets an HttpOnly session cookie and a separate readable `XSRF-TOKEN` cookie.
2. The fetch client URL-decodes only `XSRF-TOKEN` and sends `X-XSRF-TOKEN` on mutations. The session identifier is never read by JavaScript. Laravel 13's optional origin-only shortcut is overridden so a token is still required.
3. Laravel verifies credentials with its web guard, regenerates the session ID, and returns only id/name/email. Next.js keeps this safe identity in memory; `/api/auth/me` restores it after reload. Passwords and authentication tokens are never stored in localStorage/sessionStorage.
4. Logout uses Laravel's web guard, invalidates the session and regenerates CSRF. A network failure displays retry rather than claiming logout succeeded. A 401 clears private UI state; an authenticated 419 offers token reinitialization without replaying a mutation.

Sessions use the database driver, HttpOnly, SameSite=Lax and a 120-minute idle lifetime. Local HTTP uses Secure=false. HTTPS APP_URL forces Secure=true even if the environment's flag is false. HTTPS itself was not deployed or browser-tested. Exact credentialed CORS permits only `http://localhost:3000`; wildcard origins are not enabled. An unrelated origin cannot read credentialed responses. Auth and private API responses are `no-store`.

## Ownership and concurrency walkthrough

All request queries begin at `$user->serviceRequests()`. Creation allowlists title/description/priority and assigns the owner, OPEN and version 1 on the server. Detail/history/status return the same 404 for unknown and foreign IDs. History is read only after loading its owned parent. React renders user content as text, including HTML-looking descriptions and remarks.

Only OPEN → IN_PROGRESS → RESOLVED is allowed. `ChangeRequestStatus` starts a transaction and obtains the owned row with `FOR UPDATE` **before** comparing `expected_version`. It then validates the transition, increments the version, updates the row and inserts exactly one history entry, committing together. Exceptions roll back both writes. There is no async audit writer or general update endpoint.

Two clients submitting version 1 cannot both succeed: the second waits for the lock, observes version 2 and receives 409 `STALE_VERSION`. The independent-process PostgreSQL test observes both waiting connections and verifies one winner and one history row. A separate test forces a real history INSERT constraint failure and checks rollback.

To demonstrate stale recovery, open the same request in two tabs, advance it in one, and submit the old action in the other. The second tab shows a conflict, refreshes detail/history and preserves the remark. It requires a new user action. If refresh fails, status controls remain disabled until a successful explicit refresh. A network failure after a mutation also triggers a read before another action; creation is never automatically retried.

## API contract

| Method | Path | Success |
| --- | --- | --- |
| POST | `/api/auth/login` | 200 `{data:{id,name,email}}` |
| GET | `/api/auth/me` | 200 same safe identity |
| POST | `/api/auth/logout` | 204, no body |
| GET / POST | `/api/requests` | 200 list / 201 resource |
| GET | `/api/requests/{id}` | 200 resource |
| PATCH | `/api/requests/{id}/status` | 200 updated resource |
| GET | `/api/requests/{id}/history` | 200 `{data:[...]}` |

Request resources expose `id,title,description,priority,status,version,created_at,updated_at`. History exposes `id,service_request_id,actor_user_id,from_status,to_status,remark,created_at` in chronological order. Timestamps are UTC ISO strings. A new request has empty history.

List query: `?search=printer&status=OPEN&priority=HIGH&page=1&per_page=10`. Search is a case-insensitive literal title substring; `%`, `_` and backslash are escaped. Filters combine with AND inside owner scope. Default page size is 10; maximum is 25; out-of-range inputs are rejected. Order is created_at descending, then id descending.

Paginated responses have `data`, `links` (`first,last,prev,next`) and Laravel's `meta`, including `current_page,last_page,per_page,total,from,to,path,links`. The UI uses the four pagination fields named in the architecture.

Create body: `{ "title": "Printer problem", "description": "The printer is not responding.", "priority": "HIGH" }`.

Status body: `{ "status": "IN_PROGRESS", "expected_version": 1, "remark": "Investigating" }`.

Errors consistently use `{ "message": "...", "code": "...", "errors": {} }`. Validation replaces the empty object with field-to-message arrays. Codes: 401 `UNAUTHENTICATED`/`INVALID_CREDENTIALS`, 404 `NOT_FOUND`, 409 `STALE_VERSION`/`INVALID_TRANSITION`, 419 `CSRF_TOKEN_MISMATCH`, 422 `VALIDATION_ERROR`, 429 `TOO_MANY_ATTEMPTS`, and generic 500 `INTERNAL_ERROR`. Login CSRF failure stays 419; CSRF mismatch on a known protected route with an unauthenticated started session renders 401 without executing the controller.

## Screenshots

Genuine browser captures from the local application:

- [Login](docs/screenshots/login.png)
- [Create](docs/screenshots/create.png)
- [Filtered list](docs/screenshots/list.png)
- [Detail and status history](docs/screenshots/detail-history.png)
- [Mobile create](docs/screenshots/mobile-create.png)

## Scope and limitations

Local build only. No deployment, public registration, reset flow, administrators, assignment, generic edit/delete, notifications or extra authentication system. The audit trail is transactional, not tamper-proof against database administrators. Creation has no idempotency key; an uncertain response requires reviewing the list. HTTP testing cannot establish HTTPS transport behavior. Firefox/Safari and production hosting have not been verified.

The local PHP server is single-process; browser requests may be slower on Windows. Concurrency guarantees are verified separately with independent PHP processes and PostgreSQL connections, so the HTTP server's serialization does not stand in for row-lock evidence.

## Submission identifiers

Configured repository remote: https://github.com/ThushankaPramuditha/Service-Request-Tracker.git

Branch: `main`. The implementation baseline is committed at `b62e186e433509d3e1b6fd403fdb1ed0eaea0e12` (`initial commit`). This baseline predates the gap fixes. Obtain the exact current submission SHA with `git rev-parse HEAD`, confirm `git status --short` has no intended changes left out, and verify the pushed repository content. No deployment has been performed.

Keep the existing history intact. Use descriptive messages for subsequent changes, such as `Fix CSRF recovery and clarify status errors`, rather than inventing earlier development steps.

## AI Use & Verification

Tools I used:

- **OpenAI Codex:** AI assistance with implementation, testing and documentation, as described below.
- **pgAdmin:** creating the PostgreSQL database.
- **DBeaver:** monitoring and inspecting the database tables.

Additional tools used during Codex-assisted implementation and verification included shell/file tools, official-documentation web lookup, Composer/npm, Laravel/PHPUnit/Pint, PostgreSQL command-line tools, and Playwright controlling local Edge. The Sites skill was read for its local-only workflow; no Sites hosting or alternate authentication was used. No sub-agents were used.

Codex read the supplied architecture/schema, scaffolded the apps, implemented migrations/API/UI, wrote tests, ran checks, diagnosed failures, captured screenshots and drafted this documentation. A representative actual instruction was: “Acquire the owned request’s row lock inside the transaction before checking its version.” This was implemented in ChangeRequestStatus and checked using independent contending processes and a real rollback failure.

Observed corrections included a missing PHP driver in the local server child, test cookie handling, database timestamp representation, CSRF origin-shortcut behavior, a dropdown test selector, and a hot reload interrupting browser verification. Exact results and remaining limits belong in the verification record, not inferred from generated code.

**Independent technical decisions (candidate-confirmed):**

PostgreSQL: I chose PostgreSQL because I am familiar with it, which helped me focus on building and testing the application.

CSRF protection: I required a valid CSRF token for requests that change data, even when they come from the same origin. This keeps token validation consistent.

Ownership: I made Laravel check ownership by loading requests through the logged-in user’s relationship. Users cannot access someone else’s requests by bypassing the UI. Missing requests and another user’s requests both return 404.

Concurrent updates: I locked the request inside the transaction before checking its version. This makes competing updates wait and prevents an outdated update from overwriting newer data.

Audit consistency: I saved the status change, version increase and history entry in one transaction. If any step fails, everything rolls back.

**Candidate review still required:** personally review the implementation and prepare to explain and modify it without AI during the interview. The recorded automated checks do not substitute for that review.
