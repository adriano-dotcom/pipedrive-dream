import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const activityTypeLabels: Record<string, string> = {
  task: "Tarefa",
  call: "Ligação",
  whatsapp: "WhatsApp",
  meeting: "Reunião",
  email: "Email",
  deadline: "Prazo",
};

interface AssignmentRequest {
  activityTitle: string;
  activityType: string;
  dueDate: string;
  dueTime?: string;
  assignedToUserId: string;
  assignerName: string;
  dealName?: string;
  personName?: string;
  organizationName?: string;
}

serve(async (req) => {
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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      activityTitle,
      activityType,
      dueDate,
      dueTime,
      assignedToUserId,
      assignerName,
      dealName,
      personName,
      organizationName,
    }: AssignmentRequest = await req.json();

    console.log(
      "Processing activity assignment notification for user:",
      assignedToUserId
    );

    // Get assigned user email
    const { data: userData, error: userError } =
      await supabase.auth.admin.getUserById(assignedToUserId);
    if (userError || !userData?.user?.email) {
      console.error("Error fetching user:", userError);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get assigned user profile name
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", assignedToUserId)
      .single();

    const assignedUserName = profile?.full_name || userData.user.email;
    const assignedUserEmail = userData.user.email;
    const typeLabel = activityTypeLabels[activityType] || activityType;

    // Build linked items HTML
    const linkedItems: string[] = [];
    if (dealName) linkedItems.push(`<strong>Negócio:</strong> ${dealName}`);
    if (personName) linkedItems.push(`<strong>Pessoa:</strong> ${personName}`);
    if (organizationName)
      linkedItems.push(`<strong>Organização:</strong> ${organizationName}`);

    const linkedItemsHtml =
      linkedItems.length > 0
        ? `<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
            ${linkedItems.map((item) => `<p style="color: #555; margin: 4px 0; font-size: 14px;">${item}</p>`).join("")}
           </div>`
        : "";

    const appUrl = "https://pipedrive-dream.lovable.app";

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="padding: 32px 24px;">
          <h2 style="color: #111827; margin: 0 0 8px 0; font-size: 20px;">Nova atividade atribuída a você</h2>
          <p style="color: #6b7280; margin: 0 0 24px 0; font-size: 15px;">
            <strong>${assignerName}</strong> atribuiu uma atividade para você.
          </p>
          
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 0 0 24px 0;">
            <p style="color: #6b7280; margin: 0 0 4px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">${typeLabel}</p>
            <h3 style="color: #111827; margin: 0 0 12px 0; font-size: 18px;">${activityTitle}</h3>
            <p style="color: #374151; margin: 0; font-size: 14px;">
              📅 <strong>Data:</strong> ${dueDate}${dueTime ? ` às ${dueTime}` : ""}
            </p>
            ${linkedItemsHtml}
          </div>
          
          <div style="text-align: center; margin: 24px 0;">
            <a href="${appUrl}/activities" 
               style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 15px; font-weight: 500;">
              Ver Atividades
            </a>
          </div>
          
          <p style="color: #9ca3af; font-size: 12px; margin: 24px 0 0 0; text-align: center;">
            Esta é uma notificação automática do CRM Jacometo.
          </p>
        </div>
      </div>
    `;

    // Try to send email (non-blocking - don't fail if email fails)
    let emailSent = false;
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "CRM Jacometo <crm@jacometo.com.br>",
          to: [assignedUserEmail],
          subject: `${assignerName} atribuiu uma atividade: ${activityTitle}`,
          html: emailHtml,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.warn("Resend email failed (non-critical):", errorData.message || "Unknown error");
      } else {
        const result = await response.json();
        console.log("Email sent successfully:", result);
        emailSent = true;
      }
    } catch (emailError) {
      console.warn("Email sending error (non-critical):", emailError);
    }

    // Always create in-app notification
    await supabase.from("notifications").insert({
      user_id: assignedToUserId,
      type: "activity_assignment",
      title: `${assignerName} atribuiu uma atividade para você`,
      message: `${typeLabel}: ${activityTitle} - ${dueDate}${dueTime ? ` às ${dueTime}` : ""}`,
      entity_type: "activity",
      entity_name: activityTitle,
      created_by: claimsData.user.id,
    });

    return new Response(JSON.stringify({ success: true, emailSent }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error in notify-activity-assignment:", errorMessage);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
