import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    console.log(`Checking for completed events. Today: ${todayStr}`);

    // Fetch approved or live events where the date strictly < today, and we haven't notified yet.
    // Notice we use past events (date strictly < today)
    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("*")
      .lt("date", todayStr)
      .in("status", ["approved", "live"])
      .eq("resources_return_notified", false);

    if (eventsError) throw eventsError;

    if (!events || events.length === 0) {
      console.log("No completed events needing resource return notifications");
      return new Response(
        JSON.stringify({ success: true, message: "No events to process", notifications_sent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let totalNotifications = 0;

    for (const event of events) {
      // Check if this event has any allocated resources
      const { data: resources, error: resError } = await supabase
        .from("event_resources")
        .select("id")
        .eq("event_id", event.id);

      if (resError) {
        console.error(`Error fetching resources for event ${event.id}:`, resError);
        continue;
      }

      // We only care if they had resources allocated
      if (resources && resources.length > 0) {
        // Get the organizer's profile
        const { data: profile, error: profError } = await supabase
          .from("profiles")
          .select("user_id, name, email")
          .eq("user_id", event.organizer_id)
          .single();

        if (profError || !profile) {
          console.error(`Error fetching organizer profile for event ${event.id}:`, profError);
          continue;
        }

        // 1. Send an in-app notification
        await supabase.from("notifications").insert({
          user_id: profile.user_id,
          type: "resource_return",
          title: "📦 Please Return Event Resources",
          message: `Your event "${event.title}" has ended. Please ensure all allocated resources are returned promptly.`,
          event_id: event.id,
        });

        // 2. Invoke the email function (best-effort)
        try {
          await supabase.functions.invoke("send-email-notification", {
            body: {
              notification_type: "resource_return",
              recipient_email: profile.email,
              recipient_user_id: profile.user_id,
              recipient_name: profile.name,
              subject: `📦 Action Required: Return Resources for "${event.title}"`,
              event_id: event.id,
              event_title: event.title,
              event_date: event.date,
              event_time: event.time,
              event_venue: event.venue,
            },
          });
        } catch (emailErr) {
          console.error(`Failed to send resource return email to ${profile.email}:`, emailErr);
        }

        totalNotifications++;
      }

      // Mark event as notified so we don't spam them every cron run
      await supabase
        .from("events")
        .update({ resources_return_notified: true })
        .eq("id", event.id);
    }

    console.log(`Processed ${events.length} event(s), sent ${totalNotifications} resource return notification(s)`);

    return new Response(
      JSON.stringify({
        success: true,
        events_processed: events.length,
        notifications_sent: totalNotifications,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in process-event-completions:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
