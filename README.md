# Cloudflare Worker Template

A minimal Cloudflare Workers template using [Hono](https://hono.dev/) and TypeScript.

## Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono
- **Language**: TypeScript
- **Test**: Vitest + `@cloudflare/vitest-pool-workers`
- **Linter/Formatter**: Biome

## Getting Started

```bash
bun install
bun run dev
```

## Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start local dev server |
| `bun run deploy` | Deploy to Cloudflare Workers |
| `bun run test` | Run tests |
| `bun run check` | Lint and format check |
| `bun run check:fix` | Auto-fix lint and format issues |
| `bun run cf-typegen` | Generate Cloudflare binding types |

## Project Structure

```
src/
  index.ts   # Entry point
wrangler.jsonc # Wrangler configuration
```

## Configuration

Edit [wrangler.jsonc](wrangler.jsonc) to configure:

- Environment variables (`vars`)
- Secrets (`secrets`)
- Bindings (KV, R2, D1, AI, etc.)
- Static assets
- Service bindings
