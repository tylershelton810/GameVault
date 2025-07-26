import { corsHeaders } from "@shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { amount, type, currency = "usd" } = await req.json();

    if (!amount || !type) {
      return new Response(
        JSON.stringify({ error: "Amount and type are required" }),
        {
          status: 400,
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

    // Get Supabase environment variables
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return new Response(
        JSON.stringify({ error: "Supabase configuration missing" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get user from authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const baseUrl = req.headers.get("origin") || "http://localhost:5173";

    // Get or create Stripe customer and update metadata
    let customerId: string;

    // First, check if a customer already exists with our user_id in metadata
    const userMetadataSearchResponse = await fetch(
      `https://api.stripe.com/v1/customers/search?query=metadata['user_id']:'${user.id}'`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        },
      },
    );

    if (userMetadataSearchResponse.ok) {
      const userMetadataSearchData = await userMetadataSearchResponse.json();

      if (
        userMetadataSearchData.data &&
        userMetadataSearchData.data.length > 0
      ) {
        // Customer with user_id metadata exists, use that customer
        customerId = userMetadataSearchData.data[0].id;
      } else {
        // No customer with user_id metadata found, proceed with email search
        const customerSearchResponse = await fetch(
          `https://api.stripe.com/v1/customers/search?query=email:'${user.email}'`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
            },
          },
        );

        if (customerSearchResponse.ok) {
          const customerSearchData = await customerSearchResponse.json();

          if (customerSearchData.data && customerSearchData.data.length > 0) {
            // Customer exists, update their metadata
            customerId = customerSearchData.data[0].id;

            await fetch(`https://api.stripe.com/v1/customers/${customerId}`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                "metadata[user_id]": user.id,
              }),
            });
          } else {
            // Create new customer with metadata
            const customerResponse = await fetch(
              "https://api.stripe.com/v1/customers",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                  email: user.email || "",
                  "metadata[user_id]": user.id,
                }),
              },
            );

            if (customerResponse.ok) {
              const customerData = await customerResponse.json();
              customerId = customerData.id;
            } else {
              console.error("Failed to create Stripe customer");
              return new Response(
                JSON.stringify({ error: "Failed to create customer" }),
                {
                  status: 500,
                  headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                  },
                },
              );
            }
          }
        } else {
          console.error("Failed to search for Stripe customer");
          return new Response(
            JSON.stringify({ error: "Failed to search for customer" }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
      }
    } else {
      console.error("Failed to search for Stripe customer by user_id metadata");
      return new Response(
        JSON.stringify({ error: "Failed to search for customer by user_id" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Create checkout session payload
    const sessionData: any = {
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name:
                type === "subscription"
                  ? "GameVault Monthly Support"
                  : "GameVault Donation",
              description:
                type === "subscription"
                  ? "Monthly support for GameVault development"
                  : "One-time donation to support GameVault development",
            },
            unit_amount: amount * 100, // Convert to cents
            ...(type === "subscription" && {
              recurring: {
                interval: "month",
              },
            }),
          },
          quantity: 1,
        },
      ],
      mode: type === "subscription" ? "subscription" : "payment",
      success_url: `${baseUrl}/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/stripe/cancel`,
      customer: customerId,
      metadata: {
        type: type,
        amount: amount.toString(),
        user_id: user.id,
      },
    };

    // Create Stripe checkout session
    const response = await fetch(
      "https://api.stripe.com/v1/checkout/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          "payment_method_types[0]": "card",
          "line_items[0][price_data][currency]": currency,
          "line_items[0][price_data][product_data][name]":
            sessionData.line_items[0].price_data.product_data.name,
          "line_items[0][price_data][product_data][description]":
            sessionData.line_items[0].price_data.product_data.description,
          "line_items[0][price_data][unit_amount]": (amount * 100).toString(),
          ...(type === "subscription" && {
            "line_items[0][price_data][recurring][interval]": "month",
          }),
          "line_items[0][quantity]": "1",
          mode: type === "subscription" ? "subscription" : "payment",
          success_url: sessionData.success_url,
          cancel_url: sessionData.cancel_url,
          customer: customerId,
          "metadata[type]": type,
          "metadata[amount]": amount.toString(),
          "metadata[user_id]": user.id,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Stripe API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to create checkout session" }),
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
    console.error("Error creating checkout session:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
