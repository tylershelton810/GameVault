import { corsHeaders } from "@shared/cors.ts";

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
      status: 200,
    });
  }

  try {
    const { igdbGameId } = await req.json();

    if (!igdbGameId) {
      return new Response(
        JSON.stringify({ error: "IGDB Game ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get Twitch OAuth token for IGDB API
    const twitchTokenResponse = await fetch(
      "https://id.twitch.tv/oauth2/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: Deno.env.get("TWITCH_CLIENT_ID") || "",
          client_secret: Deno.env.get("TWITCH_CLIENT_SECRET") || "",
          grant_type: "client_credentials",
        }),
      },
    );

    if (!twitchTokenResponse.ok) {
      throw new Error("Failed to get Twitch OAuth token");
    }

    const tokenData = await twitchTokenResponse.json();
    const accessToken = tokenData.access_token;

    // Query IGDB for detailed game information
    const igdbQuery = `
      fields name, summary, storyline, cover.url, screenshots.url, genres.name, 
             platforms.name, release_dates.date, release_dates.platform.name,
             rating, rating_count, aggregated_rating, aggregated_rating_count,
             involved_companies.company.name, involved_companies.developer, involved_companies.publisher,
             first_release_date, age_ratings.category, age_ratings.rating;
      where id = ${igdbGameId};
    `;

    const igdbResponse = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: {
        "Client-ID": Deno.env.get("TWITCH_CLIENT_ID") || "",
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: igdbQuery,
    });

    if (!igdbResponse.ok) {
      throw new Error(`IGDB API error: ${igdbResponse.status}`);
    }

    const gameData = await igdbResponse.json();

    return new Response(JSON.stringify(gameData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error fetching game details:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch game details" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
