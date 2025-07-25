import { corsHeaders } from "@shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
      status: 200,
    });
  }

  try {
    const { steamId } = await req.json();

    if (!steamId) {
      return new Response(JSON.stringify({ error: "Steam ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user ID from Steam ID
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("steam_id", steamId)
      .single();

    if (userError || !userData) {
      return new Response(
        JSON.stringify({ error: "User not found for this Steam ID" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const userId = userData.id;

    // Check for required environment variables
    const steamApiKey = Deno.env.get("STEAM_API_KEY");
    const twitchClientId = Deno.env.get("TWITCH_CLIENT_ID");
    const twitchClientSecret = Deno.env.get("TWITCH_CLIENT_SECRET");

    if (!steamApiKey) {
      return new Response(
        JSON.stringify({ error: "Steam API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!twitchClientId || !twitchClientSecret) {
      return new Response(
        JSON.stringify({ error: "IGDB API credentials not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Fetch Steam library
    console.log("Fetching Steam library for user:", steamId);
    const steamResponse = await fetch(
      `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${steamApiKey}&steamid=${steamId}&include_appinfo=1&format=json`,
    );

    if (!steamResponse.ok) {
      console.error(
        "Steam API error:",
        steamResponse.status,
        steamResponse.statusText,
      );
      return new Response(
        JSON.stringify({ error: "Failed to fetch Steam library" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const steamData = await steamResponse.json();
    const games = steamData.response?.games || [];

    if (games.length === 0) {
      return new Response(
        JSON.stringify({
          games: [],
          message: "No games found or library is private",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    console.log(`Found ${games.length} games in Steam library`);

    // Get user's existing games from the database
    const { data: existingGames, error: existingGamesError } = await supabase
      .from("game_collections")
      .select("igdb_game_id")
      .eq("user_id", userId);

    if (existingGamesError) {
      console.error("Error fetching existing games:", existingGamesError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch existing games" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Create a Set of existing IGDB game IDs for fast lookup
    const existingIgdbIds = new Set(
      existingGames
        ?.map((game) => game.igdb_game_id)
        .filter((id) => id !== null) || [],
    );

    console.log(
      `User has ${existingIgdbIds.size} games already in their library`,
      "Existing IGDB IDs:",
      Array.from(existingIgdbIds),
    );

    // Get Twitch OAuth token for IGDB API
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
      console.error("Twitch OAuth error:", twitchTokenResponse.status);
      return new Response(
        JSON.stringify({ error: "Failed to authenticate with IGDB" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const tokenData = await twitchTokenResponse.json();
    const accessToken = tokenData.access_token;

    // Function to normalize game names for better matching
    const normalizeGameName = (name: string): string => {
      return name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "") // Remove special characters
        .replace(/\s+/g, " ") // Replace multiple spaces with single space
        .trim();
    };

    // Function to calculate string similarity (Levenshtein distance based)
    const calculateSimilarity = (str1: string, str2: string): number => {
      const longer = str1.length > str2.length ? str1 : str2;
      const shorter = str1.length > str2.length ? str2 : str1;

      if (longer.length === 0) return 1.0;

      const editDistance = levenshteinDistance(longer, shorter);
      return (longer.length - editDistance) / longer.length;
    };

    // Levenshtein distance implementation
    const levenshteinDistance = (str1: string, str2: string): number => {
      const matrix = [];

      for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
      }

      for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
      }

      for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
          if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1,
            );
          }
        }
      }

      return matrix[str2.length][str1.length];
    };

    // Function to find the best match from IGDB results
    const findBestMatch = (
      steamName: string,
      igdbResults: any[],
    ): any | null => {
      const normalizedSteamName = normalizeGameName(steamName);
      let bestMatch = null;
      let bestScore = 0;

      for (const game of igdbResults) {
        const normalizedIgdbName = normalizeGameName(game.name);

        // Exact match gets highest priority
        if (normalizedSteamName === normalizedIgdbName) {
          return game;
        }

        // Calculate similarity score
        const similarity = calculateSimilarity(
          normalizedSteamName,
          normalizedIgdbName,
        );

        // Only consider matches with high similarity (85% or higher)
        // and ensure the IGDB name doesn't contain extra words that Steam name doesn't have
        if (similarity >= 0.85) {
          const steamWords = normalizedSteamName.split(" ");
          const igdbWords = normalizedIgdbName.split(" ");

          // Check if all steam words are present in igdb name
          const allSteamWordsPresent = steamWords.every((word) =>
            igdbWords.some(
              (igdbWord) => igdbWord.includes(word) || word.includes(igdbWord),
            ),
          );

          // Penalize if IGDB has significantly more words (like "2" in "Torchlight 2")
          const wordCountDifference = Math.abs(
            igdbWords.length - steamWords.length,
          );
          const adjustedScore = similarity - wordCountDifference * 0.1;

          if (
            allSteamWordsPresent &&
            adjustedScore > bestScore &&
            adjustedScore >= 0.8
          ) {
            bestMatch = game;
            bestScore = adjustedScore;
          }
        }
      }

      return bestMatch;
    };

    // Process games in batches to avoid overwhelming the IGDB API
    const batchSize = 10;
    const igdbGames = [];

    for (let i = 0; i < games.length; i += batchSize) {
      const batch = games.slice(i, i + batchSize);
      const batchPromises = batch.map(async (steamGame) => {
        try {
          const normalizedName = normalizeGameName(steamGame.name);

          // Search IGDB for the game
          const igdbQuery = `
            fields id, name, cover.url, rating, summary, first_release_date;
            search "${normalizedName}";
            limit 5;
          `;

          const igdbResponse = await fetch("https://api.igdb.com/v4/games", {
            method: "POST",
            headers: {
              "Client-ID": twitchClientId,
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: igdbQuery,
          });

          if (igdbResponse.ok) {
            const igdbResults = await igdbResponse.json();
            if (igdbResults && igdbResults.length > 0) {
              // Find the best match using improved matching logic
              const bestMatch = findBestMatch(steamGame.name, igdbResults);

              if (!bestMatch) {
                console.log(
                  `No suitable match found for Steam game: ${steamGame.name}`,
                );
                return null;
              }

              // Skip if user already has this game
              console.log(
                `Checking if user has game "${bestMatch.name}" (IGDB ID: ${bestMatch.id})`,
              );
              if (existingIgdbIds.has(bestMatch.id)) {
                console.log(
                  `Skipping game "${bestMatch.name}" (IGDB ID: ${bestMatch.id}) - user already has it in library`,
                );
                return null;
              }

              console.log(
                `Adding new game "${bestMatch.name}" (IGDB ID: ${bestMatch.id}) to import list`,
              );

              console.log(
                `Matched Steam game "${steamGame.name}" to IGDB game "${bestMatch.name}"`,
              );

              return {
                steamAppId: steamGame.appid,
                steamName: steamGame.name,
                steamPlaytime: steamGame.playtime_forever || 0,
                status:
                  steamGame.playtime_forever && steamGame.playtime_forever > 0
                    ? "played"
                    : "want-to-play",
                igdbGame: {
                  id: bestMatch.id,
                  name: bestMatch.name,
                  cover: bestMatch.cover,
                  rating: bestMatch.rating,
                  summary: bestMatch.summary,
                  first_release_date: bestMatch.first_release_date,
                },
              };
            }
          }

          // If no IGDB match found, return null
          return null;
        } catch (error) {
          console.error(`Error processing game ${steamGame.name}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      igdbGames.push(...batchResults.filter((result) => result !== null));

      // Add a small delay between batches to be respectful to the API
      if (i + batchSize < games.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log(
      `Successfully matched ${igdbGames.length} new games with IGDB (filtered out existing games)`,
    );

    return new Response(
      JSON.stringify({
        games: igdbGames,
        totalSteamGames: games.length,
        matchedGames: igdbGames.length,
        existingGamesCount: existingIgdbIds.size,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error in steam-pull-games:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process Steam library",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
