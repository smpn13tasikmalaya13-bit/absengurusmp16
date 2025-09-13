import type { User, Class, Schedule, AttendanceRecord, UserRole } from '../types';

declare var firebase: any;

// --- Firebase Configuration ---
// Konfigurasi ini telah diperbarui dengan kredensial Anda.
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

// --- Helper Functions ---
const docToData = <T,>(doc: any): T => ({ id: doc.id, ...doc.data() } as T);
const collectionToData = <T,>(snapshot: any): T[] => snapshot.docs.map(docToData);

// --- Auth Functions ---
export const loginUser = async (userId: string, password?: string): Promise<User | null> => {
    const snapshot = await db.collection('users')
        .where('userId', '==', userId)
        .where('password', '==', password)
        .limit(1)
        .get();
        
    if (snapshot.empty) {
        return null;
    }
    return docToData<User>(snapshot.docs[0]);
};

export const registerUser = async (userData: Omit<User, 'id'>): Promise<{success: boolean; message?: string}> => {
    // Check for existing User ID
    const userSnapshot = await db.collection('users').where('userId', '==', userData.userId).get();
    if (!userSnapshot.empty) {
        return { success: false, message: 'User ID sudah digunakan.' };
    }

    // NEW: Check for admin limit
    if (userData.role === 'ADMIN') {
        const adminSnapshot = await db.collection('users').where('role', '==', 'ADMIN').get();
        if (adminSnapshot.docs.length >= 3) {
            return { success: false, message: 'Batas maksimal admin (3) telah tercapai.' };
        }
    }
    
    await db.collection('users').add(userData);
    return { success: true };
};


// --- User (Teacher) Functions ---
export const getUsers = async (): Promise<User[]> => {
    const snapshot = await db.collection('users').get();
    return collectionToData<User>(snapshot);
};

export const getUsersByRole = async (role: UserRole): Promise<User[]> => {
    const snapshot = await db.collection('users').where('role', '==', role).get();
    return collectionToData<User>(snapshot);
};

export const addUser = async (userData: Omit<User, 'id'>): Promise<void> => {
    await db.collection('users').add(userData);
};

export const deleteUser = async (id: string): Promise<void> => {
    // Also delete associated schedules
    const schedulesSnapshot = await db.collection('schedules').where('teacherId', '==', id).get();
    const batch = db.batch();
    schedulesSnapshot.docs.forEach((doc: any) => {
        batch.delete(doc.ref);
    });
    await batch.commit();

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
    await db.collection('classes').doc(id).delete();
};

// --- Schedule Functions ---
export const getSchedules = async (): Promise<Schedule[]> => {
    const snapshot = await db.collection('schedules').get();
    return collectionToData<Schedule>(snapshot);
};

export const addSchedule = async (scheduleData: Omit<Schedule, 'id'>): Promise<boolean> => {
    // NEW: Check for schedule conflicts before adding
    const conflictSnapshot = await db.collection('schedules')
        .where('day', '==', scheduleData.day)
        .where('lessonHour', '==', scheduleData.lessonHour)
        .where('classId', '==', scheduleData.classId)
        .limit(1)
        .get();

    if (!conflictSnapshot.empty) {
        console.log("Schedule conflict detected.");
        return false; // Conflict found, do not add
    }

    await db.collection('schedules').add(scheduleData);
    return true; // Successfully added
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