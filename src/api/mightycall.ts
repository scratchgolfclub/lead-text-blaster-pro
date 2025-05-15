
/**
 * Proxy API handler for MightyCall requests
 * This helps us avoid CORS issues by routing MightyCall API calls through our server
 */
export const handleMightycallProxy = async (request: Request): Promise<Response> => {
  console.log("MightyCall proxy handler called");
  
  // Handle preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    console.log("Handling OPTIONS request");
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  // Only allow POST requests
  if (request.method !== 'POST') {
    console.log(`Invalid method: ${request.method}`);
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

  try {
    // Parse the request body
    const data = await request.json();
    console.log('MightyCall proxy received data:', data);

    if (!data.phoneNumber || !data.message) {
      console.log("Missing required fields in request");
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

    // Format phone number if needed
    let phoneNumber = data.phoneNumber;
    if (!phoneNumber.startsWith('+')) {
      console.log("Phone number doesn't start with +, adding it");
      phoneNumber = '+' + phoneNumber.replace(/[^\d]/g, '');
      console.log(`Reformatted phone number: ${phoneNumber}`);
    }

    // Detect if we're running locally or on Netlify
    const isLocalDevelopment = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1'));
    
    let apiUrl;
    if (isLocalDevelopment) {
      // In local development, route to the mock API handler
      apiUrl = new URL('/api/mightycall', request.url).toString();
      console.log(`Local development detected, forwarding to mock API at: ${apiUrl}`);
    } else {
      // In production, route directly to the Netlify function
      const origin = new URL(request.url).origin;
      apiUrl = `${origin}/.netlify/functions/mightycall`;
      console.log(`Production detected, forwarding to Netlify function at: ${apiUrl}`);
    }
    
    try {
      console.log(`Making fetch request to: ${apiUrl}`);
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
          message: data.message
        })
      });
      
      console.log(`Response received with status: ${response.status}`);
      const responseText = await response.text();
      console.log(`Response body length: ${responseText.length}`);
      console.log(`Raw response: ${responseText.substring(0, 1000)}`);
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
        console.log("Parsed response data:", responseData);
      } catch (parseError) {
        console.error("Error parsing response:", parseError);
        responseData = { 
          error: 'Failed to parse response from server',
          rawResponse: responseText.substring(0, 100) + (responseText.length > 100 ? '...' : '')
        };
      }
      
      return new Response(JSON.stringify(responseData), {
        status: response.status,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (fetchError) {
      console.error('Error making API request:', fetchError);
      return new Response(JSON.stringify({
        error: 'Failed to reach the API endpoint',
        details: fetchError instanceof Error ? fetchError.message : String(fetchError)
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' 
        }
      });
    }
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
