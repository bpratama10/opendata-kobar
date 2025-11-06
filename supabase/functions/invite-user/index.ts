import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteRequest {
  email: string;
  fullName: string;
  organizationId?: string;
  organizationName?: string;
  roleId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Create client with user's auth for permission check
    const authHeader = req.headers.get('Authorization')!;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify caller has ADMIN or WALIDATA role
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: userRoles } = await userClient
      .from('org_user_roles')
      .select('org_roles(code)')
      .eq('user_id', user.id);

    const roles = userRoles?.map((r: any) => r.org_roles?.code) || [];
    const canInvite = roles.includes('ADMIN') || roles.includes('WALIDATA');

    if (!canInvite) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: InviteRequest = await req.json();
    const { email, fullName, organizationId, organizationName, roleId } = body;

    // Create admin client for inviting user
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Handle organization creation if needed
    let finalOrgId = organizationId;
    if (!organizationId && organizationName) {
      const { data: newOrg, error: orgError } = await adminClient
        .from('org_organizations')
        .insert({ name: organizationName, org_type: 'OTHER' })
        .select()
        .single();

      if (orgError) throw orgError;
      finalOrgId = newOrg.id;
    }

    // Invite user via Supabase Auth
    const redirectUrl = `${new URL(req.url).origin}/auth`;
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        data: { full_name: fullName },
        redirectTo: redirectUrl,
      }
    );

    if (inviteError) throw inviteError;

    const newUserId = inviteData.user.id;

    // Update org_users record (already created by handle_new_user trigger)
    const { error: orgUserError } = await adminClient
      .from('org_users')
      .update({
        email,
        full_name: fullName,
        org_id: finalOrgId,
        is_active: true,
      })
      .eq('id', newUserId);

    if (orgUserError) throw orgUserError;

    // Remove existing roles (trigger creates default VIEWER role)
    await adminClient
      .from('org_user_roles')
      .delete()
      .eq('user_id', newUserId);

    // Assign the selected role
    const { error: roleError } = await adminClient
      .from('org_user_roles')
      .insert({
        user_id: newUserId,
        role_id: roleId,
      });

    if (roleError) throw roleError;

    console.log(`✅ User invited: ${email} (${newUserId})`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'User invited successfully. They will receive an email with a login link.',
        userId: newUserId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error inviting user:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
