import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

const RATE_LIMITS = {
  anonymous: { requests: 10, window: 60 }, // 10 requests per minute
  apiKey: { requests: 100, window: 60 }, // 100 requests per minute
};

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

function getRateLimitKey(identifier: string, type: 'anonymous' | 'apiKey'): string {
  return `${type}:${identifier}`;
}

function checkRateLimit(identifier: string, type: 'anonymous' | 'apiKey'): boolean {
  const key = getRateLimitKey(identifier, type);
  const now = Date.now();
  const limit = RATE_LIMITS[type];
  
  let entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + limit.window * 1000 };
    rateLimitStore.set(key, entry);
    return true;
  }
  
  if (entry.count >= limit.requests) {
    return false;
  }
  
  entry.count++;
  rateLimitStore.set(key, entry);
  return true;
}

function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
         req.headers.get('x-real-ip') ||
         'unknown';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const url = new URL(req.url);
    const apiKey = req.headers.get('x-api-key');
    const endpoint = url.searchParams.get('endpoint') || 'datasets';
    const searchQuery = url.searchParams.get('search') || '';
    const datasetId = url.searchParams.get('id');

    let rateLimitType: 'anonymous' | 'apiKey' = 'anonymous';
    let identifier = getClientIP(req);

    // Verify API key if provided
    if (apiKey) {
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);
      
      // Hash the API key
      const encoder = new TextEncoder();
      const data = encoder.encode(apiKey);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const { data: keyData, error: keyError } = await adminClient
        .from('api_keys')
        .select('*')
        .eq('key_hash', keyHash)
        .eq('is_active', true)
        .single();

      if (keyError || !keyData) {
        return new Response(
          JSON.stringify({ error: 'Invalid or inactive API key' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update last_used_at
      await adminClient
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', keyData.id);

      rateLimitType = 'apiKey';
      identifier = keyData.id;
    }

    // Check rate limit
    if (!checkRateLimit(identifier, rateLimitType)) {
      const limit = RATE_LIMITS[rateLimitType];
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          limit: limit.requests,
          window: `${limit.window}s`,
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service role client to query data
    const client = createClient(supabaseUrl, supabaseServiceKey);

    let response;

    if (endpoint === 'datasets') {
      // Fetch public published datasets
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
      response = data;

    } else if (endpoint === 'dataset' && datasetId) {
      // Fetch single dataset
      const { data, error } = await client
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
        .eq('id', datasetId)
        .eq('classification_code', 'PUBLIC')
        .eq('publication_status', 'PUBLISHED')
        .single();

      if (error) throw error;
      response = data;

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid endpoint' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Public API error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
