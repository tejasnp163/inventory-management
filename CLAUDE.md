# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Factory Inventory Management System — full-stack demo with Vue 3 frontend, Python FastAPI backend, and in-memory JSON mock data (no database).

## Critical Tool Usage Rules

### Subagents
- **vue-expert**: **MANDATORY** for creating or significantly modifying any `.vue` file
- **code-reviewer**: Use after writing significant code
- **Explore**: Use for codebase structure searches and cross-file questions
- **general-purpose**: Use for complex multi-step tasks

### Skills
- **backend-api-test**: Use when writing or modifying tests in `tests/backend/`

### MCP Tools
- **ALWAYS use GitHub MCP tools** (`mcp__github__*`) for ALL GitHub operations
  - Exception: Local branch creation — use `git checkout -b` instead
- **ALWAYS use Playwright MCP tools** (`mcp__playwright__*`) for browser testing
  - Frontend: `http://localhost:3000` | API: `http://localhost:8001`

## Development Commands

```bash
# Start both servers (convenience script)
./scripts/start.sh

# Stop both servers
./scripts/stop.sh

# Backend (manual)
cd server && uv run python main.py

# Frontend (manual)
cd client && node_modules/.bin/vite --port 3000

# Run all backend tests
cd tests/backend && uv run --project ../../server pytest

# Run a single test file
cd tests/backend && uv run --project ../../server pytest test_inventory.py

# Run a single test
cd tests/backend && uv run --project ../../server pytest test_dashboard.py::TestDashboardEndpoints::test_get_dashboard_summary

# Run tests with coverage
cd tests/backend && uv run --project ../../server pytest --cov=../../server
```

## Architecture

### Data Flow
```
useFilters() composable (refs: selectedPeriod, selectedLocation, selectedCategory, selectedStatus)
  → api.js (Axios + URLSearchParams → http://localhost:8001/api)
  → FastAPI endpoint (query param filtering via Python list comprehensions)
  → mock_data.py (JSON loaded into memory at startup)
  → Pydantic model validation
  → Vue computed properties → template
```

### Filter System
Four global filters live in `client/src/composables/useFilters.js` and are shared across all views:

| Filter | Query Param | Values |
|--------|-------------|--------|
| Time Period | `month` | `"2025-01"` … `"2025-12"`, or omit for all |
| Warehouse | `warehouse` | `"Tokyo"`, `"Osaka"`, `"Nagoya"`, `"all"` |
| Category | `category` | `"Electronics"`, `"Power Supplies"`, etc. |
| Order Status | `status` | `"Pending"`, `"Shipped"`, `"Delivered"`, `"Cancelled"` |

Inventory endpoints do **not** support `month` (no time dimension on stock).

### Frontend Structure
- **`client/src/views/`** — 7 page-level components (Dashboard, Inventory, Orders, Demand, Spending, Reports, Backlog)
- **`client/src/components/`** — 9 reusable components, mostly row-detail modals (`*DetailModal.vue`)
- **`client/src/composables/`** — `useFilters.js` (global filter state), `useAuth.js` (mock user/tasks), `useI18n.js` (translation)
- **`client/src/locales/`** — `en.js` and `ja.js` translation objects; language toggle via `LanguageSwitcher.vue`
- **`client/src/api.js`** — all Axios calls; also exposes task CRUD and purchase order helpers
- **`client/src/App.vue`** — root layout: nav, `FilterBar`, `RouterView`, modals, and task management

Reactivity pattern: raw data in `ref()` (`allOrders`, `inventoryItems`), derived metrics in `computed()`.

### Backend Structure
- **`server/main.py`** — single file with all 11 endpoints, Pydantic models, and filter helpers
- **`server/mock_data.py`** — loads all JSON files from `server/data/` into module-level variables at import time
- **`server/data/`** — 7 JSON files: `inventory.json`, `orders.json`, `demand_forecasts.json`, `backlog_items.json`, `spending.json`, `transactions.json`, `purchase_orders.json`

CORS is open to all origins (development only).

## API Endpoints

| Endpoint | Filter params |
|----------|--------------|
| `GET /api/inventory` | `warehouse`, `category` |
| `GET /api/orders` | `warehouse`, `category`, `status`, `month` |
| `GET /api/dashboard/summary` | `warehouse`, `category`, `status`, `month` |
| `GET /api/spending/{summary\|monthly\|categories\|transactions}` | none |
| `GET /api/demand` | none |
| `GET /api/backlog` | none |
| `GET /api/reports/{quarterly\|monthly-trends}` | none |

## Tests

51 backend tests using pytest + FastAPI `TestClient`. Fixtures in `tests/backend/conftest.py`. No frontend tests.

## Common Pitfalls
1. Use unique keys in `v-for` — prefer `sku`, `month`, `order_id` over array index
2. Validate dates before calling `.getMonth()` — raw JSON dates can be strings or null
3. Update the matching Pydantic model in `main.py` whenever changing a JSON data structure
4. Revenue goals: $800K/month (single month filter), $9.6M YTD (all months)

## Design System
- Colors: slate/gray (`#0f172a`, `#64748b`, `#e2e8f0`)
- Status colors: green / blue / yellow / red
- Charts: custom SVG (no chart library), CSS Grid layouts
- No emojis in UI
