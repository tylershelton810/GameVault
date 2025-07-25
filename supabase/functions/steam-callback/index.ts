import { corsHeaders } from "@shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const params = url.searchParams;

    // Verify OpenID response
    const mode = params.get("openid.mode");
    const identity = params.get("openid.identity");
    const returnTo = params.get("openid.return_to");
    const responseNonce = params.get("openid.response_nonce");
    const assocHandle = params.get("openid.assoc_handle");
    const signed = params.get("openid.signed");
    const sig = params.get("openid.sig");

    // Check for required OpenID parameters
    const requiredParams = [
      "openid.mode",
      "openid.identity",
      "openid.return_to",
      "openid.response_nonce",
      "openid.assoc_handle",
      "openid.signed",
      "openid.sig",
    ];
    const missingParams = requiredParams.filter((param) => !params.get(param));

    if (missingParams.length > 0) {
      throw new Error(
        `Missing required OpenID parameters: ${missingParams.join(", ")}`,
      );
    }

    if (mode !== "id_res") {
      throw new Error(`Invalid OpenID mode: ${mode}`);
    }

    if (!identity) {
      throw new Error("Missing OpenID identity");
    }

    if (!identity.includes("steamcommunity.com/openid/id/")) {
      throw new Error("Invalid OpenID identity format");
    }

    // Extract Steam ID from identity URL
    const steamIdMatch = identity.match(/\/openid\/id\/(\d+)$/);
    if (!steamIdMatch) {
      throw new Error(`Could not extract Steam ID from identity: ${identity}`);
    }

    const steamId = steamIdMatch[1];

    // Validate Steam ID format (should be 17 digits)
    if (!/^\d{17}$/.test(steamId)) {
      throw new Error(`Invalid Steam ID format: ${steamId}`);
    }

    // Verify the OpenID response with Steam
    const verifyParams = new URLSearchParams();
    for (const [key, value] of params.entries()) {
      if (key.startsWith("openid.")) {
        verifyParams.append(key, value);
      }
    }
    verifyParams.set("openid.mode", "check_authentication");

    const verifyResponse = await fetch(
      "https://steamcommunity.com/openid/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: verifyParams.toString(),
      },
    );

    if (!verifyResponse.ok) {
      throw new Error(
        `Steam verification request failed: ${verifyResponse.status}`,
      );
    }

    const verifyText = await verifyResponse.text();
    if (!verifyText.includes("is_valid:true")) {
      throw new Error(`Steam OpenID verification failed`);
    }

    // Get token from URL parameters (passed from frontend)
    const token = params.get("token");
    if (!token) {
      throw new Error("No authentication token provided");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT token
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Invalid user token");
    }

    // Update user with Steam ID
    const { error: updateError } = await supabase
      .from("users")
      .update({ steam_id: steamId })
      .eq("id", user.id);

    if (updateError) {
      throw new Error(
        `Failed to update user with Steam ID: ${updateError.message}`,
      );
    }

    // Get the app origin from the URL parameters with validation
    let appOrigin = "https://canvas-frosty-snyder6-p565b.tempo.build";
    const providedOrigin = params.get("app_origin");

    if (providedOrigin) {
      try {
        const originUrl = new URL(providedOrigin);
        // Only use the provided origin if it's from the expected domain
        if (originUrl.hostname.includes("tempo.build")) {
          appOrigin = providedOrigin;
        }
      } catch (error) {
        // Use default origin if provided origin is invalid
      }
    }

    // Redirect back to account page with success
    const redirectUrl = `${appOrigin}/account?steam=linked`;

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: redirectUrl,
      },
    });
  } catch (error) {
    console.error("Steam callback error:", error);

    // Redirect back to account page with error
    const url = new URL(req.url);
    const params = url.searchParams;
    let appOrigin = "https://canvas-frosty-snyder6-p565b.tempo.build";
    const providedOrigin = params.get("app_origin");

    if (providedOrigin) {
      try {
        const originUrl = new URL(providedOrigin);
        // Only use the provided origin if it's from the expected domain
        if (originUrl.hostname.includes("tempo.build")) {
          appOrigin = providedOrigin;
        }
      } catch (error) {
        // Use default origin if provided origin is invalid
      }
    }

    const redirectUrl = `${appOrigin}/account?steam=error`;

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: redirectUrl,
      },
    });
  }
});
