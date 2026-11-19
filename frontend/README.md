# Next.js frontend

See the [root README](../README.md) for complete setup and actual verification results.

Use `npm ci`, then `npm run dev`. Laravel runs separately on http://localhost:8000. The only public environment setting is NEXT_PUBLIC_API_URL. No credentials or authentication tokens belong in frontend configuration or browser storage.

Checks: `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test:browser` with both apps running and local demo data seeded.
