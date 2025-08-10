// Auth configuration with fallback handling
export const getAuthDatabase = () => {
  const DATABASE_URL = process.env.DATABASE_URL!
  
  // Parse the connection string to add timeout parameters
  const url = new URL(DATABASE_URL);
  url.searchParams.set('connect_timeout', '30');
  url.searchParams.set('statement_timeout', '30000');
  url.searchParams.set('idle_in_transaction_session_timeout', '30000');
  
  return url.toString();
};