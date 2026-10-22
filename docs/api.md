# API contract
All payloads are JSON. Login is public; other routes require `Authorization: Bearer <token>`.

| Method | Route | Role | Body |
|---|---|---|---|
| POST | /api/auth/login | public | username, password |
| GET | /api/state | viewer or coordinator | — |
| POST | /api/incidents | coordinator | title, location, severity, people |
| POST | /api/incidents/{id}/dispatch | coordinator | teamId |
| POST | /api/incidents/{id}/advance | coordinator | — |
| POST | /api/incidents/{id}/allocations | coordinator | resourceId, quantity |

Successful mutations return the complete updated state. Creating an incident returns 201; other successes return 200. Invalid input returns 400, missing/invalid authentication 401, insufficient role 403, missing entity 404, business conflicts 409.

Severity is CRITICAL, HIGH, MEDIUM or LOW. Title and location must be nonblank and at most 100 characters. People is an integer from 1 to 100000. Quantity is a positive integer within stock. Advancement allows only DISPATCHED → ON_SITE and ON_SITE → RESOLVED.
