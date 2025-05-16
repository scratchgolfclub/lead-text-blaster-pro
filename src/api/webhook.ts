
import { validatePhoneNumber, formatPhoneNumber } from '../components/zapier/phoneUtils';

// Define valid locations as an enum type
type LocationType = 'downtown' | 'loverslane' | 'plano';

// Function to validate the location param
const isValidLocation = (location: string): boolean => {
  const validLocations = ['downtown', 'loverslane', 'plano'];
  return validLocations.includes(location.toLowerCase());
};

// Parse URL parameters from the webhook path
const parseWebhookParams = (url: URL): { location?: LocationType; customMessage?: string } => {
  const pathParts = url.pathname.split('/');
  
  // URL format is expected to be /api/webhook/[location]/[message]
  // We need at least /api/webhook/[location]
  if (pathParts.length < 4) {
    return {};
  }
  
  // Extract location from URL path
  const location = pathParts[3].toLowerCase() as LocationType;
  
  // Extract custom message if available (would be the 5th part, index 4)
  let customMessage: string | undefined = undefined;
  if (pathParts.length >= 5) {
    customMessage = pathParts[4].replace(/_/g, ' '); // Replace underscores with spaces
  }
  
  return { location, customMessage };
};

/**
 * Handle webhook requests from Zapier
 */
export const handleWebhook = async (request: Request): Promise<Response> => {
  const url = new URL(request.url);
  console.log(`Processing webhook request for URL: ${url.pathname}`);
  
  // Handle preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }
  
  // Check if it's a POST request
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      }
    });
  }
  
  try {
    // Extract parameters from the URL
    const { location, customMessage } = parseWebhookParams(url);
    
    // If no location was provided, return an error
    if (!location) {
      return new Response(JSON.stringify({ 
        error: 'Missing location parameter',
        validOptions: 'downtown, loverslane, plano',
        expectedFormat: '/api/webhook/[location]/[message]'
      }), { 
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' 
        }
      });
    }
    
    // Validate location
    if (!isValidLocation(location)) {
      return new Response(JSON.stringify({ 
        error: `Invalid location: ${location}`,
        validOptions: 'downtown, loverslane, plano'
      }), { 
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' 
        }
      });
    }
    
    // If no custom message was provided, return an error
    if (!customMessage) {
      return new Response(JSON.stringify({ 
        error: 'Missing message parameter',
        expectedFormat: '/api/webhook/[location]/[message]'
      }), { 
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' 
        }
      });
    }
    
    // Parse the request body for phone number
    const data = await request.json();
    console.log('Webhook received data:', data);
    
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
      return new Response(JSON.stringify({ 
        error: 'No phone number found in the request data',
        receivedData: data
      }), { 
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' 
        }
      });
    }
    
    // Format and validate the phone number
    const formattedPhone = formatPhoneNumber(phoneNumber);
    if (!validatePhoneNumber(formattedPhone)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid phone number format after formatting',
        original: phoneNumber,
        formatted: formattedPhone,
        validFormat: 'Must be in international format (e.g., +12345678901)'
      }), { 
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' 
        }
      });
    }
    
    // Use the custom message directly without any default messages
    const messageText = customMessage;
    console.log(`Using custom message: "${messageText}"`);
    
    // Forward the request directly to the Netlify function
    const origin = new URL(request.url).origin;
    const mightycallResponse = await fetch(`${origin}/api/mightycall`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phoneNumber: formattedPhone,
        message: messageText
      })
    });
    
    const mightycallData = await mightycallResponse.json();
    
    if (mightycallResponse.ok && mightycallData.success) {
      return new Response(JSON.stringify({ 
        success: true,
        message: `SMS sent to ${formattedPhone}`,
        location: location,
        customMessage: customMessage
      }), { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' 
        }
      });
    } else {
      return new Response(JSON.stringify({ 
        error: 'Failed to send SMS',
        details: mightycallData.error || mightycallData.details || 'Unknown error'
      }), { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' 
        }
      });
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
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
