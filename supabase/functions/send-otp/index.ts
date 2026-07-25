import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { email, purpose } = await req.json();

    if (!email || !purpose) {
      return new Response(
        JSON.stringify({ error: 'Email and purpose are required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validPurposes = ['signup', 'login', 'reset'];
    if (!validPurposes.includes(purpose)) {
      return new Response(
        JSON.stringify({ error: 'Invalid purpose.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Generate, hash, and store the OTP via the database function
    const { data: code, error: rpcError } = await supabase.rpc('create_otp', {
      p_email: email,
      p_purpose: purpose,
    });

    if (rpcError || !code) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate OTP.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // In production, send the OTP via an email service provider here.
    // For now, log it so the developer can retrieve it during testing.
    console.log(`[OTP] ${email} (${purpose}): ${code}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'OTP sent successfully.',
        // Returned for development/testing only. Remove in production.
        dev_code: code,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
