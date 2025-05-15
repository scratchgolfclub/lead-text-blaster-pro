
import { handleWebhook } from './webhook';

// This function will be used by serverless functions to handle API requests
export default function handler(request: Request) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Route to the webhook handler
  if (path.endsWith('/api/webhook')) {
    return handleWebhook(request);
  }
  
  // Default 404 response
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}
