
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

/**
 * Get message text based on location
 */
const getMessageForLocation = (location, customMessage = '') => {
  const customMessageSuffix = customMessage ? ` ${customMessage}` : '';
  
  switch (location.toLowerCase()) {
    case 'downtown':
      return `Hi, this is Griffin with Scratch Golf Club! I saw that you were interested in joining our club downtown. Are you ready to join as a member or would you like to come in for a trial to experience the facility first?${customMessageSuffix}`;
    case 'loverslane':
      return `Hi, this is Griffin with Scratch Golf Club! I saw that you were interested in joining our club at Lovers Lane. Are you ready to join as a member or would you like to come in for a trial to experience the facility first?${customMessageSuffix}`;
    case 'plano':
      return `Hi, this is Griffin with Scratch Golf Club! I saw that you were interested in joining our club in Plano. Would you like to reserve your spot on the waitlist?${customMessageSuffix}`;
    default:
      const error = `Invalid location specified: ${location}. Valid options are: downtown, loverslane, plano`;
      console.error(error);
      throw new Error(error);
  }
};

/**
 * Parse URL parameters from the webhook path
 */
const parseWebhookParams = (path) => {
  const pathParts = path.split('/');
  
  // URL format is expected to be /api/webhook/[location]/[message]
  // or /.netlify/functions/webhook/[location]/[message]
  
  // Find the index of 'webhook' in the path
  const webhookIndex = pathParts.findIndex(part => part === 'webhook');
  
  if (webhookIndex === -1 || webhookIndex === pathParts.length - 1) {
    return {};
  }
  
  // Extract location (should be the part after 'webhook')
  const location = pathParts[webhookIndex + 1];
  
  // Extract custom message if available (would be after location)
  let customMessage = undefined;
  if (webhookIndex + 2 < pathParts.length) {
    customMessage = pathParts[webhookIndex + 2].replace(/_/g, ' '); // Replace underscores with spaces
  }
  
  return { location, customMessage };
};

exports.handler = async (event, context) => {
  console.log("Webhook function called with event:", {
    method: event.httpMethod,
    path: event.path,
    // Safely access headers if they exist
    headers: event.headers ? Object.keys(event.headers) : []
  });
  
  // Extract parameters from the path
  const { location, customMessage } = parseWebhookParams(event.path);
  console.log(`Extracted parameters - location: ${location || 'not provided'}, customMessage: ${customMessage || 'not provided'}`);
  
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
  
  // If no location was provided, return an error
  if (!location) {
    return {
      statusCode: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Missing location parameter',
        validOptions: 'downtown, loverslane, plano',
        expectedFormat: '/api/webhook/[location]/[optional_message]'
      })
    };
  }
  
  try {
    // Parse the request body
    let data;
    try {
      data = JSON.parse(event.body || '{}');
      console.log('Webhook received data:', data);
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

    // Get the appropriate message for the location
    let messageText;
    try {
      messageText = getMessageForLocation(location, customMessage);
      console.log(`Using message text: "${messageText}"`);
    } catch (error) {
      console.error('Error determining message text:', error);
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: error.message || 'Invalid location parameter',
          validOptions: 'downtown, loverslane, plano'
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
          message: messageText
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
            message: `SMS sent to ${formattedPhone}`,
            location: location,
            customMessage: customMessage || 'None provided'
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
