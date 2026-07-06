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

    // Calculate tomorrow's date for 24-hour-ahead reminders
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    console.log(`Running reminders: today=${todayStr}, tomorrow=${tomorrowStr}`);

    // Fetch approved events happening today OR tomorrow
    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("*")
      .in("date", [todayStr, tomorrowStr])
      .eq("status", "approved");

    if (eventsError) throw eventsError;

    if (!events || events.length === 0) {
      console.log("No upcoming events found for reminders");
      return new Response(
        JSON.stringify({ success: true, message: "No upcoming events", reminders_sent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let totalReminders = 0;

    for (const event of events) {
      const isToday = event.date === todayStr;
      const isTomorrow = event.date === tomorrowStr;

      // Get all registrations for this event
      const { data: registrations, error: regError } = await supabase
        .from("registrations")
        .select("user_id")
        .eq("event_id", event.id);

      if (regError) {
        console.error(`Error fetching registrations for event ${event.id}:`, regError);
        continue;
      }

      if (!registrations || registrations.length === 0) continue;

      const userIds = registrations.map((r) => r.user_id);

      // Get user profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .in("user_id", userIds);

      if (!profiles) continue;

      const formattedDate = new Date(event.date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      for (const profile of profiles) {
        if (isToday) {
          // Same-day reminder: in-app + email
          await supabase.from("notifications").insert({
            user_id: profile.user_id,
            type: "event_reminder",
            title: "📅 Event Today!",
            message: `Reminder: "${event.title}" is happening today at ${event.time} in ${event.venue}. Don't miss it!`,
            event_id: event.id,
          });

          try {
            await supabase.functions.invoke("send-email-notification", {
              body: {
                notification_type: "event_reminder",
                recipient_email: profile.email,
                recipient_user_id: profile.user_id,
                recipient_name: profile.name,
                subject: `⏰ Today's Event: "${event.title}" starts soon!`,
                event_id: event.id,
                event_title: event.title,
                event_date: formattedDate,
                event_time: event.time,
                event_venue: event.venue,
              },
            });
          } catch (emailErr) {
            console.error(`Failed to send today reminder email to ${profile.email}:`, emailErr);
          }

          totalReminders++;
        } else if (isTomorrow) {
          // 24-hour ahead reminder: in-app + email
          await supabase.from("notifications").insert({
            user_id: profile.user_id,
            type: "event_reminder",
            title: "⏰ Event Tomorrow!",
            message: `Don't forget: "${event.title}" is happening tomorrow at ${event.time} in ${event.venue}. Get ready!`,
            event_id: event.id,
          });

          try {
            await supabase.functions.invoke("send-email-notification", {
              body: {
                notification_type: "event_reminder",
                recipient_email: profile.email,
                recipient_user_id: profile.user_id,
                recipient_name: profile.name,
                subject: `📅 Reminder: "${event.title}" is tomorrow!`,
                event_id: event.id,
                event_title: event.title,
                event_date: formattedDate,
                event_time: event.time,
                event_venue: event.venue,
              },
            });
          } catch (emailErr) {
            console.error(`Failed to send tomorrow reminder email to ${profile.email}:`, emailErr);
          }

          totalReminders++;
        }
      }
    }

    const todayEvents = events.filter((e) => e.date === todayStr).length;
    const tomorrowEvents = events.filter((e) => e.date === tomorrowStr).length;

    console.log(
      `Sent ${totalReminders} reminders — ${todayEvents} event(s) today, ${tomorrowEvents} event(s) tomorrow`
    );

    return new Response(
      JSON.stringify({
        success: true,
        events_today: todayEvents,
        events_tomorrow: tomorrowEvents,
        reminders_sent: totalReminders,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-event-reminders:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
