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
const CLIENT_SECRET = "6fa7b8353fdc";
const FROM_NUMBER = "+18444131701";
const AUTH_URL = "https://ccapi.mightycall.com/v4/auth/token";
const SMS_URL = "https://ccapi.mightycall.com/v4/api/contactcenter/messages/send";

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
      throw new Error(`Authentication failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const authData = await response.json() as AuthResponse;
    
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
          throw new Error(`SMS send retry failed: ${retryResponse.status} ${retryResponse.statusText} - ${retryErrorText}`);
        }
        
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
