
import { getAccessToken } from '@/services/mightyCallService';

/**
 * Proxy API handler for MightyCall requests
 * This helps us avoid CORS issues by routing MightyCall API calls through our server
 */
export const handleMightycallProxy = async (request: Request): Promise<Response> => {
  // Only allow POST requests
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  // Handle preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  try {
    // Parse the request body
    const data = await request.json();
    console.log('MightyCall proxy received data:', data);

    if (!data.phoneNumber || !data.message) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: phoneNumber and message are required'
      }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // MightyCall API constants using environment variables with fallbacks
    const API_KEY = typeof process !== 'undefined' && process.env ? 
      process.env.MIGHTYCALL_API_KEY : "b3777535-eb5e-474d-801f-009491645883";
    
    const FROM_NUMBER = typeof process !== 'undefined' && process.env ? 
      process.env.MIGHTYCALL_FROM_NUMBER : "+18444131701";
    
    const API_PREFIX = typeof process !== 'undefined' && process.env && process.env.MIGHTYCALL_API_PREFIX ? 
      process.env.MIGHTYCALL_API_PREFIX : "api";
    
    const API_VERSION = typeof process !== 'undefined' && process.env && process.env.MIGHTYCALL_API_VERSION ? 
      process.env.MIGHTYCALL_API_VERSION : "v4";
    
    const SMS_URL = `https://${API_PREFIX}.mightycall.com/${API_VERSION}/contactcenter/messages/send`;

    // Get a valid access token
    const accessToken = await getAccessToken();

    // Prepare the payload for MightyCall API
    const payload = {
      from: FROM_NUMBER,
      to: [data.phoneNumber],
      message: data.message,
      attachments: []
    };

    console.log("Proxy sending SMS with payload:", payload);
    console.log("Proxy sending to URL:", SMS_URL);

    // Forward the request to MightyCall API
    const response = await fetch(SMS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "x-api-key": API_KEY
      },
      body: JSON.stringify(payload)
    });

    // Get the response from MightyCall API
    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { text: responseText };
    }

    // Return the response from MightyCall API
    if (!response.ok) {
      console.error("Proxy SMS send error:", {
        status: response.status,
        statusText: response.statusText,
        body: responseData
      });
      return new Response(JSON.stringify({
        error: 'Failed to send SMS',
        details: responseData
      }), {
        status: response.status,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: `SMS sent to ${data.phoneNumber}`,
      details: responseData
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Error in MightyCall proxy:', error);
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
