
// Add CORS headers to all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

/**
 * Format phone number to ensure it has the international format
 */
const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/[^\d+]/g, '');
  
  // Add + if it doesn't start with it
  if (!digitsOnly.startsWith('+')) {
    return '+' + digitsOnly;
  }
  
  return digitsOnly;
};

/**
 * Validate a phone number format
 */
const isValidPhoneNumber = (phone) => {
  if (!phone) return false;
  
  // Basic validation for international format (starts with + and has at least 10 digits)
  const isValid = /^\+\d{10,15}$/.test(phone);
  
  console.log(`Phone validation ${isValid ? 'passed' : 'failed'} for: ${phone}`);
  return isValid;
};

exports.handler = async (event, context) => {
  console.log("Lovers Lane webhook function called with event:", {
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
    let data;
    try {
      data = JSON.parse(event.body);
      console.log('Lovers Lane webhook received data:', data);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: 'Invalid JSON payload',
          details: parseError.message
        })
      };
    }
    
    // Check for phone number in different possible formats from Zapier
    // Zapier might send it as data.phone, data.Phone, or some other variation
    let phoneNumber = null;
    
    // Try to find the phone number in the payload (case insensitive)
    for (const key in data) {
      if (typeof data[key] === 'string' && key.toLowerCase().includes('phone')) {
        phoneNumber = data[key];
        console.log(`Found phone number in field '${key}': ${phoneNumber}`);
        break;
      }
    }
    
    // If we still don't have a phone number, try the first string value we can find
    if (!phoneNumber) {
      for (const key in data) {
        if (typeof data[key] === 'string' && /\d/.test(data[key])) {
          phoneNumber = data[key];
          console.log(`Found potential phone number in field '${key}': ${phoneNumber}`);
          break;
        }
      }
    }
    
    // If no phone number found, return error
    if (!phoneNumber) {
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: 'No phone number found in the request data',
          receivedData: data
        })
      };
    }
    
    // Format the phone number
    const formattedPhone = formatPhoneNumber(phoneNumber);
    console.log(`Formatted phone number: ${formattedPhone}`);
    
    // Validate the phone number
    if (!formattedPhone || !isValidPhoneNumber(formattedPhone)) {
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: 'Invalid phone number format after formatting',
          original: phoneNumber,
          formatted: formattedPhone,
          validFormat: 'Must be in international format (e.g., +12345678901)'
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
          phoneNumber: formattedPhone,
          message: "Hi, this is Griffin with Scratch Golf Club! I saw that you were interested in joining our club at Lovers Lane. Are you ready to join as a member or would you like to come in for a trial to experience the facility first?"
        }),
        // Add empty headers to avoid null reference errors
        headers: {}
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
        console.log(`SMS successfully sent to ${formattedPhone}`);
        return {
          statusCode: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            success: true,
            message: `SMS sent to ${formattedPhone}` 
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
