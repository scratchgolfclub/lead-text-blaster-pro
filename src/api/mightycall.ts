
/**
 * Proxy API handler for MightyCall requests
 * This helps us avoid CORS issues by routing MightyCall API calls through our server
 */
export const handleMightycallProxy = async (request: Request): Promise<Response> => {
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

    // Forward the request to our Netlify function
    const apiUrl = new URL('/api/mightycall', request.url).toString();
    console.log(`Forwarding request to Netlify function at: ${apiUrl}`);
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phoneNumber: data.phoneNumber,
          message: data.message
        })
      });
      
      const responseData = await response.json();
      
      return new Response(JSON.stringify(responseData), {
        status: response.status,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (fetchError) {
      console.error('Error calling Netlify function:', fetchError);
      return new Response(JSON.stringify({
        error: 'Failed to reach the Netlify function',
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
