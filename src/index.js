import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // API route: send a simple email via Resend
    if (url.pathname === '/api/send-email' && request.method === 'POST') {
      let body;
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      return new Response(res.body, {
        status: res.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // API route: generate PDF certificate and email it via Resend
    if (url.pathname === '/api/generate-certificate' && request.method === 'POST') {
      try {
        const { playerName, email, score } = await request.json();

        // 1. Generate the PDF Certificate
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([600, 400]);
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        page.drawText('CERTIFICATE OF COMPLETION', { x: 110, y: 310, size: 24, font, color: rgb(0.1, 0.2, 0.5) });
        page.drawText(`Awarded to: ${playerName}`, { x: 110, y: 240, size: 18, font });
        page.drawText(`Final Score: ${score}`, { x: 110, y: 200, size: 16, font });
        page.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: 110, y: 160, size: 14, font });

        const pdfBase64 = await pdfDoc.saveAsBase64();

        // 2. Send the Email with PDF Attachment via Resend
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Game Awards <onboarding@resend.dev>',
            to: [email],
            subject: 'Your Game Completion Certificate!',
            html: `<p>Congrats <strong>${playerName}</strong>! Your official certificate is attached.</p>`,
            attachments: [
              {
                filename: 'Completion_Certificate.pdf',
                content: pdfBase64,
              },
            ],
          }),
        });

        if (!emailRes.ok) {
          const errText = await emailRes.text();
          return new Response(JSON.stringify({ error: 'Email failed to send', details: errText }), {
            status: emailRes.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Everything else: serve static assets
    return env.ASSETS.fetch(request);
  },
};
