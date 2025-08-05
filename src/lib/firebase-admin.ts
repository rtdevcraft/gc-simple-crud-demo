import admin from 'firebase-admin'

// This function ensures that Firebase is only initialized once.
export function initializeFirebaseAdmin() {
  // If the app is already initialized, don't do it again.
  if (admin.apps.length > 0) {
    return
  }

  // Initialize the Firebase Admin SDK.
  // When running on Google Cloud (like Cloud Run), the SDK automatically
  // finds the project ID and credentials from the environment.
  admin.initializeApp()
}
