# 🧭 Task: Standardize Indicator Dataset & Visualization Logic

## 🎯 Goal
Ensure that the dataset structure and visualization logic in the Open Data Portal produce **meaningful charts** — especially for **time-based indicators** such as "Jumlah TTE Terbit".

---

## ✅ Data Structure Tasks

- [ ] **Adopt a standardized “long format” for indicator datasets**, with the following structure example, look into datasets/a61ed2cc-be05-4a35-ac6e-6f802ed8a2a7/tables for a refrence:
  | indicator_id | indicator_name | year | value | unit | notes |
  |---------------|----------------|------|--------|------|-------|
  | 1 | Jumlah TTE Terbit | 2022 | 79 | Rekaman |  |
  | 1 | Jumlah TTE Terbit | 2023 | 172 | Rekaman |  |
  | 1 | Jumlah TTE Terbit | 2024 | 265 | Rekaman |  |

- [ ] Each row must represent **total value for a given year** (not cumulative or partial values).
- [ ] Use consistent **units**, **definitions**, and **aggregation methods** across years.
- [ ] Add metadata fields in `catalog_metadata` or `catalog_resources`:
  - [ ] `indicator_title`
  - [ ] `unit`
  - [ ] `frequency` (e.g., Tahunan, Triwulanan)
  - [ ] `aggregation_method` (e.g., Total per tahun)
  - [ ] `time_dimension` (e.g., year)
  - [ ] `chart_type` (e.g., line, area, KPI)
  - [ ] `interpretation` (optional description)

---

## 📊 Visualization Logic Tasks

- [ ] Replace **bar chart** for single-indicator datasets with more meaningful visuals:
  - [ ] **Line chart** → emphasize growth over time.
  - [ ] **Area chart** → show cumulative progression.
  - [ ] **Slope chart** → show start vs end comparison.
  - [ ] **KPI summary card** → highlight latest value and YoY change.

- [ ] Disable or hide **donut/distribution chart** if there’s only one indicator (not meaningful).
- [ ] Use **conditional rendering logic**:
  ```ts
  if (indicatorCount === 1) {
    renderLineChart(data);
  } else {
    renderMultiSeriesChart(data);
  }


🧩 Schema Integration Tasks

  - [ ] Standardize how catalog_metadata references yearly indicator datasets.

  - [ ] Add logic in data ingestion to normalize wide → long format.

  - [ ] Tag datasets with "is_timeseries": true to trigger trend charts automatically.

  - [ ] Validate data consistency before visualization:

  - [ ] Check for missing years.

  - [ ] Check for mixed cumulative/annual totals.

🧠 Optional Enhancements

  - [ ] Add a metadata-based visualization switcher:

 -If chart_type = "line", render line chart.

 -If chart_type = "kpi", render summary card.

 -If multiple indicators, render grouped bar or multi-line.

  - [ ] Add small sparkline mini-charts in dataset cards to preview 3-year trend.

  - [ ] Implement a growth badge (+54%, -10%) next to latest value.

🧾 Expected Output

 - A consistent system where:

 - Every yearly dataset has comparable totals.

 - Visualization auto-selects the most meaningful chart type.

 - Users understand not just numbers, but trends and growth.