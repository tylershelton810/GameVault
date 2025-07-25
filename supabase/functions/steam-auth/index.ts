import { corsHeaders } from "@shared/cors.ts";

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      throw new Error("No authentication token provided");
    }

    // Get the app origin from the referer header or use the default Tempo URL
    const referer = req.headers.get("referer");
    let appOrigin = "https://canvas-frosty-snyder6-p565b.tempo.build";

    console.log("[STEAM-AUTH] Initial request URL:", req.url);
    console.log("[STEAM-AUTH] Referer header:", referer);
    console.log("[STEAM-AUTH] Default appOrigin:", appOrigin);

    if (referer) {
      try {
        const refererUrl = new URL(referer);
        console.log("[STEAM-AUTH] Parsed referer URL:", refererUrl.toString());
        console.log("[STEAM-AUTH] Referer hostname:", refererUrl.hostname);
        console.log("[STEAM-AUTH] Referer origin:", refererUrl.origin);

        // Only use the referer if it's from the expected domain
        if (refererUrl.hostname.includes("tempo.build")) {
          appOrigin = refererUrl.origin;
          console.log(
            "[STEAM-AUTH] Using referer origin as appOrigin:",
            appOrigin,
          );
        } else {
          console.log(
            "[STEAM-AUTH] Referer hostname does not include tempo.build, using default",
          );
        }
      } catch (error) {
        console.log(
          "[STEAM-AUTH] Invalid referer URL, using default origin:",
          error,
        );
      }
    } else {
      console.log("[STEAM-AUTH] No referer header found, using default origin");
    }

    // Use the Supabase function URL for the callback, but pass the app origin
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    console.log("[STEAM-AUTH] Supabase URL:", supabaseUrl);

    const returnUrl = `${supabaseUrl}/functions/v1/supabase-functions-steam-callback?token=${encodeURIComponent(token)}&app_origin=${encodeURIComponent(appOrigin)}`;
    console.log("[STEAM-AUTH] Return URL:", returnUrl);
    console.log(
      "[STEAM-AUTH] Encoded app_origin:",
      encodeURIComponent(appOrigin),
    );

    // Steam OpenID endpoint
    const steamOpenIdUrl = "https://steamcommunity.com/openid/login";

    // OpenID parameters
    const params = new URLSearchParams({
      "openid.ns": "http://specs.openid.net/auth/2.0",
      "openid.mode": "checkid_setup",
      "openid.return_to": returnUrl,
      "openid.realm": url.origin,
      "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
      "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
    });

    const redirectUrl = `${steamOpenIdUrl}?${params.toString()}`;
    console.log("[STEAM-AUTH] Final redirect URL to Steam:", redirectUrl);

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: redirectUrl,
      },
    });
  } catch (error) {
    console.error("Steam auth error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to initiate Steam authentication" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
