
/**
 * Mock API handler for MightyCall requests during local development
 * This simulates successful responses without actually sending SMS
 */
export const handleMockMightycall = async (request: Request): Promise<Response> => {
  console.log("Mock MightyCall handler called - simulating success");
  
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
    console.log('Mock MightyCall handler received data:', data);

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

    // Simulate a successful response
    console.log(`MOCK: Would have sent SMS to ${data.phoneNumber}`);
    
    return new Response(JSON.stringify({
      success: true,
      message: `SIMULATED: SMS sent to ${data.phoneNumber}`,
      details: {
        mock: true,
        timestamp: new Date().toISOString(),
        phoneNumber: data.phoneNumber,
        messageLength: data.message.length
      }
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      }
    });
  } catch (error) {
    console.error('Error in mock MightyCall handler:', error);
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
