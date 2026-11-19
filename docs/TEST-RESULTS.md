# Happy and sad path verification — 2026-11-19

Executed against the current local setup using PostgreSQL on port 5432. No application source code or existing user credentials were changed. The user's existing README edits were preserved.

## Commands and results

| Command | Result |
| --- | --- |
| From backend: set PHPRC to ../.local/php.ini, then `php artisan test` | 18 passed, 147 assertions; reported test duration 36.220 seconds |
| From frontend: `npm.cmd run test:browser` | 6 passed in 3.8 minutes, using real Edge and the running local servers |

Backend tests used the separate `service_request_tracker_test` database, enforced by the test safety guard. Browser tests used the application database with demo accounts and uniquely named test requests.

## Happy paths verified

- Correct credentials, current-user identity, session persistence after reload and logout.
- Valid request creation with server-assigned ownership, OPEN status and version 1.
- Both allowed status transitions, version increments and one audit entry per transition.
- Both demo users completing the request workflow.
- Title search, combined filters, server pagination and mobile form layout.
- Explicit resubmission after successful CSRF token recovery.

## Sad paths verified

- Wrong credentials, unauthenticated access, login throttling, bearer-token rejection and non-stateful login rejection.
- Cross-user list/detail/history/status isolation; foreign records return 404.
- Invalid fields, Unicode boundaries, pagination limits and database constraints.
- Skipped, reversed, duplicate and terminal transitions rejected without changing request/history.
- Stale versions rejected; two independent processes produce one successful update and one stale conflict.
- Actual history INSERT failure rolls back the request update.
- Missing/invalid CSRF rejected; unrelated CORS origin not authorized.
- CSRF reinitialization does not submit the create form automatically.
- Status field errors and invalid-transition explanations appear in the UI.
- Two-tab stale recovery preserves remarks; failed refresh disables actions until explicit successful recovery.
- XSS-like content renders as plain text without execution.
- Empty results, interrupted list requests, retry and filter page reset.

## Setup issue encountered and resolved

The initial browser attempt rejected the demo login. A read-only check confirmed both alex@example.test and sam@example.test were absent from the current application database. Stopped that attempt, inspected the existing idempotent seeder, and ran `php -c ../.local/php.ini artisan db:seed` from backend. It added the missing demo accounts and sample requests using firstOrCreate; existing accounts/passwords were not overwritten. The full six-test browser rerun then passed.

## Artifacts and limits

The browser tests refreshed the genuine screenshots under docs/screenshots and left their test requests in the application database. Existing local servers were left running. No commits or pushes were made for this verification run. Timed idle expiry, HTTPS, other browsers, lint and production build were not rerun in this session; their earlier evidence is separate in VERIFICATION.md.
