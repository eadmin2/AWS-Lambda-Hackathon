// @deno-types="https://deno.land/x/servest@v1.3.1/types/react/index.d.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const PICA_ACTION_ID = "conn_mod_def::GC4q4JE4I28::x8Elxo0VRMK1X-uH1C3NeA";

function generateContactEmailTemplate({ name, email, subject, message }: { name: string; email: string; subject: string; message: string }) {
  return `
    <div style="background:#0a2a66;padding:32px 0;font-family:sans-serif;">
      <table style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(10,42,102,0.08);">
        <tr><td style="background:#0a2a66;padding:24px 0;text-align:center;">
          <img src='https://varatingassistant.com/Logo.png' alt='VA Rating Assistant' style='height:48px;margin-bottom:8px;' />
          <h1 style="color:#fff;font-size:1.5rem;margin:0;">New Contact Form Submission</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="color:#0a2a66;font-size:1.25rem;margin-bottom:16px;">${subject}</h2>
          <p style="margin:0 0 16px 0;color:#222;font-size:1rem;"><strong>From:</strong> ${name} (${email})</p>
          <div style="background:#f3f6fa;padding:16px 20px;border-radius:8px;color:#222;font-size:1rem;line-height:1.6;">${message.replace(/\n/g, '<br/>')}</div>
        </td></tr>
        <tr><td style="background:#f3f6fa;padding:16px;text-align:center;color:#0a2a66;font-size:0.95rem;">VA Rating Assistant &mdash; Veteran Owned &amp; Operated</td></tr>
      </table>
    </div>
  `;
}

async function sendContactEmail({ name, email, subject, message }: { name: string; email: string; subject: string; message: string }) {
  const picaSecretKey = Deno.env.get("PICA_SECRET_KEY");
  const picaResendKey = Deno.env.get("PICA_RESEND_CONNECTION_KEY");
  if (!picaSecretKey || !picaResendKey) {
    throw new Error("Missing Pica API keys in environment variables");
  }
  const htmlContent = generateContactEmailTemplate({ name, email, subject, message });
  const textContent = `Contact form submission from ${name} (${email})\nSubject: ${subject}\n\n${message}`;
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
      to: ["support@varatingassistant.com"],
      subject: `[Contact] ${subject}`,
      html: htmlContent,
      text: textContent,
      tags: [
        { name: "trigger", value: "contact_form" },
        { name: "app", value: "va_rating_assistant" }
      ]
    }),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }
  return await response.json();
}

serve(async (req: Request) => {
  const cors = getCorsHeaders(req.headers.get("origin"));
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }
  try {
    console.log('[send-contact-email] Request received');
    const rawBody = await req.text();
    console.log('[send-contact-email] Raw body:', rawBody);
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('[send-contact-email] Failed to parse JSON body:', parseError);
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    console.log('[send-contact-email] Parsed body:', body);
    const { name, email, subject, message } = body;
    if (!name || !email || !subject || !message) {
      console.error('[send-contact-email] Missing required fields:', { name, email, subject, message });
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    console.log('[send-contact-email] Sending email via Pica...');
    await sendContactEmail({ name, email, subject, message });
    console.log('[send-contact-email] Email sent successfully');
    return new Response(JSON.stringify({ message: "Contact email sent successfully" }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error('[send-contact-email] Error:', errorMessage, error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 