# FunZone — Free MySQL setup notes

**Status:** research and instructions only. No account was created, no database was provisioned, no credentials were supplied, and no Render setting was changed. Production remains on `DATA_STORE=memory`.

## 1. Current project configuration

- `database/schema.sql` defines **8 tables**: `users`, `player_profiles`, `game_rooms`, `room_players`, `matches`, `match_players`, `achievements`, `user_achievements`, plus 5 seeded achievements.
- `server/src/config/env.js` reads: `PORT`, `NODE_ENV`, `CLIENT_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `DATA_STORE`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_AUTO_SETUP`, `DB_SSL`, `DB_SSL_CA`.
- `server/src/db/index.js` selects the store:
  - `DATA_STORE=memory` → in-memory store.
  - `DATA_STORE=mysql` → MySQL only, no fallback.
  - `DATA_STORE=auto` → MySQL only when `DB_PASSWORD` is set **and** a connection succeeds within 5 seconds; otherwise it silently falls back to memory.
- `server/src/db/mysqlStore.js` uses `mysql2/promise` `createPool` with host, port, user, password, charset, named placeholders and a connection limit of 10. A testable `buildMysqlConnectionConfig()` adds TLS only when `DB_SSL=true`; TLS is **disabled by default**, so the connection config is otherwise unchanged.
- `render.yaml` sets `DATA_STORE=memory` on the free web service, so live data is temporary by design.
- The schema uses `DROP TABLE IF EXISTS`, so `DB_AUTO_SETUP=true` is destructive against any hosted database. Leave it disabled unless explicitly approved.

## 2. Hosting research result (2026)

| Provider | No credit card? | MySQL-compatible? | Verdict |
| --- | --- | --- | --- |
| TiDB Cloud Starter (Serverless) | Yes, with spending limit `0`; up to 5 free Starter instances per organisation | Yes | **Only strong candidate**; TLS is supported by FunZone as opt-in code, but still needs account/network setup and live verification |
| PlanetScale | No free hobby tier; paid only | Yes | Ruled out |
| Aiven MySQL | Free MySQL retired; paid from about US$5/month | Yes | Ruled out |
| Render MySQL | Not offered; free tier is web service, Postgres and Key Value | No | Ruled out |
| Clever Cloud | MySQL billed; no permanent free tier | Yes | Ruled out |
| Railway | No-card trial exists but managed DB effectively needs paid usage | Yes | Unsuitable |
| FreeDB / FreeSQLDatabase / db4free | Free claims, but 30-day deletion, no backups, tiny limits or unverifiable/currently unreachable | Varies | Unsuitable |

Sources: PingCAP cluster-tier, Starter pricing, create-cluster, serverless connection and secure-connection docs; PlanetScale pricing and hobby-deprecation notice; Aiven free-MySQL retirement and pricing; Render pricing; Clever Cloud pricing; Railway pricing.

## 3. What is ready and what still blocks a live hosted MySQL

Ready locally: opt-in TLS support exists in `server/src/config/env.js` and `server/src/db/mysqlStore.js` through `DB_SSL` and `DB_SSL_CA`. It is off by default, so memory mode and the live Render configuration are unchanged. Five tests (`server/tests/mysql_tls.test.js`) verify the config without connecting to any database. `.env.example` documents the two variables with no values.

Still blocking live use: TiDB Cloud public connections require TLS and IP allowlist rules; account, cluster, database, user and password creation need your action; no credentials or CA material were supplied, so no live connection was tested. TiDB Serverless also terminates long-lived connections, so a max-connection-lifetime setting may still be needed. No code change to your TiDB account or database settings has been made.

## 4. Local-only setup instructions (no values, no secrets)

1. Keep the Render service untouched, including `DATA_STORE=memory`.
2. In the local, gitignored `.env` only, set `DATA_STORE` to force MySQL rather than `auto`, so a failed connection cannot silently fall back to memory.
3. Populate `DB_HOST` and `DB_PORT` from the provider's public-connection endpoint metadata.
4. Populate `DB_USER` with the provider-issued username.
5. Populate `DB_PASSWORD` from a provider-generated password.
6. Populate `DB_NAME` with the database name created at the provider.
7. Keep `DB_AUTO_SETUP` disabled and import `database/schema.sql` manually only after approval, because it drops tables.
8. If the provider requires TLS, set `DB_SSL=true` and, where needed, `DB_SSL_CA` from provider metadata. Keep `DB_SSL=false` otherwise.
9. Never commit `.env`. Never print or store real credential values in documentation.

## 5. Stop conditions — action required from you

Work stops before any of the following:

1. Creating or verifying a provider account, organisation or SSO login.
2. Creating the hosted cluster/database, selecting region/provider, or creating a DB user and password.
3. Receiving, entering or storing `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` or CA/TLS material.
4. Adding IP allowlist rules or determining whether Render free outbound IPs are compatible.
5. Enabling TLS in a real environment, or adding connection-lifetime handling to the code.
6. Importing `database/schema.sql` into a hosted database.
7. Raising spending limits, adding a card or upgrading any plan.
8. Editing Render environment variables, switching production off memory mode, or redeploying.
