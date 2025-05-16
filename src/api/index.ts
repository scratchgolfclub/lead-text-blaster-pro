
import { handleWebhook } from './webhook';
import { handleMightycallProxy } from './mightycall';
import { handleMockMightycall } from './mock-mightycall';

// This function will be used by serverless functions to handle API requests
export default function handler(request: Request) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  console.log(`API handler processing request for: ${path}`);
  
  // Route to the webhook handler (using legacy path for backward compatibility)
  if (path.endsWith('/api/webhook')) {
    console.log('Routing to webhook handler (legacy)');
    return handleWebhook(request);
  }
  
  // Route to location-specific webhook handlers
  if (path.endsWith('/api/downtown')) {
    console.log('Routing to downtown webhook handler');
    return handleWebhook(request, "Hi, this is Griffin with Scratch Golf Club! I saw that you were interested in joining our club downtown. Are you ready to join as a member or would you like to come in for a trial to experience the facility first?");
  }
  
  if (path.endsWith('/api/loverslane')) {
    console.log('Routing to lovers lane webhook handler');
    return handleWebhook(request, "Hi, this is Griffin with Scratch Golf Club! I saw that you were interested in joining our club at Lovers Lane. Are you ready to join as a member or would you like to come in for a trial to experience the facility first?");
  }
  
  if (path.endsWith('/api/plano')) {
    console.log('Routing to plano webhook handler');
    return handleWebhook(request, "Hi, this is Griffin with Scratch Golf Club! I saw that you were interested in joining our club in Plano. Would you like to reserve your spot on the waitlist?");
  }
  
  // Route to the MightyCall proxy handler
  if (path.endsWith('/api/mightycall')) {
    console.log('Routing to mightycall proxy handler');
    return handleMightycallProxy(request);
  }
  
  // Route to the mock MightyCall handler (for local development)
  if (path.endsWith('/api/mock-mightycall')) {
    console.log('Routing to mock mightycall handler');
    return handleMockMightycall(request);
  }
  
  // Default 404 response
  console.log(`No handler found for: ${path}`);
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}
