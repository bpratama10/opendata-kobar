# Assessment of SPLP Integration Readiness for OpenData Kobar

## 1. Executive Summary
This document provides an assessment of the OpenData Kobar application's readiness to integrate with the **Sistem Penghubung Layanan Pemerintah (SPLP)** managed by the Ministry of Communication and Digital (Komdigi). 

SPLP serves as the national API Gateway and Enterprise Service Bus (ESB), facilitating secure data interoperability between government institutions under the *Sistem Pemerintahan Berbasis Elektronik* (SPBE) framework.

**Conclusion:** The application possesses a solid technical foundation, particularly in its security implementation. However, it requires several critical structural and documentation revisions before it can be submitted and successfully approved for SPLP integration.

---

## 2. Strengths (Current Implementation)
The current architecture (utilizing Supabase Edge Functions for the `public-api`) aligns well with modern development practices and meets several baseline SPLP requirements:

*   **Dedicated API Service:** The `supabase/functions/public-api/index.ts` is explicitly built to serve external data requests.
*   **Authentication & Security:** The implementation of an `x-api-key` validation system (with hashed keys stored in the database and active rate limiting) is excellent. It meets the strict security access controls required by the SPLP gateway.
*   **Data Format:** The API returns JSON, which is the required standard data interchange format.
*   **Metadata Structure:** The database schema (`catalog_metadata`, `catalog_resources`, `tags`, etc.) fundamentally supports the structural requirements of *Satu Data Indonesia* (SDI).

---

## 3. Required Revisions (Action Plan)

To meet the strict governance and interoperability standards of SPLP, the development team must address the following gaps prior to submission.

### A. Missing API Documentation (OpenAPI / Swagger) — *Critical*
*   **The Issue:** SPLP strictly requires comprehensive API documentation, universally submitted as an OpenAPI Specification (OAS) `.yaml` or `.json` file. The SPLP team relies on this document to automatically register, map, and expose our API through their centralized API Gateway. Currently, the project lacks this documentation.
*   **Action Items:** Create an `openapi.yaml` (OpenAPI v3.0+) that thoroughly describes the `public-api` endpoints, expected parameters, `x-api-key` header requirements, and the exact JSON schema of responses.
*   **Example (Snippet of OpenAPI spec for our Datasets):**
    ```yaml
    openapi: 3.0.0
    info:
      title: OpenData Kobar Public API
      version: 1.0.0
    paths:
      /public-api/datasets:
        get:
          summary: Get all public datasets
          security:
            - ApiKeyAuth: []
          responses:
            '200':
              description: Successful response
    components:
      securitySchemes:
        ApiKeyAuth:
          type: apiKey
          in: header
          name: x-api-key
    ```
*   **Reference:** [OpenAPI Specification Documentation](https://swagger.io/specification/)

### B. Non-RESTful Endpoint Design — *Moderate*
*   **The Issue:** The current Edge Function acts as a monolithic endpoint, using query parameters to determine route logic (e.g., `?endpoint=datasets` vs `?endpoint=dataset&id=xxx`). While technically functional, enterprise service buses like SPLP expect standard RESTful path-based routing.
*   **Action Items:** Refactor the Deno Edge Function to parse the URL path, transforming it into a strict RESTful architecture. (e.g., using `URLPattern` or a lightweight router like `Hono`).
    *   *Current:* `GET /public-api?endpoint=dataset&id=123`
    *   *Target:* `GET /public-api/datasets/123`
*   **Reference:** REST Architectural Style (Representational State Transfer).

### C. Standardized Response Envelope — *Recommended*
*   **The Issue:** Currently, the API returns the raw data array or object directly (e.g., `return new Response(JSON.stringify(response))`). 
*   **Action Items:** SPLP integration is smoother if the API uses a standardized response envelope. This ensures consumer systems can reliably parse metadata, pagination, errors, and success states uniformly.
*   **Example Envelope (JSend inspired):**
    ```json
    {
      "status": "success",
      "code": 200,
      "message": "Datasets retrieved successfully",
      "data": [
        { "id": "...", "title": "..." }
      ]
    }
    ```
*   **Reference:** [JSend Specification](https://github.com/omniti-labs/jsend) or generally accepted JSON:API standards.

### D. Interoperability & Satu Data Indonesia (SDI) Compliance
*   **The Issue:** Because this is an Open Data portal, Komdigi will evaluate if the data payload conforms to *Satu Data Indonesia* (SDI) metadata standards.
*   **Action Items:** Ensure that the JSON output properties map clearly to SDI's mandatory fields. While `classification_code` and `publisher_org_id` are good, the API might need to output standardized Indonesian terminology (e.g., *Kode Wilayah*, *Penyelenggara*, *Sifat Data*) as dictated by SDI policy.
*   **Reference:** Perpres No. 39 Tahun 2019 tentang Satu Data Indonesia.

---

## 4. Next Steps for the Team
1.  **Backend/API Team:** Refactor `supabase/functions/public-api/index.ts` to support RESTful paths.
2.  **Backend/API Team:** Draft the `openapi.yaml` file mapping out the newly refactored endpoints.
3.  **Data/Governance Team:** Review the JSON output of the API against Perpres 39/2019 to ensure all required metadata fields are present.
4.  **Admin/Ops Team:** Provision a permanent, non-expiring `x-api-key` dedicated solely for the Komdigi SPLP Gateway integration.

---

## 5. Source Documents & Government References
*   **Perpres No. 95 Tahun 2018 tentang Sistem Pemerintahan Berbasis Elektronik (SPBE):** The foundational regulation mandating data integration across government via SPLP.
*   **Perpres No. 39 Tahun 2019 tentang Satu Data Indonesia (SDI):** Defines the metadata standards and data governance rules that open data portals must follow.
*   **Arsitektur SPBE Nasional:** Guidelines on technical interoperability, security standards (such as API Gateways and Keys), and data exchange formats within the Indonesian government ecosystem.
