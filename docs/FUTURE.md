# Future Vision & Enhancements

This document outlines potential future directions, feature enhancements, and architectural improvements for the Open Data Platform. The goal is to evolve the platform into a more powerful, user-friendly, and community-driven resource.

---

## I. Advanced Data Discovery

The current discovery features are good, but to become a top-tier open data portal, we need to empower users to find relevant data with greater precision and context.

### 1. Proposal: Faceted Search

-   **Problem**: Users can only search by text. They cannot progressively refine their search results based on metadata like the publishing organization, file formats, tags, or update frequency.
-   **Suggestion**: Implement a faceted search interface, common in e-commerce and data portals.
    -   On the search results page, a sidebar would show filters for key metadata fields (e.g., "Organization", "Tags", "Format").
    -   Each filter value would display a count of matching datasets.
    -   Selecting a filter would instantly narrow the results.
-   **Potential Implementation**:
    -   The backend would need an aggregation query to efficiently calculate the counts for each facet.
    -   The frontend would manage filter state in the URL (`/search?q=health&organization=ministry-of-health`), allowing search results to be shared.

### 2. Proposal: Geospatial (Map-Based) Search

-   **Problem**: Many datasets are location-specific, but there is no way to discover them geographically.
-   **Suggestion**: Add a map-based search feature.
    -   Allow data producers to associate a geographic area (a point, polygon, or bounding box) with a dataset.
    -   Provide a map interface where users can draw a shape to find all datasets that intersect with that area.
-   **Potential Implementation**:
    -   Use a library like **Leaflet** or **Mapbox** on the frontend.
    -   Store geographic data in Supabase using the **PostGIS** extension, which enables efficient spatial queries.

---

## II. Richer Data Interaction & Visualization

Moving beyond simple data downloads will dramatically increase the platform's value and user engagement.

### 1. Proposal: Automated In-Browser Data Visualization

-   **Problem**: Users must download a file and use external tools (like Excel) to understand the data. This is a significant barrier to quick insights.
-   **Suggestion**: For `TABLE` resources, automatically generate basic charts directly on the dataset detail page.
    -   Add a "Visualize" tab next to the data grid preview.
    -   Allow users to select columns for the X and Y axes to generate simple bar, line, or pie charts.
-   **Potential Implementation**:
    -   Integrate a lightweight charting library like **Chart.js**, **Recharts**, or **Visx**.
    -   The visualization component would consume the same data as the `DataEntryGrid`.

### 2. Proposal: Public API & Developer Portal

-   **Problem**: The platform is primarily for human interaction. There is no clear path for developers to programmatically access data, which limits integrations and innovation.
-   **Suggestion**: Create a formal, public-facing API.
    -   **API Key Management**: Allow authenticated users to generate API keys to access data.
    -   **Developer Portal**: A dedicated section with interactive API documentation (using **Swagger/OpenAPI**), tutorials, and code examples.
    -   **Usage-Based Rate Limiting**: Protect the backend from abuse by implementing rate limiting on API keys.
-   **Potential Implementation**:
    -   Supabase can be configured to expose a RESTful API, but a dedicated API gateway (like **PostgREST** with custom middleware or a separate Node.js service) could provide more control over authentication and rate limiting.

---

## III. Enhancing Data Quality & Community Trust

An open data portal is only as good as the data it contains. Fostering trust and improving data quality should be a primary long-term goal.

### 1. Proposal: User Feedback and Data Quality Reporting

-   **Problem**: The platform is a one-way street; users can consume data but cannot provide feedback on its quality or relevance.
-   **Suggestion**: Add features for community engagement on each dataset page.
    -   A comments/discussion section.
    -   A simple "Flag an issue" button that allows users to report problems like missing data, incorrect values, or outdated information. This would create a ticket for the data producer.
-   **Potential Implementation**:
    -   Create new tables (`dataset_comments`, `quality_reports`) with RLS policies to manage submissions.
    -   Integrate a notification system to alert data producers when their datasets receive feedback.

### 2. Proposal: Data Lineage Tracking

-   **Problem**: Users cannot see the history or origin of a dataset, which can make them hesitant to trust it for critical applications.
-   **Suggestion**: Add a metadata section for "Data Lineage".
    -   This would be a simple text field or a structured log where producers can describe where the data came from and what transformations have been applied to it.
-   **Potential Implementation**:
    -   Add a `lineage_info` (TEXT or JSONB) column to the `catalog_metadata` table.

---

## IV. Performance & Scalability at Scale

The current architecture works well but will face challenges as the amount of data grows.

### 1. Proposal: Virtualization for Data Grids and Lists

-   **Problem**: The admin data tables and public dataset lists likely render all items returned from the API. This will become slow and unresponsive with thousands of rows.
-   **Suggestion**: Implement "windowing" or "virtualization".
    -   This technique only renders the items currently visible in the viewport, drastically improving performance for long lists.
-   **Potential Implementation**:
    -   Use a library like **TanStack Virtual** to virtualize both the main data entry grid and any long lists of datasets or admin items.

### 2. Proposal: Server-Side Pagination and Filtering

-   **Problem**: The application likely fetches all data and filters/sorts on the client. This is not scalable.
-   **Suggestion**: Move all pagination, sorting, and filtering logic to the backend.
    -   The client will pass parameters (e.g., `page=2`, `sortBy=updated_at`, `filter=health`) to the API.
    -   The database will perform the filtering and return only the requested slice of data.
-   **Potential Implementation**:
    -   Update all data-fetching hooks (`useDatasets`, etc.) to accept pagination and filter arguments.
    -   Modify the Supabase queries to use `.range()` for pagination and additional `.eq()` or `.ilike()` clauses for filtering.
