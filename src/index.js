import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Headers': 'Content-Type, x-session-token',
};

async function verifyGoogleIdToken(idToken, clientId) {
  if (!clientId || typeof idToken !== 'string' || !idToken) return null;
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!response.ok) return null;
  const profile = await response.json();
  if (profile.aud !== clientId || profile.email_verified !== 'true' || !profile.sub || !profile.email) return null;
  return profile;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // --- Google OAuth: verify ID token and provision a persistent player ---
    if (url.pathname === '/api/auth/verify' && request.method === 'POST') {
      try {
        let body;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { idToken } = body || {};
        if (!idToken || typeof idToken !== 'string') {
          return new Response(JSON.stringify({ error: 'Missing idToken' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (!env.GOOGLE_CLIENT_ID) {
          return new Response(JSON.stringify({ error: 'Google sign-in is not configured.' }), {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (!env.LOOTLOCKER_API_KEY) {
          return new Response(JSON.stringify({ error: 'LootLocker is not configured.' }), {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const profile = await verifyGoogleIdToken(idToken, env.GOOGLE_CLIENT_ID);
        if (!profile) {
          return new Response(JSON.stringify({ error: 'Google identity or email could not be verified.' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const playerName = typeof profile.name === 'string' && profile.name.trim()
          ? profile.name.trim()
          : profile.email;
        const lootLockerRes = await fetch('https://api.lootlocker.com/game/v2/session/custom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            game_key: env.LOOTLOCKER_API_KEY,
            game_version: '1.0.0',
            player_identifier: `g_${profile.sub}`,
          }),
        });
        const lootLockerData = await lootLockerRes.json();
        if (!lootLockerRes.ok || !lootLockerData.session_token) {
          return new Response(JSON.stringify({ error: 'Unable to create a persistent LootLocker session.' }), {
            status: 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Display-name synchronization is best effort; identity/session creation is authoritative.
        try {
          await fetch('https://api.lootlocker.io/game/player/name', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'x-session-token': lootLockerData.session_token,
              'LL-Version': '2021-03-01',
            },
            body: JSON.stringify({ name: playerName }),
          });
        } catch (nameError) {
          console.warn('LootLocker player-name sync notice:', nameError.message);
        }

        return new Response(JSON.stringify({
          authenticated: true,
          player: { sub: profile.sub, email: profile.email, name: playerName, picture: profile.picture || '' },
          sessionToken: lootLockerData.session_token,
          playerId: lootLockerData.player_id,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message || 'Google sign-in failed.' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // --- LootLocker: start a custom persistent session or an anonymous guest session ---
    if (url.pathname === '/api/lootlocker/session' && request.method === 'POST') {
      try {
        let body = {};
        try {
          const parsedBody = await request.json();
          if (parsedBody && typeof parsedBody === 'object' && !Array.isArray(parsedBody)) body = parsedBody;
        } catch {
          // An empty body remains valid for existing guest clients.
        }
        const requestedIdentifier = typeof body.player_identifier === 'string' ? body.player_identifier.trim() : '';
        let playerIdentifier = '';
        if (requestedIdentifier || body.idToken) {
          const profile = await verifyGoogleIdToken(body.idToken, env.GOOGLE_CLIENT_ID);
          if (!profile) {
            return new Response(JSON.stringify({ error: 'A verified Google identity is required for a custom session.' }), {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          playerIdentifier = `g_${profile.sub}`;
          if (requestedIdentifier && requestedIdentifier !== playerIdentifier) {
            return new Response(JSON.stringify({ error: 'Custom player identifier does not match the verified Google identity.' }), {
              status: 403,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
        const isCustomSession = Boolean(playerIdentifier);
        const res = await fetch(`https://api.lootlocker.com/game/v2/session/${isCustomSession ? 'custom' : 'guest'}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            game_key: env.LOOTLOCKER_API_KEY,
            game_version: '1.0.0',
            ...(isCustomSession ? { player_identifier: playerIdentifier } : {}),
          }),
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
        if (!sessionToken) {
          return new Response(JSON.stringify({ error: 'A LootLocker session is required.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const leaderboardKey = env.LEADERBOARD_KEY || 'leaderboard';

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
        let sessionToken = request.headers.get('x-session-token');

        // If client did not provide session token, automatically provision guest token
        if (!sessionToken && env.LOOTLOCKER_API_KEY) {
          try {
            const guestRes = await fetch('https://api.lootlocker.com/game/v2/session/guest', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ game_key: env.LOOTLOCKER_API_KEY, game_version: '1.0.0' }),
            });
            if (guestRes.ok) {
              const guestData = await guestRes.json();
              sessionToken = guestData.session_token;
            }
          } catch (tokenErr) {
            console.warn('Auto guest session notice:', tokenErr.message);
          }
        }

        const leaderboardKey = env.LEADERBOARD_KEY || 'leaderboard';
        const res = await fetch(`https://api.lootlocker.com/game/leaderboards/${leaderboardKey}/list?count=10`, {
          headers: sessionToken ? { 'x-session-token': sessionToken } : {},
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
        let certificateRequest;
        try {
          certificateRequest = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const { playerName: requestedName, email: requestedEmail, score, idToken } = certificateRequest || {};
        let playerName = requestedName;
        let email = requestedEmail;

        // When a signed-in player requests email delivery, derive recipient details from a fresh Google token.
        if (idToken) {
          const profile = await verifyGoogleIdToken(idToken, env.GOOGLE_CLIENT_ID);
          if (!profile) {
            return new Response(JSON.stringify({ error: 'Google sign-in expired or could not be verified. Sign in again to email your certificate.' }), {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          playerName = typeof profile.name === 'string' && profile.name.trim() ? profile.name.trim() : profile.email;
          email = profile.email;
        }

        if (!playerName) {
          return new Response(JSON.stringify({ error: 'Player name is required.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([600, 400]);
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        page.drawText('CERTIFICATE OF COMPLETION', { x: 110, y: 310, size: 24, font, color: rgb(0.1, 0.2, 0.5) });
        page.drawText(`Awarded to: ${playerName}`, { x: 110, y: 240, size: 18, font });
        page.drawText(`Final Score: ${score}`, { x: 110, y: 200, size: 16, font });
        page.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: 110, y: 160, size: 14, font });

        const pdfBase64 = await pdfDoc.saveAsBase64();

        let emailSent = false;
        let emailError = null;

        if (email && env.RESEND_API_KEY) {
          try {
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

            if (emailRes.ok) {
              emailSent = true;
            } else {
              emailError = await emailRes.text();
            }
          } catch (e) {
            emailError = e.message;
          }
        } else if (email && !env.RESEND_API_KEY) {
          emailError = 'RESEND_API_KEY is not configured on the worker environment.';
        }

        return new Response(JSON.stringify({
          success: true,
          emailSent,
          emailError,
          pdfBase64,
        }), {
          status: 200,
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

