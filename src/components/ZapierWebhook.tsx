
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";

// Default message to be sent to leads
const DEFAULT_MESSAGE = "I saw that you were interested in scheduling a trial at Scratch Golf Club! Do you have a date and time in mind for when you want to get that scheduled?";

const ZapierWebhook: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  
  // Helper function to log messages
  const addLog = (log: string) => {
    setLogs(prevLogs => [...prevLogs, `${new Date().toLocaleTimeString()}: ${log}`]);
  };
  
  const handleSendManual = async () => {
    if (!phoneNumber) {
      toast({
        title: "Error",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    addLog(`Sending SMS to ${phoneNumber}...`);
    
    try {
      // Use our proxy API instead of direct MightyCall API call
      const response = await fetch('/api/mightycall', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          message
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        toast({
          title: "Success",
          description: `Message sent to ${phoneNumber}`,
        });
        addLog(`Successfully sent SMS to ${phoneNumber}`);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to send SMS. Check logs for details.",
          variant: "destructive",
        });
        addLog(`Failed to send SMS to ${phoneNumber}: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error in handleSendManual:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      addLog(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>MightyCall SMS Sender</CardTitle>
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
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter phone number with country code (e.g., +1 for US)
              </p>
            </div>
            
            <div>
              <label htmlFor="message" className="block text-sm font-medium mb-1">
                Message
              </label>
              <textarea
                id="message"
                className="w-full min-h-[100px] p-2 border rounded-md"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleSendManual}
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : "Send Manual Test"}
          </Button>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Integration Guide</CardTitle>
          <CardDescription>
            How to integrate with Zapier
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Webhook Endpoint</h3>
              <p className="text-sm mt-1">{window.location.origin}/api/webhook</p>
              <p className="text-xs text-gray-500 mt-1">
                Use this URL in your Zapier webhook action
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold">Expected JSON Format</h3>
              <pre className="bg-gray-100 p-2 rounded text-sm">
                {JSON.stringify({ phone: "+12345678901" }, null, 2)}
              </pre>
            </div>
            
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Activity Logs</h3>
              <div className="bg-gray-100 p-2 rounded max-h-40 overflow-y-auto text-sm">
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
