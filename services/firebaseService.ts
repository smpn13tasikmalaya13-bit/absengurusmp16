import type { User, Class, Schedule, AttendanceRecord, UserRole, Message, Eskul, EskulSchedule, EskulAttendanceRecord, AbsenceRecord } from '../types';
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
    const userDoc = await userDocRef.get({ source: 'server' }); // Force server read on login

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

const getFirebaseAuthErrorMessage = (error: any): string => {
    switch (error.code) {
        case 'auth/email-already-in-use':
            return 'Email ini sudah terdaftar. Silakan gunakan email lain atau login.';
        case 'auth/invalid-email':
            return 'Format email tidak valid. Harap periksa kembali.';
        case 'auth/weak-password':
            return 'Password terlalu lemah. Harap gunakan minimal 6 karakter.';
        case 'auth/operation-not-allowed':
            return 'Pendaftaran dengan email dan password tidak diaktifkan. Hubungi admin.';
        default:
            return error.message || 'Terjadi kesalahan pendaftaran yang tidak diketahui.';
    }
};

export const signUp = async (email: string, password: string, name: string, role: UserRole): Promise<void> => {
    const authInstance = firebase.auth();
    let userCredential;

    // Tahap 1: Buat pengguna di Firebase Authentication.
    try {
        userCredential = await authInstance.createUserWithEmailAndPassword(email, password);
    } catch (authError: any) {
        console.error("Firebase Auth creation failed:", authError);
        throw new Error(getFirebaseAuthErrorMessage(authError));
    }
    
    const user = userCredential.user;
    if (!user) {
        throw new Error("Gagal memverifikasi pengguna setelah pendaftaran.");
    }
    
    // Tahap 2: Buat dokumen profil pengguna di Firestore.
    // Dengan aturan keamanan yang benar, ini seharusnya berhasil tanpa coba-ulang yang rumit.
    try {
        const deviceId = getDeviceId();
        const profileData = {
            name,
            role,
            userId: email,
            boundDeviceId: deviceId, 
        };
        
        await db.collection('users').doc(user.uid).set(profileData);

    } catch (firestoreError: any) {
        console.error("Firestore profile creation failed, cleaning up auth user...", firestoreError);
        // Jika Firestore gagal, kita HARUS menghapus pengguna Auth untuk mencegah akun yatim.
        try {
            await user.delete();
        } catch (deleteError) {
            console.error("KRITIS: Gagal membersihkan pengguna auth setelah pembuatan profil gagal:", deleteError);
            throw new Error("Pendaftaran gagal kritis. Akun Anda mungkin dalam keadaan tidak konsisten. Harap hubungi admin.");
        }
        // Lempar pesan yang mudah dipahami untuk kegagalan Firestore.
        throw new Error(`Gagal menyimpan profil pengguna. Silakan coba lagi. (Pesan: ${firestoreError.message})`);
    }
};

// --- User Functions ---

export const onUserProfileChange = (uid: string, callback: (user: User | null) => void) => {
    const userDocRef = db.collection('users').doc(uid);
    // onSnapshot menangani kasus offline dengan baik. Ini menyediakan data cache terlebih dahulu,
    // kemudian diperbarui dengan data server saat koneksi pulih.
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
            // Jika terjadi kesalahan (misalnya, izin), anggap profil pengguna tidak ada.
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
    // Fungsi ini sekarang hanya menghapus data pengguna Firestore.
    // Menghapus pengguna dari Firebase Authentication adalah operasi istimewa
    // dan harus ditangani di lingkungan backend yang aman (misalnya, Cloud Functions)
    // atau secara manual di Firebase Console untuk mencegah penyalahgunaan.
    
    // Hapus jadwal terkait
    const schedulesSnapshot = await db.collection('schedules').where('teacherId', '==', id).get();
    const batch = db.batch();
    schedulesSnapshot.docs.forEach((doc: any) => {
        batch.delete(doc.ref);
    });
    // Hapus juga jadwal eskul
    const eskulSchedulesSnapshot = await db.collection('eskulSchedules').where('pembinaId', '==', id).get();
    eskulSchedulesSnapshot.docs.forEach((doc: any) => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    // Hapus dokumen pengguna dari Firestore
    await db.collection('users').doc(id).delete();
};

export const resetDeviceBinding = async (id: string): Promise<void> => {
    // Fungsi ini untuk admin melepaskan ikatan perangkat pengguna.
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
    // Juga hapus jadwal terkait untuk mencegah data yatim
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
    // Query dengan beberapa klausa orderBy memerlukan indeks komposit,
    // yang bisa gagal jika tidak dibuat di Firebase.
    // Untuk menghindarinya, kita ambil tanpa diurutkan dan urutkan di sisi klien.
    const snapshot = await db.collection('schedules').get();
    const schedules = collectionToData<Schedule>(snapshot);

    // Urutkan jadwal berdasarkan hari, lalu waktu mulai
    schedules.sort((a, b) => {
        const dayAIndex = a.day ? DAYS_OF_WEEK.indexOf(a.day) : -1;
        const dayBIndex = b.day ? DAYS_OF_WEEK.indexOf(b.day) : -1;

        if (dayAIndex !== dayBIndex) {
            return dayAIndex - dayBIndex;
        }
        
        // Bandingkan startTime dengan aman, default ke string kosong jika null atau undefined
        const startTimeA = a.startTime || '';
        const startTimeB = b.startTime || '';
        return startTimeA.localeCompare(startTimeB);
    });

    return schedules;
};

const checkForTimeConflict = async (scheduleData: Omit<Schedule, 'id'>, existingId?: string): Promise<{ conflict: boolean; message: string }> => {
    // 1. Periksa konflik guru
    const teacherConflictQuery = db.collection('schedules')
        .where('teacherId', '==', scheduleData.teacherId)
        .where('day', '==', scheduleData.day);
        
    const teacherSchedulesSnapshot = await teacherConflictQuery.get();
    for (const doc of teacherSchedulesSnapshot.docs) {
        if (existingId && doc.id === existingId) continue; // Lewati diri sendiri saat memperbarui

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

    // 2. Periksa konflik kelas
    const classConflictQuery = db.collection('schedules')
        .where('classId', '==', scheduleData.classId)
        .where('day', '==', scheduleData.day);

    const classSchedulesSnapshot = await classConflictQuery.get();
    for (const doc of classSchedulesSnapshot.docs) {
        if (existingId && doc.id === existingId) continue; // Lewati diri sendiri saat memperbarui

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
    try {
        // Validasi waktu dasar
        if (scheduleData.startTime >= scheduleData.endTime) {
            return { success: false, message: "Waktu selesai harus setelah waktu mulai." };
        }

        const timeConflict = await checkForTimeConflict(scheduleData);
        if (timeConflict.conflict) {
            return { success: false, message: timeConflict.message };
        }

        await db.collection('schedules').add(scheduleData);
        return { success: true, message: "Jadwal berhasil ditambahkan." };
    } catch (error: any) {
        console.error("Error adding schedule:", error);
        const message = error.code === 'permission-denied'
            ? "Akses ditolak. Anda tidak memiliki izin untuk menambahkan jadwal ini. Periksa aturan keamanan Firestore."
            : `Gagal menambahkan jadwal: ${error.message}`;
        return { success: false, message };
    }
};

export const updateSchedule = async (id: string, scheduleData: Omit<Schedule, 'id'>): Promise<{success: boolean, message: string}> => {
    try {
        // Validasi waktu dasar
        if (scheduleData.startTime >= scheduleData.endTime) {
            return { success: false, message: "Waktu selesai harus setelah waktu mulai." };
        }
        
        const timeConflict = await checkForTimeConflict(scheduleData, id);
        if (timeConflict.conflict) {
            return { success: false, message: timeConflict.message };
        }

        await db.collection('schedules').doc(id).update(scheduleData);
        return { success: true, message: "Jadwal berhasil diperbarui." };
    } catch (error: any) {
        console.error("Error updating schedule:", error);
        const message = error.code === 'permission-denied'
            ? "Akses ditolak. Anda tidak memiliki izin untuk mengubah jadwal ini. Periksa aturan keamanan Firestore."
            : `Gagal mengubah jadwal: ${error.message}`;
        return { success: false, message };
    }
};


export const deleteSchedule = async (id: string): Promise<void> => {
    await db.collection('schedules').doc(id).delete();
};

// --- Attendance Functions ---
export const getAttendanceRecords = async (): Promise<AttendanceRecord[]> => {
    const snapshot = await db.collection('attendance').orderBy('scanTime', 'desc').get();
    return collectionToData<AttendanceRecord>(snapshot);
};

export const getAttendanceRecordsForTeacher = async (teacherId: string): Promise<AttendanceRecord[]> => {
    // Remove orderBy to prevent needing a composite index. Sorting will be done client-side.
    const snapshot = await db.collection('attendance')
        .where('teacherId', '==', teacherId)
        .get();
    const records = collectionToData<AttendanceRecord>(snapshot);
    // Sort records client-side in descending order of scan time.
    records.sort((a, b) => {
        const timeA = a.scanTime ? new Date(a.scanTime).getTime() : 0;
        const timeB = b.scanTime ? new Date(b.scanTime).getTime() : 0;
        return timeB - timeA;
    });
    return records;
};

export const addAttendanceRecord = async (recordData: Omit<AttendanceRecord, 'id'>): Promise<string> => {
    const docRef = await db.collection('attendance').add(recordData);
    return docRef.id;
};

export const checkIfAlreadyScanned = async (teacherId: string, classId: string, lessonHour: number): Promise<boolean> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Mulai hari ini
    
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

// Gunakan onSnapshot untuk pembaruan real-time
export const onMessagesReceived = (userId: string, callback: (messages: Message[]) => void): (() => void) => {
    // The query for messages likely fails silently due to a missing composite index
    // for `where('recipientId', '==', ...)` and `orderBy('timestamp', ...)`.
    // Re-adding the `orderBy` clause is crucial because Firestore will then log an error
    // in the developer console with a direct link to CREATE the required index.
    return db.collection('messages')
        .where('recipientId', '==', userId)
        .orderBy('timestamp', 'desc') // This is critical for triggering the index creation link in the console.
        .onSnapshot((snapshot: any) => {
            const messages = collectionToData<Message>(snapshot);
            // Although the server should sort, a robust client-side sort is a good fallback.
            messages.sort((a, b) => {
                const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                return timeB - timeA;
            });
            callback(messages);
        }, (error: any) => {
            console.error("Error listening to messages:", error);
            // If there's an error (e.g., missing index, permissions), return an empty array.
            // Check the browser's developer console for a detailed error message from Firebase.
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

// --- Extracurricular (Eskul) Functions ---

export const getEskuls = async (): Promise<Eskul[]> => {
    const snapshot = await db.collection('eskuls').orderBy('name').get();
    return collectionToData<Eskul>(snapshot);
};

export const addEskul = async (eskulData: Omit<Eskul, 'id'>): Promise<{success: boolean, message: string}> => {
    try {
        await db.collection('eskuls').add(eskulData);
        return { success: true, message: "Eskul berhasil ditambahkan." };
    } catch (error: any) {
        console.error("Error adding eskul:", error);
        const message = error.code === 'permission-denied'
            ? "Akses ditolak. Anda tidak memiliki izin untuk menambahkan eskul. Periksa aturan keamanan Firestore."
            : `Gagal menambahkan eskul: ${error.message}`;
        return { success: false, message };
    }
};

export const deleteEskul = async (id: string): Promise<{success: boolean, message: string}> => {
    try {
        const schedulesSnapshot = await db.collection('eskulSchedules').where('eskulId', '==', id).get();
        const batch = db.batch();
        schedulesSnapshot.docs.forEach((doc: any) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        await db.collection('eskuls').doc(id).delete();
        return { success: true, message: "Eskul berhasil dihapus." };
    } catch (error: any) {
        console.error("Error deleting eskul:", error);
        const message = error.code === 'permission-denied'
            ? "Akses ditolak. Anda tidak memiliki izin untuk menghapus eskul. Periksa aturan keamanan Firestore."
            : `Gagal menghapus eskul: ${error.message}`;
        return { success: false, message };
    }
};

export const getEskulSchedules = async (pembinaId: string): Promise<EskulSchedule[]> => {
    const snapshot = await db.collection('eskulSchedules').where('pembinaId', '==', pembinaId).get();
    const schedules = collectionToData<EskulSchedule>(snapshot);
    schedules.sort((a, b) => {
        const dayAIndex = DAYS_OF_WEEK.indexOf(a.day);
        const dayBIndex = DAYS_OF_WEEK.indexOf(b.day);
        if (dayAIndex !== dayBIndex) return dayAIndex - dayBIndex;
        return (a.startTime || '').localeCompare(b.startTime || '');
    });
    return schedules;
};

export const getAllEskulSchedules = async (): Promise<EskulSchedule[]> => {
    const snapshot = await db.collection('eskulSchedules').get();
    const schedules = collectionToData<EskulSchedule>(snapshot);
    schedules.sort((a, b) => {
        const dayAIndex = DAYS_OF_WEEK.indexOf(a.day);
        const dayBIndex = DAYS_OF_WEEK.indexOf(b.day);
        if (dayAIndex !== dayBIndex) return dayAIndex - dayBIndex;
        return (a.startTime || '').localeCompare(b.startTime || '');
    });
    return schedules;
};


export const addEskulSchedule = async (scheduleData: Omit<EskulSchedule, 'id'>): Promise<{success: boolean, message: string}> => {
    try {
        await db.collection('eskulSchedules').add(scheduleData);
        return { success: true, message: "Jadwal eskul berhasil ditambahkan." };
    } catch (error: any) {
        console.error("Error adding eskul schedule:", error);
        const message = error.code === 'permission-denied'
            ? "Akses ditolak. Anda tidak memiliki izin untuk menambahkan jadwal eskul. Periksa aturan keamanan Firestore."
            : `Gagal menambahkan jadwal eskul: ${error.message}`;
        return { success: false, message };
    }
};

export const updateEskulSchedule = async (id: string, scheduleData: Partial<EskulSchedule>): Promise<{success: boolean, message: string}> => {
    try {
        await db.collection('eskulSchedules').doc(id).update(scheduleData);
        return { success: true, message: "Jadwal eskul berhasil diperbarui." };
    } catch (error: any) {
        console.error("Error updating eskul schedule:", error);
        const message = error.code === 'permission-denied'
            ? "Akses ditolak. Anda tidak memiliki izin untuk mengubah jadwal eskul. Periksa aturan keamanan Firestore."
            : `Gagal mengubah jadwal eskul: ${error.message}`;
        return { success: false, message };
    }
};

export const deleteEskulSchedule = async (id: string): Promise<{success: boolean, message: string}> => {
    try {
        await db.collection('eskulSchedules').doc(id).delete();
        return { success: true, message: "Jadwal eskul berhasil dihapus." };
    } catch (error: any) {
        console.error("Error deleting eskul schedule:", error);
        const message = error.code === 'permission-denied'
            ? "Akses ditolak. Anda tidak memiliki izin untuk menghapus jadwal eskul. Periksa aturan keamanan Firestore."
            : `Gagal menghapus jadwal eskul: ${error.message}`;
        return { success: false, message };
    }
};

export const getEskulAttendanceRecords = async (pembinaId: string): Promise<EskulAttendanceRecord[]> => {
    // Remove orderBy to prevent needing a composite index. Sorting will be done client-side.
    const snapshot = await db.collection('eskulAttendance').where('pembinaId', '==', pembinaId).get();
    const records = collectionToData<EskulAttendanceRecord>(snapshot);
    // Sort records client-side in descending order of check-in time.
    records.sort((a, b) => {
        const timeA = a.checkInTime ? new Date(a.checkInTime).getTime() : 0;
        const timeB = b.checkInTime ? new Date(b.checkInTime).getTime() : 0;
        return timeB - timeA;
    });
    return records;
};

export const getAllEskulAttendanceRecords = async (): Promise<EskulAttendanceRecord[]> => {
    const snapshot = await db.collection('eskulAttendance').orderBy('checkInTime', 'desc').get();
    return collectionToData<EskulAttendanceRecord>(snapshot);
};

export const findEskulAttendanceForToday = async (pembinaId: string, eskulScheduleId: string, date: string): Promise<EskulAttendanceRecord | null> => {
    const snapshot = await db.collection('eskulAttendance')
        .where('pembinaId', '==', pembinaId)
        .where('eskulScheduleId', '==', eskulScheduleId)
        .where('date', '==', date)
        .limit(1)
        .get();

    if (snapshot.empty) {
        return null;
    }
    return docToData<EskulAttendanceRecord>(snapshot.docs[0]);
};

export const addEskulAttendanceRecord = async (recordData: Omit<EskulAttendanceRecord, 'id'>): Promise<{success: boolean, message: string, id?: string}> => {
    try {
        const docRef = await db.collection('eskulAttendance').add(recordData);
        return { success: true, message: "Absensi berhasil ditambahkan.", id: docRef.id };
    } catch (error: any) {
        console.error("Error adding eskul attendance:", error);
        const message = error.code === 'permission-denied'
            ? "Akses ditolak. Anda tidak memiliki izin untuk menambahkan absensi eskul. Periksa aturan keamanan Firestore."
            : `Gagal menambahkan absensi eskul: ${error.message}`;
        return { success: false, message };
    }
};

export const updateEskulAttendanceRecord = async (id: string, updateData: { checkOutTime: string }): Promise<{success: boolean, message: string}> => {
    try {
        await db.collection('eskulAttendance').doc(id).update(updateData);
        return { success: true, message: "Absensi pulang berhasil diperbarui." };
    } catch (error: any) {
        console.error("Error updating eskul attendance:", error);
        const message = error.code === 'permission-denied'
            ? "Akses ditolak. Anda tidak memiliki izin untuk mengubah absensi eskul. Periksa aturan keamanan Firestore."
            : `Gagal mengubah absensi eskul: ${error.message}`;
        return { success: false, message };
    }
};

// --- Absence Record Functions (for Teachers) ---

export const getAbsenceRecordForTeacherOnDate = async (teacherId: string, date: string): Promise<AbsenceRecord | null> => {
    const snapshot = await db.collection('absenceRecords')
        .where('teacherId', '==', teacherId)
        .where('date', '==', date)
        .limit(1)
        .get();

    if (snapshot.empty) {
        return null;
    }
    return docToData<AbsenceRecord>(snapshot.docs[0]);
};

export const addOrUpdateAbsenceRecord = async (recordData: Omit<AbsenceRecord, 'id' | 'timestamp'>): Promise<void> => {
    const existingRecord = await getAbsenceRecordForTeacherOnDate(recordData.teacherId, recordData.date);
    
    const dataToSave = {
        ...recordData,
        timestamp: new Date().toISOString(),
    };

    if (existingRecord) {
        // Update existing record
        await db.collection('absenceRecords').doc(existingRecord.id).update(dataToSave);
    } else {
        // Add new record
        await db.collection('absenceRecords').add(dataToSave);
    }
};

export const getAbsenceRecords = async (): Promise<AbsenceRecord[]> => {
    const snapshot = await db.collection('absenceRecords').get();
    return collectionToData<AbsenceRecord>(snapshot);
};
