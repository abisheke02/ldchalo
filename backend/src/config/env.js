require('dotenv').config();

const required = ['JWT_SECRET', 'DB_PASSWORD', 'ADMIN_PASSWORD'];
const missing  = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`[FATAL] Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}

module.exports = {
  port:    parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  db: {
    url:      process.env.DATABASE_URL,
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '5432', 10),
    name:     process.env.DB_NAME     || 'ldschools',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD,
  },

  redis: {
    url:      process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || undefined,
  },

  jwt: {
    secret:    process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  cors: {
    origins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map((o) => o.trim()),
  },

  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD,
  },

  anthropic:  { apiKey: process.env.ANTHROPIC_API_KEY  || '' },
  supabase:   { url: process.env.SUPABASE_URL || '', anonKey: process.env.SUPABASE_ANON_KEY || '', serviceKey: process.env.SUPABASE_SERVICE_KEY || '' },
  firebase:   { projectId: process.env.FIREBASE_PROJECT_ID || '', clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '', privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n') },
  razorpay:   { keyId: process.env.RAZORPAY_KEY_ID || '', keySecret: process.env.RAZORPAY_KEY_SECRET || '', webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '' },
  smtp:       { host: process.env.SMTP_HOST || 'smtp.gmail.com', port: parseInt(process.env.SMTP_PORT || '587', 10), user: process.env.SMTP_USER || '', pass: process.env.SMTP_PASS || '' },
  google:     { projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || '', credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS || '' },
  appUrl:     process.env.APP_URL || 'http://localhost',
};
