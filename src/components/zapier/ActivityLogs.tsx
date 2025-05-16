
import React from 'react';
import { CardContent } from "@/components/ui/card";

interface ActivityLogsProps {
  logs: string[];
}

export const ActivityLogs: React.FC<ActivityLogsProps> = ({ logs }) => {
  return (
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
  );
};
