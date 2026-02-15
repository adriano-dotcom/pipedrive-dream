import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Use service role to update campaign/recipient statuses
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate JWT
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authError } = await userClient.auth.getClaims(token);
    if (authError || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claims.claims.sub;

    // Get user's profile for sender info
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: authUser } = await userClient.auth.getUser();
    const fromEmail = authUser?.user?.email || "noreply@lovable.dev";
    const fromName = profile?.full_name || "Equipe";

    // Parse request body for campaign_id
    const { campaign_id } = await req.json();
    if (!campaign_id) {
      return new Response(JSON.stringify({ error: "campaign_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get campaign
    const { data: campaign, error: campaignError } = await supabase
      .from("bulk_email_campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();

    if (campaignError || !campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update campaign status to processing
    await supabase
      .from("bulk_email_campaigns")
      .update({ status: "processing" })
      .eq("id", campaign_id);

    // Get pending recipients (limited by rate_limit)
    const { data: recipients, error: recipientError } = await supabase
      .from("bulk_email_recipients")
      .select("*")
      .eq("campaign_id", campaign_id)
      .eq("status", "pending")
      .limit(campaign.rate_limit || 10);

    if (recipientError) {
      console.error("Error fetching recipients:", recipientError);
      return new Response(JSON.stringify({ error: "Error fetching recipients" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trackingBaseUrl = `${supabaseUrl}/functions/v1/track-email-open`;
    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of recipients || []) {
      // Check person's email_status
      if (recipient.person_id) {
        const { data: person } = await supabase
          .from("people")
          .select("email_status")
          .eq("id", recipient.person_id)
          .maybeSingle();

        if (person && person.email_status !== "active") {
          await supabase
            .from("bulk_email_recipients")
            .update({ status: "blocked", error_message: `Email ${person.email_status}` })
            .eq("id", recipient.id);
          failedCount++;
          continue;
        }
      }

      // Insert tracking pixel
      const trackingUrl = `${trackingBaseUrl}?tid=${recipient.tracking_id}`;
      const bodyWithPixel = campaign.body + `<img src="${trackingUrl}" width="1" height="1" style="display:none" alt="" />`;

      try {
        const { error: emailError } = await resend.emails.send({
          from: `${fromName} <onboarding@resend.dev>`,
          to: [recipient.email],
          subject: campaign.subject,
          html: bodyWithPixel,
          reply_to: fromEmail,
        });

        if (emailError) {
          await supabase
            .from("bulk_email_recipients")
            .update({ status: "failed", error_message: emailError.message })
            .eq("id", recipient.id);
          failedCount++;
        } else {
          await supabase
            .from("bulk_email_recipients")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", recipient.id);
          sentCount++;
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        await supabase
          .from("bulk_email_recipients")
          .update({ status: "failed", error_message: errMsg })
          .eq("id", recipient.id);
        failedCount++;
      }

      // Small delay between emails for rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // Update campaign counters
    const { data: updatedCampaign } = await supabase
      .from("bulk_email_campaigns")
      .select("sent_count, failed_count")
      .eq("id", campaign_id)
      .single();

    const newSentCount = (updatedCampaign?.sent_count || 0) + sentCount;
    const newFailedCount = (updatedCampaign?.failed_count || 0) + failedCount;

    // Check if there are remaining pending recipients
    const { count: pendingCount } = await supabase
      .from("bulk_email_recipients")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", campaign_id)
      .eq("status", "pending");

    const newStatus = (pendingCount || 0) === 0 ? "completed" : "processing";

    await supabase
      .from("bulk_email_campaigns")
      .update({
        sent_count: newSentCount,
        failed_count: newFailedCount,
        status: newStatus,
      })
      .eq("id", campaign_id);

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        failed: failedCount,
        remaining: pendingCount || 0,
        status: newStatus,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in process-bulk-email:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
