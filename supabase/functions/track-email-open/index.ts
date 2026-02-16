import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 1x1 transparent GIF
const TRANSPARENT_GIF = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
  0x80, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21,
  0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00,
  0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
  0x01, 0x00, 0x3b,
]);

// UUID v4 format validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req: Request) => {
  const url = new URL(req.url);
  const trackingId = url.searchParams.get("tid");

  // Validate tracking ID is a valid UUID before querying
  if (trackingId && UUID_REGEX.test(trackingId)) {
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Update recipient as opened (only if not already opened)
      const { data: recipient } = await supabase
        .from("bulk_email_recipients")
        .select("id, campaign_id, status")
        .eq("tracking_id", trackingId)
        .maybeSingle();

      if (recipient && recipient.status !== "opened") {
        await supabase
          .from("bulk_email_recipients")
          .update({ status: "opened", opened_at: new Date().toISOString() })
          .eq("id", recipient.id);

        // Increment campaign opened_count
        const { data: campaign } = await supabase
          .from("bulk_email_campaigns")
          .select("opened_count")
          .eq("id", recipient.campaign_id)
          .single();

        if (campaign) {
          await supabase
            .from("bulk_email_campaigns")
            .update({ opened_count: (campaign.opened_count || 0) + 1 })
            .eq("id", recipient.campaign_id);
        }
      }
    } catch (err) {
      console.error("Error tracking email open:", err);
    }
  }

  return new Response(TRANSPARENT_GIF, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
});
