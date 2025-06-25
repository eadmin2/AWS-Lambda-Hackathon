// @deno-types="https://deno.land/x/servest@v1.3.1/types/react/index.d.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";

const PICA_ACTION_ID = "conn_mod_def::GC4q4JE4I28::x8Elxo0VRMK1X-uH1C3NeA";

interface Profile {
  id: string;
  email: string;
  full_name: string;
  email_notifications_enabled: boolean;
}

interface ConditionUpdate {
  id: string;
  user_id: string;
  document_id: string;
  created_at: string;
  notification_sent: boolean;
  notification_sent_at: string | null;
}

async function sendEmail(to: string, userName: string) {
  const picaSecretKey = Deno.env.get("PICA_SECRET_KEY");
  const picaResendKey = Deno.env.get("PICA_RESEND_CONNECTION_KEY");

  if (!picaSecretKey || !picaResendKey) {
    throw new Error("Missing Pica API keys in environment variables");
  }

  const dashboardUrl = "https://varatingassistant.com/dashboard";
  const profileUrl = "https://varatingassistant.com/profile";

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1f2937;">New Conditions Detected</h2>
      <p>Hi ${userName},</p>
      <p>We've detected new or updated conditions in your medical documents. Visit your dashboard to view the details.</p>
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #374151; margin-top: 0;">Next Steps</h3>
        <p>1. Review your updated conditions and ratings</p>
        <p>2. Check if any new conditions were identified</p>
        <p>3. View detailed breakdowns of each condition</p>
        <a href="${dashboardUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 10px;">View Your Dashboard</a>
      </div>
      <p style="color: #6b7280; font-size: 0.875rem;">To stop receiving these notifications, you can <a href="${profileUrl}" style="color: #3b82f6; text-decoration: none;">update your email preferences</a> in your profile settings.</p>
    </div>
  `;

  const textContent = `
    Hi ${userName},

    We've detected new or updated conditions in your medical documents. Visit your dashboard to view the details.

    Next Steps:
    1. Review your updated conditions and ratings
    2. Check if any new conditions were identified
    3. View detailed breakdowns of each condition

    View your dashboard: ${dashboardUrl}

    To stop receiving these notifications, you can update your email preferences in your profile settings: ${profileUrl}
  `;

  const response = await fetch("https://api.picaos.com/v1/passthrough/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-pica-secret": picaSecretKey,
      "x-pica-connection-key": picaResendKey,
      "x-pica-action-id": PICA_ACTION_ID,
    },
    body: JSON.stringify({
      from: "VA Rating Assistant <noreply@marketing.varatingassistant.com>",
      to: [to],
      subject: "New Conditions Detected - VA Rating Assistant",
      html: htmlContent,
      text: textContent,
      tags: [
        { name: "trigger", value: "condition_update" },
        { name: "app", value: "va_rating_assistant" }
      ]
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Failed to send email:", error);
    throw new Error(`Failed to send email: ${error}`);
  }

  const result = await response.json();
  console.log("Email sent successfully:", result);
  return result;
}

async function processNotifications(supabaseClient: SupabaseClient) {
  // Get users with pending notifications who have notifications enabled
  const { data: profiles, error: profilesError } = await supabaseClient
    .from('profiles')
    .select('id, email, full_name, email_notifications_enabled')
    .eq('email_notifications_enabled', true);

  if (profilesError) {
    console.error("Error fetching profiles:", profilesError);
    return;
  }

  for (const profile of profiles) {
    try {
      // Get unsent notifications for this user
      const { data: updates, error: updatesError } = await supabaseClient
        .from('condition_updates')
        .select('*')
        .eq('user_id', profile.id)
        .eq('notification_sent', false);

      if (updatesError) {
        console.error(`Error fetching updates for user ${profile.id}:`, updatesError);
        continue;
      }

      if (updates && updates.length > 0) {
        // Send notification email
        await sendEmail(profile.email, profile.full_name || 'Veteran');

        // Mark all notifications as sent
        const updateIds = updates.map((u: ConditionUpdate) => u.id);
        const { error: updateError } = await supabaseClient
          .from('condition_updates')
          .update({
            notification_sent: true,
            notification_sent_at: new Date().toISOString()
          })
          .in('id', updateIds);

        if (updateError) {
          console.error(`Error marking notifications as sent for user ${profile.id}:`, updateError);
        } else {
          console.log(`Successfully processed ${updates.length} notifications for user ${profile.id}`);
        }
      }
    } catch (error) {
      console.error(`Error processing notifications for user ${profile.id}:`, error);
    }
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await processNotifications(supabaseClient);

    return new Response(JSON.stringify({ message: "Notifications processed successfully" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error processing notifications:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 