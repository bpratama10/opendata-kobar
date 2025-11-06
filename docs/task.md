# 🧩 Task: Implement Central Priority Data Management Module

## 🎯 Objective
Introduce a new feature allowing admins and coordinators to **delegate** "priority datasets" (defined by central government) to specific ORGs, and allow producers to **claim** unassigned priority datasets.  
These datasets integrate seamlessly into each organization’s dataset management page with a **“Priority Data” badge**.

---

## 📁 Database Changes

### 1. New Table: `priority_datasets`
- **Purpose:** Store the list of centrally-defined priority datasets.
- **Seed:** Manually inserted via SQL or bulk import.

| Field | Type | Description |
|-------|------|--------------|
| id | UUID / SERIAL | Primary key |
| code | VARCHAR | Data code prefix, e.g. `6201.01` |
| name | TEXT | Dataset name |
| operational_definition | TEXT | Operational definition |
| data_type | VARCHAR | e.g. Statistik Dasar, Tematik, Administratif |
| proposing_agency | VARCHAR | Central or proposing institution |
| producing_agency | VARCHAR | Institution expected to produce the data |
| source_reference | TEXT | Source document or national reference |
| data_depth_level | VARCHAR | e.g. Kabupaten/Kecamatan/Desa |
| update_schedule | VARCHAR | e.g. Quarterly, Annual |
| assigned_org | UUID (FK → org_organizations.id) | Nullable, ORG assigned or claimed |
| status | ENUM(`unassigned`, `claimed`, `assigned`) | Tracks progress |
| assigned_by | UUID (FK → users.id) | Admin or coordinator who delegated |
| assigned_at | TIMESTAMP | When the dataset was assigned |
| claimed_by | UUID (FK → users.id) | Producer who claimed the dataset |
| claimed_at | TIMESTAMP | When dataset was claimed |
| created_at | TIMESTAMP | Default now() |
| updated_at | TIMESTAMP | Default now() |

### 2. Existing Table Updates
- `catalog_metadata`:  
  - Add field `is_priority` (BOOLEAN, default: false)
  - If dataset originated from `priority_datasets`, link via `priority_dataset_id`

---

## 🧠 Core Logic

### 1. Assignment Workflow (Admin / Coordinator)
- View the list of all **unassigned priority datasets**.
- Assign one dataset to a specific ORG.
- Once assigned:
  - `assigned_org`, `assigned_by`, and `assigned_at` are recorded.
  - `status` updates to `assigned`.
  - A corresponding entry is **created or linked** in `catalog_metadata` with `is_priority = true`.

### 2. Claim Workflow (Producer)
- Producers can view **unclaimed datasets** in a “Priority Data” tab.
- They can **claim** a dataset if:
  - It has no existing `assigned_org`.
  - Their ORG is eligible (logic to be defined if needed).
- After claim:
  - `status` → `claimed`
  - `assigned_org` → producer’s org
  - `claimed_by` and `claimed_at` are recorded.
  - The dataset appears in their Data Management view with `is_priority = true`.

---

## 🔐 Role-Based Permissions

| Role | Permissions |
|------|--------------|
| **Admin** | Full access: create/edit/delete priority datasets, assign to ORG |
| **Coordinator** | Same as Admin but read-only on central schema config |
| **Walidata** | View all datasets, read-only for assignments |
| **Producer** | View unassigned datasets, claim if available |

---

## 🖥️ UI / UX Requirements

### 1. Admin / Coordinator View
- Menu item: **Priority Data (Central)**
- Table columns:
  - Code, Name, Data Type, Assigned ORG, Status, Last Updated
- Actions:
  - “Assign to ORG” button (dropdown list of org_organizations)
  - “Edit Metadata” (optional)
  - “View Claim Logs”

### 2. Producer View
- Tab in Dataset Management: **Priority Data**
- List unassigned datasets available for claim.
- Button: **Claim Dataset**
- Once claimed, the dataset appears in their regular “My Datasets” view with a **badge**:
  - Example badge: `<Badge variant="destructive">Priority Data</Badge>`

### 3. Shared Components
- Badge system in dataset list / detail view:
  ```tsx
  {is_priority && <Badge variant="destructive">Priority Data</Badge>}

### 🧾 Logging & Audit Trail 
Table: priority_dataset_logs

| Field               | Type                                          | Description              |
| ------------------- | --------------------------------------------- | ------------------------ |
| id                  | SERIAL                                        | Primary key              |
| priority_dataset_id | FK                                            | Reference to dataset     |
| action              | ENUM(`assign`, `claim`, `update`, `unassign`) |                          |
| actor_id            | FK → users.id                                 | Who did the action       |
| org_id              | FK → org_organizations.id                     | Related ORG              |
| timestamp           | TIMESTAMP                                     | When action occurred     |
| notes               | TEXT                                          | Optional notes or reason |


🧩 Suggested File / Folder Locations
/src/
 ├─ components/
 │   ├─ admin/PriorityDataTable.tsx
 │   └─ producer/PriorityClaimList.tsx
 ├─ pages/
 │   ├─ admin/priority-data.tsx
 │   └─ producer/priority-data.tsx
 ├─ lib/
 │   ├─ priority.ts (CRUD functions)
 │   └─ logger.ts
 ├─ db/
 │   └─ migrations/priority_datasets.sql

 Note: Keep is_priority datasets unified under the same management flow as normal datasets for better UX — the badge is enough differentiation.