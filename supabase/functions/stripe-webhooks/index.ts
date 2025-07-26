import { corsHeaders } from "@shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_KEY");

    // Check each environment variable individually for better debugging
    const missingVars = [];
    if (!STRIPE_WEBHOOK_SECRET) missingVars.push("STRIPE_WEBHOOK_SECRET");
    if (!SUPABASE_URL) missingVars.push("SUPABASE_URL");
    if (!SUPABASE_SERVICE_KEY) missingVars.push("SUPABASE_SERVICE_KEY");

    if (missingVars.length > 0) {
      console.error(
        `Missing required environment variables: ${missingVars.join(", ")}`,
      );
      return new Response(
        JSON.stringify({
          error: "Missing required environment variables",
          missing: missingVars,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("All required environment variables are present");

    // Initialize Supabase client with service key for admin operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get the raw body and signature
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      console.error("No stripe signature found");
      return new Response(
        JSON.stringify({ error: "No stripe signature found" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Verify webhook signature
    const crypto = await import("node:crypto");
    const elements = signature.split(",");
    const signatureHash = elements
      .find((el) => el.startsWith("v1="))
      ?.split("=")[1];
    const timestamp = elements.find((el) => el.startsWith("t="))?.split("=")[1];

    if (!signatureHash || !timestamp) {
      console.error("Invalid signature format");
      return new Response(
        JSON.stringify({ error: "Invalid signature format" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Create expected signature
    const payload = `${timestamp}.${body}`;
    const expectedSignature = crypto
      .createHmac("sha256", STRIPE_WEBHOOK_SECRET)
      .update(payload, "utf8")
      .digest("hex");

    if (signatureHash !== expectedSignature) {
      console.error("Invalid signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse the event
    const event = JSON.parse(body);
    console.log(`Received webhook: ${event.type}`);

    // Handle different webhook events
    switch (event.type) {
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        const subscriptionId = invoice.subscription;

        console.log(
          `Invoice payment succeeded - subscription ID: ${subscriptionId}`,
        );

        if (!subscriptionId) {
          console.log(
            "No subscription ID found in invoice - this might be a one-time payment",
          );
          break;
        }

        if (subscriptionId) {
          // Get customer metadata to find user_id
          const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
          if (!STRIPE_SECRET_KEY) {
            console.error("Missing Stripe secret key");
            break;
          }

          const customerResponse = await fetch(
            `https://api.stripe.com/v1/customers/${customerId}`,
            {
              headers: {
                Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
              },
            },
          );

          if (!customerResponse.ok) {
            console.error("Failed to fetch customer from Stripe");
            break;
          }

          const customer = await customerResponse.json();
          const userId = customer.metadata?.user_id;

          if (!userId) {
            console.error("No user_id found in customer metadata");
            break;
          }

          // Calculate new expiration date (30 days from now)
          const expirationDate = new Date();
          expirationDate.setDate(expirationDate.getDate() + 30);

          // Update user donor status
          const { error } = await supabase
            .from("users")
            .update({
              is_donor: true,
              donation_started_at: new Date().toISOString(),
              donation_expires_at: expirationDate.toISOString(),
            })
            .eq("id", userId);

          if (error) {
            console.error("Error updating user donor status:", error);
          } else {
            console.log(`Updated donor status for user ${userId}`);
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        const attemptCount = invoice.attempt_count;

        // Get customer metadata to find user_id
        const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
        if (!STRIPE_SECRET_KEY) {
          console.error("Missing Stripe secret key");
          break;
        }

        const customerResponse = await fetch(
          `https://api.stripe.com/v1/customers/${customerId}`,
          {
            headers: {
              Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
            },
          },
        );

        if (!customerResponse.ok) {
          console.error("Failed to fetch customer from Stripe");
          break;
        }

        const customer = await customerResponse.json();
        const userId = customer.metadata?.user_id;

        if (!userId) {
          console.error("No user_id found in customer metadata");
          break;
        }

        // If this is the final attempt (usually 4), remove donor status
        if (attemptCount >= 4) {
          const { error } = await supabase
            .from("users")
            .update({
              is_donor: false,
              donation_expires_at: new Date().toISOString(),
            })
            .eq("id", userId);

          if (error) {
            console.error("Error removing donor status:", error);
          } else {
            console.log(
              `Removed donor status for user ${userId} after failed payments`,
            );
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        // Get customer metadata to find user_id
        const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
        if (!STRIPE_SECRET_KEY) {
          console.error("Missing Stripe secret key");
          break;
        }

        const customerResponse = await fetch(
          `https://api.stripe.com/v1/customers/${customerId}`,
          {
            headers: {
              Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
            },
          },
        );

        if (!customerResponse.ok) {
          console.error("Failed to fetch customer from Stripe");
          break;
        }

        const customer = await customerResponse.json();
        const userId = customer.metadata?.user_id;

        if (!userId) {
          console.error("No user_id found in customer metadata");
          break;
        }

        // Remove donor status
        const { error } = await supabase
          .from("users")
          .update({
            is_donor: false,
            donation_expires_at: new Date().toISOString(),
          })
          .eq("id", userId);

        if (error) {
          console.error("Error removing donor status:", error);
        } else {
          console.log(
            `Removed donor status for user ${userId} after subscription deletion`,
          );
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
