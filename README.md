# Notion to Google Chat Relay

Automatically forward Notion webhook events to Google Chat spaces with beautifully formatted cards — powered by Google Chat's incoming webhooks.

**🚀 Hosted instance (recommended): <https://notion-to-google-chat-relay.influ.workers.dev/>**

Built on [Cloudflare Workers](https://workers.cloudflare.com/) with [Hono](https://hono.dev/). The Google Chat version of [notion-to-discord-bot](https://github.com/nakanoasaservice/notion-to-discord-bot).

## How it works

```
Notion database automation ──▶ this worker ──▶ Google Chat incoming webhook
      (Send webhook)          (formats card)      (posts to your space)
```

You paste your Google Chat webhook URL into the generator page. It extracts the space ID, key, and token and produces a worker URL like:

```
https://<worker-host>/{SPACE_ID}?key={KEY}&token={TOKEN}&title={OPTIONAL_TITLE}
```

Set that URL as a "Send webhook" action in a Notion database automation. Every triggered event is posted to your space as a card showing all page properties, with an "Open in Notion" button.

## Quick Start

1. **Create a Google Chat webhook**: In Google Chat, open your space → click the space name → **Apps & integrations** → **Webhooks** → **Add webhook** → name it → copy the webhook URL.
   (Incoming webhooks require a Google Workspace account.)
2. **Generate your URL**: Open the [generator page](https://notion-to-google-chat-relay.influ.workers.dev/), paste the webhook URL, and optionally set a card title.
3. **Configure Notion**: In your Notion database, go to **Settings → Automations → New action → Send webhook**, and paste the generated URL.

> [!WARNING]
> The generated URL contains your webhook's `key` and `token` — anyone who has it can post to your space. Treat it as a secret, exactly like the Google Chat webhook URL itself.

## URL as Configuration

There is no database and no server-side state. Everything is encoded in the URL:

| Part | Where | Description |
|---|---|---|
| `{SPACE_ID}` | path | Google Chat space ID from the webhook URL |
| `key` | query | API key from the webhook URL |
| `token` | query | Webhook token from the webhook URL |
| `title` | query | Optional card header title |

Opening a generated URL in the browser pre-fills the generator form again — the URL *is* the settings page.

## Supported Notion properties

Title, rich text, URL, select, multi-select, date, checkbox, email, phone, number, status, created/edited time & by, unique ID, relation, people, formula, files, rollup, verification, button, and place.

## Self-hosting

For most users the [hosted instance](https://notion-to-google-chat-relay.influ.workers.dev/) is all you need. If you prefer to run your own private instance, click the button below — Cloudflare will deploy it to your own Cloudflare Workers account in just a few clicks:

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fnakanoasaservice%2Fnotion-to-google-chat-relay)

Or deploy manually:

```bash
git clone https://github.com/nakanoasaservice/notion-to-google-chat-relay.git
cd notion-to-google-chat-relay
bun install
bun run deploy
```

No secrets are needed — authentication lives entirely in the webhook URL.

## Development

| Command | Description |
|---------|-------------|
| `bun run dev` | Start Vite dev server (worker + UI) |
| `bun run build` | Build worker + static assets |
| `bun run preview` | Build and preview locally |
| `bun run deploy` | Build and deploy to Cloudflare Workers |
| `bun run test` | Run tests |
| `bun run check` | Lint and format check |
| `bun run check:fix` | Auto-fix lint and format issues |
| `bun run check-types` | Type check |
| `bun run cf-typegen` | Generate Cloudflare binding types |

## Known limitations

- Google Chat messages are limited to 32,000 bytes; pages with very large property values may fail to send (the error is logged in Workers Logs).
- Incoming webhooks are rate-limited to about 1 request per second per space.
- Webhook messages are one-way; interactive card actions other than link buttons are not supported.
