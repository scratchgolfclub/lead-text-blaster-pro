
/**
 * Validate a phone number format
 * Simple validation - could be enhanced for production
 */
const isValidPhoneNumber = (phone: string): boolean => {
  // Basic validation for international format (starts with + and has at least 10 digits)
  return /^\+\d{10,15}$/.test(phone);
};

/**
 * Handle webhook requests from Zapier
 */
export const handleWebhook = async (request: Request): Promise<Response> => {
  // Handle preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }
  
  // Check if it's a POST request
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      }
    });
  }
  
  try {
    // Parse the request body
    const data = await request.json();
    console.log('Webhook received data:', data);
    
    // Validate the phone number
    if (!data.phone || !isValidPhoneNumber(data.phone)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid phone number format. Must be in international format (e.g., +12345678901)' 
      }), { 
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' 
        }
      });
    }
    
    // Forward the request directly to the Netlify function
    const origin = new URL(request.url).origin;
    const mightycallResponse = await fetch(`${origin}/.netlify/functions/mightycall`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phoneNumber: data.phone,
        message: "I saw that you were interested in scheduling a trial at Scratch Golf Club! Do you have a date and time in mind for when you want to get that scheduled?"
      })
    });
    
    const mightycallData = await mightycallResponse.json();
    
    if (mightycallResponse.ok && mightycallData.success) {
      return new Response(JSON.stringify({ 
        success: true,
        message: `SMS sent to ${data.phone}` 
      }), { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' 
        }
      });
    } else {
      return new Response(JSON.stringify({ 
        error: 'Failed to send SMS',
        details: mightycallData.error || 'Unknown error'
      }), { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' 
        }
      });
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }), { 
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      }
    });
  }
};
