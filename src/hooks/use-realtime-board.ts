import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface PresenceUser {
  userId: string;
  onlineAt: string;
}

export function useRealtimeBoard(workspaceId: string, currentUserId: string) {
  const queryClient = useQueryClient();
  const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    let channel: any;
    let isMounted = true;

    async function initRealtime() {
      try {
        if (!isMounted) return;

        const channelTopic = `workspace:${workspaceId}`;
        // We no longer need custom JWT token for Postgres RLS, 
        // because we are switching to custom Broadcast events over public channels.
        // The UUID of the workspace acts as an unguessable channel name.
        
        // Remove existing channel if it exists to prevent "after subscribe" errors in Strict Mode
        const existingChannel = supabase.getChannels().find((c) => c.topic === channelTopic);
        if (existingChannel) {
          await supabase.removeChannel(existingChannel);
        }

        if (!isMounted) return;

        channel = supabase
          .channel(channelTopic, {
            config: {
              presence: {
                key: currentUserId,
              },
            },
          })
          .on("presence", { event: "sync" }, () => {
            const newState = channel.presenceState();
            const users: PresenceUser[] = [];
            for (const id in newState) {
              // Get the first presence instance for this user
              const presence = newState[id][0] as PresenceUser;
              users.push({ userId: id, onlineAt: presence.onlineAt });
            }
            setActiveUsers(users);
          })
          .on("presence", { event: "join" }, ({ key, newPresences }) => {
            // join handled
          })
          .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
            // leave handled
          })
          .on("broadcast", { event: "BOARD_UPDATED" }, () => {
            // When another client updates the board, just invalidate our queries
            // so React Query fetches the latest state transparently.
            queryClient.invalidateQueries({ queryKey: ["board", workspaceId] });
          })
          .on("broadcast", { event: "WORKSPACE_DELETED" }, () => {
            toast.error("Workspace ini telah dihapus oleh Admin.", { duration: 10000 });
            queryClient.clear();
            window.location.href = "/dashboard";
          })
          .subscribe(async (status, err) => {
            if (status === "SUBSCRIBED") {
              await channel.track({
                userId: currentUserId,
                onlineAt: new Date().toISOString(),
              });
            }
          });

      } catch (error) {
        console.error("Realtime initialization error:", error);
      }
    }

    initRealtime();

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [workspaceId, currentUserId, queryClient]);

  return { activeUsers };
}
