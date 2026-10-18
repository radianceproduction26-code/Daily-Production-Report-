# Radiance Polymers - Live Production Reporting Backend & Online Database

This backend serves as the centralized live database and REST API for the **Radiance Polymers Digital Production Reporting System**. It eliminates reliance on isolated browser memory and provides a single real-time source of truth for the shop floor.

---

## 🏗️ Architecture & Database Structure

The backend uses **Node.js 24 + Express + Native SQLite (WAL Mode)** with zero external database server setup required. It can also connect to any online **PostgreSQL / Supabase** instance via `DATABASE_URL`.

### Data Models & Schemas

| Table | Purpose | Key Fields |
|---|---|---|
| **`users`** | Authentication & Roles | `id`, `full_name`, `email`, `role`, `pin_code` (default: 2026), `badge_id` |
| **`system_rules`** | Factory Rules & Tolerances | `key`, `value` (JSON), `description` (Shot tolerance: 3%, Material: 5%) |
| **`machines`** | Fleet Master (MC01..MC14) | `id`, `machine_number`, `machine_name`, `tonnage`, `capacity_ton` |
| **`moulds`** | Tooling Catalog | `id`, `mould_number`, `mould_name`, `cavity_count`, `clamping_ton_required` |
| **`parts`** | Manufactured Components | `id`, `part_number`, `part_name`, `standard_cycle_time_seconds`, `cavity_count`, `part_weight_grams`, `runner_weight_grams` |
| **`machine_part_mappings`** | Machine Allocations | `id`, `machine_number`, `part_number`, `mould_number` |
| **`bom_materials`** | BOM & Resins Master | `id`, `material_code`, `material_name`, `material_type` (Virgin, Masterbatch), `grade`, `price` |
| **`rejection_codes`** | Defect Codes (A..Q) | `code`, `description_en`, `description_hi`, `category` |
| **`downtime_codes`** | Stoppage Codes (DT-401..409)| `code`, `description_en`, `description_hi`, `category` |
| **`shift_reports`** | Consolidated Shift Ledgers | `id`, `report_date`, `shift`, `machine_number`, `operator_name`, `supervisor_name`, `lumps_generated_kg`, `status`, `full_data` |
| **`hourly_entries`** | Production Hourly Logs | `id`, `report_id`, `hour_index`, `production_qty`, `rejection_qty`, `accepted_qty`, `downtime_minutes`, **`lumps_kg`** |
| **`audit_logs`** | Immutable Audit Trail | `id`, `timestamp`, `user_id`, `user_name`, `action`, `table_name`, `record_id`, `old_value`, `new_value`, `reason` |

---

## ⚡ Quick Start

### 1. Run the Backend Locally
From the `backend/` directory:

```bash
npm install
npm start
```

Server starts immediately on **`http://localhost:5000`** and listens across factory LAN at **`http://0.0.0.0:5000`**.

### 2. Connect the React App
The React Vite app already includes a pre-configured proxy in `vite.config.js`:
All requests from the browser to `/api/*` automatically route to `http://localhost:5000`.

---

## 📡 Live REST API Endpoints

### Health & Metadata
- `GET /api/health` — Service health & database row counts
- `GET /api/metadata` — Complete bundle of machines, parts, moulds, BOM, defect codes, and users

### Authentication & Users
- `POST /api/auth/login` — Authenticate via PIN code (default: `2026`) or email
- `GET /api/users` — Active factory personnel roster

### Rules, BOM & Masters
- `GET /api/rules` / `PUT /api/rules` — View and edit factory tolerances
- `GET /api/bom` — Bill of materials (PP 575P, ABS, Masterbatches)
- `GET /api/parts` / `POST /api/parts/bulk` — Parts catalog and bulk Excel imports

### Shift Reports & Hourly Production
- `GET /api/reports` — List shift reports (supports `?machine=MC03`, `?status=submitted`, `?date=YYYY-MM-DD`)
- `GET /api/reports/:id` — Full report detail
- `POST /api/reports` — Create or autosave draft report
- `POST /api/reports/:id/submit` — Submit shift report with total lumps
- `POST /api/reports/:id/approve` — Supervisor sign-off
- `DELETE /api/reports/:id` — Delete shift report

### Audit Trail
- `GET /api/audit-logs` — Immutable audit records
- `POST /api/audit-logs` — Record audit event
