
// Add CORS headers to all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Implement the getAccessToken function directly within the serverless function
async function getAccessToken() {
  // MightyCall API constants - hardcoded URL prefix and version
  const API_KEY = process.env.MIGHTYCALL_API_KEY;
  const CLIENT_SECRET = process.env.MIGHTYCALL_CLIENT_SECRET;
  const AUTH_URL = 'https://api.mightycall.com/v4/auth/token';

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
    console.log("Making authentication request to MightyCall...");
    const response = await fetch(AUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "x-api-key": API_KEY
      },
      body: urlencoded
    });
    
    const responseText = await response.text();
    console.log(`Auth response status: ${response.status}, body length: ${responseText.length}`);
    
    if (!response.ok) {
      console.error("Auth error response:", {
        status: response.status,
        statusText: response.statusText,
        body: responseText
      });
      throw new Error(`Authentication failed: ${response.status} ${response.statusText} - ${responseText}`);
    }
    
    let authData;
    try {
      authData = JSON.parse(responseText);
      console.log("Auth succeeded, token received");
    } catch (e) {
      console.error("Failed to parse auth response:", e);
      throw new Error(`Failed to parse auth response: ${e.message}`);
    }
    
    if (!authData.access_token) {
      console.error("No access token in response:", authData);
      throw new Error("No access token returned from MightyCall API");
    }
    
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
    // Safely access headers if they exist
    headers: event.headers ? Object.keys(event.headers) : []
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
    const data = JSON.parse(event.body || '{}'); // Add fallback for null/undefined
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

    // MightyCall API constants - hardcoded URL prefix and version
    const API_KEY = process.env.MIGHTYCALL_API_KEY;
    const FROM_NUMBER = process.env.MIGHTYCALL_FROM_NUMBER;
    const SMS_URL = 'https://api.mightycall.com/v4/api/contactcenter/messages/send';

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

    // Verify the phone number format
    if (!data.phoneNumber.startsWith('+')) {
      console.warn("Phone number does not start with +, adding it automatically");
      data.phoneNumber = '+' + data.phoneNumber.replace(/[^\d]/g, '');
    }
    
    console.log("Formatted phone number:", data.phoneNumber);

    try {
      // Get a valid access token
      console.log("Attempting to get access token...");
      const accessToken = await getAccessToken();
      console.log("Access token obtained successfully. Length:", accessToken.length);

      // Prepare the payload for MightyCall API
      const payload = {
        from: FROM_NUMBER,
        to: [data.phoneNumber],
        message: data.message,
        attachments: []
      };

      console.log("Proxy sending SMS with payload:", {
        from: FROM_NUMBER,
        to: data.phoneNumber,
        messageLength: data.message.length
      });
      console.log("Proxy sending to URL:", SMS_URL);

      // Forward the request to MightyCall API
      console.log("Making request to MightyCall SMS API...");
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
      console.log(`MightyCall API SMS response status: ${response.status}`);
      console.log("MightyCall API response text:", responseText);
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
        console.log("Parsed SMS response:", responseData);
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

      // MightyCall might return success status but indicate failures in the response body
      if (responseData && responseData.errors && responseData.errors.length > 0) {
        console.error("MightyCall returned errors:", responseData.errors);
        return {
          statusCode: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            error: 'MightyCall API reported errors',
            details: responseData.errors
          })
        };
      }

      console.log("SMS sent successfully");
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
