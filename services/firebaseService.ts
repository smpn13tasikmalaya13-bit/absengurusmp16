import type { User, Class, Schedule, AttendanceRecord, UserRole } from '../types';
import { HARI_TRANSLATION } from '../constants';

declare var firebase: any;

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyDw3_F5evnkiTJ4L-rjfiOLER19jozdM3k",
  authDomain: "absensi-guru13.firebaseapp.com",
  projectId: "absensi-guru13",
  storageBucket: "absensi-guru13.appspot.com",
  messagingSenderId: "354663983406",
  appId: "1:354663983406:web:c3c5cd66c89f9c008af2bf",
};


// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();

// Enable offline persistence
db.enablePersistence()
  .catch((err: any) => {
      if (err.code == 'failed-precondition') {
          // This can happen if multiple tabs are open.
          console.warn('Firestore persistence failed. Multiple tabs may be open.');
      } else if (err.code == 'unimplemented') {
          // The current browser does not support persistence.
          console.warn('Firestore persistence is not supported in this browser.');
      }
  });

// --- Helper Functions ---
const docToData = <T,>(doc: any): T => ({ id: doc.id, ...doc.data() } as T);
const collectionToData = <T,>(snapshot: any): T[] => snapshot.docs.map(docToData);

// --- Auth Functions (Secure) ---

export const onAuthStateChanged = (callback: (user: any | null) => void) => {
    return auth.onAuthStateChanged(callback);
};

export const signIn = async (email: string, password: string): Promise<string> => {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    if (!user) {
        throw new Error("User not found after sign in.");
    }
    // Generate a unique session ID
    const sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);

    // Store the session ID in the user's Firestore document
    await db.collection('users').doc(user.uid).update({
        currentSessionId: sessionId
    });
    
    return sessionId;
};

export const signOut = async (): Promise<void> => {
    const user = auth.currentUser;
    if (user) {
        // Clear the session ID from the user's document on logout
        try {
            await db.collection('users').doc(user.uid).update({
                currentSessionId: null
            });
        } catch (error) {
            console.error("Failed to clear session ID on logout:", error);
            // Don't block sign-out if this fails
        }
    }
    await auth.signOut();
};

export const sendPasswordResetEmail = async (email: string): Promise<void> => {
    await auth.sendPasswordResetEmail(email);
};

export const signUp = async (email: string, password: string, name: string, role: UserRole): Promise<{success: boolean; message?: string}> => {
    // Note: The client-side admin limit check was removed.
    // This check is insecure and often blocked by Firestore security rules,
    // which was preventing admin profiles from being created and causing login failures.
    // Admin limits should be managed via a secure backend (e.g., Cloud Functions)
    // or manually in the Firebase console.

    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    if (!user) {
        throw new Error("Gagal membuat pengguna.");
    }
    
    // Store user role and name in Firestore, linking with the auth UID
    await db.collection('users').doc(user.uid).set({
        name,
        role,
        userId: email, // Keep userId as email for consistency
    });

    return { success: true };
};

// --- User Functions ---

export const onUserProfileChange = (uid: string, callback: (user: User | null) => void) => {
    const userDocRef = db.collection('users').doc(uid);
    // onSnapshot handles offline cases gracefully. It provides cached data first,
    // then updates with server data when the connection is restored.
    const unsubscribe = userDocRef.onSnapshot(
        (doc: any) => {
            if (doc.exists) {
                callback(docToData<User>(doc));
            } else {
                callback(null);
            }
        },
        (error: any) => {
            console.error("Error listening to user profile:", error);
            // In case of an error (e.g., permissions), treat as if the user profile doesn't exist.
            callback(null);
        }
    );
    return unsubscribe;
};

export const getUser = async (id: string): Promise<User | null> => {
    const doc = await db.collection('users').doc(id).get();
    if (!doc.exists) {
        return null;
    }
    return docToData<User>(doc);
};

export const getUsers = async (): Promise<User[]> => {
    const snapshot = await db.collection('users').get();
    return collectionToData<User>(snapshot);
};

export const getUsersByRole = async (role: UserRole): Promise<User[]> => {
    const snapshot = await db.collection('users').where('role', '==', role).get();
    return collectionToData<User>(snapshot);
};

export const deleteUser = async (id: string): Promise<void> => {
    // This function now only deletes the Firestore user data.
    // Deleting a user from Firebase Authentication is a privileged operation
    // and should be handled in a secure backend environment (e.g., Cloud Functions)
    // or manually in the Firebase Console to prevent abuse.
    
    // Delete associated schedules
    const schedulesSnapshot = await db.collection('schedules').where('teacherId', '==', id).get();
    const batch = db.batch();
    schedulesSnapshot.docs.forEach((doc: any) => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    // Delete the user document from Firestore
    await db.collection('users').doc(id).delete();
};

// --- Class Functions ---
export const getClasses = async (): Promise<Class[]> => {
    const snapshot = await db.collection('classes').get();
    return collectionToData<Class>(snapshot);
};

export const addClass = async (classData: Omit<Class, 'id'>): Promise<void> => {
    await db.collection('classes').add(classData);
};

export const deleteClass = async (id: string): Promise<void> => {
    // Also delete associated schedules to prevent orphaned data
    const schedulesSnapshot = await db.collection('schedules').where('classId', '==', id).get();
    const batch = db.batch();
    schedulesSnapshot.docs.forEach((doc: any) => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    await db.collection('classes').doc(id).delete();
};

// --- Schedule Functions ---

export const getSchedules = async (): Promise<Schedule[]> => {
    const snapshot = await db.collection('schedules').orderBy('day').orderBy('startTime').get();
    return collectionToData<Schedule>(snapshot);
};

export const addSchedule = async (scheduleData: Omit<Schedule, 'id'>): Promise<{success: boolean, message: string}> => {
    // Basic time validation
    if (scheduleData.startTime >= scheduleData.endTime) {
        return { success: false, message: "Waktu selesai harus setelah waktu mulai." };
    }

    await db.collection('schedules').add(scheduleData);
    return { success: true, message: "Jadwal berhasil ditambahkan." };
};

export const updateSchedule = async (id: string, scheduleData: Omit<Schedule, 'id'>): Promise<{success: boolean, message: string}> => {
     // Basic time validation
    if (scheduleData.startTime >= scheduleData.endTime) {
        return { success: false, message: "Waktu selesai harus setelah waktu mulai." };
    }

    await db.collection('schedules').doc(id).update(scheduleData);
    return { success: true, message: "Jadwal berhasil diperbarui." };
};


export const deleteSchedule = async (id: string): Promise<void> => {
    await db.collection('schedules').doc(id).delete();
};

// --- Attendance Functions ---
export const getAttendanceRecords = async (): Promise<AttendanceRecord[]> => {
    const snapshot = await db.collection('attendance').orderBy('scanTime', 'desc').get();
    return collectionToData<AttendanceRecord>(snapshot);
};

export const addAttendanceRecord = async (recordData: Omit<AttendanceRecord, 'id'>): Promise<void> => {
    await db.collection('attendance').add(recordData);
};

export const checkIfAlreadyScanned = async (teacherId: string, classId: string, lessonHour: number): Promise<boolean> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    const snapshot = await db.collection('attendance')
        .where('teacherId', '==', teacherId)
        .where('classId', '==', classId)
        .where('lessonHour', '==', lessonHour)
        .where('scanTime', '>=', today.toISOString())
        .limit(1)
        .get();
        
    return !snapshot.empty;
};