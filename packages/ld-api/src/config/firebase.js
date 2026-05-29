const admin = require('firebase-admin');

let initialized = false;
let initError   = null;

const initFirebase = () => {
  if (initialized) return;

  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  // Detect placeholder / missing values — skip gracefully in dev
  const isPlaceholder = (v) => !v || v.includes('PLACEHOLDER') || v.includes('your-') || v === 'false';

  if (isPlaceholder(projectId) || isPlaceholder(clientEmail) || isPlaceholder(privateKey)) {
    initError = 'Firebase not configured — mobile student OTP and push notifications will not work. See .env.example for setup steps.';
    console.warn(`[Firebase] ${initError}`);
    initialized = true;
    return;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
    console.log(`[Firebase] Admin SDK initialized (project: ${projectId})`);
  } catch (err) {
    initError = `Firebase init failed: ${err.message}`;
    console.error(`[Firebase] ${initError}`);
  }

  initialized = true;
};

// Verify Firebase ID token sent by the mobile app after phone OTP
const verifyIdToken = async (idToken) => {
  initFirebase();
  if (initError) {
    throw Object.assign(
      new Error('Firebase is not configured on this server. ' + initError),
      { status: 503 }
    );
  }
  return admin.auth().verifyIdToken(idToken);
};

// Send FCM push notification to a device
const sendPushNotification = async (fcmToken, title, body, data = {}) => {
  initFirebase();
  if (initError) {
    console.warn('[Firebase] Push skipped — Firebase not configured');
    return null;
  }
  return admin.messaging().send({
    notification: { title, body },
    data,
    token: fcmToken,
    android: {
      priority: 'high',
      notification: { sound: 'default', channelId: 'ld_platform' },
    },
  });
};

module.exports = { initFirebase, verifyIdToken, sendPushNotification };
