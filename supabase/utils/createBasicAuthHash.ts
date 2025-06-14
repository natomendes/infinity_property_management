export const createBasicAuthHash = (
  clientId: string,
  clientSecret: string,
): string => {
  // Combine client_id and client_secret with colon separator
  const credentials = `${clientId}:${clientSecret}`;

  // Convert to base64
  const base64Hash = btoa(credentials);

  // Return with "Basic " prefix
  return `Basic ${base64Hash}`;
};
