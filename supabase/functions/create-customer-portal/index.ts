import { corsHeaders } from "@shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header is required" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT token
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: "Stripe secret key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Search for customer in Stripe using user_id metadata
    const searchResponse = await fetch(
      `https://api.stripe.com/v1/customers/search?query=metadata['user_id']:'${user.id}'`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        },
      },
    );

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error("Stripe customer search error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to search for customer" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const searchResult = await searchResponse.json();

    if (!searchResult.data || searchResult.data.length === 0) {
      return new Response(
        JSON.stringify({
          error:
            "No Stripe customer found. Please make a purchase first to access billing management.",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const customer = searchResult.data[0];
    const baseUrl = req.headers.get("origin") || "http://localhost:5173";

    // Create customer portal session with configuration
    const response = await fetch(
      "https://api.stripe.com/v1/billing_portal/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          customer: customer.id,
          return_url: `${baseUrl}/settings`,
          // Add configuration for test mode
          "configuration[business_profile][headline]": "GameVault Billing",
          "configuration[business_profile][privacy_policy_url]": `${baseUrl}/privacy-policy`,
          "configuration[business_profile][terms_of_service_url]": `${baseUrl}/terms-of-service`,
          "configuration[features][payment_method_update][enabled]": "true",
          "configuration[features][invoice_history][enabled]": "true",
          "configuration[features][customer_update][enabled]": "true",
          "configuration[features][customer_update][allowed_updates][]":
            "email",
          "configuration[features][customer_update][allowed_updates][]": "name",
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Stripe API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to create customer portal session" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const session = await response.json();

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error creating customer portal session:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
