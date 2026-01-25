import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SendMentionNotificationParams {
  noteContent: string;
  entityType: "deal" | "person" | "organization";
  entityId: string;
  entityName: string;
}

export function useMentionNotifications() {
  const { profile } = useAuth();

  const extractMentionedUserIds = (htmlContent: string): string[] => {
    // Extract user IDs from mention spans: <span data-type="mention" data-id="user-id">@Name</span>
    const mentionRegex = /data-id="([^"]+)"/g;
    const userIds: string[] = [];
    let match;
    
    while ((match = mentionRegex.exec(htmlContent)) !== null) {
      if (match[1] && !userIds.includes(match[1])) {
        userIds.push(match[1]);
      }
    }
    
    return userIds;
  };

  const sendMentionNotifications = async ({
    noteContent,
    entityType,
    entityId,
    entityName,
  }: SendMentionNotificationParams) => {
    const mentionedUserIds = extractMentionedUserIds(noteContent);
    
    if (mentionedUserIds.length === 0) {
      return { success: true, sent: 0 };
    }

    try {
      const { data, error } = await supabase.functions.invoke("send-mention-notification", {
        body: {
          mentionedUserIds,
          noteContent,
          entityType,
          entityId,
          entityName,
          authorName: profile?.full_name || "Alguém",
        },
      });

      if (error) {
        console.error("Error sending mention notifications:", error);
        return { success: false, error };
      }

      return { success: true, ...data };
    } catch (error) {
      console.error("Error invoking mention notification function:", error);
      return { success: false, error };
    }
  };

  return { sendMentionNotifications, extractMentionedUserIds };
}
