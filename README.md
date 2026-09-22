# Nexus-Flow

n8n operations console + autonomous workflow builder, running locally on Docker.

```
http://localhost:3000   Nexus-Flow dashboard + API  (build / validate / dry-run / deploy)
http://localhost:5678   n8n 2.39.7                 (workflow engine)
```

## Quick start

```powershell
.\up.ps1          # build + start + wait for health
.\up.ps1 -Test    # ...then run the verification suites
.\up.ps1 -Logs    # follow logs
.\up.ps1 -Down    # stop
```

Requirements: Docker Desktop running. Node 20+ only for the CLI suites (`node` alone,
no `npm install` anywhere - every script is dependency-free).

## Layout

| path | what |
|---|---|
| `server.js` | Express API: n8n proxy, event bus, WhatsApp channel proxy |
| `public/index.html` | dashboard - workflows, executions, inbound events |
| `automation/` | deploy + verify existing workflow JSON |
| `automation/workflows/*.json` | declarative n8n workflows (source of truth) |
| `builder/` | request -> workflow compiler (LLM + validator + dry-run) |
| `builder/data/catalog-*.json` | node descriptions scraped from **this** n8n install |
| `Dockerfile` | multi-stage, non-root, healthcheck |

## Commands

```powershell
node automation/deploy.mjs    # push automation/workflows/*.json to n8n and activate
node automation/run.mjs       # 9-check end-to-end suite
node builder/test-greenapi.mjs # WhatsApp channel suite (sends to own number)
node builder/test-plan.mjs     # "customer request -> workflow" suite
node builder/catalog.mjs       # re-scrape node catalog (run inside container)
```

## Configuration

Copy values into `.env` (read by docker compose). **Never commit it.**

```dotenv
DASH_PORT=3000
N8N_URL=http://n8n:5678
N8N_API_KEY=<n8n public API key>

# Green API - WhatsApp gateway. Path-authenticated, so it is held ONLY by
# Nexus and never written into an n8n workflow.
idInstance=...
apiTokenInstance=...
GREENAPI_BASE=https://api.greenapi.com

# Optional LLM key for the autonomous builder (any one of these)
#NVIDIA_API_KEY=...
#OPENAI_API_KEY=...
#ANTHROPIC_API_KEY=...
#NEXUS_LLM_MODEL=...
```

## Design rules

1. **Secrets stay in Nexus.** Green API authenticates via URL path, so the token
   cannot be a header. n8n posts to `POST /api/channels/whatsapp/send` and Nexus
   attaches credentials. Workflows are safe to export.
2. **Catalog-driven generation.** The builder only ever emits node types and
   `typeVersion` values present in `builder/data/catalog-index.json`, which is
   scraped from the running instance - nothing is guessed.
3. **Nothing deploys unvalidated.** `builder/validate.mjs` checks types, versions,
   parameters, options, required fields, triggers, reachability and cycles.
4. **Dry-run before live.** `builder/simulate.mjs` walks the graph in-process and
   stubs every side effect, proving logic without sending anything.

## API

```
GET  /healthz
GET  /api/summary              workflows + executions + inbound events
GET  /api/workflows            proxy to n8n
POST /api/workflows/:id/activate|deactivate
GET  /api/events               event bus
POST /api/events               n8n -> Nexus sink
DELETE /api/events
GET  /api/channels             outbound channel status
POST /api/channels/whatsapp/send     {chatId|phone, message}
POST /api/channels/whatsapp/dry-run  validates, sends nothing
GET  /api/channels/whatsapp/status
```

WhatsApp `chatId` format: `1234567890@c.us` (person), `...@g.us` (group).

## Tests

- `automation/run.mjs` - service health, workflow activation, webhook flow,
  scheduled flow, execution history, dashboard summary.
- `builder/test-greenapi.mjs` - proxy config, token isolation, dry-run gate,
  live send to the instance's own number.

Both exit non-zero on failure, so they are CI-ready.
