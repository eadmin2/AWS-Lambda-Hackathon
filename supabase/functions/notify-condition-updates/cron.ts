import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { Request } from "https://deno.land/std@0.208.0/http/server.ts";

// Cron schedule is used in Supabase dashboard configuration
export const _CRON_SCHEDULE = "*/2 * * * *"; // Run every 2 minutes

serve(async (req: Request) => {
  try {
    const response = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-condition-updates`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to trigger notifications: ${await response.text()}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Notifications processed" }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}); 