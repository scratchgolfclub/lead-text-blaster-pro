
import { handleWebhook } from './webhook';
import { handleMightycallProxy } from './mightycall';
import { handleMockMightycall } from './mock-mightycall';

// This function will be used by serverless functions to handle API requests
export default function handler(request: Request) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  console.log(`API handler processing request for: ${path}`);
  
  // Route to the webhook handler with parameters
  if (path.includes('/api/webhook')) {
    console.log('Routing to webhook handler');
    return handleWebhook(request);
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
