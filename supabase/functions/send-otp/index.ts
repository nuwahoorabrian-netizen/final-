import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Generate a cryptographically random 6-digit OTP */
function generateOtp(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const num = array[0] % 1_000_000;
  return num.toString().padStart(6, "0");
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, email, name } = await req.json();

    if (!user_id || !email) {
      return new Response(
        JSON.stringify({ success: false, error: "user_id and email are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 1. Invalidate / delete all existing OTPs for this user
    await supabase
      .from("otp_verifications")
      .delete()
      .eq("user_id", user_id);

    // 2. Generate OTP
    const otpCode = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    // 3. Insert new OTP record
    const { error: insertError } = await supabase
      .from("otp_verifications")
      .insert({
        user_id,
        otp_code: otpCode,
        expires_at: expiresAt,
        verified: false,
        attempt_count: 0,
      });

    if (insertError) {
      console.error("Failed to insert OTP:", insertError);
      throw new Error(`DB insert failed: ${insertError.message}`);
    }

    // 4. Send email via the existing notification function
    const notificationUrl = `${supabaseUrl}/functions/v1/send-email-notification`;
    const emailResp = await fetch(notificationUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
        "apikey": supabaseServiceKey,
      },
      body: JSON.stringify({
        notification_type: "otp_verification",
        recipient_email: email,
        recipient_name: name || "there",
        subject: "Your Verification Code",
        additional_message: otpCode,
      }),
    });

    let emailSent = false;
    if (!emailResp.ok) {
      const errText = await emailResp.text();
      console.error("Email send failed:", errText);
      // Still return success — OTP is in DB, return code as fallback
    } else {
      emailSent = true;
    }

    console.log(`OTP ${emailSent ? "emailed" : "saved (no email)"} for ${email}`);

    return new Response(
      JSON.stringify({ success: true, otp_code: otpCode, email_sent: emailSent }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-otp function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
