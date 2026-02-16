import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check payload size
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 1_000_000) {
      return new Response(JSON.stringify({ error: 'Payload too large' }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const payload = await req.json();
    const { type, data } = payload;

    console.log("Resend webhook event:", type, data);

    // Handle bounce and complaint events
    if (type === "email.bounced" || type === "email.complained") {
      const toEmail = data?.to?.[0];
      if (!toEmail) {
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const newStatus = type === "email.bounced" ? "bounced" : "blocked";

      // Update any matching recipients
      const { data: recipients } = await supabase
        .from("bulk_email_recipients")
        .select("id, campaign_id, person_id")
        .eq("email", toEmail)
        .in("status", ["sent", "opened"]);

      for (const recipient of recipients || []) {
        await supabase
          .from("bulk_email_recipients")
          .update({ status: newStatus, error_message: type })
          .eq("id", recipient.id);

        // Increment failed_count on campaign
        const { data: campaign } = await supabase
          .from("bulk_email_campaigns")
          .select("failed_count")
          .eq("id", recipient.campaign_id)
          .single();

        if (campaign) {
          await supabase
            .from("bulk_email_campaigns")
            .update({ failed_count: (campaign.failed_count || 0) + 1 })
            .eq("id", recipient.campaign_id);
        }

        // Block person's email
        if (recipient.person_id) {
          await supabase
            .from("people")
            .update({ email_status: newStatus })
            .eq("id", recipient.person_id);
        }
      }

      // Also block in people table by email directly
      await supabase
        .from("people")
        .update({ email_status: newStatus })
        .eq("email", toEmail);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in resend-webhook:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
