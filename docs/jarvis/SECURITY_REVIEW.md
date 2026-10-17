# SEC-001 and SEC-004 review

**Status:** Draft review. An authenticated end-to-end run against an isolated Evolution staging instance is still required.

This change hardens the Evolution webhook by validating the configured secret, instance and authorized sender; applying replay/idempotency and rate limits; and rejecting malformed events. Media handling avoids fetching caller-supplied external URLs and enforces the inline payload limit before processing.

The Prisma migration and database-backed integration suite were exercised against a disposable local PostgreSQL database. Backend validation (82 tests), frontend validation (47 tests), and desktop validation (4 tests) passed in the recorded implementation run. GitHub Actions previously passed for the equivalent application code; this review branch still needs its own CI run.

Evolution staging credentials and an isolated test instance were not available in the local environment. No production WhatsApp conversation, number, credentials, or instance was used. Do not merge or deploy until the staging matrix is complete and this review is approved.

The hourly scheduler remains disabled. This change contains no deployment or production operation.
