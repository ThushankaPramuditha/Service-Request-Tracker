# Implementation and verification record

Work performed on 2026-11-19. This records observed results, not planned acceptance claims.

## Phase 0 — Inspection

Read all of ARCHITECTURE.md and docs/schema.sql. No AGENTS.md was found in the repository or checked parent directories. Existing architecture/schema were untracked and preserved. Repository initially contained only those documents and a one-line README.

Observed runtimes: PHP 8.3.33, Node 22.14.0, npm 10.9.2, PostgreSQL client/server 17.2. Composer was absent from PATH; an existing Composer 2.11-dev PHAR was available. PHP initially had no loaded php.ini and lacked required extensions. An ignored workspace configuration enables the installed extensions. Existing PostgreSQL required unavailable credentials; a new ignored loopback-only cluster was initialized on port 55432, with separate development and test databases. Existing databases were not modified.

Network-restricted dependency downloads failed initially and succeeded after tool escalation. Installed Laravel 13.43.0, Sanctum 4.5.0, Next.js 16.4.6, React 19.3.0 and Playwright 1.65.1. Dependency lockfiles are included.

## Phase 1 — Foundation

Implemented all four application tables through a Laravel migration, using explicit PostgreSQL DDL equivalent to docs/schema.sql. The reference script was not executed against the application database. Added enums, relationships, factory, local-only idempotent demo seeder and a test-database safety guard.

Executed `php artisan key:generate`, `php artisan migrate --seed`: succeeded on the new development database. `php artisan test --filter=DatabaseFoundationTest`: 2 passed, 13 assertions. Verified seed repeatability, password hashing and database CHECK rejection. An earlier launch during Composer autoloader generation failed to load Sanctum; it was rerun after installation completed.

## Phase 2 — Authentication

Added Sanctum stateful cookies, database sessions, login/me/logout, login throttle, exact CORS, no-store responses, JSON errors and explicit token-required CSRF middleware. Session HttpOnly is enforced; HTTPS APP_URL forces Secure. Laravel 13's origin-only CSRF shortcut is overridden to require the token.

`php artisan test --filter=AuthenticationTest`: 3 passed, 24 assertions. Real credentials, normalized email, database-backed login, me, original session deletion, guest responses and throttle verified. Test cookie handling was corrected; browser replay checks separately verify session invalidation. PHPUnit's ordinary CSRF bypass is not counted as browser CSRF evidence.

## Phase 3 — Owned API

Implemented Form Requests, Resources and owned create/list/detail/history endpoints. Inputs cannot set owner/status/version. Literal PostgreSQL ILIKE search, combined filters and deterministic pagination are covered.

`php artisan test --filter=OwnedRequestsTest`: 4 passed, 46 assertions.

## Phase 4 — Atomic workflow

Added ChangeRequestStatus: transaction, owned row lock, expected-version comparison, enum transition validation, update/version increment and one history INSERT. Added workflow, cross-user status, rollback and independent-process concurrency tests.

The rollback test initially compared a new in-memory model against a database-loaded representation; corrected it to compare persisted snapshots. PostgreSQL connections explicitly use UTC.

`php artisan test`: 16 passed, 138 assertions (includes two scaffold example tests). The concurrency test observed two independent connections waiting on the locked row, released it, then verified SUCCESS + STALE_VERSION, version 2 and one audit row. The rollback test forces an actual PostgreSQL CHECK failure on history INSERT and verifies unchanged request/history.

## Phase 5 — Browser authentication

Implemented minimal login/logout, AuthProvider, credentialed fetch with XSRF header and protected layout. `npm run lint` and `npx tsc --noEmit` passed after correcting auth initialization's effect.

Initial browser checks exposed a local server configuration failure: artisan serve's child did not inherit the workspace PHP extension configuration. Direct PHP serving with explicit `-c`, from public/, resolved it. No CSRF or CORS protection was relaxed. Exception logging was restricted to exception class to avoid logging SQL bindings or session identifiers.

`npx playwright test tests/auth.spec.ts`: 2 passed in Edge, 20.6 seconds. Verified real cookie attributes, missing CSRF rejection, identity reload, logout and replay of the prior authenticated cookie, empty browser local/session storage, and exact CORS. Additional rotation/invalid-token and timed expiry checks were added afterward; their results will be recorded when complete.

Additional phase 5 run: `npx playwright test tests/auth.spec.ts tests/expiry.spec.ts` with temporary `SESSION_LIFETIME=1` passed all 3 checks in 1.6 minutes. Pre-login cookie replay remained unauthenticated, an invalid token with a same-origin header returned 419, and 65 seconds of real inactivity returned the browser to login. The original 120-minute lifetime was restored in finally.

## Phase 6 — Request screens

Added request list, URL-backed filters/pagination, creation, detail/history and status actions. Superseded list/detail/identity reads are cancelled. Stale updates refresh without replay; remarks remain; failed refresh disables actions. Uncertain creation displays a check-the-list message and prevents blind resubmission. User content uses React text nodes.

Executed `npm run lint`, `npm run typecheck`, `npm run build`: all passed. Routes /, /login, /requests, /requests/new and /requests/[id] built successfully.

The first workflow run failed on a wrapped-label selector and a login timeout. Changed the dropdown selector to its accessible combobox role/name and increased asynchronous assertion timeout for this Windows runtime. The second run passed pagination/mobile but a code hot reload interrupted Sam's final transition. Froze source, rebuilt and switched to `next start` for final verification.

`npm run test:browser` against the production build: **4 passed in 1.8 minutes**. Covered authentication/cookies/CSRF/CORS, both demo users creating and completing requests, cross-user detail/history/status 404, literal XSS strings without image nodes/dialog execution, two tabs with stale expected versions, failed recovery GETs disabling actions, preserved remark, explicit successful recovery, exactly two final history entries, combined filters, pagination/reset, empty results, network retry and 390px-wide mobile form layout.

Captured real screenshots in docs/screenshots: login.png, create.png, list.png, detail-history.png and mobile-create.png. Screenshots were regenerated during the successful production-browser run; they are not mockups.

## Phase 7 — Delivery verification

- Created a third **new** database, service_request_tracker_setup_verify, and executed `php artisan migrate --seed` with a process-scoped DB_DATABASE override. Succeeded. Read-only SQL confirmed users=2, requests=2, history=0 and PostgreSQL server 17.2. Development data was not reset.
- Added schema-reference equivalence, foreign-key deletion/session behavior, Unicode boundary checks and session-only authentication regression tests. Explicitly disabled Sanctum's unused bearer-token lookup so a supplied bearer token cannot invoke a token-table fallback.
- Removed generated example tests and unused Laravel Vite/welcome assets. Newly scaffolded AGENTS.md/CLAUDE.md were generic instructions to install Boost; they were removed with unused scaffold material to honor the requested minimal project, without changing original repository instructions.
- Final `php artisan test`: **18 passed, 147 assertions**, 8.620 seconds. This includes independent-process lock contention and real database rollback.
- `php vendor/bin/pint`: passed after applying formatting. `composer validate --no-check-publish`: valid. `composer install --dry-run --no-interaction`: lock/platform compatible, nothing to install. Its advisory-filter network refresh was unavailable under the restricted network; no fresh audit claim is made from that dry run. Earlier dependency installation reported no known advisories.
- Final frontend lint/typecheck/build passed. No frontend application changes followed that production build.
- `git diff --check`: passed, with only Git's LF-to-CRLF notice. Ignore inspection confirmed private backend .env and .local/php.ini are ignored and frontend/.env.example is included. No vendor/node_modules/logs/browser traces are submission files.
- README contains setup, demo accounts, API/error semantics, security/concurrency walkthroughs, screenshots and evidence-based AI disclosure. The candidate's independent decision remains explicitly unconfirmed.

Final timed-expiry rerun: `./scripts/verify-expiry.ps1` against the completed production UI **passed 1 test in 1.3 minutes**. Confirmed SESSION_LIFETIME=120 afterward and ran `php artisan config:clear` successfully. Final `php vendor/bin/pint --test` passed. Temporary PHP/Next.js verification servers and the workspace-only PostgreSQL cluster were stopped after checks; database files remain for restart.

## Submission state and limits

Configured remote: https://github.com/ThushankaPramuditha/Service-Request-Tracker.git. Branch main; existing initial HEAD 823d5133854ffe612f2afbbfe30a0c530d096ecf. No implementation commit, push or deployment was performed. Candidate review and final submission SHA remain pending.

Only local HTTP and Edge were browser-tested. HTTPS Secure enforcement is implemented/configured, not proven by an HTTPS browser run. No Firefox/Safari, hosting, production operations or tamper-proof audit claims. The local PHP server is single-process; concurrency evidence comes from separate PHP processes/DB connections. Candidate personal decisions and independent review are not inferred from agent work.
