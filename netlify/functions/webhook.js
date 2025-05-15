
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
  const isValid = /^\+\d{10,15}$/.test(phone);
  
  if (!isValid) {
    console.log(`Phone validation failed for: ${phone}`);
    return false;
  }
  
  console.log(`Phone validation passed for: ${phone}`);
  return true;
};

exports.handler = async (event, context) => {
  console.log("Webhook function called with event:", {
    method: event.httpMethod,
    path: event.path,
    headers: Object.keys(event.headers)
  });
  
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
    console.log(`Invalid method: ${event.httpMethod}`);
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
    
    // Format phone number if needed
    let phoneNumber = data.phone;
    if (!phoneNumber.startsWith('+')) {
      console.log("Phone number doesn't start with +, adding it");
      phoneNumber = '+' + phoneNumber.replace(/[^\d]/g, '');
      console.log(`Reformatted phone number: ${phoneNumber}`);
    }
    
    // Validate the phone number
    if (!phoneNumber || !isValidPhoneNumber(phoneNumber)) {
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

    try {
      // Call our mightycall function directly
      console.log("Calling mightycall handler...");
      const { handler: mightycallHandler } = require('./mightycall');
      
      const mightycallEvent = {
        httpMethod: 'POST',
        body: JSON.stringify({
          phoneNumber: phoneNumber,
          message: "I saw that you were interested in scheduling a trial at Scratch Golf Club! Do you have a date and time in mind for when you want to get that scheduled?"
        })
      };
      
      console.log('Calling mightycall handler with:', JSON.parse(mightycallEvent.body));
      
      const mightycallResponse = await mightycallHandler(mightycallEvent);
      console.log('Received response from mightycall handler:', mightycallResponse.statusCode);
      
      let mightycallData;
      try {
        mightycallData = JSON.parse(mightycallResponse.body);
        console.log('Parsed mightycall response body:', mightycallData);
      } catch (parseError) {
        console.error('Error parsing mightycall response:', parseError);
        console.log('Raw response body:', mightycallResponse.body);
        mightycallData = { success: false, error: 'Failed to parse response' };
      }
      
      if (mightycallResponse.statusCode === 200 && mightycallData.success) {
        console.log(`SMS successfully sent to ${phoneNumber}`);
        return {
          statusCode: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            success: true,
            message: `SMS sent to ${phoneNumber}` 
          })
        };
      } else {
        console.error('MightyCall request failed:', mightycallData);
        return {
          statusCode: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            error: 'Failed to send SMS',
            details: mightycallData.error || mightycallData.details || 'Unknown error'
          })
        };
      }
    } catch (mightycallError) {
      console.error('Error calling MightyCall function:', mightycallError);
      return {
        statusCode: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: 'Failed to process MightyCall request',
          details: mightycallError.message || String(mightycallError)
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
