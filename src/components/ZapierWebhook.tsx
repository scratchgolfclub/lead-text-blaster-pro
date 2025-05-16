
import React, { useState } from 'react';
import { toast } from "@/components/ui/use-toast";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PhoneMessageForm } from "@/components/zapier/PhoneMessageForm";
import { ActivityLogs } from "@/components/zapier/ActivityLogs";
import { EnvironmentAlert } from "@/components/zapier/EnvironmentAlert";
import { validatePhoneNumber } from "@/components/zapier/phoneUtils";

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
      <EnvironmentAlert />
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Send Text Messages</CardTitle>
          <CardDescription>
            Send text messages to leads via MightyCall API
          </CardDescription>
        </CardHeader>
        
        <PhoneMessageForm 
          phoneNumber={phoneNumber}
          message={message}
          isLoading={isLoading}
          onPhoneNumberChange={setPhoneNumber}
          onMessageChange={setMessage}
          onSendText={handleSendText}
        />
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>API Activity</CardTitle>
        </CardHeader>
        <ActivityLogs logs={logs} />
      </Card>
    </div>
  );
};

export default ZapierWebhook;
