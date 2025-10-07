
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { inviteCode, recipientEmail, senderName } = await req.json()

    // MOCK: Log what would be sent
    console.log('='.repeat(50))
    console.log('📧 MOCK EMAIL WOULD BE SENT:')
    console.log('='.repeat(50))
    console.log('To:', recipientEmail)
    console.log('From:', senderName)
    console.log('Subject: 🍕 You\'ve been invited to join a fridge!')
    console.log('Invite Code:', inviteCode)
    console.log('='.repeat(50))

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Mock email logged (check Edge Function logs)',
        mockData: { 
          inviteCode, 
          recipientEmail,
          note: 'This is a mock. Real emails will be sent once Resend is configured.'
        }
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    )
  }
})

