import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const RATE_LIMITS = {
  requests: 100, // 100 requests
  window: 60,    // per 60 seconds
};

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

function checkRateLimit(keyId: string): boolean {
  const now = Date.now();
  const limit = RATE_LIMITS;
  
  let entry = rateLimitStore.get(keyId);
  
  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + limit.window * 1000 };
    rateLimitStore.set(keyId, entry);
    return true;
  }
  
  if (entry.count >= limit.requests) {
    return false;
  }
  
  entry.count++;
  rateLimitStore.set(keyId, entry);
  return true;
}

async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helpers for Data Mapping
function mapDatasetList(dbItem: any) {
  const themes = dbItem.catalog_dataset_themes
    ? dbItem.catalog_dataset_themes
        .map((t: any) => t.catalog_themes?.name)
        .filter(Boolean)
    : [];

  const tags = dbItem.catalog_dataset_tags
    ? dbItem.catalog_dataset_tags
        .map((t: any) => t.catalog_tags?.name)
        .filter(Boolean)
    : [];

  return {
    id: dbItem.id,
    title: dbItem.title,
    slug: dbItem.slug,
    abstract: dbItem.abstract || "",
    description: dbItem.description || "",
    created_at: dbItem.created_at,
    updated_at: dbItem.updated_at,
    classification_code: dbItem.classification_code || "PUBLIC",
    publication_status: dbItem.publication_status,
    publisher: dbItem.org_organizations ? {
      id: dbItem.org_organizations.id,
      name: dbItem.org_organizations.name,
      short_name: dbItem.org_organizations.short_name || ""
    } : null,
    themes,
    tags
  };
}

function mapDatasetDetail(dbItem: any) {
  const themes = dbItem.catalog_dataset_themes
    ? dbItem.catalog_dataset_themes
        .map((t: any) => t.catalog_themes?.name)
        .filter(Boolean)
    : [];

  const tags = dbItem.catalog_dataset_tags
    ? dbItem.catalog_dataset_tags
        .map((t: any) => t.catalog_tags?.name)
        .filter(Boolean)
    : [];

  const resources = dbItem.catalog_resources
    ? dbItem.catalog_resources.map((res: any) => {
        const distributions = res.catalog_distributions
          ? res.catalog_distributions.map((dist: any) => ({
              id: dist.id,
              media_type: dist.media_type || "Various",
              byte_size: dist.byte_size || 0,
              version: dist.version || "1.0.0"
            }))
          : [];
        return {
          id: res.id,
          name: res.name,
          resource_type: res.resource_type,
          description: res.description || "",
          distributions
        };
      })
    : [];

  return {
    id: dbItem.id,
    title: dbItem.title,
    slug: dbItem.slug,
    abstract: dbItem.abstract || "",
    description: dbItem.description || "",
    created_at: dbItem.created_at,
    updated_at: dbItem.updated_at,
    classification_code: dbItem.classification_code || "PUBLIC",
    publication_status: dbItem.publication_status,
    contact_email: dbItem.contact_email || "",
    language: dbItem.language || "id",
    version: dbItem.version || "1.0.0",
    publisher: dbItem.org_organizations ? {
      id: dbItem.org_organizations.id,
      name: dbItem.org_organizations.name,
      short_name: dbItem.org_organizations.short_name || ""
    } : null,
    themes,
    tags,
    resources
  };
}

// Response Envelopes
function sendSuccess(data: any, message = "Success", status = 200) {
  return new Response(
    JSON.stringify({
      status: "success",
      code: status,
      message,
      data
    }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function sendFail(message: string, code = 400) {
  return new Response(
    JSON.stringify({
      status: "fail",
      code,
      message
    }),
    { status: code, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function sendError(message: string, code = 500) {
  return new Response(
    JSON.stringify({
      status: "error",
      code,
      message
    }),
    { status: code, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Main Handler
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return sendFail('Method not allowed. Only GET requests are accepted.', 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const url = new URL(req.url);
    const apiKey = req.headers.get('x-api-key');

    // 1. Enforce API Key validation (No anonymous access)
    if (!apiKey) {
      return sendFail('Missing API key. Please provide a valid key in the "x-api-key" header.', 401);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const keyHash = await hashApiKey(apiKey);

    const { data: keyData, error: keyError } = await adminClient
      .from('api_keys')
      .select('*')
      .eq('key_hash', keyHash)
      .eq('is_active', true)
      .single();

    if (keyError || !keyData) {
      return sendFail('Invalid or inactive API key.', 401);
    }

    // Update last_used_at in the background (fire and forget)
    adminClient
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyData.id)
      .then(({ error }) => {
        if (error) console.error('Failed to update API key last_used_at:', error);
      });

    // 2. Check rate limit
    if (!checkRateLimit(keyData.id)) {
      return sendFail('Rate limit exceeded. Maximum 100 requests per minute.', 429);
    }

    const client = createClient(supabaseUrl, supabaseServiceKey);
    
    // 3. Routing (Parse RESTful paths relative to base function route)
    // Local / Production paths: /functions/v1/public-api/datasets or /public-api/datasets
    const path = url.pathname.replace(/^\/(functions\/v1\/)?public-api/, '').replace(/\/$/, '');

    // Skenario A: Fetch semua datasets (/datasets atau / atau kosong)
    if (path === '' || path === '/' || path === '/datasets') {
      const searchQuery = url.searchParams.get('search') || '';

      let query = client
        .from('catalog_metadata')
        .select(`
          id,
          title,
          slug,
          abstract,
          description,
          created_at,
          updated_at,
          classification_code,
          publication_status,
          org_organizations!publisher_org_id (
            id,
            name,
            short_name
          ),
          catalog_dataset_themes (
            catalog_themes (
              id,
              code,
              name,
              icon_url
            )
          ),
          catalog_dataset_tags (
            catalog_tags (
              id,
              name
            )
          )
        `)
        .eq('classification_code', 'PUBLIC')
        .eq('publication_status', 'PUBLISHED')
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,abstract.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const mappedData = data.map(mapDatasetList);
      return sendSuccess(mappedData, "Datasets retrieved successfully");
    }

    // Skenario B: Fetch single dataset berdasarkan ID/Slug (/datasets/:idOrSlug)
    const match = path.match(/^\/datasets\/([^/]+)$/);
    if (match) {
      const idOrSlug = match[1];
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

      let query = client
        .from('catalog_metadata')
        .select(`
          *,
          org_organizations!publisher_org_id (
            id,
            name,
            short_name
          ),
          catalog_dataset_themes (
            catalog_themes (
              id,
              code,
              name,
              icon_url
            )
          ),
          catalog_dataset_tags (
            catalog_tags (
              id,
              name
            )
          ),
          catalog_resources (
            id,
            name,
            resource_type,
            description,
            catalog_distributions (
              id,
              media_type,
              byte_size,
              version
            )
          )
        `)
        .eq('classification_code', 'PUBLIC')
        .eq('publication_status', 'PUBLISHED');

      if (isUUID) {
        query = query.eq('id', idOrSlug);
      } else {
        query = query.eq('slug', idOrSlug);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;

      if (!data) {
        return sendFail(`Dataset not found with identifier: '${idOrSlug}'`, 404);
      }

      const mappedData = mapDatasetDetail(data);
      return sendSuccess(mappedData, "Dataset retrieved successfully");
    }

    // Skenario C: Route tidak ditemukan
    return sendFail('Endpoint not found. Valid endpoints are GET /datasets and GET /datasets/:idOrSlug', 404);

  } catch (error) {
    console.error('❌ Public API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return sendError(errorMessage, 500);
  }
});
