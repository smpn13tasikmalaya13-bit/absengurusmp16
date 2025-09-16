
import type { User, Class, Schedule, AttendanceRecord, UserRole, Message } from '../types';
import { HARI_TRANSLATION, DAYS_OF_WEEK } from '../constants';

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

const getDeviceId = (): string => {
    let deviceId = localStorage.getItem('appDeviceId');
    if (!deviceId) {
        // Simple UUID generator
        deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        localStorage.setItem('appDeviceId', deviceId);
    }
    return deviceId;
};


// --- Auth Functions (Secure) ---

export const onAuthStateChanged = (callback: (user: any | null) => void) => {
    return auth.onAuthStateChanged(callback);
};

export const signIn = async (email: string, password: string): Promise<void> => {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    if (!user) throw new Error("User not found after sign in.");

    const deviceId = getDeviceId();
    const userDocRef = db.collection('users').doc(user.uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
        await auth.signOut();
        throw new Error("Profil pengguna tidak ditemukan. Hubungi admin.");
    }

    const userData = userDoc.data();
    const boundDeviceId = userData.boundDeviceId;

    // If a device is bound and it's NOT the current device, block login.
    if (boundDeviceId && boundDeviceId !== deviceId) {
        await auth.signOut();
        throw new Error("Perangkat Anda tidak terdaftar. Hubungi admin untuk mengganti perangkat.");
    }
    
    // If no device is bound (e.g., after admin reset), bind the current device.
    if (!boundDeviceId) {
        await userDocRef.update({ boundDeviceId: deviceId });
    }

    // If the bound device matches the current device, or if it was just bound, login proceeds.
};

export const signOut = async (): Promise<void> => {
    // Device binding is persistent and should NOT be removed on logout.
    await auth.signOut();
};

export const sendPasswordResetEmail = async (email: string): Promise<void> => {
    await auth.sendPasswordResetEmail(email);
};

export const signUp = async (email: string, password: string, name: string, role: UserRole): Promise<void> => {
    // We get the auth instance directly from the firebase object.
    const authInstance = firebase.auth();

    // Create user in Auth. This also signs them in.
    await authInstance.createUserWithEmailAndPassword(email, password);
    
    // Explicitly get the current user from the auth instance to ensure the session is fully established.
    // This can help prevent race conditions where Firestore rules might not recognize the new user's permissions immediately.
    const user = authInstance.currentUser;

    if (!user) {
        // This is an unlikely but important safeguard.
        throw new Error("Gagal memverifikasi pengguna setelah pendaftaran. Silakan coba lagi.");
    }
    
    // Attempt to create the corresponding user profile document in Firestore.
    try {
        const deviceId = getDeviceId();
        await db.collection('users').doc(user.uid).set({
            name,
            role,
            userId: email,
            boundDeviceId: deviceId, 
        });
        // Success: The user is now fully registered and logged in.
        // The onAuthStateChanged listener in App.tsx will handle updating the UI.

    } catch (firestoreError: any) {
        // If writing to Firestore fails, we must clean up the Auth user to prevent an orphaned account
        // where a user exists in Auth but has no profile, making them unable to log in or re-register.
        console.error("Error creating user profile in Firestore. Attempting to clean up auth user...", firestoreError);
        try {
            await user.delete();
        } catch (deleteError) {
            // This is a critical failure state. The user is stuck. They must contact an admin.
            console.error("CRITICAL: Failed to clean up auth user after profile creation failure:", deleteError);
            throw new Error("Pendaftaran gagal dan akun tidak dapat dibersihkan secara otomatis. Harap hubungi admin.");
        }
        
        // Rethrow a more informative error to the UI.
        throw new Error(`Gagal menyimpan profil pengguna. Silakan coba lagi. (Pesan: ${firestoreError.message})`);
    }
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

export const resetDeviceBinding = async (id: string): Promise<void> => {
    // This function is for admins to unbind a user's device.
    await db.collection('users').doc(id).update({
        boundDeviceId: firebase.firestore.FieldValue.delete()
    });
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
    // The query with multiple orderBy clauses requires a composite index,
    // which can fail if not created in Firebase.
    // To avoid this, we fetch unsorted and sort on the client.
    const snapshot = await db.collection('schedules').get();
    const schedules = collectionToData<Schedule>(snapshot);

    // Sort schedules by day of the week, then by start time
    schedules.sort((a, b) => {
        const dayAIndex = a.day ? DAYS_OF_WEEK.indexOf(a.day) : -1;
        const dayBIndex = b.day ? DAYS_OF_WEEK.indexOf(b.day) : -1;

        if (dayAIndex !== dayBIndex) {
            return dayAIndex - dayBIndex;
        }
        
        // Safely compare startTime, defaulting to an empty string if null or undefined
        const startTimeA = a.startTime || '';
        const startTimeB = b.startTime || '';
        return startTimeA.localeCompare(startTimeB);
    });

    return schedules;
};

const checkForTimeConflict = async (scheduleData: Omit<Schedule, 'id'>, existingId?: string): Promise<{ conflict: boolean; message: string }> => {
    // 1. Check for teacher conflict
    const teacherConflictQuery = db.collection('schedules')
        .where('teacherId', '==', scheduleData.teacherId)
        .where('day', '==', scheduleData.day);
        
    const teacherSchedulesSnapshot = await teacherConflictQuery.get();
    for (const doc of teacherSchedulesSnapshot.docs) {
        if (existingId && doc.id === existingId) continue; // Skip self when updating

        const existingSchedule = doc.data();
        if (existingSchedule.startTime && existingSchedule.endTime) {
            if (scheduleData.startTime < existingSchedule.endTime && scheduleData.endTime > existingSchedule.startTime) {
                return {
                    conflict: true,
                    message: `Jadwal bentrok: Guru ini sudah memiliki jadwal lain (${existingSchedule.subject}) pada jam ${existingSchedule.startTime}-${existingSchedule.endTime}.`
                };
            }
        }
    }

    // 2. Check for class conflict
    const classConflictQuery = db.collection('schedules')
        .where('classId', '==', scheduleData.classId)
        .where('day', '==', scheduleData.day);

    const classSchedulesSnapshot = await classConflictQuery.get();
    for (const doc of classSchedulesSnapshot.docs) {
        if (existingId && doc.id === existingId) continue; // Skip self when updating

        const existingSchedule = doc.data();
        if (existingSchedule.startTime && existingSchedule.endTime) {
            if (scheduleData.startTime < existingSchedule.endTime && scheduleData.endTime > existingSchedule.startTime) {
                return {
                    conflict: true,
                    message: `Jadwal bentrok: Kelas ini sudah memiliki jadwal pelajaran (${existingSchedule.subject}) pada jam ${existingSchedule.startTime}-${existingSchedule.endTime}.`
                };
            }
        }
    }

    return { conflict: false, message: '' };
};

export const addSchedule = async (scheduleData: Omit<Schedule, 'id'>): Promise<{success: boolean, message: string}> => {
    // Basic time validation
    if (scheduleData.startTime >= scheduleData.endTime) {
        return { success: false, message: "Waktu selesai harus setelah waktu mulai." };
    }

    const timeConflict = await checkForTimeConflict(scheduleData);
    if (timeConflict.conflict) {
        return { success: false, message: timeConflict.message };
    }

    await db.collection('schedules').add(scheduleData);
    return { success: true, message: "Jadwal berhasil ditambahkan." };
};

export const updateSchedule = async (id: string, scheduleData: Omit<Schedule, 'id'>): Promise<{success: boolean, message: string}> => {
     // Basic time validation
    if (scheduleData.startTime >= scheduleData.endTime) {
        return { success: false, message: "Waktu selesai harus setelah waktu mulai." };
    }
    
    const timeConflict = await checkForTimeConflict(scheduleData, id);
    if (timeConflict.conflict) {
        return { success: false, message: timeConflict.message };
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

export const addAttendanceRecord = async (recordData: Omit<AttendanceRecord, 'id'>): Promise<string> => {
    const docRef = await db.collection('attendance').add(recordData);
    return docRef.id;
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

// --- Message Functions ---

export const addMessage = async (messageData: Omit<Message, 'id'>): Promise<void> => {
    await db.collection('messages').add(messageData);
};

// Use onSnapshot for real-time updates
export const onMessagesReceived = (userId: string, callback: (messages: Message[]) => void): (() => void) => {
    return db.collection('messages')
        .where('recipientId', '==', userId)
        .orderBy('timestamp', 'desc')
        .onSnapshot((snapshot: any) => {
            callback(collectionToData<Message>(snapshot));
        }, (error: any) => {
            console.error("Error listening to messages:", error);
            callback([]);
        });
};

export const markMessagesAsRead = async (messageIds: string[]): Promise<void> => {
    if (messageIds.length === 0) return;
    const batch = db.batch();
    messageIds.forEach(id => {
        const docRef = db.collection('messages').doc(id);
        batch.update(docRef, { isRead: true });
    });
    await batch.commit();
};
