import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  to: string;
  toName?: string;
  subject: string;
  body: string;
  entityType: "deal" | "person" | "organization";
  entityId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate JWT and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authError } = await supabase.auth.getClaims(token);
    
    if (authError || !claims?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claims.claims.sub;

    // Get user's profile to get their name and email
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", userId)
      .maybeSingle();

    // Get user's email from auth
    const { data: { user } } = await supabase.auth.getUser();
    const fromEmail = user?.email || "noreply@lovable.dev";
    const fromName = profile?.full_name || "Equipe";

    const { to, toName, subject, body, entityType, entityId }: SendEmailRequest = await req.json();

    // Validate required fields
    if (!to || !subject || !body || !entityType || !entityId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, body, entityType, entityId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending email to ${to} from ${fromName} <${fromEmail}>`);

    // Send email via Resend
    // Note: Using onboarding@resend.dev for testing. Replace with verified domain in production.
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: `${fromName} <onboarding@resend.dev>`,
      to: [to],
      subject: subject,
      html: body,
      reply_to: fromEmail,
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      
      // Record failed email
      await supabase.from("sent_emails").insert({
        entity_type: entityType,
        entity_id: entityId,
        from_email: fromEmail,
        from_name: fromName,
        to_email: to,
        to_name: toName || null,
        subject,
        body,
        status: "failed",
        error_message: emailError.message,
        created_by: userId,
      });

      return new Response(
        JSON.stringify({ error: "Failed to send email", details: emailError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Email sent successfully:", emailData);

    // Record sent email
    const { error: insertError } = await supabase.from("sent_emails").insert({
      entity_type: entityType,
      entity_id: entityId,
      from_email: fromEmail,
      from_name: fromName,
      to_email: to,
      to_name: toName || null,
      subject,
      body,
      status: "sent",
      created_by: userId,
    });

    if (insertError) {
      console.error("Error recording sent email:", insertError);
    }

    return new Response(
      JSON.stringify({ success: true, id: emailData?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
