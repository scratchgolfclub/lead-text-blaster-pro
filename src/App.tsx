
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import apiHandler from './api/index';

// Detect if we're running in production (on Netlify) or locally
const isProduction = window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1');
console.log(`Running in ${isProduction ? 'production' : 'development'} mode`);

// Setup API request handler for development only
if (typeof window !== 'undefined' && !isProduction) {
  // Mock server API routes on the client side during development only
  console.log('Setting up local API interceptor for development');
  const originalFetch = window.fetch;
  window.fetch = async function(input, init) {
    const url = input instanceof Request ? input.url : String(input);
    
    // Only intercept local API requests that start with /api/
    if (url.includes('/api/') && !url.includes('/.netlify/functions/')) {
      console.log('Intercepting local API request to:', url);
      const request = input instanceof Request ? input : new Request(url, init);
      return apiHandler(request);
    }
    
    return originalFetch(input, init);
  };
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
