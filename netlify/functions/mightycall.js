
const { getAccessToken } = require('../../dist/services/mightyCallService');

// Add CORS headers to all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async (event, context) => {
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse the request body
    const data = JSON.parse(event.body);
    console.log('MightyCall proxy received data:', data);

    if (!data.phoneNumber || !data.message) {
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Missing required fields: phoneNumber and message are required'
        })
      };
    }

    // MightyCall API constants using environment variables
    const API_KEY = process.env.MIGHTYCALL_API_KEY;
    const FROM_NUMBER = process.env.MIGHTYCALL_FROM_NUMBER;
    const API_PREFIX = process.env.MIGHTYCALL_API_PREFIX || "api";
    const API_VERSION = process.env.MIGHTYCALL_API_VERSION || "v4";
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
      return {
        statusCode: response.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Failed to send SMS',
          details: responseData
        })
      };
    }

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: `SMS sent to ${data.phoneNumber}`,
        details: responseData
      })
    };
  } catch (error) {
    console.error('Error in MightyCall proxy:', error);
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message || String(error)
      })
    };
  }
};
