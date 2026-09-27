#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const envExample = `# API Configuration
EXPO_PUBLIC_API_URL=https://api.ogamechanic.com/v1
EXPO_PUBLIC_API_KEY=DNTc5u8uGCibny1U5LSz6Su7qYnWHfRFTX1yTSBSU3NwJ8w8iYwBZP0pdg46zqoq

# Environment
EXPO_PUBLIC_ENV=development

# App Configuration
EXPO_PUBLIC_APP_NAME=Oga Mechanic
EXPO_PUBLIC_APP_VERSION=1.0.0

# Feature Flags
EXPO_PUBLIC_ENABLE_ANALYTICS=true
EXPO_PUBLIC_ENABLE_CRASH_REPORTING=true

# Third-party Services
EXPO_PUBLIC_GOOGLE_SIGN_UP_API_KEY=your_google_web_client_id_here
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_google_web_client_id_here
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your_google_ios_client_id_here
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key_here

# WebSocket Configuration
EXPO_PUBLIC_WEBSOCKET_URL=wss://api.ogamechanic.com/ws

# File Upload Configuration
EXPO_PUBLIC_MAX_FILE_SIZE=10485760
EXPO_PUBLIC_ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,doc,docx`;

const envPath = path.join(process.cwd(), '.env');

// Check if .env already exists
if (fs.existsSync(envPath)) {
} else {
  // Create .env file
  fs.writeFileSync(envPath, envExample);
}
