import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { supabase } from "../../../supabase/supabase";
import { useAuth } from "../../../supabase/auth";

interface GameClub {
  id: string;
  name: string;
  game_title: string;
  igdb_game_id: number;
}

interface GameClubReviewProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  club: GameClub;
  onReviewSubmitted: () => void;
}

const GameClubReview: React.FC<GameClubReviewProps> = ({
  isOpen,
  onOpenChange,
  club,
  onReviewSubmitted,
}) => {
  const { user } = useAuth();
  const [rating, setRating] = useState<number[]>([5]);
  const [review, setReview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingReview, setExistingReview] = useState<any>(null);

  useEffect(() => {
    if (isOpen && user) {
      checkExistingReview();
    }
  }, [isOpen, user, club.id]);

  const checkExistingReview = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("game_club_reviews")
        .select("*")
        .eq("user_id", user.id)
        .eq("club_id", club.id)
        .single();

      if (data && !error) {
        setExistingReview(data);
        setRating([data.rating]);
        setReview(data.review_text || "");
      }
    } catch (error) {
      // No existing review found, which is fine
      console.log("No existing review found");
    }
  };

  const handleSubmit = async () => {
    if (!user || rating[0] === 0) return;

    setIsSubmitting(true);
    try {
      // First, check if user has this game in their collection
      const { data: collectionEntry } = await supabase
        .from("game_collections")
        .select("id")
        .eq("user_id", user.id)
        .eq("igdb_game_id", club.igdb_game_id)
        .single();

      let gameCollectionId;

      // If not in collection, add it as "played"
      if (!collectionEntry) {
        const { data: newEntry } = await supabase
          .from("game_collections")
          .insert({
            user_id: user.id,
            igdb_game_id: club.igdb_game_id,
            game_title: club.game_title,
            status: "played",
            personal_rating: rating[0],
            is_completed: true,
            date_completed: new Date().toISOString(),
          })
          .select("id")
          .single();

        gameCollectionId = newEntry?.id;
      } else {
        // Update existing collection entry with rating and mark as played
        await supabase
          .from("game_collections")
          .update({
            personal_rating: rating[0],
            status: "played",
            is_completed: true,
            date_completed: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", collectionEntry.id);

        gameCollectionId = collectionEntry.id;
      }

      let clubReviewId;

      // Add or update game club review
      if (existingReview) {
        const { data: updatedReview } = await supabase
          .from("game_club_reviews")
          .update({
            rating: rating[0],
            review_text: review.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingReview.id)
          .select("id")
          .single();

        clubReviewId = updatedReview?.id;
      } else {
        const { data: newReview } = await supabase
          .from("game_club_reviews")
          .insert({
            user_id: user.id,
            club_id: club.id,
            rating: rating[0],
            review_text: review.trim() || null,
            is_completed: true,
          })
          .select("id")
          .single();

        clubReviewId = newReview?.id;
      }

      // Also add/update regular game review if there's review text
      if (review.trim()) {
        const { data: existingGameReview } = await supabase
          .from("game_reviews")
          .select("id")
          .eq("user_id", user.id)
          .eq("game_collection_id", gameCollectionId)
          .single();

        if (existingGameReview) {
          await supabase
            .from("game_reviews")
            .update({
              rating: rating[0],
              review_text: review.trim(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingGameReview.id);
        } else {
          await supabase.from("game_reviews").insert({
            user_id: user.id,
            game_collection_id: gameCollectionId,
            rating: rating[0],
            review_text: review.trim(),
          });
        }
      }

      // Create activity for the review (using valid activity_type)
      await supabase.from("activity_feed").insert({
        user_id: user.id,
        activity_type: "review_posted",
        game_collection_id: gameCollectionId,
        activity_data: {
          rating: rating[0],
          review_text: review.trim() || null,
          game_club_id: club.id,
          game_club_name: club.name,
          game_title: club.game_title,
          igdb_game_id: club.igdb_game_id,
          source: "game_club",
        },
      });

      onReviewSubmitted();
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting review:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setRating([5]);
    setReview("");
    setExistingReview(null);
  };

  const getRatingText = (ratingValue: number) => {
    if (ratingValue === 0) return "No rating";
    if (ratingValue <= 2) return "Poor";
    if (ratingValue <= 4) return "Fair";
    if (ratingValue <= 6) return "Good";
    if (ratingValue <= 8) return "Great";
    return "Excellent";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {existingReview ? "Update Review" : "Rate & Review"}
          </DialogTitle>
          <DialogDescription>
            Share your thoughts and rating for {club.game_title} from the{" "}
            {club.name} club.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">
              {club.game_title}
            </h3>
            <p className="text-sm text-gray-600">
              How did you like this game from the {club.name} club?
            </p>
          </div>

          {/* Rating */}
          <div className="space-y-2">
            <Label>Rating: {rating[0]}/10 *</Label>
            <Slider
              value={rating}
              onValueChange={setRating}
              max={10}
              min={0.5}
              step={0.5}
              className="w-full"
            />
            <p className="text-sm text-gray-600">
              {getRatingText(rating[0])} ({rating[0].toFixed(1)}/10)
            </p>
          </div>

          {/* Review Text */}
          <div className="space-y-2">
            <Label htmlFor="review">Review (Optional)</Label>
            <Textarea
              id="review"
              placeholder="Share your thoughts about the game..."
              value={review}
              onChange={(e) => setReview(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isSubmitting}
            >
              Reset
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={rating[0] === 0 || isSubmitting}
              >
                {isSubmitting
                  ? "Submitting..."
                  : existingReview
                    ? "Update Review"
                    : "Submit Review"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GameClubReview;
