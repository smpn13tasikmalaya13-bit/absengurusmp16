

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { QRCodeCanvas as QRCode } from 'qrcode.react';
import type { User, Class, Schedule, AttendanceRecord, UserRole, Message, Eskul, EskulSchedule, EskulAttendanceRecord } from './types';
import { UserRole as UserRoleEnum } from './types';
import { useGeolocation } from './hooks/useGeolocation';
import { CENTRAL_COORDINATES, MAX_RADIUS_METERS, DAYS_OF_WEEK, LESSON_HOURS, HARI_TRANSLATION } from './constants';
import * as api from './services/firebaseService';
import * as geminiApi from './services/geminiService';


// FIX: Add declarations for globally available libraries
declare var Html5Qrcode: any;
declare var XLSX: any;
declare global {
    interface Window {
        jspdf: any;
    }
}

// --- SVG Icons ---
const CalendarIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>);
const ClockIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
const UserIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>);
const QrScanIcon = () => (<div className="w-12 h-12 flex items-center justify-center rounded-full bg-green-100 text-green-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h-1m-1 6v-1M4 12H3m17 0h-1m-1-6V4M7 7V4m6 16v-1M7 17H4m16 0h-3m-1-6h-1m-4 0H8m12-1V7M4 7v3m0 4v3m3-13h1m4 0h1m-1 16h1m-4 0h1" /></svg></div>);
const ScheduleIcon = () => (<div className="w-12 h-12 flex items-center justify-center rounded-full bg-blue-100 text-blue-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>);
const QrCodeEmptyIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h-1m-1 6v-1M4 12H3m17 0h-1m-1-6V4M7 7V4m6 16v-1M7 17H4m16 0h-3m-1-6h-1m-4 0H8m12-1V7M4 7v3m0 4v3m3-13h1m4 0h1m-1 16h1m-4 0h1" /></svg>);
const CalendarEmptyIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>);
const LogoutIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>);
const MessageIcon = ({ hasUnread }: { hasUnread?: boolean }) => (
    <div className="relative">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        {hasUnread && <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>}
    </div>
);
const DownloadIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>);


// --- UI Components ---

const Spinner = () => (
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
);

const FullPageSpinner = () => (
    <div className="fixed inset-0 bg-gray-100 flex justify-center items-center z-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
    </div>
);


interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-xl font-semibold">{title}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl leading-none">&times;</button>
                </div>
                <div className="p-4">{children}</div>
            </div>
        </div>
    );
};

// --- Teacher Dashboard Components ---
const TeacherDashboard: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [scanResult, setScanResult] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const { isWithinRadius } = useGeolocation();

    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);

    const unreadMessagesCount = useMemo(() => messages.filter(m => !m.isRead).length, [messages]);

    const getClassName = useCallback((classId: string) => classes.find(c => c.id === classId)?.name || 'N/A', [classes]);

    const fetchData = useCallback(async () => {
        setLoadingData(true);
        try {
            const [classesData, schedulesData, allAttendance] = await Promise.all([
                api.getClasses(),
                api.getSchedules(),
                api.getAttendanceRecords()
            ]);
            setClasses(classesData);
            setSchedules(schedulesData);

            const userAttendance = allAttendance
                .filter(rec => rec.teacherId === user.id)
                .sort((a, b) => new Date(b.scanTime).getTime() - new Date(a.scanTime).getTime());
            setAttendance(userAttendance);
        } catch (error) {
            console.error("Failed to fetch data:", error);
            // Optionally set an error state here to show in the UI
        } finally {
            setLoadingData(false);
        }
    }, [user.id]);

    useEffect(() => {
        fetchData();
        const unsubscribeMessages = api.onMessagesReceived(user.id, setMessages);
        return () => unsubscribeMessages();
    }, [fetchData, user.id]);

    useEffect(() => {
        if (scanResult) {
            const timer = setTimeout(() => setScanResult(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [scanResult]);
    
    const userSchedules = useMemo(() => schedules.filter(s => s.teacherId === user.id), [schedules, user.id]);

    const handleOpenMessageModal = () => {
        setIsMessageModalOpen(true);
        const unreadIds = messages.filter(m => !m.isRead).map(m => m.id);
        if (unreadIds.length > 0) {
            api.markMessagesAsRead(unreadIds);
        }
    };

    const handleScheduleDelete = async (idToDelete: string) => {
        try {
            await api.deleteSchedule(idToDelete);
            // After successful deletion, re-fetch data to ensure UI consistency.
            await fetchData();
        } catch (error: any) {
            console.error("Gagal menghapus jadwal:", error);
            let errorMessage = "Terjadi kesalahan saat menghapus jadwal.";
            // Check for Firebase permission error
            if (error.code === 'permission-denied') {
                errorMessage = "Akses ditolak. Anda mungkin tidak memiliki izin untuk menghapus jadwal ini. Masalah ini biasanya terkait dengan konfigurasi di server (Firebase Security Rules).";
            } else if (error.message) {
                errorMessage = `Terjadi kesalahan: ${error.message}`;
            }
            alert(errorMessage);
        }
    };

    const handleScanSuccess = async (qrData: string) => {
        setIsScanning(false); // Immediately close scanner and release camera
    
        let classId;
        try {
            const parsedData = JSON.parse(qrData);
            if (parsedData.type !== 'attendance' || !parsedData.classId) {
                setScanResult({ type: 'error', message: 'QR Code tidak valid untuk absensi.' });
                return;
            }
            classId = parsedData.classId;
        } catch (e) {
            setScanResult({ type: 'error', message: 'Format QR Code tidak dikenali.' });
            return;
        }
    
        const now = new Date();
        const todayName = now.toLocaleDateString('en-US', { weekday: 'long' }) as Schedule['day'];
    
        // Find ALL potentially active schedules for this class today
        const activeSchedules = userSchedules.filter(s => {
            if (s.classId !== classId || s.day !== todayName || !s.startTime || !s.endTime) {
                return false;
            }
    
            const [startHour, startMinute] = s.startTime.split(':').map(Number);
            const startTime = new Date(now);
            startTime.setHours(startHour, startMinute, 0, 0);
    
            const [endHour, endMinute] = s.endTime.split(':').map(Number);
            const endTime = new Date(now);
            endTime.setHours(endHour, endMinute, 0, 0);
            
            const leewayMilliseconds = 15 * 60 * 1000; // 15 minutes before start
    
            return now.getTime() >= (startTime.getTime() - leewayMilliseconds) && now.getTime() <= endTime.getTime();
        });
    
        if (activeSchedules.length === 0) {
            setScanResult({ type: 'error', message: `Tidak ada jadwal mengajar yang aktif saat ini untuk kelas ${getClassName(classId)}.` });
            return;
        }
    
        // Get lesson hours for today's attendance records to check which ones are done
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayScannedLessonHours = new Set(
            attendance
                .filter(rec => new Date(rec.scanTime) >= today)
                .map(rec => `${rec.classId}-${rec.lessonHour}`) // Use a composite key for accuracy
        );
    
        // Find the first active schedule that has NOT been scanned yet
        const scheduleToScan = activeSchedules.find(s => 
            !todayScannedLessonHours.has(`${s.classId}-${s.lessonHour}`)
        );
    
        if (!scheduleToScan) {
            setScanResult({ type: 'error', message: `Anda sudah absen untuk semua jadwal aktif di kelas ${getClassName(classId)} hari ini.` });
            return;
        }
    
        try {
            const newRecordData: Omit<AttendanceRecord, 'id'> = {
                teacherId: user.id,
                classId: scheduleToScan.classId,
                lessonHour: scheduleToScan.lessonHour,
                scanTime: now.toISOString(),
            };
            await api.addAttendanceRecord(newRecordData);
            
            // Re-fetch data from the server to guarantee UI consistency.
            await fetchData();
    
            setScanResult({ type: 'success', message: `Absensi berhasil: Kelas ${getClassName(classId)} (Jam ke-${scheduleToScan.lessonHour}).` });
        } catch (error: any) {
            setScanResult({ type: 'error', message: `Gagal menyimpan absensi: ${error.message}` });
        }
    };

    const attendanceStats = useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const dayOfWeek = now.getDay(); // Sunday - 0, Monday - 1
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)).getTime();

        const todayCount = attendance.filter(rec => new Date(rec.scanTime).getTime() >= startOfToday).length;
        const weekCount = attendance.filter(rec => new Date(rec.scanTime).getTime() >= startOfWeek).length;
        const totalCount = attendance.length;

        return { today: todayCount, week: weekCount, total: totalCount };
    }, [attendance]);

    const todaySchedules = useMemo(() => {
        const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' }) as Schedule['day'];
        return userSchedules
            .filter(s => s.day === todayName)
            .sort((a,b) => (a.startTime || '').localeCompare(b.startTime || ''));
    }, [userSchedules]);

    if (loadingData) {
        return <FullPageSpinner />;
    }
    
    if (isScanning) {
        return <QRScanner onScanSuccess={handleScanSuccess} onCancel={() => setIsScanning(false)} />;
    }
    
    return (
      <div className="bg-gray-50 min-h-screen font-sans">
            <header className="bg-white p-4 flex justify-between items-center shadow-sm">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard Guru</h1>
                    <p className="text-sm text-gray-500">Selamat datang, {user.name}</p>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={handleOpenMessageModal} className="text-gray-600 hover:text-gray-900 transition-colors">
                        <MessageIcon hasUnread={unreadMessagesCount > 0} />
                    </button>
                    <button onClick={onLogout} className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-4 py-2 rounded-md border border-gray-300 hover:border-gray-400">
                        <LogoutIcon />
                        <span>Keluar</span>
                    </button>
                </div>
            </header>

            <main className="p-4 md:p-6 space-y-6">
                {scanResult && (
                    <div className={`p-4 rounded-md mb-6 shadow ${scanResult.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        <p className="font-medium">{scanResult.type === 'success' ? 'Berhasil!' : 'Gagal'}</p>
                        <p className="text-sm">{scanResult.message}</p>
                    </div>
                )}
                
                {/* Action Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <button onClick={() => setIsScanning(true)} disabled={!isWithinRadius} className="bg-white p-8 rounded-lg shadow-sm text-center hover:shadow-md transition-shadow disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-sm group flex flex-col items-center justify-center gap-4 border border-gray-200">
                        <QrScanIcon />
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 group-disabled:text-gray-500">Scan QR Code</h3>
                            <p className="text-gray-500 text-sm mt-1">Scan QR Code kelas untuk absensi</p>
                            {!isWithinRadius && <p className="text-xs text-red-500 mt-1">Anda berada di luar radius sekolah.</p>}
                        </div>
                    </button>
                     <button onClick={() => setIsScheduleModalOpen(true)} className="bg-white p-8 rounded-lg shadow-sm text-center hover:shadow-md transition-shadow flex flex-col items-center justify-center gap-4 border border-gray-200">
                        <ScheduleIcon />
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">Jadwal Mengajar</h3>
                            <p className="text-gray-500 text-sm mt-1">Lihat dan kelola jadwal mengajar Anda</p>
                        </div>
                    </button>
                </div>
                
                {/* Top Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex justify-between items-center mb-1">
                             <p className="font-semibold text-gray-700">Absensi Hari Ini</p>
                            <div className="text-gray-400"><CalendarIcon /></div>
                        </div>
                        <p className="text-3xl font-bold text-gray-800">{attendanceStats.today}</p>
                        <p className="text-xs text-gray-400">Jam pelajaran yang sudah diabsen</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                         <div className="flex justify-between items-center mb-1">
                            <p className="font-semibold text-gray-700">Minggu Ini</p>
                            <div className="text-gray-400"><ClockIcon /></div>
                        </div>
                        <p className="text-3xl font-bold text-gray-800">{attendanceStats.week}</p>
                        <p className="text-xs text-gray-400">Total absensi minggu ini</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex justify-between items-center mb-1">
                            <p className="font-semibold text-gray-700">Total Absensi</p>
                            <div className="text-gray-400"><UserIcon /></div>
                        </div>
                        <p className="text-3xl font-bold text-gray-800">{attendanceStats.total}</p>
                        <p className="text-xs text-gray-400">Semua absensi Anda</p>
                    </div>
                </div>

                {/* Data Display Cards */}
                <div className="grid grid-cols-1 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <h3 className="font-bold text-lg">Riwayat Absensi Terbaru</h3>
                        <p className="text-sm text-gray-500 mb-4">10 absensi terakhir Anda</p>
                        <div className="space-y-3">
                            {attendance.length === 0 ? (
                                <div className="text-center py-10 text-gray-400">
                                    <QrCodeEmptyIcon />
                                    <p className="font-semibold mt-2 text-gray-600">Belum ada riwayat absensi</p>
                                    <p className="text-sm">Scan QR Code kelas untuk mulai absensi</p>
                                </div>
                            ) : (
                                attendance.slice(0, 10).map(rec => (
                                    <div key={rec.id} className="border-b last:border-b-0 pb-3 pt-2">
                                        <p className="font-semibold">Kelas {getClassName(rec.classId)} - Jam ke-{rec.lessonHour}</p>
                                        <p className="text-sm text-gray-500">{new Date(rec.scanTime).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                     <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <h3 className="font-bold text-lg">Jadwal Hari Ini</h3>
                        <p className="text-sm text-gray-500 mb-4">Jadwal mengajar Anda hari ini</p>
                         <div className="space-y-3">
                            {todaySchedules.length === 0 ? (
                                <div className="text-center py-10 text-gray-400">
                                    <CalendarEmptyIcon />
                                    <p className="font-semibold mt-2 text-gray-600">Belum ada jadwal mengajar</p>
                                    <p className="text-sm">Hubungi admin untuk mengatur jadwal</p>
                                </div>
                            ) : (
                                todaySchedules.map(s => (
                                    <div key={s.id} className="bg-gray-50 p-4 rounded-lg flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold text-gray-800">{s.subject}</p>
                                            <p className="text-sm text-gray-500">{getClassName(s.classId)}</p>
                                        </div>
                                        <span className="text-sm font-medium text-gray-500">{s.startTime} - {s.endTime}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </main>
            
            <Modal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} title="Kelola Jadwal Mengajar">
                <TeacherScheduleManager user={user} schedules={userSchedules} onScheduleUpdate={fetchData} classes={classes} onScheduleDelete={handleScheduleDelete} />
            </Modal>
            
            <Modal isOpen={isMessageModalOpen} onClose={() => setIsMessageModalOpen(false)} title="Pesan Masuk">
                <div className="space-y-4 max-h-96 overflow-y-auto">
                    {messages.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">Tidak ada pesan.</p>
                    ) : (
                        messages.map(msg => (
                            <div key={msg.id} className={`p-3 rounded-lg ${msg.isRead ? 'bg-gray-100' : 'bg-blue-50 border border-blue-200'}`}>
                                <p className="text-sm text-gray-800">{msg.content}</p>
                                <p className="text-xs text-gray-500 mt-2 text-right">
                                    Dari: {msg.senderName} - {msg.timestamp ? new Date(msg.timestamp).toLocaleString('id-ID') : 'Baru saja'}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </Modal>
            <footer className="text-center text-sm text-gray-500 py-6">
                © {new Date().getFullYear()} Rullp. All rights reserved.
            </footer>
        </div>
    );
};

const QRScanner: React.FC<{ onScanSuccess: (decodedText: string) => void; onCancel: () => void; }> = ({ onScanSuccess, onCancel }) => {
    const scannerRef = useRef<any | null>(null);
    const [scannerState, setScannerState] = useState<'initializing' | 'running' | 'error'>('initializing');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        const scannerId = "qr-reader-element";
        
        // Ensure the scanner is only initialized once.
        if (!scannerRef.current) {
            scannerRef.current = new Html5Qrcode(scannerId);
        }
        const scannerInstance = scannerRef.current;

        // Cleanup function to stop the scanner
        const cleanupScanner = () => {
            if (scannerInstance && scannerInstance.isScanning) {
                scannerInstance.stop().catch((err: any) => {
                    // This error can happen if the camera is already stopped, it's safe to ignore.
                    console.warn("Scanner stop error on cleanup, likely already stopped:", err);
                });
            }
        };
        
        const startScanner = async () => {
            try {
                await scannerInstance.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
                            const size = Math.min(viewfinderWidth, viewfinderHeight) * 0.7;
                            return { width: size, height: size };
                        },
                        aspectRatio: 1.0
                    },
                    (decodedText: string) => {
                        // Success callback
                        cleanupScanner();
                        onScanSuccess(decodedText);
                    },
                    (errorMessage: string) => {
                        // Error callback (ignore 'QR code not found')
                    }
                );
                setScannerState('running');
            } catch (err: any) {
                setScannerState('error');
                let userFriendlyMessage = "Tidak dapat mengakses kamera. Pastikan Anda telah memberikan izin.";
                if (typeof err === 'string' && err.includes('NotAllowedError')) {
                    userFriendlyMessage = "Akses kamera ditolak. Harap izinkan akses kamera di pengaturan browser Anda.";
                } else if (err.name === 'NotReadableError') {
                    userFriendlyMessage = "Kamera mungkin sedang digunakan oleh aplikasi lain. Tutup aplikasi lain dan coba lagi.";
                }
                setErrorMessage(userFriendlyMessage);
            }
        };

        startScanner();

        // This is the key cleanup function that runs when the component unmounts.
        return () => {
            cleanupScanner();
        };
    }, [onScanSuccess]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="w-full bg-white rounded-2xl shadow-xl max-w-sm mx-auto overflow-hidden">
                <div className="p-4 text-center space-y-3">
                    <h2 className="font-bold text-lg text-gray-800">
                        Arahkan kamera ke QR Code
                    </h2>
                </div>
                <div className="w-full aspect-square bg-black relative">
                    <div id="qr-reader-element" className="w-full h-full"></div>
                    {scannerState === 'initializing' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 text-white">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                            <p className="mt-2">Memulai kamera...</p>
                        </div>
                    )}
                    {scannerState === 'error' && (
                         <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 text-white p-4">
                            <p className="text-red-400 text-center font-semibold">Gagal Memuat Kamera</p>
                            <p className="text-center text-sm mt-2">{errorMessage}</p>
                             <button onClick={onCancel} className="mt-4 bg-red-500 text-white px-4 py-2 rounded-lg">Tutup</button>
                        </div>
                    )}
                </div>
                 <div className="p-4">
                    <button 
                        onClick={onCancel} 
                        className="w-full bg-gray-200 text-gray-800 font-semibold py-3 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                        Batal
                    </button>
                </div>
            </div>
        </div>
    );
};

const TeacherScheduleManager: React.FC<{user: User, schedules: Schedule[], onScheduleUpdate: () => Promise<void>, classes: Class[], onScheduleDelete: (id: string) => Promise<void>}> = ({ user, schedules, onScheduleUpdate, classes, onScheduleDelete }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<Partial<Schedule> | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSchedule || !editingSchedule.classId || !editingSchedule.day || !editingSchedule.lessonHour || !editingSchedule.startTime || !editingSchedule.endTime || !editingSchedule.subject) {
            alert("Harap isi semua kolom");
            return;
        }

        setIsSaving(true);
        try {
            const scheduleData: Omit<Schedule, 'id'> = {
              teacherId: user.id,
              classId: editingSchedule.classId,
              subject: editingSchedule.subject,
              day: editingSchedule.day,
              lessonHour: editingSchedule.lessonHour,
              startTime: editingSchedule.startTime,
              endTime: editingSchedule.endTime,
            };

            const result = editingSchedule.id
                ? await api.updateSchedule(editingSchedule.id, scheduleData)
                : await api.addSchedule(scheduleData);
            
            if(result.success) {
                await onScheduleUpdate();
                handleCloseModal();
            } else {
                alert(result.message);
            }
        } catch (error: any) {
            console.error("Gagal menyimpan jadwal:", error);
            alert(`Terjadi kesalahan saat menyimpan: ${error.message || 'Silakan coba lagi.'}`);
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDelete = async (id: string) => {
        if(window.confirm("Yakin ingin menghapus jadwal ini?")){
            await onScheduleDelete(id);
        }
    }

    const handleOpenModal = (schedule: Partial<Schedule> | null = null) => {
        setEditingSchedule(schedule || {startTime: '07:00', endTime: '08:00', subject: ''});
        setIsModalOpen(true);
    };
    
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingSchedule(null);
    }
    
    const getClassName = (classId: string) => classes.find(c => c.id === classId)?.name || 'N/A';
    
    return (
        <div className="bg-white p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Jadwal Mengajar Saya</h2>
                <button onClick={() => handleOpenModal()} className="bg-blue-500 text-white px-4 py-2 rounded-lg">Tambah Jadwal</button>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto">
                {schedules.length === 0 ? <p>Anda belum memiliki jadwal.</p> : schedules.map(s => (
                    <div key={s.id} className="border p-3 rounded-lg flex justify-between items-center">
                        <div>
                            <p className="font-semibold">{s.subject}</p>
                            <p className="text-gray-600">Kelas: {getClassName(s.classId)} ({HARI_TRANSLATION[s.day]}, Jam ke-{s.lessonHour})</p>
                             <p className="text-sm text-gray-500">Waktu: {s.startTime} - {s.endTime}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button onClick={() => handleOpenModal(s)} className="text-blue-600 hover:underline text-sm font-medium">Ubah</button>
                            <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:underline text-sm font-medium">Hapus</button>
                        </div>
                    </div>
                ))}
            </div>
             <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingSchedule?.id ? 'Ubah Jadwal' : 'Tambah Jadwal'}>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block mb-1">Mata Pelajaran</label>
                        <input type="text" value={editingSchedule?.subject || ''} onChange={e => setEditingSchedule({...editingSchedule, subject: e.target.value})} className="w-full p-2 border rounded" placeholder="Contoh: Matematika"/>
                    </div>
                     <div>
                        <label className="block mb-1">Kelas</label>
                        <select value={editingSchedule?.classId || ''} onChange={e => setEditingSchedule({...editingSchedule, classId: e.target.value})} className="w-full p-2 border rounded">
                            <option value="">Pilih Kelas</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block mb-1">Hari</label>
                        <select value={editingSchedule?.day || ''} onChange={e => setEditingSchedule({...editingSchedule, day: e.target.value as Schedule['day']})} className="w-full p-2 border rounded">
                            <option value="">Pilih Hari</option>
                            {DAYS_OF_WEEK.map(day => <option key={day} value={day}>{HARI_TRANSLATION[day]}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block mb-1">Jam Ke</label>
                        <select 
                            value={editingSchedule?.lessonHour || ''} 
                            onChange={e => {
                                const value = parseInt(e.target.value, 10);
                                setEditingSchedule({...editingSchedule, lessonHour: isNaN(value) ? undefined : value });
                            }} 
                            className="w-full p-2 border rounded"
                        >
                            <option value="">Pilih Jam</option>
                            {LESSON_HOURS.map(hour => <option key={hour} value={hour}>{hour}</option>)}
                        </select>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-1">Waktu Mulai</label>
                            <input type="time" value={editingSchedule?.startTime || ''} onChange={e => setEditingSchedule({...editingSchedule, startTime: e.target.value})} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block mb-1">Waktu Selesai</label>
                            <input type="time" value={editingSchedule?.endTime || ''} onChange={e => setEditingSchedule({...editingSchedule, endTime: e.target.value})} className="w-full p-2 border rounded" />
                        </div>
                    </div>
                    
                    <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded-lg flex justify-center items-center transition duration-150 disabled:bg-blue-400" disabled={isSaving}>
                        {isSaving ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                <span>Menyimpan...</span>
                            </>
                        ) : 'Simpan'}
                    </button>
                </form>
            </Modal>
        </div>
    );
};

// --- Pembina Eskul Dashboard Components ---
const SelfieCapture: React.FC<{ onConfirm: (base64Image: string) => void; onCancel: () => void; }> = ({ onConfirm, onCancel }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let stream: MediaStream | null = null;
        const startCamera = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
                setError("Gagal mengakses kamera. Pastikan izin telah diberikan.");
            }
        };

        if (!capturedImage) {
            startCamera();
        }

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [capturedImage]);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            if (context) {
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                setCapturedImage(dataUrl);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex flex-col items-center justify-center p-4">
            <div className="w-full bg-white rounded-2xl shadow-xl max-w-sm mx-auto overflow-hidden">
                <div className="p-4 text-center">
                    <h2 className="font-bold text-lg text-gray-800">Ambil Foto Selfie</h2>
                    <p className="text-sm text-gray-500">Sebagai bukti kehadiran</p>
                </div>
                <div className="w-full aspect-[3/4] bg-black relative">
                    {error ? (
                        <div className="absolute inset-0 flex items-center justify-center text-white p-4 text-center">{error}</div>
                    ) : capturedImage ? (
                        <img src={capturedImage} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
                    )}
                    <canvas ref={canvasRef} className="hidden"></canvas>
                </div>
                <div className="p-4 space-y-2">
                    {capturedImage ? (
                        <div className="flex gap-2">
                            <button onClick={() => setCapturedImage(null)} className="flex-1 bg-gray-200 text-gray-800 font-semibold py-3 rounded-lg">Ulangi</button>
                            <button onClick={() => onConfirm(capturedImage)} className="flex-1 bg-green-500 text-white font-semibold py-3 rounded-lg">Konfirmasi</button>
                        </div>
                    ) : (
                        <button onClick={handleCapture} className="w-full bg-blue-500 text-white font-semibold py-3 rounded-lg" disabled={!!error}>Ambil Foto</button>
                    )}
                    <button onClick={onCancel} className="w-full bg-transparent text-gray-600 font-semibold py-2 rounded-lg">Batal</button>
                </div>
            </div>
        </div>
    );
};


const PembinaEskulDashboard: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [schedules, setSchedules] = useState<EskulSchedule[]>([]);
    const [eskuls, setEskuls] = useState<Eskul[]>([]);
    const [attendance, setAttendance] = useState<EskulAttendanceRecord[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [scanResult, setScanResult] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [selfieContext, setSelfieContext] = useState<{ schedule: EskulSchedule; existingRecord?: EskulAttendanceRecord } | null>(null);
    const [viewingImage, setViewingImage] = useState<string | null>(null);

    const { isWithinRadius } = useGeolocation();

    const getEskulName = useCallback((eskulId: string) => eskuls.find(e => e.id === eskulId)?.name || 'N/A', [eskuls]);

    const fetchData = useCallback(async () => {
        setLoadingData(true);
        try {
            // Fetch critical data for dropdowns first.
            const eskulsData = await api.getEskuls();
            setEskuls(eskulsData);
    
            if (eskulsData.length === 0) {
                console.warn("Daftar eskul kosong. Periksa data di Firestore dan aturan keamanan.");
            }
    
            // Fetch non-critical data.
            const [schedulesData, attendanceData] = await Promise.all([
                api.getEskulSchedules(user.id),
                api.getEskulAttendanceRecords(user.id)
            ]);
            setSchedules(schedulesData);
            setAttendance(attendanceData);
    
        } catch (error: any) {
            console.error("Gagal memuat data dasbor pembina:", error);
            alert(`Terjadi kesalahan saat memuat data: ${error.message}. Beberapa fitur mungkin tidak berfungsi.`);
        } finally {
            setLoadingData(false);
        }
    }, [user.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    useEffect(() => {
        if (scanResult) {
            const timer = setTimeout(() => setScanResult(null), 7000);
            return () => clearTimeout(timer);
        }
    }, [scanResult]);

    const handleScanSuccess = async (qrData: string) => {
        setIsScanning(false);
        let eskulId: string;
        try {
            const parsedData = JSON.parse(qrData);
            if (parsedData.type !== 'eskul_attendance' || !parsedData.eskulId) {
                setScanResult({ type: 'error', message: 'QR Code tidak valid untuk absensi eskul.' });
                return;
            }
            eskulId = parsedData.eskulId;
        } catch (e) {
            setScanResult({ type: 'error', message: 'Format QR Code tidak dikenali.' });
            return;
        }

        const now = new Date();
        const todayName = now.toLocaleDateString('en-US', { weekday: 'long' }) as EskulSchedule['day'];
        
        const activeSchedule = schedules.find(s => {
            if (s.eskulId !== eskulId || s.day !== todayName) return false;
            
            const [startHour, startMinute] = s.startTime.split(':').map(Number);
            const startTime = new Date(now); startTime.setHours(startHour, startMinute, 0, 0);
            const [endHour, endMinute] = s.endTime.split(':').map(Number);
            const endTime = new Date(now); endTime.setHours(endHour, endMinute, 0, 0);
            const leewayStart = 30 * 60 * 1000, leewayEnd = 60 * 60 * 1000;
            return now.getTime() >= (startTime.getTime() - leewayStart) && now.getTime() <= (endTime.getTime() + leewayEnd);
        });

        if (!activeSchedule) {
            setScanResult({ type: 'error', message: `Tidak ada jadwal eskul ${getEskulName(eskulId)} yang aktif saat ini.` });
            return;
        }

        const todayDateString = now.toISOString().slice(0, 10);
        const existingRecord = await api.findEskulAttendanceForToday(user.id, activeSchedule.id, todayDateString);

        if (existingRecord && existingRecord.checkOutTime) {
            setScanResult({ type: 'error', message: 'Anda sudah absen pulang untuk kegiatan ini.' });
            return;
        }

        // Trigger selfie capture
        setSelfieContext({ schedule: activeSchedule, existingRecord: existingRecord || undefined });
    };

    const handleSelfieConfirm = async (base64Image: string) => {
        if (!selfieContext) return;
        const { schedule, existingRecord } = selfieContext;
        const isCheckIn = !existingRecord;
        const eskulName = getEskulName(schedule.eskulId);
        setSelfieContext(null);

        try {
            if (isCheckIn) {
                // Flow Absen Datang
                setScanResult({ type: 'info', message: `Mencatat absensi datang untuk ${eskulName}...` });
                const newRecordData: Omit<EskulAttendanceRecord, 'id'> = {
                    pembinaId: user.id,
                    eskulScheduleId: schedule.id,
                    date: new Date().toISOString().slice(0, 10),
                    checkInTime: new Date().toISOString(),
                };
                const addResult = await api.addEskulAttendanceRecord(newRecordData);
                if (!addResult.success || !addResult.id) throw new Error(addResult.message);
                
                setScanResult({ type: 'info', message: 'Mengunggah foto...' });
                const imageUrl = await api.uploadEskulSelfie(base64Image, user.id, addResult.id, 'checkin');
                
                await api.updateEskulAttendanceRecord(addResult.id, { checkInImageUrl: imageUrl });

                setScanResult({ type: 'success', message: `Absen DATANG berhasil untuk ${eskulName}.` });
            } else {
                // Flow Absen Pulang
                if(!existingRecord) return; // Should not happen, but for type safety
                setScanResult({ type: 'info', message: `Mencatat absensi pulang untuk ${eskulName}...` });
                setScanResult({ type: 'info', message: 'Mengunggah foto...' });
                const imageUrl = await api.uploadEskulSelfie(base64Image, user.id, existingRecord.id, 'checkout');

                const updateData = {
                    checkOutTime: new Date().toISOString(),
                    checkOutImageUrl: imageUrl
                };
                await api.updateEskulAttendanceRecord(existingRecord.id, updateData);

                setScanResult({ type: 'success', message: `Absen PULANG berhasil untuk ${eskulName}.` });
            }
        } catch (error: any) {
            setScanResult({ type: 'error', message: `Terjadi kesalahan: ${error.message}` });
        } finally {
            fetchData();
        }
    };
    
    if (loadingData) return <FullPageSpinner />;
    if (isScanning) return <QRScanner onScanSuccess={handleScanSuccess} onCancel={() => setIsScanning(false)} />;
    if (selfieContext) return <SelfieCapture onConfirm={handleSelfieConfirm} onCancel={() => setSelfieContext(null)} />;

    const todaySchedules = schedules.filter(s => s.day === new Date().toLocaleDateString('en-US', { weekday: 'long' }));

    return (
        <div className="bg-gray-50 min-h-screen font-sans">
            <header className="bg-white p-4 flex justify-between items-center shadow-sm">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard Pembina Eskul</h1>
                    <p className="text-sm text-gray-500">Selamat datang, {user.name}</p>
                </div>
                <button onClick={onLogout} className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-4 py-2 rounded-md border border-gray-300 hover:border-gray-400">
                    <LogoutIcon />
                    <span>Keluar</span>
                </button>
            </header>
            <main className="p-4 md:p-6 space-y-6">
                {scanResult && (
                    <div className={`p-4 rounded-md mb-6 shadow ${scanResult.type === 'success' ? 'bg-green-100 text-green-800' : scanResult.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                        <p className="font-medium">{scanResult.type === 'success' ? 'Berhasil!' : scanResult.type === 'error' ? 'Gagal' : 'Info'}</p>
                        <p className="text-sm">{scanResult.message}</p>
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button onClick={() => setIsScanning(true)} disabled={!isWithinRadius} className="bg-white p-8 rounded-lg shadow-sm text-center hover:shadow-md transition-shadow disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-sm group flex flex-col items-center justify-center gap-4 border border-gray-200">
                        <QrScanIcon />
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 group-disabled:text-gray-500">Scan Absensi Eskul</h3>
                            <p className="text-gray-500 text-sm mt-1">Pindai QR untuk absensi datang & pulang</p>
                            {!isWithinRadius && <p className="text-xs text-red-500 mt-1">Anda berada di luar radius sekolah.</p>}
                        </div>
                    </button>
                    <button onClick={() => setIsScheduleModalOpen(true)} className="bg-white p-8 rounded-lg shadow-sm text-center hover:shadow-md transition-shadow flex flex-col items-center justify-center gap-4 border border-gray-200">
                        <ScheduleIcon />
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">Jadwal Eskul</h3>
                            <p className="text-gray-500 text-sm mt-1">Lihat dan kelola jadwal eskul Anda</p>
                        </div>
                    </button>
                </div>
                 <div className="grid grid-cols-1 gap-6">
                     <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <h3 className="font-bold text-lg">Jadwal Hari Ini</h3>
                         <div className="space-y-3 mt-4">
                            {todaySchedules.length === 0 ? (
                                <div className="text-center py-10 text-gray-400">
                                    <CalendarEmptyIcon />
                                    <p className="font-semibold mt-2 text-gray-600">Tidak ada jadwal eskul hari ini</p>
                                </div>
                            ) : (
                                todaySchedules.map(s => (
                                    <div key={s.id} className="bg-gray-50 p-4 rounded-lg flex justify-between items-center">
                                        <p className="font-semibold text-gray-800">{getEskulName(s.eskulId)}</p>
                                        <span className="text-sm font-medium text-gray-500">{s.startTime} - {s.endTime}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <h3 className="font-bold text-lg">Riwayat Absensi Eskul Terbaru</h3>
                        <div className="space-y-3 mt-4">
                            {attendance.length === 0 ? (
                                <div className="text-center py-10 text-gray-400">
                                    <QrCodeEmptyIcon />
                                    <p className="font-semibold mt-2 text-gray-600">Belum ada riwayat absensi</p>
                                </div>
                            ) : (
                                attendance.slice(0, 5).map(rec => {
                                    const schedule = schedules.find(s => s.id === rec.eskulScheduleId);
                                    return (
                                        <div key={rec.id} className="border-b last:border-b-0 pb-3 pt-2">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-semibold">{schedule ? getEskulName(schedule.eskulId) : 'Kegiatan Dihapus'}</p>
                                                    <p className="text-sm text-gray-500">Tanggal: {new Date(rec.checkInTime).toLocaleDateString('id-ID')}</p>
                                                    <p className="text-sm text-gray-500">Datang: {new Date(rec.checkInTime).toLocaleTimeString('id-ID')}</p>
                                                    {rec.checkOutTime && <p className="text-sm text-gray-500">Pulang: {new Date(rec.checkOutTime).toLocaleTimeString('id-ID')}</p>}
                                                </div>
                                                <div className="flex gap-2 flex-shrink-0 ml-2">
                                                    {rec.checkInImageUrl && <img src={rec.checkInImageUrl} alt="selfie datang" className="w-12 h-12 object-cover rounded-md cursor-pointer" onClick={() => setViewingImage(rec.checkInImageUrl!)} />}
                                                    {rec.checkOutImageUrl && <img src={rec.checkOutImageUrl} alt="selfie pulang" className="w-12 h-12 object-cover rounded-md cursor-pointer" onClick={() => setViewingImage(rec.checkOutImageUrl!)} />}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </main>
            <Modal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} title="Kelola Jadwal Eskul">
                <EskulScheduleManager user={user} schedules={schedules} eskuls={eskuls} onScheduleUpdate={fetchData} />
            </Modal>
            {viewingImage && (
                <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4" onClick={() => setViewingImage(null)}>
                    <img src={viewingImage} alt="Bukti Foto" className="max-w-full max-h-full rounded-lg"/>
                </div>
            )}
             <footer className="text-center text-sm text-gray-500 py-6">
                © {new Date().getFullYear()} Rullp. All rights reserved.
            </footer>
        </div>
    );
};

const EskulScheduleManager: React.FC<{user: User, schedules: EskulSchedule[], eskuls: Eskul[], onScheduleUpdate: () => void}> = ({ user, schedules, eskuls, onScheduleUpdate }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<Partial<EskulSchedule> | null>(null);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSchedule || !editingSchedule.eskulId || !editingSchedule.day || !editingSchedule.startTime || !editingSchedule.endTime) {
            alert("Harap isi semua kolom");
            return;
        }

        try {
            const scheduleData = {
              pembinaId: user.id,
              eskulId: editingSchedule.eskulId,
              day: editingSchedule.day,
              startTime: editingSchedule.startTime,
              endTime: editingSchedule.endTime,
            };
            
            let result;
            if (editingSchedule.id) {
                result = await api.updateEskulSchedule(editingSchedule.id, scheduleData);
            } else {
                result = await api.addEskulSchedule(scheduleData);
            }

            if (result.success) {
                onScheduleUpdate();
                handleCloseModal();
            } else {
                alert(result.message);
            }
        } catch (error: any) {
            alert(`Gagal menyimpan: ${error.message}`);
        }
    };
    
    const handleDelete = async (id: string) => {
        if(window.confirm("Yakin ingin menghapus jadwal ini?")){
            const result = await api.deleteEskulSchedule(id);
            if (result.success) {
                onScheduleUpdate();
            } else {
                alert(result.message);
            }
        }
    }

    const handleOpenModal = (schedule: Partial<EskulSchedule> | null = null) => {
        setEditingSchedule(schedule || { startTime: '14:00', endTime: '16:00' });
        setIsModalOpen(true);
    };
    
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingSchedule(null);
    }
    
    const getEskulName = (eskulId: string) => eskuls.find(e => e.id === eskulId)?.name || 'N/A';
    
    return (
        <div className="bg-white p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Jadwal Eskul Saya</h2>
                <button onClick={() => handleOpenModal()} className="bg-blue-500 text-white px-4 py-2 rounded-lg">Tambah</button>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto">
                {schedules.map(s => (
                    <div key={s.id} className="border p-3 rounded-lg flex justify-between items-center">
                        <div>
                            <p className="font-semibold">{getEskulName(s.eskulId)}</p>
                            <p className="text-gray-600">{HARI_TRANSLATION[s.day]}, {s.startTime} - {s.endTime}</p>
                        </div>
                        <div>
                            <button onClick={() => handleOpenModal(s)} className="text-blue-600 hover:underline text-sm font-medium">Ubah</button>
                            <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:underline text-sm font-medium ml-2">Hapus</button>
                        </div>
                    </div>
                ))}
            </div>
             <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingSchedule?.id ? 'Ubah Jadwal' : 'Tambah Jadwal'}>
                <form onSubmit={handleSave} className="space-y-4">
                     <div>
                        <label className="block mb-1">Kegiatan Eskul</label>
                        <select value={editingSchedule?.eskulId || ''} onChange={e => setEditingSchedule({...editingSchedule, eskulId: e.target.value})} className="w-full p-2 border rounded">
                            <option value="">Pilih Eskul</option>
                            {eskuls.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block mb-1">Hari</label>
                        <select value={editingSchedule?.day || ''} onChange={e => setEditingSchedule({...editingSchedule, day: e.target.value as EskulSchedule['day']})} className="w-full p-2 border rounded">
                            <option value="">Pilih Hari</option>
                            {DAYS_OF_WEEK.map(day => <option key={day} value={day}>{HARI_TRANSLATION[day]}</option>)}
                        </select>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-1">Waktu Mulai</label>
                            <input type="time" value={editingSchedule?.startTime || ''} onChange={e => setEditingSchedule({...editingSchedule, startTime: e.target.value})} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block mb-1">Waktu Selesai</label>
                            <input type="time" value={editingSchedule?.endTime || ''} onChange={e => setEditingSchedule({...editingSchedule, endTime: e.target.value})} className="w-full p-2 border rounded" />
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded-lg">Simpan</button>
                </form>
            </Modal>
        </div>
    );
};

// --- Admin Dashboard Components ---

const AdminDashboard: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
    const [view, setView] = useState('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleSetView = (newView: string) => {
        setView(newView);
        if (window.innerWidth < 768) { // md breakpoint
            setIsSidebarOpen(false);
        }
    };
    
    const viewTitles: { [key: string]: string } = {
        dashboard: 'Dashboard',
        teachers: 'Data Guru & Pembina',
        admins: 'Data Admin',
        classes: 'Data Kelas',
        eskul: 'Data Ekstrakurikuler',
        schedules: 'Jadwal Pelajaran',
        eskulSchedules: 'Jadwal Ekstrakurikuler',
        reports: 'Laporan Absensi',
        'ai-assistant': 'Asisten AI'
    };

    return (
        <div className="relative min-h-screen md:flex">
            {/* Mobile menu overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            {/* Sidebar */}
            <aside className={`bg-gray-800 text-white w-64 flex-shrink-0 flex flex-col fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-4 text-xl font-bold border-b border-gray-700 flex justify-between items-center">
                    <span>Panel Admin</span>
                    <button className="md:hidden text-gray-400 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <nav className="flex-grow">
                    <a onClick={() => handleSetView('dashboard')} className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 cursor-pointer">Dashboard</a>
                    <a onClick={() => handleSetView('teachers')} className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 cursor-pointer">Data Guru & Pembina</a>
                    <a onClick={() => handleSetView('admins')} className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 cursor-pointer">Data Admin</a>
                    <a onClick={() => handleSetView('classes')} className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 cursor-pointer">Data Kelas</a>
                    <a onClick={() => handleSetView('eskul')} className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 cursor-pointer">Data Ekstrakurikuler</a>
                    <a onClick={() => handleSetView('schedules')} className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 cursor-pointer">Jadwal Pelajaran</a>
                    <a onClick={() => handleSetView('eskulSchedules')} className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 cursor-pointer">Jadwal Ekstrakurikuler</a>
                    <a onClick={() => handleSetView('reports')} className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 cursor-pointer">Laporan Absensi</a>
                    <a onClick={() => handleSetView('ai-assistant')} className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 cursor-pointer">Asisten AI</a>
                </nav>
                <div className="p-4 border-t border-gray-700">
                    <p>{user.name}</p>
                    <button onClick={onLogout} className="text-sm text-red-400 hover:text-red-300">Keluar</button>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 p-6 bg-gray-100 overflow-auto">
                {/* Header with hamburger button for mobile */}
                <header className="flex items-center justify-between mb-6 md:hidden">
                    <button onClick={() => setIsSidebarOpen(true)} className="text-gray-500 focus:outline-none">
                        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                        </svg>
                    </button>
                    <h1 className="text-xl font-semibold">{viewTitles[view] || 'Halaman'}</h1>
                </header>

                {/* Page Content */}
                {view === 'dashboard' && <DashboardHome />}
                {view === 'teachers' && <StaffManagement adminUser={user}/>}
                {view === 'admins' && <AdminManagement />}
                {view === 'classes' && <ClassManagement />}
                {view === 'eskul' && <EskulManagement />}
                {view === 'schedules' && <ScheduleManagement />}
                {view === 'eskulSchedules' && <AdminEskulScheduleManagement />}
                {view === 'reports' && <AttendanceReport />}
                {view === 'ai-assistant' && <AIAssistant />}
                <footer className="text-center text-sm text-gray-500 pt-8 pb-2">
                    © {new Date().getFullYear()} Rullp. All rights reserved.
                </footer>
            </main>
        </div>
    );
};


const DashboardHome: React.FC = () => {
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [teachers, setTeachers] = useState<User[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const [att, tch, cls, sch] = await Promise.all([
                api.getAttendanceRecords(),
                api.getUsersByRole(UserRoleEnum.TEACHER),
                api.getClasses(),
                api.getSchedules(),
            ]);
            setAttendance(att);
            setTeachers(tch);
            setClasses(cls);
            setSchedules(sch);
            setLoading(false);
        };
        fetchData();
    }, [])

    const attendanceSummary = useMemo(() => {
        const today = new Date();
        const todayISO = today.toISOString().slice(0, 10);
        const todayName = today.toLocaleDateString('en-US', { weekday: 'long' }) as Schedule['day'];

        // Get unique teacher IDs scheduled for today
        const scheduledTeacherIds = new Set(
            schedules.filter(s => s.day === todayName).map(s => s.teacherId)
        );

        // Get unique teacher IDs who have attendance records today
        const todayAttendance = attendance.filter(rec => rec.scanTime.startsWith(todayISO));
        const presentTeacherIds = new Set(todayAttendance.map(rec => rec.teacherId));
        
        // Teachers are absent if they were scheduled but are not in the present list.
        const absentCount = [...scheduledTeacherIds].filter(id => !presentTeacherIds.has(id)).length;

        // A teacher is present if they have a scan record. This implies they were scheduled.
        const presentCount = presentTeacherIds.size;

        return {
            present: presentCount,
            absent: absentCount,
        };
    }, [attendance, schedules]);
    
    const chartData = [
        { name: 'Hadir', value: attendanceSummary.present, fill: '#4ade80' },
        { name: 'Absen', value: attendanceSummary.absent, fill: '#f87171' },
    ];

    const getTeacherName = (id: string) => teachers.find(t => t.id === id)?.name || 'N/A';
    const getClassName = (id: string) => classes.find(c => c.id === id)?.name || 'N/A';

    if (loading) return <Spinner />;

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6 hidden md:block">Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="font-semibold text-gray-500">Total Guru</h3>
                    <p className="text-3xl font-bold">{teachers.length}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="font-semibold text-gray-500">Guru Hadir Hari Ini</h3>
                    <p className="text-3xl font-bold text-green-500">{attendanceSummary.present}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="font-semibold text-gray-500">Guru Absen Hari Ini</h3>
                    <p className="text-3xl font-bold text-red-500">{attendanceSummary.absent}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <div className="bg-white p-4 rounded-lg shadow">
                    <h2 className="text-xl font-bold mb-4">Ringkasan Absensi Hari Ini</h2>
                     <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                    <h2 className="text-xl font-bold mb-4">Aktivitas Absensi Terbaru</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                           <thead>
                               <tr>
                                   <th className="p-2 border-b">Guru</th>
                                   <th className="p-2 border-b">Kelas</th>
                                   <th className="p-2 border-b">Waktu</th>
                               </tr>
                           </thead>
                            <tbody>
                                {attendance.slice(-5).reverse().map(rec => (
                                    <tr key={rec.id}>
                                        <td className="p-2">{getTeacherName(rec.teacherId)}</td>
                                        <td className="p-2">{getClassName(rec.classId)}</td>
                                        <td className="p-2">{new Date(rec.scanTime).toLocaleString('id-ID')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CrudTable: React.FC<{
    title: string;
    columns: string[];
    data: any[];
    renderRow: (item: any) => React.ReactNode;
    onAdd?: () => void;
}> = ({ title, columns, data, renderRow, onAdd }) => (
    <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">{title}</h2>
            {onAdd && (
                <button onClick={onAdd} className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">Tambah</button>
            )}
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className="bg-gray-50">
                        {columns.map(col => <th key={col} className="p-3 font-semibold text-gray-600">{col}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {data.length === 0 ? (
                        <tr><td colSpan={columns.length} className="text-center p-4 text-gray-500">Tidak ada data.</td></tr>
                    ) : (
                        data.map(item => renderRow(item))
                    )}
                </tbody>
            </table>
        </div>
    </div>
);

const SendMessageModal: React.FC<{ staff: User; adminUser: User; onClose: () => void }> = ({ staff, adminUser, onClose }) => {
    const [content, setContent] = useState('');
    const [isSending, setIsSending] = useState(false);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
        setIsSending(true);
        try {
            const newMessage: Omit<Message, 'id' | 'timestamp'> = {
                senderId: adminUser.id,
                senderName: adminUser.name,
                recipientId: staff.id,
                content: content.trim(),
                isRead: false,
            };
            await api.addMessage(newMessage);
            alert(`Pesan berhasil dikirim ke ${staff.name}`);
            onClose();
        } catch (error: any) {
            alert(`Gagal mengirim pesan: ${error.message}`);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Kirim Pesan ke ${staff.name}`}>
            <form onSubmit={handleSend}>
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={5}
                    className="w-full p-2 border rounded-md"
                    placeholder="Ketik pesan Anda..."
                    required
                ></textarea>
                <div className="flex justify-end mt-4">
                    <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-blue-300" disabled={isSending}>
                        {isSending ? 'Mengirim...' : 'Kirim'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

const StaffManagement: React.FC<{ adminUser: User }> = ({ adminUser }) => {
    const [staff, setStaff] = useState<User[]>([]);
    const [messagingStaff, setMessagingStaff] = useState<User | null>(null);

    const fetchStaff = async () => {
        const teachers = await api.getUsersByRole(UserRoleEnum.TEACHER);
        const pembinas = await api.getUsersByRole(UserRoleEnum.PEMBINA_ESKUL);
        setStaff([...teachers, ...pembinas]);
    };

    useEffect(() => {
        fetchStaff();
    }, []);
    
    const handleDelete = async (id: string) => {
        if (window.confirm("Yakin ingin menghapus pengguna ini? Ini juga akan menghapus jadwal terkait.")) {
            await api.deleteUser(id);
            setStaff(staff.filter(t => t.id !== id));
        }
    };

    const handleResetDevice = async (id: string, name: string) => {
        if (window.confirm(`Yakin ingin mereset perangkat untuk "${name}"? Pengguna ini akan dapat login di perangkat baru setelahnya.`)) {
            try {
                await api.resetDeviceBinding(id);
                alert(`Perangkat untuk ${name} berhasil direset.`);
            } catch (error: any) {
                console.error("Gagal mereset perangkat:", error);
                alert(`Terjadi kesalahan: ${error.message}`);
            }
        }
    };

    const roleTranslation: { [key in UserRole]?: string } = {
        [UserRoleEnum.TEACHER]: 'Guru',
        [UserRoleEnum.PEMBINA_ESKUL]: 'Pembina Eskul',
    };

    return (
        <>
            <CrudTable
                title="Manajemen Guru & Pembina"
                columns={['Nama', 'User ID (Email)', 'Peran', 'Aksi']}
                data={staff}
                renderRow={(member: User) => (
                    <tr key={member.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{member.name}</td>
                        <td className="p-3">{member.userId}</td>
                        <td className="p-3">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${member.role === UserRoleEnum.TEACHER ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                {roleTranslation[member.role] || member.role}
                            </span>
                        </td>
                        <td className="p-3 space-x-4">
                            <button onClick={() => setMessagingStaff(member)} className="text-green-600 hover:underline">Kirim Pesan</button>
                            <button onClick={() => handleResetDevice(member.id, member.name)} className="text-blue-600 hover:underline">Reset Perangkat</button>
                            <button onClick={() => handleDelete(member.id)} className="text-red-600 hover:underline">Hapus</button>
                        </td>
                    </tr>
                )}
            />
            <div className="mt-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-lg">
                <p className="font-bold">Informasi Pendaftaran</p>
                <p>Untuk menambahkan guru atau pembina baru, mereka harus mendaftar melalui halaman login dengan memilih opsi 'Daftar' dan peran yang sesuai.</p>
            </div>

            {messagingStaff && (
                <SendMessageModal
                    staff={messagingStaff}
                    adminUser={adminUser}
                    onClose={() => setMessagingStaff(null)}
                />
            )}
        </>
    );
};

const AdminManagement: React.FC = () => {
    const [admins, setAdmins] = useState<User[]>([]);

    useEffect(() => {
        const fetchAdmins = async () => {
            setAdmins(await api.getUsersByRole(UserRoleEnum.ADMIN));
        };
        fetchAdmins();
    }, []);

    const handleResetDevice = async (id: string, name: string) => {
        if (window.confirm(`Yakin ingin mereset perangkat untuk admin "${name}"? Admin ini akan dapat login di perangkat baru setelahnya.`)) {
            try {
                await api.resetDeviceBinding(id);
                alert(`Perangkat untuk ${name} berhasil direset.`);
            } catch (error: any) {
                console.error("Gagal mereset perangkat:", error);
                alert(`Terjadi kesalahan: ${error.message}`);
            }
        }
    };

    return (
        <CrudTable
            title="Manajemen Admin"
            columns={['Nama', 'User ID (Email)', 'Aksi']}
            data={admins}
            renderRow={(admin: User) => (
                <tr key={admin.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{admin.name}</td>
                    <td className="p-3">{admin.userId}</td>
                    <td className="p-3">
                        <button onClick={() => handleResetDevice(admin.id, admin.name)} className="text-blue-600 hover:underline">Reset Perangkat</button>
                    </td>
                </tr>
            )}
        />
    );
};


const ClassManagement: React.FC = () => {
    const [classes, setClasses] = useState<Class[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newClassName, setNewClassName] = useState('');
    const [newClassGrade, setNewClassGrade] = useState<number | ''>('');
    const [qrClass, setQrClass] = useState<Class | null>(null);

    const fetchClasses = async () => setClasses(await api.getClasses());

    useEffect(() => {
        fetchClasses();
    }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedClassName = newClassName.trim();
        if (trimmedClassName && newClassGrade) {
            const isDuplicate = classes.some(c => c.name.toLowerCase() === trimmedClassName.toLowerCase());
            if (isDuplicate) {
                alert(`Kelas dengan nama "${trimmedClassName}" sudah ada.`);
                return;
            }

            await api.addClass({ name: trimmedClassName, grade: newClassGrade as number });
            setNewClassName('');
            setNewClassGrade('');
            setIsModalOpen(false);
            fetchClasses();
        }
    };
    
    const handleDelete = async (id: string) => {
        if (window.confirm("Yakin ingin menghapus kelas ini? Ini juga akan menghapus jadwal terkait.")) {
            await api.deleteClass(id);
            fetchClasses();
        }
    };

    return (
        <>
            <CrudTable
                title="Manajemen Kelas"
                columns={['Nama Kelas', 'Tingkat', 'Aksi']}
                data={classes}
                onAdd={() => setIsModalOpen(true)}
                renderRow={(c: Class) => (
                    <tr key={c.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{c.name}</td>
                        <td className="p-3">{c.grade}</td>
                        <td className="p-3 space-x-4">
                            <button onClick={() => setQrClass(c)} className="text-blue-600 hover:underline">QR Code</button>
                            <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:underline">Hapus</button>
                        </td>
                    </tr>
                )}
            />
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Tambah Kelas Baru">
                <form onSubmit={handleAdd}>
                    <div className="mb-4">
                        <label className="block mb-2">Nama Kelas (Contoh: X-A)</label>
                        <input value={newClassName} onChange={e => setNewClassName(e.target.value)} className="w-full p-2 border rounded"/>
                    </div>
                     <div className="mb-4">
                        <label className="block mb-2">Tingkat (Contoh: 10)</label>
                        <input type="number" value={newClassGrade} onChange={e => setNewClassGrade(e.target.value ? parseInt(e.target.value, 10) : '')} className="w-full p-2 border rounded"/>
                    </div>
                    <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded-lg">Simpan</button>
                </form>
            </Modal>

            <Modal isOpen={!!qrClass} onClose={() => setQrClass(null)} title={`QR Code Absensi - Kelas ${qrClass?.name}`}>
                {qrClass && (
                    <div className="text-center p-4">
                        <QRCode
                            value={JSON.stringify({ type: 'attendance', classId: qrClass.id })}
                            size={256}
                            level={"H"}
                            includeMargin={true}
                        />
                        <p className="mt-4 text-gray-600">Pindai kode ini untuk melakukan absensi di kelas {qrClass.name}.</p>
                        <p className="text-sm text-gray-500 mt-2">Pastikan guru memindai dari dalam radius sekolah.</p>
                    </div>
                )}
            </Modal>
        </>
    );
};

const EskulManagement: React.FC = () => {
    const [eskuls, setEskuls] = useState<Eskul[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newEskulName, setNewEskulName] = useState('');
    const [qrEskul, setQrEskul] = useState<Eskul | null>(null);

    const fetchEskuls = useCallback(async () => {
        try {
            setEskuls(await api.getEskuls());
        } catch (error: any) {
            console.error("Gagal memuat data eskul:", error);
            alert(`Gagal memuat daftar eskul. Pastikan Anda memiliki izin untuk mengakses data ini. Error: ${error.message}`);
        }
    }, []);

    useEffect(() => {
        fetchEskuls();
    }, [fetchEskuls]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = newEskulName.trim();
        if (trimmedName) {
            if (eskuls.some(e => e.name.toLowerCase() === trimmedName.toLowerCase())) {
                alert(`Eskul dengan nama "${trimmedName}" sudah ada.`);
                return;
            }
            const result = await api.addEskul({ name: trimmedName });
            if (result.success) {
                setNewEskulName('');
                setIsModalOpen(false);
                fetchEskuls();
            } else {
                alert(result.message);
            }
        }
    };
    
    const handleDelete = async (id: string) => {
        if (window.confirm("Yakin ingin menghapus kegiatan eskul ini? Ini juga akan menghapus jadwal terkait.")) {
            const result = await api.deleteEskul(id);
            if (result.success) {
                fetchEskuls();
            } else {
                alert(result.message);
            }
        }
    };

    return (
        <>
            <CrudTable
                title="Manajemen Ekstrakurikuler"
                columns={['Nama Eskul', 'Aksi']}
                data={eskuls}
                onAdd={() => setIsModalOpen(true)}
                renderRow={(e: Eskul) => (
                    <tr key={e.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{e.name}</td>
                        <td className="p-3 space-x-4">
                            <button onClick={() => setQrEskul(e)} className="text-blue-600 hover:underline">QR Code</button>
                            <button onClick={() => handleDelete(e.id)} className="text-red-600 hover:underline">Hapus</button>
                        </td>
                    </tr>
                )}
            />
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Tambah Eskul Baru">
                <form onSubmit={handleAdd}>
                    <div className="mb-4">
                        <label className="block mb-2">Nama Eskul (Contoh: Pramuka)</label>
                        <input value={newEskulName} onChange={e => setNewEskulName(e.target.value)} className="w-full p-2 border rounded"/>
                    </div>
                    <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded-lg">Simpan</button>
                </form>
            </Modal>

            <Modal isOpen={!!qrEskul} onClose={() => setQrEskul(null)} title={`QR Code Absensi - ${qrEskul?.name}`}>
                {qrEskul && (
                    <div className="text-center p-4">
                        <QRCode
                            value={JSON.stringify({ type: 'eskul_attendance', eskulId: qrEskul.id })}
                            size={256}
                            level={"H"}
                            includeMargin={true}
                        />
                        <p className="mt-4 text-gray-600">Pindai kode ini untuk absensi kegiatan {qrEskul.name}.</p>
                    </div>
                )}
            </Modal>
        </>
    );
};

const ScheduleManagement: React.FC = () => {
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [users, setUsers] = useState<User[]>([]); // Teachers only
    const [classes, setClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<Partial<Schedule> | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch critical dropdown data first
            const [teachersData, classesData] = await Promise.all([
                api.getUsersByRole(UserRoleEnum.TEACHER),
                api.getClasses()
            ]);
            setUsers(teachersData);
            setClasses(classesData);
    
            if (teachersData.length === 0 || classesData.length === 0) {
                console.warn("Daftar guru atau kelas kosong. Periksa data di Firestore dan aturan keamanan.");
            }
    
            // Fetch main table data
            const schedulesData = await api.getSchedules();
            setSchedules(schedulesData);
    
        } catch (error: any) {
            console.error("Gagal memuat data manajemen jadwal:", error);
            alert(`Terjadi kesalahan saat memuat data: ${error.message}. Beberapa fitur mungkin tidak berfungsi.`);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenModal = (schedule: Partial<Schedule> | null = null) => {
        setEditingSchedule(schedule || { startTime: '07:00', endTime: '08:00', subject: '' });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingSchedule(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSchedule || !editingSchedule.teacherId || !editingSchedule.classId || !editingSchedule.day || !editingSchedule.lessonHour || !editingSchedule.startTime || !editingSchedule.endTime || !editingSchedule.subject) {
            alert("Harap isi semua kolom");
            return;
        }

        setIsSaving(true);
        try {
            const result = editingSchedule.id
                ? await api.updateSchedule(editingSchedule.id, editingSchedule as Omit<Schedule, 'id'>)
                : await api.addSchedule(editingSchedule as Omit<Schedule, 'id'>);
            
            if(result.success) {
                await fetchData();
                handleCloseModal();
            } else {
                alert(result.message);
            }
        } catch (error: any) {
            console.error("Gagal menyimpan jadwal:", error);
            alert(`Terjadi kesalahan saat menyimpan: ${error.message || 'Silakan coba lagi.'}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Yakin ingin menghapus jadwal ini?")) {
            try {
                await api.deleteSchedule(id);
                await fetchData();
            } catch (error: any) {
                alert(`Gagal menghapus: ${error.message}`);
            }
        }
    };

    const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'N/A';
    const getClassName = (id: string) => classes.find(c => c.id === id)?.name || 'N/A';

    if (loading) return <Spinner />;

    return (
        <>
            <CrudTable
                title="Manajemen Jadwal Pelajaran"
                columns={['Guru', 'Kelas', 'Mata Pelajaran', 'Hari & Waktu', 'Aksi']}
                data={schedules}
                onAdd={() => handleOpenModal()}
                renderRow={(s: Schedule) => (
                    <tr key={s.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{getUserName(s.teacherId)}</td>
                        <td className="p-3">{getClassName(s.classId)}</td>
                        <td className="p-3">{s.subject}</td>
                        <td className="p-3">{HARI_TRANSLATION[s.day]}, Jam ke-{s.lessonHour} ({s.startTime}-{s.endTime})</td>
                        <td className="p-3 space-x-2">
                            <button onClick={() => handleOpenModal(s)} className="text-blue-600 hover:underline">Ubah</button>
                            <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:underline">Hapus</button>
                        </td>
                    </tr>
                )}
            />
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingSchedule?.id ? 'Ubah Jadwal' : 'Tambah Jadwal'}>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block mb-1">Guru</label>
                        <select value={editingSchedule?.teacherId || ''} onChange={e => setEditingSchedule({...editingSchedule, teacherId: e.target.value})} className="w-full p-2 border rounded">
                            <option value="">Pilih Guru</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block mb-1">Kelas</label>
                        <select value={editingSchedule?.classId || ''} onChange={e => setEditingSchedule({...editingSchedule, classId: e.target.value})} className="w-full p-2 border rounded">
                            <option value="">Pilih Kelas</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block mb-1">Mata Pelajaran</label>
                        <input type="text" value={editingSchedule?.subject || ''} onChange={e => setEditingSchedule({...editingSchedule, subject: e.target.value})} className="w-full p-2 border rounded" placeholder="Contoh: Matematika"/>
                    </div>
                    <div>
                        <label className="block mb-1">Hari</label>
                        <select value={editingSchedule?.day || ''} onChange={e => setEditingSchedule({...editingSchedule, day: e.target.value as Schedule['day']})} className="w-full p-2 border rounded">
                            <option value="">Pilih Hari</option>
                            {DAYS_OF_WEEK.map(day => <option key={day} value={day}>{HARI_TRANSLATION[day]}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block mb-1">Jam Ke</label>
                        <select value={editingSchedule?.lessonHour || ''} onChange={e => setEditingSchedule({...editingSchedule, lessonHour: parseInt(e.target.value)})} className="w-full p-2 border rounded">
                            <option value="">Pilih Jam</option>
                            {LESSON_HOURS.map(hour => <option key={hour} value={hour}>{hour}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-1">Waktu Mulai</label>
                            <input type="time" value={editingSchedule?.startTime || ''} onChange={e => setEditingSchedule({...editingSchedule, startTime: e.target.value})} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block mb-1">Waktu Selesai</label>
                            <input type="time" value={editingSchedule?.endTime || ''} onChange={e => setEditingSchedule({...editingSchedule, endTime: e.target.value})} className="w-full p-2 border rounded" />
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded-lg flex justify-center items-center transition duration-150 disabled:bg-blue-400" disabled={isSaving}>
                        {isSaving ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                <span>Menyimpan...</span>
                            </>
                        ) : 'Simpan'}
                    </button>
                </form>
            </Modal>
        </>
    );
};

const AdminEskulScheduleManagement: React.FC = () => {
    const [schedules, setSchedules] = useState<EskulSchedule[]>([]);
    const [users, setUsers] = useState<User[]>([]); // Pembina eskul
    const [eskuls, setEskuls] = useState<Eskul[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<Partial<EskulSchedule> | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [schedulesData, pembinaData, eskulData] = await Promise.all([
                api.getAllEskulSchedules(),
                api.getUsersByRole(UserRoleEnum.PEMBINA_ESKUL),
                api.getEskuls(),
            ]);
            setSchedules(schedulesData);
            setUsers(pembinaData);
            setEskuls(eskulData);
        } catch (error: any) {
            console.error("Gagal memuat data jadwal eskul:", error);
            alert(`Gagal memuat data: ${error.message}`);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenModal = (schedule: Partial<EskulSchedule> | null = null) => {
        setEditingSchedule(schedule || { startTime: '14:00', endTime: '16:00' });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingSchedule(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSchedule || !editingSchedule.pembinaId || !editingSchedule.eskulId || !editingSchedule.day || !editingSchedule.startTime || !editingSchedule.endTime) {
            alert("Harap isi semua kolom");
            return;
        }

        setIsSaving(true);
        try {
            const result = editingSchedule.id
                ? await api.updateEskulSchedule(editingSchedule.id, editingSchedule as Omit<EskulSchedule, 'id'>)
                : await api.addEskulSchedule(editingSchedule as Omit<EskulSchedule, 'id'>);
            
            if(result.success) {
                await fetchData();
                handleCloseModal();
            } else {
                alert(result.message);
            }
        } catch (error: any) {
            console.error("Gagal menyimpan jadwal eskul:", error);
            alert(`Terjadi kesalahan: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Yakin ingin menghapus jadwal eskul ini?")) {
            const result = await api.deleteEskulSchedule(id);
            if (result.success) {
                await fetchData();
            } else {
                alert(result.message);
            }
        }
    };

    const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'N/A';
    const getEskulName = (id: string) => eskuls.find(e => e.id === id)?.name || 'N/A';

    if (loading) return <Spinner />;

    return (
        <>
            <CrudTable
                title="Manajemen Jadwal Ekstrakurikuler"
                columns={['Pembina', 'Eskul', 'Hari & Waktu', 'Aksi']}
                data={schedules}
                onAdd={() => handleOpenModal()}
                renderRow={(s: EskulSchedule) => (
                    <tr key={s.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{getUserName(s.pembinaId)}</td>
                        <td className="p-3">{getEskulName(s.eskulId)}</td>
                        <td className="p-3">{HARI_TRANSLATION[s.day]}, {s.startTime}-{s.endTime}</td>
                        <td className="p-3 space-x-2">
                            <button onClick={() => handleOpenModal(s)} className="text-blue-600 hover:underline">Ubah</button>
                            <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:underline">Hapus</button>
                        </td>
                    </tr>
                )}
            />
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingSchedule?.id ? 'Ubah Jadwal Eskul' : 'Tambah Jadwal Eskul'}>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block mb-1">Pembina</label>
                        <select value={editingSchedule?.pembinaId || ''} onChange={e => setEditingSchedule({...editingSchedule, pembinaId: e.target.value})} className="w-full p-2 border rounded">
                            <option value="">Pilih Pembina</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block mb-1">Kegiatan Eskul</label>
                        <select value={editingSchedule?.eskulId || ''} onChange={e => setEditingSchedule({...editingSchedule, eskulId: e.target.value})} className="w-full p-2 border rounded">
                            <option value="">Pilih Eskul</option>
                            {eskuls.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block mb-1">Hari</label>
                        <select value={editingSchedule?.day || ''} onChange={e => setEditingSchedule({...editingSchedule, day: e.target.value as EskulSchedule['day']})} className="w-full p-2 border rounded">
                            <option value="">Pilih Hari</option>
                            {DAYS_OF_WEEK.map(day => <option key={day} value={day}>{HARI_TRANSLATION[day]}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-1">Waktu Mulai</label>
                            <input type="time" value={editingSchedule?.startTime || ''} onChange={e => setEditingSchedule({...editingSchedule, startTime: e.target.value})} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block mb-1">Waktu Selesai</label>
                            <input type="time" value={editingSchedule?.endTime || ''} onChange={e => setEditingSchedule({...editingSchedule, endTime: e.target.value})} className="w-full p-2 border rounded" />
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded-lg flex justify-center items-center" disabled={isSaving}>
                         {isSaving ? 'Menyimpan...' : 'Simpan'}
                    </button>
                </form>
            </Modal>
        </>
    );
};

const AttendanceReport: React.FC = () => {
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [eskulAttendance, setEskulAttendance] = useState<EskulAttendanceRecord[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [eskuls, setEskuls] = useState<Eskul[]>([]);
    const [eskulSchedules, setEskulSchedules] = useState<EskulSchedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ teacherId: '', classId: '', startDate: '', endDate: '' });
    const [eskulFilter, setEskulFilter] = useState({ pembinaId: '', eskulId: '', startDate: '', endDate: '' });
    const [activeTab, setActiveTab] = useState<'kelas' | 'eskul'>('kelas');

    const fetchAllData = useCallback(async () => {
        setLoading(true);
        try {
            const [
                attendanceData,
                eskulAttendanceData,
                usersData,
                classesData,
                eskulData,
                allEskulSchedules
            ] = await Promise.all([
                api.getAttendanceRecords(),
                api.getAllEskulAttendanceRecords(),
                api.getUsers(),
                api.getClasses(),
                api.getEskuls(),
                api.getAllEskulSchedules()
            ]);
            setAttendance(attendanceData);
            setEskulAttendance(eskulAttendanceData);
            setUsers(usersData);
            setClasses(classesData);
            setEskuls(eskulData);
            setEskulSchedules(allEskulSchedules);
        } catch (error) {
            console.error("Error fetching report data:", error);
            alert("Gagal memuat data laporan.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'N/A';
    const getClassName = (id: string) => classes.find(c => c.id === id)?.name || 'N/A';
    const getEskulName = (id: string) => eskuls.find(e => e.id === id)?.name || 'N/A';

    const filteredAttendance = useMemo(() => {
        return attendance.filter(rec => {
            const scanDate = new Date(rec.scanTime);
            const startDate = filter.startDate ? new Date(filter.startDate) : null;
            const endDate = filter.endDate ? new Date(filter.endDate) : null;
            if (startDate) startDate.setHours(0, 0, 0, 0);
            if (endDate) endDate.setHours(23, 59, 59, 999);

            return (
                (filter.teacherId === '' || rec.teacherId === filter.teacherId) &&
                (filter.classId === '' || rec.classId === filter.classId) &&
                (!startDate || scanDate >= startDate) &&
                (!endDate || scanDate <= endDate)
            );
        });
    }, [attendance, filter]);
    
    const filteredEskulAttendance = useMemo(() => {
        return eskulAttendance.filter(rec => {
            const schedule = eskulSchedules.find(s => s.id === rec.eskulScheduleId);
            const checkInDate = new Date(rec.checkInTime);
            const startDate = eskulFilter.startDate ? new Date(eskulFilter.startDate) : null;
            const endDate = eskulFilter.endDate ? new Date(eskulFilter.endDate) : null;
            if (startDate) startDate.setHours(0, 0, 0, 0);
            if (endDate) endDate.setHours(23, 59, 59, 999);

            return (
                (eskulFilter.pembinaId === '' || rec.pembinaId === eskulFilter.pembinaId) &&
                (eskulFilter.eskulId === '' || schedule?.eskulId === eskulFilter.eskulId) &&
                (!startDate || checkInDate >= startDate) &&
                (!endDate || checkInDate <= endDate)
            );
        });
    }, [eskulAttendance, eskulFilter, eskulSchedules]);

    const handleExport = (type: 'pdf' | 'excel') => {
        if (activeTab === 'kelas') {
            exportClassReport(type);
        } else {
            exportEskulReport(type);
        }
    };

    const exportClassReport = (type: 'pdf' | 'excel') => {
        const reportData = filteredAttendance.map((rec, index) => ({
            No: index + 1,
            Guru: getUserName(rec.teacherId),
            Kelas: getClassName(rec.classId),
            'Jam Ke': rec.lessonHour,
            Waktu: new Date(rec.scanTime).toLocaleString('id-ID'),
        }));

        if (type === 'excel') {
            const ws = XLSX.utils.json_to_sheet(reportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Laporan Absensi Kelas");
            XLSX.writeFile(wb, "laporan_absensi_kelas.xlsx");
        } else {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            doc.text("Laporan Absensi Kelas", 14, 16);
            doc.autoTable({
                startY: 20,
                head: [['No', 'Guru', 'Kelas', 'Jam Ke', 'Waktu']],
                body: reportData.map(Object.values),
            });
            doc.save("laporan_absensi_kelas.pdf");
        }
    };
    
    const exportEskulReport = (type: 'pdf' | 'excel') => {
        const reportData = filteredEskulAttendance.map((rec, index) => {
            const schedule = eskulSchedules.find(s => s.id === rec.eskulScheduleId);
            const checkIn = new Date(rec.checkInTime);
            const checkOut = rec.checkOutTime ? new Date(rec.checkOutTime) : null;
            let duration = 'N/A';
            if (checkOut) {
                const diffMs = checkOut.getTime() - checkIn.getTime();
                const hours = Math.floor(diffMs / 3600000);
                const minutes = Math.floor((diffMs % 3600000) / 60000);
                duration = `${hours} jam ${minutes} menit`;
            }
            return {
                No: index + 1,
                Pembina: getUserName(rec.pembinaId),
                Eskul: schedule ? getEskulName(schedule.eskulId) : 'N/A',
                Tanggal: checkIn.toLocaleDateString('id-ID'),
                'Jam Datang': checkIn.toLocaleTimeString('id-ID'),
                'Jam Pulang': checkOut ? checkOut.toLocaleTimeString('id-ID') : 'N/A',
                'Durasi': duration
            };
        });

        if (type === 'excel') {
            const ws = XLSX.utils.json_to_sheet(reportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Laporan Eskul");
            XLSX.writeFile(wb, "laporan_absensi_eskul.xlsx");
        } else {
             const { jsPDF } = window.jspdf;
             const doc = new jsPDF();
             doc.text("Laporan Absensi Ekstrakurikuler", 14, 16);
             doc.autoTable({
                 startY: 20,
                 head: [['No', 'Pembina', 'Eskul', 'Tanggal', 'Datang', 'Pulang', 'Durasi']],
                 body: reportData.map(Object.values),
             });
             doc.save("laporan_absensi_eskul.pdf");
        }
    };


    if (loading) return <Spinner />;

    const teachers = users.filter(u => u.role === UserRoleEnum.TEACHER);
    const pembinas = users.filter(u => u.role === UserRoleEnum.PEMBINA_ESKUL);

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h1 className="text-2xl font-bold mb-4">Laporan Absensi</h1>
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => setActiveTab('kelas')} className={`${activeTab === 'kelas' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                        Absensi Kelas
                    </button>
                    <button onClick={() => setActiveTab('eskul')} className={`${activeTab === 'eskul' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                        Absensi Ekstrakurikuler
                    </button>
                </nav>
            </div>

            {activeTab === 'kelas' ? (
                <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-4 p-4 border rounded-md">
                        <select value={filter.teacherId} onChange={e => setFilter({...filter, teacherId: e.target.value})} className="p-2 border rounded">
                            <option value="">Semua Guru</option>
                            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <select value={filter.classId} onChange={e => setFilter({...filter, classId: e.target.value})} className="p-2 border rounded">
                            <option value="">Semua Kelas</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <input type="date" value={filter.startDate} onChange={e => setFilter({...filter, startDate: e.target.value})} className="p-2 border rounded"/>
                        <input type="date" value={filter.endDate} onChange={e => setFilter({...filter, endDate: e.target.value})} className="p-2 border rounded"/>
                    </div>
                    <CrudTable
                        title="Laporan Absensi Kelas"
                        columns={['Guru', 'Kelas', 'Jam Ke', 'Waktu Absen', 'Foto']}
                        data={filteredAttendance}
                        renderRow={(rec: AttendanceRecord) => (
                            <tr key={rec.id} className="border-b">
                                <td className="p-3">{getUserName(rec.teacherId)}</td>
                                <td className="p-3">{getClassName(rec.classId)}</td>
                                <td className="p-3">{rec.lessonHour}</td>
                                <td className="p-3">{new Date(rec.scanTime).toLocaleString('id-ID')}</td>
                                <td className="p-3">-</td>
                            </tr>
                        )}
                    />
                </div>
            ) : (
                <div>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-4 p-4 border rounded-md">
                        <select value={eskulFilter.pembinaId} onChange={e => setEskulFilter({...eskulFilter, pembinaId: e.target.value})} className="p-2 border rounded">
                            <option value="">Semua Pembina</option>
                            {pembinas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <select value={eskulFilter.eskulId} onChange={e => setEskulFilter({...eskulFilter, eskulId: e.target.value})} className="p-2 border rounded">
                            <option value="">Semua Eskul</option>
                            {eskuls.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                        <input type="date" value={eskulFilter.startDate} onChange={e => setEskulFilter({...eskulFilter, startDate: e.target.value})} className="p-2 border rounded"/>
                        <input type="date" value={eskulFilter.endDate} onChange={e => setEskulFilter({...eskulFilter, endDate: e.target.value})} className="p-2 border rounded"/>
                    </div>
                    <CrudTable
                        title="Laporan Absensi Ekstrakurikuler"
                        columns={['Pembina', 'Eskul', 'Tanggal', 'Datang', 'Pulang', 'Durasi', 'Foto']}
                        data={filteredEskulAttendance}
                        renderRow={(rec: EskulAttendanceRecord) => {
                             const schedule = eskulSchedules.find(s => s.id === rec.eskulScheduleId);
                             const checkIn = new Date(rec.checkInTime);
                             const checkOut = rec.checkOutTime ? new Date(rec.checkOutTime) : null;
                             let duration = '-';
                             if (checkOut) {
                                 const diffMs = checkOut.getTime() - checkIn.getTime();
                                 const hours = Math.floor(diffMs / 3600000);
                                 const minutes = Math.floor((diffMs % 3600000) / 60000);
                                 duration = `${hours}j ${minutes}m`;
                             }
                             return (
                                 <tr key={rec.id} className="border-b">
                                     <td className="p-3">{getUserName(rec.pembinaId)}</td>
                                     <td className="p-3">{schedule ? getEskulName(schedule.eskulId) : 'N/A'}</td>
                                     <td className="p-3">{checkIn.toLocaleDateString('id-ID')}</td>
                                     <td className="p-3">{checkIn.toLocaleTimeString('id-ID')}</td>
                                     <td className="p-3">{checkOut ? checkOut.toLocaleTimeString('id-ID') : '-'}</td>
                                     <td className="p-3">{duration}</td>
                                     <td className="p-3 flex gap-2">
                                        {rec.checkInImageUrl && <img src={rec.checkInImageUrl} alt="datang" className="w-10 h-10 object-cover rounded"/>}
                                        {rec.checkOutImageUrl && <img src={rec.checkOutImageUrl} alt="pulang" className="w-10 h-10 object-cover rounded"/>}
                                     </td>
                                 </tr>
                             );
                        }}
                    />
                </div>
            )}

            <div className="mt-6 flex justify-end space-x-4">
                <button onClick={() => handleExport('pdf')} className="bg-red-500 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                    <DownloadIcon/> PDF
                </button>
                <button onClick={() => handleExport('excel')} className="bg-green-500 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                    <DownloadIcon/> Excel
                </button>
            </div>
        </div>
    );
};

const AIAssistant: React.FC = () => {
    const [query, setQuery] = useState('');
    const [response, setResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [analysisData, setAnalysisData] = useState<any>(null);

    useEffect(() => {
        // Pre-load data so it's ready when the user asks a question
        const fetchAllData = async () => {
            try {
                const [teachers, classes, schedules, attendance] = await Promise.all([
                    api.getUsersByRole(UserRoleEnum.TEACHER),
                    api.getClasses(),
                    api.getSchedules(),
                    api.getAttendanceRecords(),
                ]);
                setAnalysisData({ teachers, classes, schedules, attendance });
            } catch (err) {
                console.error("Failed to load data for AI Assistant:", err);
                setError("Gagal memuat data yang diperlukan untuk analisis.");
            }
        };
        fetchAllData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim() || !analysisData) return;

        setIsLoading(true);
        setResponse('');
        setError('');
        try {
            const result = await geminiApi.getAIAnalysis(analysisData, query);
            // Simple markdown-to-HTML
            const formattedResult = result
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/^- (.*)/gm, '<li class="ml-4 list-disc">$1</li>');
            setResponse(formattedResult);
        } catch (err: any) {
            setError(err.message || "Terjadi kesalahan yang tidak diketahui.");
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="bg-white p-6 rounded-lg shadow max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-2">Asisten AI Analisis Data</h1>
            <p className="text-gray-600 mb-6">Ajukan pertanyaan tentang data absensi, jadwal, dan guru. AI akan menganalisis dan memberikan jawaban berdasarkan data yang tersedia.</p>
            
            <form onSubmit={handleSubmit}>
                <div className="flex flex-col sm:flex-row gap-2">
                    <input 
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="Contoh: Siapa guru yang paling sering hadir minggu ini?"
                        disabled={isLoading || !analysisData}
                    />
                    <button 
                        type="submit" 
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-300"
                        disabled={isLoading || !analysisData}
                    >
                        {isLoading ? 'Menganalisis...' : 'Tanya'}
                    </button>
                </div>
                 {!analysisData && !error && <p className="text-sm text-gray-500 mt-2">Mempersiapkan data untuk analisis...</p>}
            </form>

            <div className="mt-8 min-h-[200px] bg-gray-50 p-4 rounded-lg border">
                {isLoading && <Spinner />}
                {error && <div className="text-red-500 font-semibold p-4">{error}</div>}
                {response && <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: response }} />}
                {!isLoading && !response && !error && (
                    <div className="text-center text-gray-500 pt-10">
                        <p>Jawaban dari AI akan muncul di sini.</p>
                    </div>
                )}
            </div>
        </div>
    );
};


// --- App Component ---

const App: React.FC = () => {
    const [user, setUser] = useState<any | null>(null);
    const [userProfile, setUserProfile] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = api.onAuthStateChanged((firebaseUser) => {
            setUser(firebaseUser);
            if (!firebaseUser) {
                // Not logged in
                setUserProfile(null);
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        let unsubscribeProfile: (() => void) | null = null;
        if (user) {
            // User is logged in, now fetch their profile from Firestore
            unsubscribeProfile = api.onUserProfileChange(user.uid, (profile) => {
                if (profile) {
                    setUserProfile(profile);
                } else {
                    // This can happen if the user exists in Auth but not in Firestore (e.g., deleted by admin)
                    console.error("User profile not found in Firestore. Logging out.");
                    api.signOut(); // Force logout
                }
                setLoading(false);
            });
        }
        return () => {
            if (unsubscribeProfile) {
                unsubscribeProfile();
            }
        };
    }, [user]);

    if (loading) {
        return <FullPageSpinner />;
    }

    if (!userProfile) {
        return <LoginPage onLoginSuccess={() => setLoading(true)} />;
    }

    switch (userProfile.role) {
        case UserRoleEnum.ADMIN:
            return <AdminDashboard user={userProfile} onLogout={api.signOut} />;
        case UserRoleEnum.TEACHER:
            return <TeacherDashboard user={userProfile} onLogout={api.signOut} />;
        case UserRoleEnum.PEMBINA_ESKUL:
            return <PembinaEskulDashboard user={userProfile} onLogout={api.signOut} />;
        default:
            return <div>Peran tidak diketahui. Hubungi admin. <button onClick={api.signOut}>Keluar</button></div>;
    }
};

// FIX: The `onLoginSuccess` prop must be destructured from the component's arguments.
const LoginPage: React.FC<{onLoginSuccess: () => void}> = ({ onLoginSuccess }) => {
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState<UserRole>(UserRoleEnum.TEACHER);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            if (isRegister) {
                await api.signUp(email, password, name, role);
                setSuccess('Pendaftaran berhasil! Silakan login.');
                setIsRegister(false);
            } else {
                await api.signIn(email, password);
                // The onAuthStateChanged listener in App component will handle the redirect.
                onLoginSuccess();
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await api.sendPasswordResetEmail(resetEmail);
            setSuccess(`Email pemulihan telah dikirim ke ${resetEmail}.`);
            setIsResetModalOpen(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
      <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 space-y-6">
          <div className="text-center">
            <img src="/smpn-13-tasikmalaya.svg" alt="Logo" className="w-20 h-20 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-800">HadirKu</h1>
            <p className="text-gray-500">Sistem Absensi Guru & Pembina</p>
          </div>

          {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md"><p>{error}</p></div>}
          {success && <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-md"><p>{success}</p></div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                 <div>
                  <label className="block mb-1 font-medium text-gray-700">Nama Lengkap</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full p-3 border rounded-lg" />
                </div>
                 <div>
                  <label className="block mb-1 font-medium text-gray-700">Peran</label>
                  <select value={role} onChange={e => setRole(e.target.value as UserRole)} className="w-full p-3 border rounded-lg bg-white">
                    <option value={UserRoleEnum.TEACHER}>Guru</option>
                    <option value={UserRoleEnum.PEMBINA_ESKUL}>Pembina Eskul</option>
                    <option value={UserRoleEnum.ADMIN}>Admin</option>
                  </select>
                </div>
              </>
            )}
             <div>
              <label className="block mb-1 font-medium text-gray-700">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full p-3 border rounded-lg" />
            </div>
             <div>
              <label className="block mb-1 font-medium text-gray-700">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full p-3 border rounded-lg" />
            </div>
            
            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400">
              {loading ? 'Memproses...' : (isRegister ? 'Daftar' : 'Login')}
            </button>
          </form>

          <div className="text-center text-sm">
            <p className="text-gray-600">
              {isRegister ? 'Sudah punya akun?' : 'Belum punya akun?'}
              <button onClick={() => { setIsRegister(!isRegister); setError(''); setSuccess(''); }} className="font-semibold text-blue-600 hover:underline ml-1">
                {isRegister ? 'Login' : 'Daftar'}
              </button>
            </p>
            {!isRegister && (
                <p className="mt-2">
                    <button onClick={() => setIsResetModalOpen(true)} className="text-sm text-gray-500 hover:underline">Lupa Password?</button>
                </p>
            )}
          </div>
        </div>
        <Modal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} title="Reset Password">
                <form onSubmit={handlePasswordReset}>
                    <p className="mb-4 text-gray-600">Masukkan email Anda untuk menerima link reset password.</p>
                    <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required className="w-full p-2 border rounded" placeholder="Email Anda"/>
                    <button type="submit" disabled={loading} className="w-full mt-4 bg-blue-500 text-white py-2 rounded-lg">
                        {loading ? 'Mengirim...' : 'Kirim Email Pemulihan'}
                    </button>
                </form>
            </Modal>
      </div>
    );
};

export default App;