# Tradeez Outreach API — Outreach Leads (v1)

Canonical behavior for the first backend slice. Keep implementations aligned with this document.

## Scope

- NestJS + Prisma + PostgreSQL.
- **No DELETE** for leads, notes, or messages in v1 (create / read / update only where specified). This is intentionally not full CRUD.
- No queues, AI, auth, or external integrations in v1.

## Infrastructure

- `DATABASE_URL` in [`backend/.env`](.env) must point at the Postgres instance used for local dev (e.g. Docker Compose).
- Prisma migrations are assumed applied. Connection URL for Migrate is configured in [`prisma.config.ts`](prisma.config.ts).
- [`PrismaModule`](src/prisma/prisma.module.ts) is **@Global()**; [`AppModule`](src/app.module.ts) imports it so `PrismaService` is available in feature modules without re-importing.

## Validation (Postman / curl)

- [`main.ts`](src/main.ts) registers a global `ValidationPipe` with `whitelist`, `forbidNonWhitelisted`, and **`transform: true`** so query/body types (enums, numbers, dates) deserialize consistently.

## DTOs and enums

- Use **`LeadStatus`**, **`LeadPriority`**, and **`MessageType`** from `@prisma/client` in DTOs (`@IsEnum(...)`) so the API stays aligned with the schema.

### CreateLeadDto

- **May** optionally set `status` and `lastContactedAt` on create (in addition to the fields listed in the product prompt). If omitted, Prisma defaults apply (e.g. `status` defaults to `NEW` per schema).

### UpdateLeadDto

- Partial update of all creatable lead fields, including `status` and `lastContactedAt`, via `PartialType(CreateLeadDto)`.

## GET /outreach-leads

- **Order:** `createdAt` descending.
- **Filters:** optional query params `status`, `area`, `serviceType`. Matching is **exact equality** on stored column values (not substring / case-insensitive search).
- **Invalid `status`:** when `status` is present but not a valid `LeadStatus` enum value, the client receives **400** (via `ParseEnumPipe`).

## GET /outreach-leads/:id

- Returns the lead with `notes`, `messages`, and `activities`, each ordered by `createdAt` descending.

## Activity log (LeadActivity)

| Event | ActivityType | Metadata (JSON) |
|--------|----------------|-----------------|
| Lead created | `CREATED` | none required |
| Lead `status` changed via PATCH | `STATUS_CHANGED` | `{ "previousStatus": "<old>", "newStatus": "<new>" }` |
| Note created | `NOTE_ADDED` | `{ "noteId": "<id>" }` |

- **POST /outreach-leads/:id/messages:** v1 **does not** create a `LeadActivity` row. Enum values such as `CONTACTED` / `REPLIED` are reserved for a later iteration if needed.

## Errors

- Missing lead: **`NotFoundException`** (404) for unknown id on read/update and on nested note/message routes.

## HTTP surface (v1)

- `POST /outreach-leads`
- `GET /outreach-leads`
- `GET /outreach-leads/:id`
- `PATCH /outreach-leads/:id`
- `POST /outreach-leads/:id/notes`
- `POST /outreach-leads/:id/messages`

Responses return Prisma results as returned by the service unless otherwise changed in code.
