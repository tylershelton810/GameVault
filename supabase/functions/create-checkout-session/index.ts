import { corsHeaders } from "@shared/cors.ts";

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

    const baseUrl = req.headers.get("origin") || "http://localhost:5173";

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
      metadata: {
        type: type,
        amount: amount.toString(),
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
          "metadata[type]": type,
          "metadata[amount]": amount.toString(),
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
