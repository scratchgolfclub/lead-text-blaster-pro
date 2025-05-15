
// Add CORS headers to all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

/**
 * Validate a phone number format
 */
const isValidPhoneNumber = (phone) => {
  // Basic validation for international format (starts with + and has at least 10 digits)
  return /^\+\d{10,15}$/.test(phone);
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
  
  // Check if it's a POST request
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
    console.log('Webhook received data:', data);
    
    // Validate the phone number
    if (!data.phone || !isValidPhoneNumber(data.phone)) {
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: 'Invalid phone number format. Must be in international format (e.g., +12345678901)' 
        })
      };
    }
    
    // Call our mightycall function directly without importing
    // We need to pass the phone and message directly to the mightycall handler
    const { handler: mightycallHandler } = require('./mightycall');
    
    const mightycallEvent = {
      httpMethod: 'POST',
      body: JSON.stringify({
        phoneNumber: data.phone,
        message: "I saw that you were interested in scheduling a trial at Scratch Golf Club! Do you have a date and time in mind for when you want to get that scheduled?"
      })
    };
    
    const mightycallResponse = await mightycallHandler(mightycallEvent);
    const mightycallData = JSON.parse(mightycallResponse.body);
    
    if (mightycallResponse.statusCode === 200 && mightycallData.success) {
      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          success: true,
          message: `SMS sent to ${data.phone}` 
        })
      };
    } else {
      return {
        statusCode: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: 'Failed to send SMS',
          details: mightycallData.error || 'Unknown error'
        })
      };
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
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
