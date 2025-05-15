
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Phone } from "lucide-react";

// Default message to be sent to leads
const DEFAULT_MESSAGE = "I saw that you were interested in scheduling a trial at Scratch Golf Club! Do you have a date and time in mind for when you want to get that scheduled?";

// Direct Netlify function endpoint
const API_ENDPOINT = '/.netlify/functions/mightycall';

const ZapierWebhook: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  
  // Helper function to log messages
  const addLog = (log: string) => {
    setLogs(prevLogs => [...prevLogs, `${new Date().toLocaleTimeString()}: ${log}`]);
    console.log(`LOG: ${log}`); // Also log to console for debugging
  };
  
  // Validate phone number format
  const validatePhoneNumber = (phone: string): boolean => {
    // Basic validation for international format
    const isValid = /^\+\d{10,15}$/.test(phone);
    
    if (!isValid) {
      // If not valid but has some numbers, try to format it
      if (/\d/.test(phone)) {
        const formattedPhone = '+' + phone.replace(/[^\d]/g, '');
        if (/^\+\d{10,15}$/.test(formattedPhone)) {
          setPhoneNumber(formattedPhone);
          return true;
        }
      }
    }
    
    return isValid;
  };
  
  const handleSendText = async () => {
    if (!phoneNumber) {
      toast({
        title: "Error",
        description: "Please enter a phone number",
        variant: "destructive",
      });
      return;
    }
    
    // Validate phone number format
    if (!validatePhoneNumber(phoneNumber)) {
      toast({
        title: "Invalid Phone Format",
        description: "Please enter a valid phone number with country code (e.g., +12345678901)",
        variant: "destructive",
      });
      return;
    }
    
    if (!message.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    addLog(`Sending SMS to ${phoneNumber} via ${API_ENDPOINT}...`);
    
    try {
      // Make direct request to the Netlify function
      addLog(`Making request to ${API_ENDPOINT}...`);
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          message
        }),
      });
      
      addLog(`Received response with status: ${response.status}`);
      let responseText;
      try {
        responseText = await response.text();
        addLog(`Raw response: ${responseText}`);
      } catch (error) {
        addLog(`Error reading response text: ${error instanceof Error ? error.message : String(error)}`);
        responseText = '';
      }
      
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : {};
        addLog(`Parsed response data: ${JSON.stringify(data)}`);
      } catch (error) {
        addLog(`Error parsing JSON response: ${error instanceof Error ? error.message : String(error)}`);
        data = { error: 'Invalid JSON response', rawResponse: responseText };
      }
      
      if (response.ok && data.success) {
        toast({
          title: "Success",
          description: `Message sent to ${phoneNumber}`,
        });
        addLog(`Successfully sent SMS to ${phoneNumber}`);
      } else {
        let errorMessage = data.error || "Failed to send SMS.";
        
        // Check for 404 errors specifically
        if (response.status === 404) {
          errorMessage = "Netlify function not found. Please make sure your application is deployed to Netlify with the required functions.";
          addLog("404 error: Netlify function not found");
        }
        
        // Provide more helpful error messages for common issues
        if (data.details) {
          if (typeof data.details === 'object') {
            addLog(`Error details: ${JSON.stringify(data.details)}`);
            if (data.details.text && data.details.text.includes("404")) {
              errorMessage = "Netlify function not found. Please make sure your application is deployed to Netlify with the required functions.";
            } else if (data.details.text && data.details.text.includes("CORS")) {
              errorMessage = "CORS error detected. This app needs to be deployed to Netlify with proper environment variables.";
            } else if (data.details.message) {
              errorMessage += ` ${data.details.message}`;
            }
          } else {
            addLog(`Error details: ${data.details}`);
            errorMessage += ` ${data.details}`;
          }
        }
        
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        addLog(`Failed to send SMS to ${phoneNumber}: ${errorMessage}`);
      }
    } catch (error) {
      console.error("Error in handleSendText:", error);
      
      const errorMessage = error instanceof Error && error.message.includes("CORS") 
        ? "CORS error detected. This app needs to be deployed to Netlify to work properly."
        : `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`;
        
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      addLog(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <Alert className="mb-6 bg-amber-50 border-amber-200">
        <AlertTitle className="text-amber-800">Environment Variables Required</AlertTitle>
        <AlertDescription className="text-amber-700">
          <p>This application requires the following environment variables in Netlify:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><code>MIGHTYCALL_API_KEY</code> - Your MightyCall API key</li>
            <li><code>MIGHTYCALL_CLIENT_SECRET</code> - Your MightyCall client secret</li>
            <li><code>MIGHTYCALL_FROM_NUMBER</code> - Your MightyCall phone number</li>
            <li>(Optional) <code>MIGHTYCALL_API_PREFIX</code> - API prefix (default: "api")</li>
            <li>(Optional) <code>MIGHTYCALL_API_VERSION</code> - API version (default: "v4")</li>
          </ul>
        </AlertDescription>
      </Alert>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Send Text Messages</CardTitle>
          <CardDescription>
            Send text messages to leads via MightyCall API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium mb-1">
                Phone Number
              </label>
              <Input
                id="phoneNumber"
                placeholder="+12345678901"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">
                Include country code (e.g., +1 for US)
              </p>
            </div>
            
            <div>
              <label htmlFor="message" className="block text-sm font-medium mb-1">
                Message
              </label>
              <Textarea
                id="message"
                className="min-h-[100px] font-mono"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleSendText}
            disabled={isLoading}
            className="gap-2"
          >
            <Phone size={18} />
            {isLoading ? "Sending..." : "Send Text Message"}
          </Button>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>API Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Webhook Endpoint (For Zapier Integration)</h3>
              <p className="text-sm mt-1 font-mono">
                {window.location.origin}/api/webhook
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Use this URL in your Zapier webhook action with JSON format: {"{ \"phone\": \"+12345678901\" }"}
              </p>
            </div>
            
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Activity Logs ({logs.length})</h3>
              <div className="bg-gray-100 p-2 rounded max-h-60 overflow-y-auto text-sm font-mono">
                {logs.length > 0 ? (
                  logs.map((log, index) => <div key={index}>{log}</div>)
                ) : (
                  <p className="text-gray-500">No activity yet</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ZapierWebhook;
