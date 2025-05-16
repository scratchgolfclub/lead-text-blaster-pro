
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Phone } from "lucide-react";

interface PhoneMessageFormProps {
  phoneNumber: string;
  message: string;
  isLoading: boolean;
  onPhoneNumberChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onSendText: () => void;
}

export const PhoneMessageForm: React.FC<PhoneMessageFormProps> = ({
  phoneNumber,
  message,
  isLoading,
  onPhoneNumberChange,
  onMessageChange,
  onSendText
}) => {
  return (
    <>
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
              onChange={(e) => onPhoneNumberChange(e.target.value)}
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
              onChange={(e) => onMessageChange(e.target.value)}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={onSendText}
          disabled={isLoading}
          className="gap-2"
        >
          <Phone size={18} />
          {isLoading ? "Sending..." : "Send Text Message"}
        </Button>
      </CardFooter>
    </>
  );
};
