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

    // If we have game data, also fetch similar games
    let similarGames = [];
    if (gameData && gameData.length > 0) {
      const game = gameData[0];

      // Search for similar games using the game name to find related titles
      // Extract key words from the game name for better matching
      const gameWords = game.name
        .toLowerCase()
        .split(/[\s\-:]+/)
        .filter(
          (word) =>
            word.length > 2 &&
            ![
              "the",
              "and",
              "for",
              "are",
              "but",
              "not",
              "you",
              "all",
              "can",
              "had",
              "her",
              "was",
              "one",
              "our",
              "out",
              "day",
              "get",
              "has",
              "him",
              "his",
              "how",
              "man",
              "new",
              "now",
              "old",
              "see",
              "two",
              "way",
              "who",
              "boy",
              "did",
              "its",
              "let",
              "put",
              "say",
              "she",
              "too",
              "use",
            ].includes(word),
        );

      if (gameWords.length > 0) {
        // Try multiple search strategies for better recommendations
        const searchStrategies = [];

        // Strategy 1: Use the full game name (most specific)
        searchStrategies.push(game.name);

        // Strategy 2: Use first two significant words if available
        if (gameWords.length >= 2) {
          searchStrategies.push(`${gameWords[0]} ${gameWords[1]}`);
        }

        // Strategy 3: Use the most unique/specific word (longest word that's not a number)
        const specificWord = gameWords
          .filter((word) => !/^\d+$/.test(word)) // Filter out pure numbers
          .sort((a, b) => b.length - a.length)[0]; // Get longest word
        if (specificWord && specificWord !== gameWords[0]) {
          searchStrategies.push(specificWord);
        }

        // Strategy 4: Fallback to first word only
        searchStrategies.push(gameWords[0]);

        // Try each search strategy until we get good results
        for (const searchTerm of searchStrategies) {
          try {
            const similarQuery = `
              fields name, cover.url, rating, summary, first_release_date;
              search "${searchTerm}";
              where id != ${igdbGameId} & cover != null & rating > 60;
              limit 20;
            `;

            const similarResponse = await fetch(
              "https://api.igdb.com/v4/games",
              {
                method: "POST",
                headers: {
                  "Client-ID": Deno.env.get("TWITCH_CLIENT_ID") || "",
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
                body: similarQuery,
              },
            );

            if (similarResponse.ok) {
              const results = await similarResponse.json();
              // If we get good results (more than 3 games), use them
              if (results && results.length >= 3) {
                similarGames = results;
                break;
              }
              // Otherwise, keep the results but try the next strategy
              if (results && results.length > similarGames.length) {
                similarGames = results;
              }
            }
          } catch (error) {
            console.error(
              `Error fetching similar games with term "${searchTerm}":`,
              error,
            );
            // Continue to next strategy
          }
        }
      }
    }

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
      JSON.stringify({ error: "Failed to fetch game details" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
