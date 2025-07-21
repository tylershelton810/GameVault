import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
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
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
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
        .from("user_game_reviews")
        .select("*")
        .eq("user_id", user.id)
        .eq("igdb_game_id", club.igdb_game_id)
        .single();

      if (data && !error) {
        setExistingReview(data);
        setRating(data.rating);
        setReview(data.review_text || "");
      }
    } catch (error) {
      // No existing review found, which is fine
      console.log("No existing review found");
    }
  };

  const handleSubmit = async () => {
    if (!user || rating === 0) return;

    setIsSubmitting(true);
    try {
      // First, check if user has this game in their library
      const { data: libraryEntry } = await supabase
        .from("user_games")
        .select("id")
        .eq("user_id", user.id)
        .eq("igdb_game_id", club.igdb_game_id)
        .single();

      // If not in library, add it as "played"
      if (!libraryEntry) {
        await supabase.from("user_games").insert({
          user_id: user.id,
          igdb_game_id: club.igdb_game_id,
          game_title: club.game_title,
          status: "played",
          rating: rating,
        });
      } else {
        // Update existing library entry with rating
        await supabase
          .from("user_games")
          .update({
            rating: rating,
            status: "played",
          })
          .eq("id", libraryEntry.id);
      }

      // Add or update review
      if (existingReview) {
        await supabase
          .from("user_game_reviews")
          .update({
            rating: rating,
            review_text: review.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingReview.id);
      } else {
        await supabase.from("user_game_reviews").insert({
          user_id: user.id,
          igdb_game_id: club.igdb_game_id,
          game_title: club.game_title,
          rating: rating,
          review_text: review.trim() || null,
        });
      }

      // Create activity for the review
      await supabase.from("user_activities").insert({
        user_id: user.id,
        activity_type: "game_reviewed",
        game_id: club.igdb_game_id,
        game_title: club.game_title,
        metadata: {
          rating: rating,
          review_text: review.trim() || null,
          game_club_id: club.id,
          game_club_name: club.name,
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
    setRating(0);
    setHoverRating(0);
    setReview("");
    setExistingReview(null);
  };

  const getRatingText = (rating: number) => {
    if (rating === 0) return "No rating";
    if (rating <= 2) return "Poor";
    if (rating <= 4) return "Fair";
    if (rating <= 6) return "Good";
    if (rating <= 8) return "Great";
    return "Excellent";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {existingReview ? "Update Review" : "Rate & Review"}
          </DialogTitle>
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
            <Label>Rating *</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => {
                const isFilled = star <= (hoverRating || rating);
                const isHalf =
                  star === Math.ceil(hoverRating || rating) &&
                  (hoverRating || rating) % 1 !== 0;

                return (
                  <button
                    key={star}
                    type="button"
                    className="p-1 hover:scale-110 transition-transform"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                  >
                    <Star
                      className={`w-6 h-6 transition-colors ${
                        isFilled
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300 hover:text-yellow-400"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <p className="text-sm text-gray-600">
              {getRatingText(hoverRating || rating)} ({hoverRating || rating}
              /10)
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
                disabled={rating === 0 || isSubmitting}
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
