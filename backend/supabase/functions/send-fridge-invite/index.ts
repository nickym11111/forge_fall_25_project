import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const { inviteCode, recipientEmail, senderName } = await req.json();
    console.log('Sending invite:', {
      inviteCode,
      recipientEmail,
      senderName
    });
    // Validate inputs
    if (!inviteCode || !recipientEmail) {
      throw new Error('Missing required fields');
    }
    // Send email using Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'FridgeShare <onboarding@resend.dev>',
        to: [
          recipientEmail
        ],
        subject: '🍕 You\'ve been invited to join a fridge!',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                  line-height: 1.6;
                  color: #333;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                }
                .header {
                  text-align: center;
                  padding: 20px;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  border-radius: 10px;
                  margin-bottom: 30px;
                }
                .code-container {
                  background: #f7f7f7;
                  border: 2px dashed #667eea;
                  border-radius: 10px;
                  padding: 30px;
                  text-align: center;
                  margin: 30px 0;
                }
                .code {
                  font-size: 36px;
                  font-weight: bold;
                  letter-spacing: 8px;
                  color: #667eea;
                  font-family: 'Courier New', monospace;
                }
                .footer {
                  margin-top: 40px;
                  padding-top: 20px;
                  border-top: 1px solid #eee;
                  font-size: 12px;
                  color: #999;
                  text-align: center;
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>🍕 FridgeShare Invitation</h1>
              </div>
              
              <p>Hey there! 👋</p>
              
              <p><strong>${senderName}</strong> has invited you to join their fridge on FridgeShare.</p>
              
              <p>Use this code to join:</p>
              
              <div class="code-container">
                <div class="code">${inviteCode}</div>
              </div>
              
              <p>To join:</p>
              <ol>
                <li>Open the FridgeShare app</li>
                <li>Go to "Join Fridge"</li>
                <li>Enter the code above</li>
              </ol>
              
              <p><strong>This code will expire in 7 days.</strong></p>
              
              <div class="footer">
                <p>This invitation was sent to ${recipientEmail}</p>
                <p>If you didn't expect this invitation, you can safely ignore this email.</p>
              </div>
            </body>
          </html>
        `
      })
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('Resend error:', data);
      throw new Error(data.message || 'Failed to send email');
    }
    console.log('Email sent successfully:', data);
    return new Response(JSON.stringify({
      success: true,
      data
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in function:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
