
// MightyCall API service for authentication and sending SMS

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface TokenCache {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// In-memory token cache (in production, consider using a more persistent solution)
let tokenCache: TokenCache | null = null;

// MightyCall API constants
const API_KEY = "b3777535-eb5e-474d-801f-009491645883";
const CLIENT_SECRET = "aec11e6836d7"; 
const FROM_NUMBER = "+18444131701";

// Updated API URLs with proper environment prefix (using 'api' for production)
const API_PREFIX = "ccapi"; // Options: "sandbox" for testing, "api" or "ccapi" for production
const API_VERSION = "v4";
const BASE_URL = `https://${API_PREFIX}.mightycall.com/${API_VERSION}`;
const AUTH_URL = `${BASE_URL}/auth/token`;
const SMS_URL = `${BASE_URL}/api/contactcenter/messages/send`;

/**
 * Get a valid access token, either from cache or by requesting a new one
 */
export const getAccessToken = async (): Promise<string> => {
  const now = Date.now();
  
  // If we have a cached token that's still valid (with 5 min buffer), return it
  if (tokenCache && tokenCache.expiresAt > now + 300000) {
    console.log("Using cached access token");
    return tokenCache.accessToken;
  }
  
  // Otherwise, request a new token
  console.log("Requesting new access token");
  
  const urlencoded = new URLSearchParams();
  urlencoded.append("grant_type", "client_credentials");
  urlencoded.append("client_id", API_KEY);
  urlencoded.append("client_secret", CLIENT_SECRET);
  
  try {
    // Add more detailed logging
    console.log("Auth request details:", {
      url: AUTH_URL,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "x-api-key": API_KEY
      },
      body: urlencoded.toString()
    });
    
    const response = await fetch(AUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "x-api-key": API_KEY
      },
      body: urlencoded
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Auth error response:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`Authentication failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const authData = await response.json() as AuthResponse;
    console.log("Auth succeeded, token received");
    
    // Cache the token
    tokenCache = {
      accessToken: authData.access_token,
      refreshToken: authData.refresh_token,
      expiresAt: now + (authData.expires_in * 1000) // convert seconds to milliseconds
    };
    
    return authData.access_token;
  } catch (error) {
    console.error("Error getting access token:", error);
    throw error;
  }
};

/**
 * Send an SMS using the MightyCall API
 */
export const sendSMS = async (phoneNumber: string, message: string): Promise<boolean> => {
  try {
    // Get a valid access token
    const accessToken = await getAccessToken();
    
    const payload = {
      from: FROM_NUMBER,
      to: [phoneNumber],
      message,
      attachments: []
    };
    
    console.log("Sending SMS with payload:", payload);
    
    const response = await fetch(SMS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "x-api-key": API_KEY
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("SMS send error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      
      // If unauthorized, try once with a fresh token
      if (response.status === 401) {
        console.log("Token expired, forcing token refresh and retrying...");
        tokenCache = null; // Clear the cache to force new token
        const newAccessToken = await getAccessToken();
        
        const retryResponse = await fetch(SMS_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${newAccessToken}`,
            "x-api-key": API_KEY
          },
          body: JSON.stringify(payload)
        });
        
        if (!retryResponse.ok) {
          const retryErrorText = await retryResponse.text();
          console.error("SMS retry error:", {
            status: retryResponse.status,
            statusText: retryResponse.statusText,
            body: retryErrorText
          });
          throw new Error(`SMS send retry failed: ${retryResponse.status} ${retryResponse.statusText} - ${retryErrorText}`);
        }
        
        console.log("SMS retry succeeded");
        return true; // Retry succeeded
      }
      
      throw new Error(`SMS send failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    console.log(`SMS sent successfully to ${phoneNumber}`);
    return true;
  } catch (error) {
    console.error("Error sending SMS:", error);
    return false;
  }
};
