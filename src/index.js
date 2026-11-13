import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Headers': 'Content-Type, x-session-token',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // --- LootLocker: start guest session ---
    if (url.pathname === '/api/lootlocker/session' && request.method === 'POST') {
      try {
        const res = await fetch('https://api.lootlocker.com/game/v2/session/guest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ game_key: env.LOOTLOCKER_API_KEY, game_version: '1.0.0' }),
        });
        const data = await res.text();
        return new Response(data, {
          status: res.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // --- LootLocker: set player name + submit score ---
    if (url.pathname === '/api/lootlocker/submit' && request.method === 'POST') {
      try {
        const { playerName, score, sessionToken } = await request.json();
        const leaderboardKey = env.LEADERBOARD_KEY || 'main_leaderboard';

        // Step 1: Set player name
        const nameRes = await fetch('https://api.lootlocker.io/game/player/name', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-session-token': sessionToken,
            'LL-Version': '2021-03-01',
          },
          body: JSON.stringify({ name: playerName }),
        });
        const nameData = await nameRes.text();

        // Step 2: Submit score
        const scoreRes = await fetch(`https://api.lootlocker.io/game/leaderboards/${leaderboardKey}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-session-token': sessionToken },
          body: JSON.stringify({ score }),
        });
        const scoreData = await scoreRes.text();

        // Return both steps' results for debugging
        return new Response(JSON.stringify({
          leaderboardKey,
          nameStep: { status: nameRes.status, body: nameData },
          scoreStep: { status: scoreRes.status, body: scoreData },
        }, null, 2), {
          status: scoreRes.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // --- LootLocker: get leaderboard ---
    if (url.pathname === '/api/lootlocker/leaderboard' && request.method === 'GET') {
      try {
        const sessionToken = request.headers.get('x-session-token');
        const leaderboardKey = env.LEADERBOARD_KEY || 'main_leaderboard';
        const res = await fetch(`https://api.lootlocker.com/game/leaderboards/${leaderboardKey}/list?count=5`, {
          headers: { 'x-session-token': sessionToken },
        });
        const data = await res.text();
        return new Response(data, {
          status: res.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // --- Generate PDF certificate + email via Resend ---
    if (url.pathname === '/api/generate-certificate' && request.method === 'POST') {
      try {
        const { playerName, email, score } = await request.json();

        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([600, 400]);
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        page.drawText('CERTIFICATE OF COMPLETION', { x: 110, y: 310, size: 24, font, color: rgb(0.1, 0.2, 0.5) });
        page.drawText(`Awarded to: ${playerName}`, { x: 110, y: 240, size: 18, font });
        page.drawText(`Final Score: ${score}`, { x: 110, y: 200, size: 16, font });
        page.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: 110, y: 160, size: 14, font });

        const pdfBase64 = await pdfDoc.saveAsBase64();

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
            attachments: [{ filename: 'Completion_Certificate.pdf', content: pdfBase64 }],
          }),
        });

        if (!emailRes.ok) {
          const errText = await emailRes.text();
          return new Response(JSON.stringify({ success: true, scoreStep: { status: scoreRes.status, body: scoreData } }), {
            status: 200,
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

    // --- Simple email ---
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
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return new Response(res.body, {
        status: res.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Everything else: serve static assets
    return env.ASSETS.fetch(request);
  },
};

