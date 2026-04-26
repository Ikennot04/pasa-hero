import admin from '../../config/firebase.config.js';

export const UserFirebaseService = {
  // GET ALL USERS ===================================================================
  async getAllUsers() {
    if (!admin.apps.length) {
      throw new Error('Firebase Admin not configured');
    }

    const db = admin.firestore();
    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return users;
  },

  // GET USER BY ID ===================================================================
  async getUserById(id) {
    if (!admin.apps.length) {
      throw new Error('Firebase Admin not configured');
    }

    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(id).get();

    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    return { id: userDoc.id, ...userDoc.data() };
  },

  // UPDATE USER ===================================================================
  async updateUser(id, updateData) {
    if (!admin.apps.length) {
      throw new Error('Firebase Admin not configured');
    }

    const db = admin.firestore();
    const { id: _, ...dataToUpdate } = updateData;

    await db.collection('users').doc(id).update({
      ...dataToUpdate,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { message: 'User updated successfully' };
  },

  // DELETE USER ===================================================================
  async deleteUser(id) {
    if (!admin.apps.length) {
      throw new Error('Firebase Admin not configured');
    }

    const db = admin.firestore();
    await db.collection('users').doc(id).delete();

    return { message: 'User deleted successfully' };
  },

  // VERIFY FIREBASE TOKEN ===================================================================
  async verifyToken(idToken) {
    if (!admin.apps.length) {
      throw new Error('Firebase Admin not configured');
    }

    if (!idToken) {
      throw new Error('ID token is required');
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  },

  // CHANGE USER EMAIL ===================================================================
  async changeEmail(uid, newEmail) {
    if (!admin.apps.length) {
      throw new Error('Firebase Admin not configured');
    }

    if (!uid) {
      throw new Error('User ID (uid) is required');
    }

    if (!newEmail) {
      throw new Error('New email address is required');
    }

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const trimmedEmail = newEmail.trim().toLowerCase();
    
    if (!emailRegex.test(trimmedEmail)) {
      throw new Error('Invalid email format');
    }

    // Verify that OTP was verified for this email (check Firestore)
    const db = admin.firestore();
    const otpDoc = await db.collection('otp_verifications').doc(trimmedEmail).get();
    
    if (!otpDoc.exists) {
      throw new Error('OTP verification not found. Please complete OTP verification first.');
    }

    const otpData = otpDoc.data();
    const isVerified = otpData?.verified === true;
    const purpose = otpData?.purpose;
    
    // Check if OTP was for change_email purpose
    if (purpose !== 'change_email') {
      throw new Error('Invalid OTP purpose. Please complete email change OTP verification.');
    }
    
    if (!isVerified) {
      throw new Error('OTP has not been verified. Please verify the OTP code first.');
    }

    // Check if OTP verification is recent (within last 10 minutes)
    const verifiedAt = otpData?.verifiedAt;
    if (verifiedAt) {
      const verifiedTime = verifiedAt.toDate ? verifiedAt.toDate() : new Date(verifiedAt);
      const now = new Date();
      const timeDiff = (now - verifiedTime) / 1000 / 60; // minutes
      
      if (timeDiff > 10) {
        throw new Error('OTP verification has expired. Please request a new OTP.');
      }
    }

    try {
      // Update email in Firebase Auth using Admin SDK
      await admin.auth().updateUser(uid, {
        email: trimmedEmail,
        emailVerified: false, // Reset verification status for new email
      });

      console.log(`✅ Email updated successfully for user ${uid} to ${trimmedEmail}`);

      // Optionally, delete the OTP verification document after successful email change
      // to prevent reuse
      await otpDoc.ref.delete();

      return { 
        message: 'Email updated successfully',
        email: trimmedEmail,
      };
    } catch (error) {
      console.error(`❌ Failed to update email for user ${uid}:`, error);
      
      if (error.code === 'auth/user-not-found') {
        throw new Error('User account not found');
      }
      if (error.code === 'auth/email-already-exists') {
        throw new Error('This email is already in use by another account');
      }
      if (error.code === 'auth/invalid-email') {
        throw new Error('Invalid email format');
      }
      
      throw new Error(`Failed to update email: ${error.message}`);
    }
  },
};
