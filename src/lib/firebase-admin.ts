import admin from 'firebase-admin'

export function initializeFirebaseAdmin() {
  // Check if the app is already initialized to prevent errors
  if (admin.apps.length > 0) {
    return
  }

  // The private key needs to be parsed correctly from the environment variable
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (
    !process.env.FIREBASE_PROJECT_ID ||
    !process.env.FIREBASE_CLIENT_EMAIL ||
    !privateKey
  ) {
    throw new Error(
      'Firebase environment variables are not set. Check your .env file.'
    )
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
  })
}
