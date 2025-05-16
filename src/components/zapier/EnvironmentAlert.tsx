
import React from 'react';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export const EnvironmentAlert: React.FC = () => {
  return (
    <Alert className="mb-6 bg-amber-50 border-amber-200">
      <AlertTitle className="text-amber-800">Environment Variables Required</AlertTitle>
      <AlertDescription className="text-amber-700">
        <p>This application requires the following environment variables in Netlify:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li><code>MIGHTYCALL_API_KEY</code> - Your MightyCall API key</li>
          <li><code>MIGHTYCALL_CLIENT_SECRET</code> - Your MightyCall client secret</li>
          <li><code>MIGHTYCALL_FROM_NUMBER</code> - Your MightyCall phone number</li>
        </ul>
      </AlertDescription>
    </Alert>
  );
};
