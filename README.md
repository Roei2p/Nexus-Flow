# Nexus-Flow

n8n operations console + autonomous workflow builder, running locally on Docker.

```
http://localhost:3000   Nexus-Flow dashboard + API  (build / validate / dry-run / deploy)
http://localhost:5678   n8n 2.39.7                 (workflow engine)
```

## Quick start

The bring-up scripts sit next to `docker-compose.yml`, one level **above** this
repo (`C:\AI\8n8\`), because that is where the compose file and the `env` secrets live:

```powershell
cd C:\AI\8n8
up.cmd           # build + start + wait for health
up.cmd -Test     # ...then run the verification suites
up.cmd -Logs     # follow logs
up.cmd -Down     # stop
```

`up.cmd` wraps `up.ps1` with `-ExecutionPolicy Bypass` for that single process, so it
runs on machines where PowerShell's execution policy blocks `.\up.ps1` directly, without
touching any machine-wide policy. `.\up.ps1 <args>` still works wherever the policy
already allows it, and both forward every argument identically.

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
node builder/test-simulate.mjs # validate + dry-run every shipped workflow
node builder/test-plan.mjs     # "customer request -> workflow" suite
```

Re-scraping the node catalog has to happen **inside** the n8n container, because it
reads the installed `n8n-nodes-base` package directly:

```powershell
docker cp builder/catalog.mjs 8n8-n8n-1:/tmp/catalog.mjs
docker exec 8n8-n8n-1 node /tmp/catalog.mjs
docker cp 8n8-n8n-1:/tmp/catalog-index.json builder/data/catalog-index.json
docker cp 8n8-n8n-1:/tmp/catalog-full.json  builder/data/catalog-full.json
```

Do this after every n8n upgrade: the catalog has to match the installed node
descriptions or `validate.mjs` will accept types/parameter values that n8n rejects,
or reject ones it would accept.

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
