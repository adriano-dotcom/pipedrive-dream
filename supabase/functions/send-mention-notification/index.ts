import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MentionNotificationRequest {
  mentionedUserIds: string[];
  noteContent: string;
  entityType: "deal" | "person" | "organization";
  entityId: string;
  entityName: string;
  authorName: string;
}

interface NotificationInsert {
  user_id: string;
  type: string;
  title: string;
  message: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  created_by: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the token
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { mentionedUserIds, noteContent, entityType, entityId, entityName, authorName }: MentionNotificationRequest = await req.json();

    console.log("Processing mention notifications for users:", mentionedUserIds);

    if (!mentionedUserIds || mentionedUserIds.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No mentions to process" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clean HTML for plain text preview
    const plainTextContent = noteContent
      .replace(/<[^>]*>/g, "")
      .substring(0, 200);

    // Insert in-app notifications for all mentioned users
    const notificationsToInsert: NotificationInsert[] = mentionedUserIds.map((userId) => ({
      user_id: userId,
      type: "mention",
      title: `${authorName} mencionou você em uma nota`,
      message: plainTextContent,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      created_by: claimsData.user.id,
    }));

    const { error: notificationError } = await supabase
      .from("notifications")
      .insert(notificationsToInsert);

    if (notificationError) {
      console.error("Error inserting notifications:", notificationError);
    } else {
      console.log(`Inserted ${notificationsToInsert.length} in-app notifications`);
    }

    // Get user emails from auth.users via profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", mentionedUserIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw new Error("Failed to fetch user profiles");
    }

    // Get emails from auth.users
    const emails: { email: string; name: string }[] = [];
    for (const profile of profiles || []) {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(profile.user_id);
      if (!userError && userData?.user?.email) {
        emails.push({
          email: userData.user.email,
          name: profile.full_name,
        });
      }
    }

    console.log("Sending email notifications to:", emails.map(e => e.email));

    const entityTypeLabels: Record<string, string> = {
      deal: "negócio",
      person: "pessoa",
      organization: "organização",
    };

    const entityUrlPaths: Record<string, string> = {
      deal: "deals",
      person: "people",
      organization: "organizations",
    };

    const appUrl = "https://pipedrive-dream.lovable.app";
    const entityLink = `${appUrl}/${entityUrlPaths[entityType]}/${entityId}`;
    const typeLabel = entityTypeLabels[entityType] || entityType;

    // Send emails using Resend API directly
    const emailPromises = emails.map(async ({ email }) => {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "CRM Jacometo <crm@jacometo.com.br>",
          to: [email],
          subject: `${authorName} mencionou você em uma nota`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
              <div style="padding: 32px 24px;">
                <h2 style="color: #111827; margin: 0 0 8px 0; font-size: 20px;">Você foi mencionado em uma nota</h2>
                <p style="color: #6b7280; margin: 0 0 24px 0; font-size: 15px;">
                  <strong>${authorName}</strong> mencionou você em uma nota.
                </p>
                
                <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 0 0 24px 0;">
                  <p style="color: #6b7280; margin: 0 0 4px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">${typeLabel}</p>
                  <h3 style="color: #111827; margin: 0 0 12px 0; font-size: 18px;">${entityName}</h3>
                  <div style="color: #374151; margin: 0; font-size: 14px; line-height: 1.5;">
                    ${plainTextContent}${noteContent.length > 200 ? "..." : ""}
                  </div>
                </div>
                
                <div style="text-align: center; margin: 24px 0;">
                  <a href="${entityLink}" 
                     style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 15px; font-weight: 500;">
                    Ver no CRM
                  </a>
                </div>
                
                <p style="color: #9ca3af; font-size: 12px; margin: 24px 0 0 0; text-align: center;">
                  Esta é uma notificação automática do CRM Jacometo.
                </p>
              </div>
            </div>
          `,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send email");
      }

      return response.json();
    });

    const results = await Promise.allSettled(emailPromises);
    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failedCount = results.filter((r) => r.status === "rejected").length;

    console.log(`Sent ${successCount} emails, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failedCount,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-mention-notification:", errorMessage);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
