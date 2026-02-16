import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, svix-id, svix-timestamp, svix-signature",
};

// Verify Resend/Svix webhook signature
async function verifyWebhookSignature(req: Request, body: string): Promise<boolean> {
  const webhookSecret = Deno.env.get("RESEND_WEBHOOK_SECRET");
  
  if (!webhookSecret) {
    console.error("RESEND_WEBHOOK_SECRET not configured - rejecting request");
    return false;
  }

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.error("Missing Svix headers for webhook verification");
    return false;
  }

  // Check timestamp is within 5 minutes to prevent replay attacks
  const timestampSeconds = parseInt(svixTimestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestampSeconds) > 300) {
    console.error("Webhook timestamp too old or too far in the future");
    return false;
  }

  // Build the signed content
  const signedContent = `${svixId}.${svixTimestamp}.${body}`;

  // The secret comes as "whsec_<base64>" - decode the base64 part
  const secretBytes = Uint8Array.from(
    atob(webhookSecret.startsWith("whsec_") ? webhookSecret.slice(6) : webhookSecret),
    (c) => c.charCodeAt(0)
  );

  // Import key and sign
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedContent));
  const computedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));

  // Svix sends multiple signatures separated by space, each prefixed with "v1,"
  const expectedSignatures = svixSignature.split(" ");
  for (const sig of expectedSignatures) {
    const sigValue = sig.startsWith("v1,") ? sig.slice(3) : sig;
    if (sigValue === computedSignature) {
      return true;
    }
  }

  console.error("Webhook signature verification failed");
  return false;
}

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

    // Read body as text for signature verification
    const bodyText = await req.text();

    // Verify webhook signature
    const isValid = await verifyWebhookSignature(req, bodyText);
    if (!isValid) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const payload = JSON.parse(bodyText);
    const { type, data } = payload;

    console.log("Resend webhook event:", type);

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
