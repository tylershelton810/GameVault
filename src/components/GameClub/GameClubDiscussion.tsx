import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  Send,
  Pin,
  Heart,
  Smile,
  MoreHorizontal,
} from "lucide-react";
import { supabase } from "../../../supabase/supabase";
import { useAuth } from "../../../supabase/auth";
import { useTheme } from "@/lib/theme";

interface Message {
  id: string;
  user_id: string;
  message_text: string;
  is_pinned: boolean;
  created_at: string;
  user: {
    full_name: string;
    avatar_url?: string;
    email: string;
  };
  reactions: Reaction[];
}

interface Reaction {
  id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  user: {
    full_name: string;
  };
}

interface GameClubDiscussionProps {
  clubId: string;
}

const GameClubDiscussion: React.FC<GameClubDiscussionProps> = ({ clubId }) => {
  const { user } = useAuth();
  const { currentTheme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    subscribeToMessages();
  }, [clubId]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("game_club_messages")
        .select(
          `
          *,
          user:users!game_club_messages_user_id_fkey (
            full_name,
            avatar_url,
            email
          ),
          reactions:game_club_reactions (
            id,
            user_id,
            emoji,
            created_at,
            user:users!game_club_reactions_user_id_fkey (
              full_name
            )
          )
        `,
        )
        .eq("club_id", clubId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        return;
      }

      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`game_club_${clubId}_messages`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_club_messages",
          filter: `club_id=eq.${clubId}`,
        },
        () => {
          fetchMessages();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_club_reactions",
        },
        () => {
          fetchMessages();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || isSending) return;

    setIsSending(true);
    try {
      const { error } = await supabase.from("game_club_messages").insert({
        club_id: clubId,
        user_id: user.id,
        message_text: newMessage.trim(),
      });

      if (error) {
        console.error("Error sending message:", error);
        return;
      }

      setNewMessage("");
      // Scroll to bottom after sending
      setTimeout(() => {
        if (scrollAreaRef.current) {
          const scrollContainer = scrollAreaRef.current.querySelector(
            "[data-radix-scroll-area-viewport]",
          );
          if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
          }
        }
      }, 100);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    // Find the message and existing reaction
    const message = messages.find((m) => m.id === messageId);
    const existingReaction = message?.reactions.find(
      (r) => r.user_id === user.id && r.emoji === emoji,
    );

    // Optimistically update the UI first
    setMessages((prevMessages) => {
      return prevMessages.map((msg) => {
        if (msg.id === messageId) {
          if (existingReaction) {
            // Remove the reaction optimistically
            return {
              ...msg,
              reactions: msg.reactions.filter(
                (r) => r.id !== existingReaction.id,
              ),
            };
          } else {
            // Add the reaction optimistically
            const newReaction: Reaction = {
              id: `temp-${Date.now()}`, // Temporary ID
              user_id: user.id,
              emoji,
              created_at: new Date().toISOString(),
              user: {
                full_name:
                  user.user_metadata?.full_name || user.email || "Unknown",
              },
            };
            return {
              ...msg,
              reactions: [...msg.reactions, newReaction],
            };
          }
        }
        return msg;
      });
    });

    try {
      if (existingReaction) {
        // Remove reaction from database
        const { error } = await supabase
          .from("game_club_reactions")
          .delete()
          .eq("id", existingReaction.id);

        if (error) {
          // Revert optimistic update on error
          fetchMessages();
          throw error;
        }
      } else {
        // Add reaction to database using upsert to handle conflicts
        const { error } = await supabase.from("game_club_reactions").upsert(
          {
            message_id: messageId,
            user_id: user.id,
            emoji,
          },
          {
            onConflict: "message_id,user_id,emoji",
            ignoreDuplicates: true,
          },
        );

        if (error && error.code !== "23505") {
          // Revert optimistic update on error
          fetchMessages();
          // 23505 is unique constraint violation, which we can ignore
          throw error;
        }
      }
    } catch (error) {
      console.error("Error toggling reaction:", error);
    }
  };

  const togglePin = async (messageId: string, currentPinStatus: boolean) => {
    if (!user) return;

    try {
      await supabase
        .from("game_club_messages")
        .update({ is_pinned: !currentPinStatus })
        .eq("id", messageId);
    } catch (error) {
      console.error("Error toggling pin:", error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }
  };

  const groupReactionsByEmoji = (reactions: Reaction[]) => {
    const grouped: { [emoji: string]: Reaction[] } = {};
    reactions.forEach((reaction) => {
      if (!grouped[reaction.emoji]) {
        grouped[reaction.emoji] = [];
      }
      grouped[reaction.emoji].push(reaction);
    });
    return grouped;
  };

  const pinnedMessages = messages.filter((m) => m.is_pinned);
  const regularMessages = messages.filter((m) => !m.is_pinned);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Discussion
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Discussion
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pinned Messages */}
        {pinnedMessages.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Pin className="w-4 h-4" />
              Pinned Messages
            </div>
            {pinnedMessages.map((message) => (
              <div
                key={message.id}
                className="rounded-lg p-3"
                style={{
                  backgroundColor: `hsl(${currentTheme.colors.accent} / 0.1)`,
                  border: `1px solid hsl(${currentTheme.colors.accent} / 0.3)`,
                }}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={
                        message.user.avatar_url ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.user.email}`
                      }
                      alt={message.user.full_name}
                    />
                    <AvatarFallback className="text-xs">
                      {message.user.full_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">
                        {message.user.full_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(message.created_at)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                        onClick={() => togglePin(message.id, message.is_pinned)}
                      >
                        <Pin
                          className="w-3 h-3"
                          style={{
                            color: `hsl(${currentTheme.colors.accent})`,
                          }}
                        />
                      </Button>
                    </div>
                    <p className="text-sm text-foreground">
                      {message.message_text}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="h-96" ref={scrollAreaRef}>
          <div className="space-y-4 pr-4">
            {regularMessages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              regularMessages.map((message) => {
                const groupedReactions = groupReactionsByEmoji(
                  message.reactions,
                );
                return (
                  <div key={message.id} className="group">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={
                            message.user.avatar_url ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.user.email}`
                          }
                          alt={message.user.full_name}
                        />
                        <AvatarFallback className="text-xs">
                          {message.user.full_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-foreground">
                            {message.user.full_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(message.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-foreground mb-2">
                          {message.message_text}
                        </p>

                        {/* Reactions */}
                        {Object.keys(groupedReactions).length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {Object.entries(groupedReactions).map(
                              ([emoji, reactions]) => {
                                const userReacted = reactions.some(
                                  (r) => r.user_id === user?.id,
                                );
                                return (
                                  <Button
                                    key={emoji}
                                    variant="outline"
                                    size="sm"
                                    className={`h-6 px-2 text-xs ${
                                      userReacted
                                        ? "bg-primary/10 border-primary/20 text-primary"
                                        : "hover:bg-muted"
                                    }`}
                                    onClick={() =>
                                      toggleReaction(message.id, emoji)
                                    }
                                  >
                                    {emoji} {reactions.length}
                                  </Button>
                                );
                              },
                            )}
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => toggleReaction(message.id, "👍")}
                          >
                            👍
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => toggleReaction(message.id, "❤️")}
                          >
                            ❤️
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => toggleReaction(message.id, "😄")}
                          >
                            😄
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() =>
                              togglePin(message.id, message.is_pinned)
                            }
                          >
                            <Pin className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="flex gap-2">
          <Textarea
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="min-h-[40px] max-h-[120px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim() || isSending}
            size="sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default GameClubDiscussion;
