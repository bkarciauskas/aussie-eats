# AussieEats engineering docs

Operator-facing setup and demos live in the root [README](../README.md). This folder covers **how the app works** for developers.

| Doc | Use when |
| --- | --- |
| [Architecture](./architecture.md) | Understanding browse, location, cart, money, ETA, and orders |
| [Catalog ingest](./catalog-ingest.md) | Running or debugging `db:import-places` |
| [Cloud Agents](./cloud-agents.md) | Repo-managed `environment.json`, secrets (`MONGODB_URI`, `JWT_SECRET`), and `*.mongodb.net` egress |
| [Troubleshooting](./troubleshooting.md) | Common local pitfalls and regressions |

Product intent and original build brief: [spec.md](../spec.md) (historical; prefer code + these docs for current behavior).
