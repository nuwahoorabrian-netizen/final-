import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EmailNotificationRequest {
  notification_type: string;
  recipient_email: string;
  recipient_user_id?: string;
  recipient_name?: string;
  subject: string;
  event_id?: string;
  meeting_id?: string;
  event_title?: string;
  event_date?: string;
  event_time?: string;
  event_venue?: string;
  meeting_title?: string;
  meeting_date?: string;
  meeting_time?: string;
  meeting_link?: string;
  organizer_name?: string;
  status?: string;
  additional_message?: string;
}

// Email templates for different notification types
function getEmailTemplate(data: EmailNotificationRequest): string {
  const baseUrl = Deno.env.get("SITE_URL") || "https://qqmzhdnofylwjkyqeqei.supabase.co";
  
  const styles = `
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
      .header h1 { margin: 0; font-size: 24px; }
      .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
      .details { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
      .details p { margin: 8px 0; }
      .details strong { color: #374151; }
      .button { display: inline-block; background: #6366f1; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
      .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      .status-approved { color: #059669; font-weight: bold; }
      .status-rejected { color: #dc2626; font-weight: bold; }
      .status-pending { color: #d97706; font-weight: bold; }
    </style>
  `;

  let content = "";
  
  switch (data.notification_type) {
    case "event_created":
      content = `
        <div class="header">
          <h1>🎉 New Event Created</h1>
        </div>
        <div class="content">
          <p>Hello ${data.recipient_name || "there"},</p>
          <p>A new event has been created and is pending approval:</p>
          <div class="details">
            <p><strong>Event:</strong> ${data.event_title}</p>
            <p><strong>Date:</strong> ${data.event_date}</p>
            <p><strong>Time:</strong> ${data.event_time}</p>
            <p><strong>Venue:</strong> ${data.event_venue}</p>
            <p><strong>Organizer:</strong> ${data.organizer_name}</p>
          </div>
          <a href="${baseUrl}/events/${data.event_id}" class="button">View Event Details</a>
        </div>
      `;
      break;

    case "event_updated":
      content = `
        <div class="header">
          <h1>📝 Event Updated</h1>
        </div>
        <div class="content">
          <p>Hello ${data.recipient_name || "there"},</p>
          <p>An event you're associated with has been updated:</p>
          <div class="details">
            <p><strong>Event:</strong> ${data.event_title}</p>
            <p><strong>Date:</strong> ${data.event_date}</p>
            <p><strong>Time:</strong> ${data.event_time}</p>
            <p><strong>Venue:</strong> ${data.event_venue}</p>
          </div>
          ${data.additional_message ? `<p><em>${data.additional_message}</em></p>` : ""}
          <a href="${baseUrl}/events/${data.event_id}" class="button">View Updated Event</a>
        </div>
      `;
      break;

    case "event_cancelled":
      content = `
        <div class="header" style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);">
          <h1>❌ Event Cancelled</h1>
        </div>
        <div class="content">
          <p>Hello ${data.recipient_name || "there"},</p>
          <p>We regret to inform you that the following event has been cancelled:</p>
          <div class="details">
            <p><strong>Event:</strong> ${data.event_title}</p>
            <p><strong>Originally scheduled:</strong> ${data.event_date} at ${data.event_time}</p>
            <p><strong>Venue:</strong> ${data.event_venue}</p>
          </div>
          ${data.additional_message ? `<p><em>Reason: ${data.additional_message}</em></p>` : ""}
          <p>We apologize for any inconvenience caused.</p>
        </div>
      `;
      break;

    case "event_approved":
      content = `
        <div class="header" style="background: linear-gradient(135deg, #059669 0%, #10b981 100%);">
          <h1>✅ Event Approved</h1>
        </div>
        <div class="content">
          <p>Hello ${data.recipient_name || "there"},</p>
          <p>Great news! Your event has been <span class="status-approved">APPROVED</span>:</p>
          <div class="details">
            <p><strong>Event:</strong> ${data.event_title}</p>
            <p><strong>Date:</strong> ${data.event_date}</p>
            <p><strong>Time:</strong> ${data.event_time}</p>
            <p><strong>Venue:</strong> ${data.event_venue}</p>
          </div>
          <a href="${baseUrl}/events/${data.event_id}" class="button">View Your Event</a>
        </div>
      `;
      break;

    case "event_rejected":
      content = `
        <div class="header" style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);">
          <h1>⚠️ Event Not Approved</h1>
        </div>
        <div class="content">
          <p>Hello ${data.recipient_name || "there"},</p>
          <p>Unfortunately, your event has been <span class="status-rejected">REJECTED</span>:</p>
          <div class="details">
            <p><strong>Event:</strong> ${data.event_title}</p>
            <p><strong>Proposed Date:</strong> ${data.event_date}</p>
            <p><strong>Proposed Time:</strong> ${data.event_time}</p>
            <p><strong>Venue:</strong> ${data.event_venue}</p>
          </div>
          ${data.additional_message ? `<p><em>Reason: ${data.additional_message}</em></p>` : ""}
          <p>Please contact the administration for more information or to discuss alternatives.</p>
        </div>
      `;
      break;

    case "meeting_scheduled":
    case "meeting_invitation":
      content = `
        <div class="header">
          <h1>📅 Meeting Invitation</h1>
        </div>
        <div class="content">
          <p>Hello ${data.recipient_name || "there"},</p>
          <p>You have been invited to a planning meeting:</p>
          <div class="details">
            <p><strong>Meeting:</strong> ${data.meeting_title}</p>
            <p><strong>Date:</strong> ${data.meeting_date}</p>
            <p><strong>Time:</strong> ${data.meeting_time}</p>
            ${data.event_title ? `<p><strong>Related Event:</strong> ${data.event_title}</p>` : ""}
          </div>
          ${data.meeting_link ? `<a href="${data.meeting_link}" class="button">Join Meeting</a>` : ""}
          <a href="${baseUrl}/meetings" class="button" style="margin-left: 10px; background: #4b5563;">View All Meetings</a>
        </div>
      `;
      break;

    case "meeting_updated":
      content = `
        <div class="header">
          <h1>📝 Meeting Updated</h1>
        </div>
        <div class="content">
          <p>Hello ${data.recipient_name || "there"},</p>
          <p>A meeting you're invited to has been updated:</p>
          <div class="details">
            <p><strong>Meeting:</strong> ${data.meeting_title}</p>
            <p><strong>New Date:</strong> ${data.meeting_date}</p>
            <p><strong>New Time:</strong> ${data.meeting_time}</p>
          </div>
          ${data.additional_message ? `<p><em>${data.additional_message}</em></p>` : ""}
          ${data.meeting_link ? `<a href="${data.meeting_link}" class="button">Join Meeting</a>` : ""}
        </div>
      `;
      break;

    case "meeting_cancelled":
      content = `
        <div class="header" style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);">
          <h1>❌ Meeting Cancelled</h1>
        </div>
        <div class="content">
          <p>Hello ${data.recipient_name || "there"},</p>
          <p>A meeting you were invited to has been cancelled:</p>
          <div class="details">
            <p><strong>Meeting:</strong> ${data.meeting_title}</p>
            <p><strong>Was scheduled for:</strong> ${data.meeting_date} at ${data.meeting_time}</p>
          </div>
          ${data.additional_message ? `<p><em>Reason: ${data.additional_message}</em></p>` : ""}
        </div>
      `;
      break;

    case "event_registration":
      content = `
        <div class="header" style="background: linear-gradient(135deg, #059669 0%, #10b981 100%);">
          <h1>🎟️ Registration Confirmed!</h1>
        </div>
        <div class="content">
          <p>Hello ${data.recipient_name || "there"},</p>
          <p>You have successfully registered for the following event. We're excited to have you!</p>
          <div class="details">
            <p><strong>📌 Event:</strong> ${data.event_title}</p>
            <p><strong>📅 Date:</strong> ${data.event_date}</p>
            <p><strong>🕐 Time:</strong> ${data.event_time}</p>
            <p><strong>📍 Venue:</strong> ${data.event_venue}</p>
          </div>
          <p>Your unique QR ticket has been generated. Show it at the entrance for seamless check-in.</p>
          <p style="color: #6b7280; font-size: 14px;">💡 <em>Tip: You will receive another reminder email 24 hours before the event and on the day of the event.</em></p>
          <a href="${baseUrl}/my-registrations" class="button" style="margin-right: 10px;">View My Ticket</a>
          <a href="${baseUrl}/events/${data.event_id}" class="button" style="background: #4b5563;">Event Details</a>
        </div>
      `;
      break;

    case "event_reminder":
      content = `
        <div class="header" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
          <h1>⏰ ${data.subject?.includes('tomorrow') ? "Event Reminder — Tomorrow!" : "Event Reminder — Today!"}</h1>
        </div>
        <div class="content">
          <p>Hello ${data.recipient_name || "there"},</p>
          <p>${data.subject?.includes('tomorrow') ? "Just a friendly heads-up that an event you've registered for is <strong>happening tomorrow</strong>. Make sure you're all set!" : "This is your <strong>day-of reminder</strong>! The event you registered for is happening <strong>today</strong>. We can't wait to see you there!"}</p>
          <div class="details">
            <p><strong>📌 Event:</strong> ${data.event_title}</p>
            <p><strong>📅 Date:</strong> ${data.event_date}</p>
            <p><strong>🕐 Time:</strong> ${data.event_time}</p>
            <p><strong>📍 Venue:</strong> ${data.event_venue}</p>
          </div>
          <p style="color: #6b7280; font-size: 14px;">🎟️ <em>Remember to bring your QR ticket for check-in at the entrance.</em></p>
          <a href="${baseUrl}/my-registrations" class="button" style="margin-right: 10px;">View My Ticket</a>
          <a href="${baseUrl}/events/${data.event_id}" class="button" style="background: #4b5563;">Event Details</a>
        </div>
      `;
      break;

    case "meeting_reminder":
      content = `
        <div class="header" style="background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);">
          <h1>⏰ Meeting Reminder</h1>
        </div>
        <div class="content">
          <p>Hello ${data.recipient_name || "there"},</p>
          <p>This is a reminder for an upcoming meeting:</p>
          <div class="details">
            <p><strong>Meeting:</strong> ${data.meeting_title}</p>
            <p><strong>Date:</strong> ${data.meeting_date}</p>
            <p><strong>Time:</strong> ${data.meeting_time}</p>
          </div>
          ${data.meeting_link ? `<a href="${data.meeting_link}" class="button">Join Meeting</a>` : ""}
        </div>
      `;
      break;

    case "role_assigned":
      content = `
        <div class="header">
          <h1>👤 Role Assignment</h1>
        </div>
        <div class="content">
          <p>Hello ${data.recipient_name || "there"},</p>
          <p>You have been assigned a new role:</p>
          <div class="details">
            <p><strong>Role:</strong> ${data.status}</p>
            ${data.event_title ? `<p><strong>For Event:</strong> ${data.event_title}</p>` : ""}
          </div>
          ${data.additional_message ? `<p><em>${data.additional_message}</em></p>` : ""}
        </div>
      `;
      break;

    default:
      content = `
        <div class="header">
          <h1>📬 Notification</h1>
        </div>
        <div class="content">
          <p>Hello ${data.recipient_name || "there"},</p>
          <p>${data.additional_message || "You have a new notification from the Smart University Event Management System."}</p>
        </div>
      `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${styles}
    </head>
    <body>
      <div class="container">
        ${content}
        <div class="footer">
          <p>Smart University Event Management System</p>
          <p>This is an automated message. Please do not reply directly to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Email notification function called");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const data: EmailNotificationRequest = await req.json();
    console.log("Received notification request:", JSON.stringify(data, null, 2));

    // Check if this notification type is enabled globally
    const { data: settingsData, error: settingsError } = await supabase
      .from("email_notification_settings")
      .select("enabled")
      .eq("notification_type", data.notification_type)
      .single();

    if (settingsError) {
      console.log("Settings check error (might not exist):", settingsError.message);
    }

    if (settingsData && !settingsData.enabled) {
      console.log(`Notification type ${data.notification_type} is disabled globally`);
      return new Response(
        JSON.stringify({ success: false, message: "Notification type is disabled" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check user preferences if we have a user_id
    if (data.recipient_user_id) {
      const { data: prefData } = await supabase
        .from("user_email_preferences")
        .select("enabled")
        .eq("user_id", data.recipient_user_id)
        .eq("notification_type", data.notification_type)
        .single();

      if (prefData && !prefData.enabled) {
        console.log(`User ${data.recipient_user_id} has disabled ${data.notification_type} notifications`);
        return new Response(
          JSON.stringify({ success: false, message: "User has disabled this notification type" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Generate email content
    const htmlContent = getEmailTemplate(data);

    // Send the email
    console.log(`Sending email to ${data.recipient_email}`);
    const emailResponse = await resend.emails.send({
      from: "University Events <onboarding@resend.dev>",
      to: [data.recipient_email],
      subject: data.subject,
      html: htmlContent,
      tags: [{ name: "notification_type", value: data.notification_type }],
    });

    if ("error" in emailResponse && emailResponse.error) {
      console.error("Resend error:", emailResponse.error);
      throw new Error(
        `Resend error: ${(emailResponse.error as any).message || JSON.stringify(emailResponse.error)}`
      );
    }

    console.log("Email sent successfully:", emailResponse);

    // Log the email notification
    const { error: logError } = await supabase
      .from("email_notification_logs")
      .insert({
        notification_type: data.notification_type,
        recipient_email: data.recipient_email,
        recipient_user_id: data.recipient_user_id || null,
        subject: data.subject,
        status: "sent",
        event_id: data.event_id || null,
        meeting_id: data.meeting_id || null,
        sent_at: new Date().toISOString(),
      });

    if (logError) {
      console.error("Error logging email notification:", logError);
    }

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-email-notification function:", error);

    // Try to log the failure
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const data: EmailNotificationRequest = await req.clone().json();
      
      await supabase
        .from("email_notification_logs")
        .insert({
          notification_type: data.notification_type,
          recipient_email: data.recipient_email,
          recipient_user_id: data.recipient_user_id || null,
          subject: data.subject,
          status: "failed",
          error_message: error.message,
          event_id: data.event_id || null,
          meeting_id: data.meeting_id || null,
        });
    } catch (logErr) {
      console.error("Failed to log email error:", logErr);
    }

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
