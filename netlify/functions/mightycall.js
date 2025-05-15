
// Instead of importing from dist, we'll include the necessary code directly
// const { getAccessToken } = require('../../dist/services/mightyCallService');

// Add CORS headers to all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Implement the getAccessToken function directly within the serverless function
async function getAccessToken() {
  // MightyCall API constants using environment variables
  const API_KEY = process.env.MIGHTYCALL_API_KEY;
  const CLIENT_SECRET = process.env.MIGHTYCALL_CLIENT_SECRET;
  const API_PREFIX = process.env.MIGHTYCALL_API_PREFIX || "api";
  const API_VERSION = process.env.MIGHTYCALL_API_VERSION || "v4";
  const AUTH_URL = `https://${API_PREFIX}.mightycall.com/${API_VERSION}/auth/token`;

  console.log("Requesting access token from:", AUTH_URL);
  console.log("Using API Key:", API_KEY ? "Key exists (not shown)" : "Missing API key");
  console.log("Using Client Secret:", CLIENT_SECRET ? "Secret exists (not shown)" : "Missing client secret");
  
  if (!API_KEY || !CLIENT_SECRET) {
    throw new Error("Missing required environment variables: MIGHTYCALL_API_KEY and/or MIGHTYCALL_CLIENT_SECRET");
  }
  
  const urlencoded = new URLSearchParams();
  urlencoded.append("grant_type", "client_credentials");
  urlencoded.append("client_id", API_KEY);
  urlencoded.append("client_secret", CLIENT_SECRET);
  
  try {
    const response = await fetch(AUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "x-api-key": API_KEY
      },
      body: urlencoded
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Auth error response:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`Authentication failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const authData = await response.json();
    console.log("Auth succeeded, token received");
    
    return authData.access_token;
  } catch (error) {
    console.error("Error getting access token:", error);
    throw error;
  }
}

exports.handler = async (event, context) => {
  console.log("MightyCall function called with event:", {
    method: event.httpMethod,
    path: event.path,
    headers: event.headers
  });

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

    // Check for required environment variables
    if (!API_KEY) {
      console.error("Missing API key in environment variables");
      return {
        statusCode: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Server configuration error',
          details: 'Missing MIGHTYCALL_API_KEY environment variable'
        })
      };
    }
    
    if (!FROM_NUMBER) {
      console.error("Missing FROM_NUMBER in environment variables");
      return {
        statusCode: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Server configuration error',
          details: 'Missing MIGHTYCALL_FROM_NUMBER environment variable'
        })
      };
    }

    try {
      // Get a valid access token
      console.log("Attempting to get access token...");
      const accessToken = await getAccessToken();
      console.log("Access token obtained successfully");

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
      console.log("MightyCall API response text:", responseText);
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = { text: responseText };
        console.error("Failed to parse MightyCall response as JSON:", e);
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
    } catch (apiError) {
      console.error("API request error:", apiError);
      return {
        statusCode: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Error making API request',
          details: apiError.message || String(apiError)
        })
      };
    }
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
