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
    const {
      igdbGameId,
      useSimilarGamesAPI = true,
      useGenreMatching = false,
    } = await req.json();

    if (!igdbGameId) {
      return new Response(
        JSON.stringify({ error: "IGDB Game ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Check for required environment variables
    const twitchClientId = Deno.env.get("TWITCH_CLIENT_ID");
    const twitchClientSecret = Deno.env.get("TWITCH_CLIENT_SECRET");

    console.log("Environment check:", {
      hasClientId: !!twitchClientId,
      hasClientSecret: !!twitchClientSecret,
      clientIdLength: twitchClientId?.length || 0,
      clientSecretLength: twitchClientSecret?.length || 0,
    });

    if (!twitchClientId || !twitchClientSecret) {
      console.error("Missing Twitch API credentials");
      return new Response(
        JSON.stringify({
          error: "Missing Twitch API credentials",
          details: {
            hasClientId: !!twitchClientId,
            hasClientSecret: !!twitchClientSecret,
          },
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get Twitch OAuth token for IGDB API
    console.log("Requesting Twitch OAuth token...");
    const twitchTokenResponse = await fetch(
      "https://id.twitch.tv/oauth2/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: twitchClientId,
          client_secret: twitchClientSecret,
          grant_type: "client_credentials",
        }),
      },
    );

    if (!twitchTokenResponse.ok) {
      const errorText = await twitchTokenResponse.text();
      console.error("Twitch OAuth error:", {
        status: twitchTokenResponse.status,
        statusText: twitchTokenResponse.statusText,
        error: errorText,
      });
      throw new Error(
        `Failed to get Twitch OAuth token: ${twitchTokenResponse.status} - ${errorText}`,
      );
    }

    const tokenData = await twitchTokenResponse.json();
    const accessToken = tokenData.access_token;

    console.log("Successfully obtained Twitch OAuth token");

    // Query IGDB for detailed game information
    const igdbQuery = `
      fields name, summary, storyline, cover.url, screenshots.url, genres.name, 
             platforms.name, release_dates.date, release_dates.platform.name,
             rating, rating_count, aggregated_rating, aggregated_rating_count,
             involved_companies.company.name, involved_companies.developer, involved_companies.publisher,
             first_release_date, age_ratings.category, age_ratings.rating;
      where id = ${igdbGameId};
    `;

    console.log("Querying IGDB for game ID:", igdbGameId);
    const igdbResponse = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: {
        "Client-ID": twitchClientId,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: igdbQuery,
    });

    if (!igdbResponse.ok) {
      const errorText = await igdbResponse.text();
      console.error("IGDB API error:", {
        status: igdbResponse.status,
        statusText: igdbResponse.statusText,
        error: errorText,
      });
      throw new Error(`IGDB API error: ${igdbResponse.status} - ${errorText}`);
    }

    const gameData = await igdbResponse.json();
    console.log("IGDB game data received:", gameData?.length || 0, "games");

    // If we have game data, fetch similar games using IGDB's similar games API
    let similarGames = [];
    if (gameData && gameData.length > 0 && useSimilarGamesAPI) {
      const game = gameData[0];

      try {
        // Use IGDB's similar games endpoint
        const similarGamesQuery = `
          fields similar_games.name, similar_games.cover.url, similar_games.rating, 
                 similar_games.summary, similar_games.genres.name, similar_games.first_release_date;
          where id = ${igdbGameId};
        `;

        const similarGamesResponse = await fetch(
          "https://api.igdb.com/v4/games",
          {
            method: "POST",
            headers: {
              "Client-ID": twitchClientId,
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: similarGamesQuery,
          },
        );

        if (similarGamesResponse.ok) {
          const similarGamesData = await similarGamesResponse.json();
          if (
            similarGamesData[0]?.similar_games &&
            similarGamesData[0].similar_games.length > 0
          ) {
            // Sort by rating (highest first) and limit to 12
            similarGames = similarGamesData[0].similar_games
              .filter((g) => g.rating && g.rating > 60) // Only include games with decent ratings
              .sort((a, b) => (b.rating || 0) - (a.rating || 0))
              .slice(0, 12);
          }
        }
      } catch (error) {
        console.error("Error in similar games fetching:", error);
      }
    }

    console.log(
      "Returning response with",
      gameData?.length || 0,
      "games and",
      similarGames?.length || 0,
      "similar games",
    );

    return new Response(
      JSON.stringify({
        gameData,
        similarGames: similarGames || [],
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error fetching game details:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to fetch game details",
        details: error.message,
        stack: error.stack,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
