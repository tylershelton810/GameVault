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

    try {
      // Check if user already reacted with this emoji
      const message = messages.find((m) => m.id === messageId);
      const existingReaction = message?.reactions.find(
        (r) => r.user_id === user.id && r.emoji === emoji,
      );

      if (existingReaction) {
        // Remove reaction
        await supabase
          .from("game_club_reactions")
          .delete()
          .eq("id", existingReaction.id);
      } else {
        // Add reaction
        await supabase.from("game_club_reactions").insert({
          message_id: messageId,
          user_id: user.id,
          emoji,
        });
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
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Pin className="w-4 h-4" />
              Pinned Messages
            </div>
            {pinnedMessages.map((message) => (
              <div
                key={message.id}
                className="bg-yellow-50 border border-yellow-200 rounded-lg p-3"
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
                      <span className="text-sm font-medium text-gray-900">
                        {message.user.full_name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTime(message.created_at)}
                      </span>
                      <Pin className="w-3 h-3 text-yellow-600" />
                    </div>
                    <p className="text-sm text-gray-700">
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
              <div className="text-center py-8 text-gray-500">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
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
                          <span className="text-sm font-medium text-gray-900">
                            {message.user.full_name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatTime(message.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">
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
                                        ? "bg-blue-50 border-blue-200 text-blue-700"
                                        : "hover:bg-gray-50"
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
