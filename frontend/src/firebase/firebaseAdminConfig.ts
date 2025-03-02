import admin from "firebase-admin";

const serviceAccount = {
    type: process.env.FIREBASE_ADMIN_TYPE,
    project_id: process.env.FIREBASE_ADMIN_PROJECT_ID,
    private_key_id: process.env.FIREBASE_ADMIN_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_ADMIN_CLIENT_ID,
    auth_uri: process.env.FIREBASE_ADMIN_AUTH_URI,
    token_uri: process.env.FIREBASE_ADMIN_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_ADMIN_AUTH_PROVIDER_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_ADMIN_CLIENT_CERT_URL,
    universe_domain: process.env.FIREBASE_ADMIN_UNIVERSE_DOMAIN,
}

// Check if Firebase Admin is already initialized
const adminApp = !admin.apps.length
    ? admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    })
    : admin.app();

// Get bucket reference
const bucket = adminApp.storage().bucket();

// Initialize Firestore
const adminDb = admin.firestore(adminApp);

export { adminDb, bucket };
