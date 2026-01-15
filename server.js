require('dotenv').config();
const app = require('./app');
const http = require('http');
const { syncEnvWithPort } = require('./utils/updateEnvPort');
const { autoFixGoogleOAuth } = require('./utils/googleOauthFix');

// Port configuration - strictly use PORT 3006
const DEFAULT_PORT = 3006;
const FALLBACK_PORTS = [3007, 3008, 8081, 8082, 8083]; // Use higher ports that don't require elevated privileges
let PORT = parseInt(process.env.PORT) || DEFAULT_PORT;

// Force PORT to 3006 if not explicitly set
if (!process.env.PORT) {
  PORT = DEFAULT_PORT;
  process.env.PORT = DEFAULT_PORT.toString();
}

const HOST = process.env.HOST || '0.0.0.0'; // Use 0.0.0.0 for better compatibility

// Validate environment variables
function validateEnv() {
  const required = ['MONGO_URI', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'SESSION_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('💡 Please create a .env file in the backend folder with all required variables.');
    console.error('💡 See ENVIRONMENT_SETUP.md for details.');
    process.exit(1);
  }
  
  console.log('✅ Environment variables validated');
  
  // Validate Stripe configuration (warnings only, not fatal)
  const stripeVars = {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRO_PRICE_ID: process.env.STRIPE_PRO_PRICE_ID,
    STRIPE_BUSINESS_PRICE_ID: process.env.STRIPE_BUSINESS_PRICE_ID
  };
  
  const missingStripe = Object.entries(stripeVars)
    .filter(([key, value]) => !value)
    .map(([key]) => key);
  
  if (missingStripe.length > 0) {
    console.warn('⚠️  WARNING: Stripe configuration incomplete!');
    console.warn('   Missing:', missingStripe.join(', '));
    console.warn('   Payment features will not work until these are configured.');
    console.warn('   See STRIPE_PAYMENT_SETUP.md for setup instructions.\n');
  } else {
    console.log('✅ Stripe configuration validated');
    console.log('   • Secret Key: ' + (process.env.STRIPE_SECRET_KEY.substring(0, 15) + '...'));
    console.log('   • Webhook Secret: ' + (process.env.STRIPE_WEBHOOK_SECRET.substring(0, 15) + '...'));
    console.log('   • Pro Price ID: ' + process.env.STRIPE_PRO_PRICE_ID);
    console.log('   • Business Price ID: ' + process.env.STRIPE_BUSINESS_PRICE_ID + '\n');
  }
}

// Start server with automatic port fallback
function startServer(port, attempt = 0) {
  const server = http.createServer(app);
  
  server.listen(port, HOST, () => {
    // Update environment variable for consistency
    process.env.PORT = port.toString();
    
    // Auto-sync .env file with actual running port
    syncEnvWithPort(port);
    
    // Auto-fix Google OAuth redirect URI mismatch
    autoFixGoogleOAuth(port);
    
    console.log('\n🚀 Backend server started successfully!');
    console.log(`📍 Server running on http://localhost:${port}`);
    console.log(`🌐 Accessible at http://${HOST}:${port}`);
    console.log(`🔐 Google OAuth: http://localhost:${port}/auth/google`);
    console.log(`📊 Health check: http://localhost:${port}/\n`);
    
    // Verify BACKEND_URL is in sync (should always be true now)
    const backendUrl = process.env.BACKEND_URL || '';
    const urlMatch = backendUrl.match(/http:\/\/[^:]+:(\d+)/);
    const backendPort = urlMatch ? parseInt(urlMatch[1]) : null;
    
    if (backendUrl && backendPort && backendPort === port) {
      console.log(`✅ BACKEND_URL in sync: http://localhost:${port}\n`);
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EACCES') {
      console.error(`❌ Permission denied on port ${port}`);
      console.error('   This usually means the port requires elevated privileges or is blocked.');
      
      // Try fallback port
      if (attempt < FALLBACK_PORTS.length) {
        const nextPort = FALLBACK_PORTS[attempt];
        console.log(`🔄 Trying fallback port ${nextPort}...`);
        setTimeout(() => startServer(nextPort, attempt + 1), 500);
      } else {
        console.error('❌ All ports failed. Please check your system configuration.');
        process.exit(1);
      }
    } else if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${port} is already in use`);
      
      // Try fallback port
      if (attempt < FALLBACK_PORTS.length) {
        const nextPort = FALLBACK_PORTS[attempt];
        console.log(`🔄 Trying fallback port ${nextPort}...`);
        setTimeout(() => startServer(nextPort, attempt + 1), 500);
      } else {
        console.error('❌ All ports are in use. Please free up a port or specify a different one.');
        process.exit(1);
      }
    } else {
      console.error('❌ Server error:', err);
      process.exit(1);
    }
  });
}

// Validate environment before starting
validateEnv();

// Start the server
startServer(PORT);
