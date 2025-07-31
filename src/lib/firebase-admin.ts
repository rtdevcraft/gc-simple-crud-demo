import admin from 'firebase-admin'

// This function ensures that Firebase is only initialized once.
export function initializeFirebaseAdmin() {
  // If the app is already initialized, don't do it again.
  if (admin.apps.length > 0) {
    return
  }

  // The replace function is crucial for parsing the private key from an environment variable.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  // Check if all required environment variables are present.
  if (
    !process.env.FIREBASE_PROJECT_ID ||
    !process.env.FIREBASE_CLIENT_EMAIL ||
    !privateKey
  ) {
    // This error will be thrown during the build if the variables aren't set,
    // which is expected. We'll handle this in the Dockerfile.
    console.warn(
      'Firebase environment variables not found. Skipping Admin SDK initialization.'
    )
    return
  }

  // Initialize the Firebase Admin SDK.
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  })
}
