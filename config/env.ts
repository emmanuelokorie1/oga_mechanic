// Environment Configuration
// Copy this file to .env and update the values as needed

export const ENV_CONFIG = {
  // API Configuration
  API_URL: process.env.EXPO_PUBLIC_API_URL || (() => {
    console.error('❌ EXPO_PUBLIC_API_URL is missing! Requests will fail.');
    return 'https://api-missing-error.ogamechanic.org';
  })(),
  API_KEY: process.env.EXPO_PUBLIC_API_KEY || (() => {
    console.error('❌ EXPO_PUBLIC_API_KEY is missing! API access may be restricted.');
    return 'MISSING_API_KEY';
  })(),
  
  // Environment
  ENV: process.env.EXPO_PUBLIC_ENV || 'development',
  
  // App Configuration
  APP_NAME: process.env.EXPO_PUBLIC_APP_NAME || 'Oga Mechanic',
  APP_VERSION: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
  
  // Feature Flags
  ENABLE_ANALYTICS: process.env.EXPO_PUBLIC_ENABLE_ANALYTICS === 'true',
  ENABLE_CRASH_REPORTING: process.env.EXPO_PUBLIC_ENABLE_CRASH_REPORTING === 'true',
  
  // Third-party Services
  GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyDGQK3DCCu8bbbvJXd2JGBPAy5jMce0PPQ',
  GOOGLE_MAPS_AUTOCOMPLETE_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_AUTOCOMPLETE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_AUTOCOMPLETE_API_KEY || 'AIzaSyCY2wxCiyA8elykXO7IPxDXj3em4k1DQTs',
  GOOGLE_SIGN_UP_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_SIGN_UP_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '113954419006-ngbls808fq260861rc0inh74hu9v8g0l.apps.googleusercontent.com',
  GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_SIGN_UP_API_KEY || '113954419006-ngbls808fq260861rc0inh74hu9v8g0l.apps.googleusercontent.com',
  GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '113954419006-6a0imrer5lb7t626culnfluj0t45mni7.apps.googleusercontent.com',
  STRIPE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  MAPBOX_ACCESS_TOKEN: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '',
  MAPBOX_PLACES_ENDPOINT: process.env.EXPO_PUBLIC_MAPBOX_PLACES_ENDPOINT || 'https://api.mapbox.com/geocoding/v5/mapbox.places',
  
  // WebSocket Configuration
  WEBSOCKET_URL: process.env.EXPO_PUBLIC_WEBSOCKET_URL || 'wss://api.ogamechanic.org/ws',
  
  // File Upload Configuration
  MAX_FILE_SIZE: parseInt(process.env.EXPO_PUBLIC_MAX_FILE_SIZE || '10485760'),
  ALLOWED_FILE_TYPES: process.env.EXPO_PUBLIC_ALLOWED_FILE_TYPES?.split(',') || ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
  
  // Security Configuration
  ENABLE_CERTIFICATE_PINNING: process.env.EXPO_PUBLIC_ENABLE_CERTIFICATE_PINNING === 'true',
  ENABLE_REQUEST_SIGNING: process.env.EXPO_PUBLIC_ENABLE_REQUEST_SIGNING === 'true',
  ENABLE_BIOMETRIC_AUTH: process.env.EXPO_PUBLIC_ENABLE_BIOMETRIC_AUTH === 'true',
  ENABLE_RATE_LIMITING: process.env.EXPO_PUBLIC_ENABLE_RATE_LIMITING === 'true',
  ENABLE_DATA_ENCRYPTION: process.env.EXPO_PUBLIC_ENABLE_DATA_ENCRYPTION === 'true',
} as const;

// Validation
export const validateEnvConfig = () => {
  const required = ['API_URL'];
  const missing = required.filter(key => !ENV_CONFIG[key as keyof typeof ENV_CONFIG]);
  
  if (missing.length > 0) {
    console.warn(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  return missing.length === 0;
};

// Initialize validation
validateEnvConfig();
