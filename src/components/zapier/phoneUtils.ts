
/**
 * Validate phone number format
 */
export const validatePhoneNumber = (phone: string): boolean => {
  // Basic validation for international format
  const isValid = /^\+\d{10,15}$/.test(phone);
  
  if (!isValid) {
    // If not valid but has some numbers, try to format it
    if (/\d/.test(phone)) {
      const formattedPhone = '+' + phone.replace(/[^\d]/g, '');
      if (/^\+\d{10,15}$/.test(formattedPhone)) {
        return true;
      }
    }
  }
  
  return isValid;
};

/**
 * Format phone number to ensure it has the international format
 */
export const formatPhoneNumber = (phone: string): string => {
  if (!phone.startsWith('+')) {
    return '+' + phone.replace(/[^\d]/g, '');
  }
  return phone;
};
