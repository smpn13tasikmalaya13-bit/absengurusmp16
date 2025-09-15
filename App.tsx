

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { QRCodeCanvas as QRCode } from 'qrcode.react';
import type { User, Class, Schedule, AttendanceRecord, UserRole, Message } from './types';
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
    const [view, setView] = useState<'dashboard' | 'scan'>('dashboard');
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    const { isWithinRadius } = useGeolocation();

    const [isLessonHourModalOpen, setIsLessonHourModalOpen] = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
    const [selectedLessonHour, setSelectedLessonHour] = useState<number | null>(null);

    const unreadMessagesCount = useMemo(() => messages.filter(m => !m.isRead).length, [messages]);

    const fetchData = useCallback(async () => {
        setLoadingData(true);
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
        
        setLoadingData(false);
    }, [user.id]);

    useEffect(() => {
        fetchData();
        const unsubscribeMessages = api.onMessagesReceived(user.id, setMessages);
        return () => unsubscribeMessages();
    }, [fetchData, user.id]);

    const handleOpenMessageModal = () => {
        setIsMessageModalOpen(true);
        const unreadIds = messages.filter(m => !m.isRead).map(m => m.id);
        if (unreadIds.length > 0) {
            api.markMessagesAsRead(unreadIds);
        }
    };

    const userSchedules = useMemo(() => schedules.filter(s => s.teacherId === user.id), [schedules, user.id]);

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

    const getClassName = useCallback((classId: string) => classes.find(c => c.id === classId)?.name || 'N/A', [classes]);

    const recordAttendance = async (classId: string, lessonHour: number) => {
        const now = new Date();
        if (!lessonHour) {
            alert("Jam pelajaran tidak valid.");
            return;
        }

        // Validate if scan is within the allowed time
        const todayName = now.toLocaleDateString('en-US', { weekday: 'long' }) as Schedule['day'];
        const schedule = schedules.find(s => 
            s.teacherId === user.id && 
            s.classId === classId && 
            s.day === todayName && 
            s.lessonHour === lessonHour
        );

        if (schedule && schedule.endTime) {
            const [endHour, endMinute] = schedule.endTime.split(':').map(Number);
            const endTime = new Date(now);
            endTime.setHours(endHour, endMinute, 0, 0);

            if (now > endTime) {
                alert('Waktu untuk absensi jam pelajaran ini sudah berakhir.');
                setView('dashboard');
                setSelectedLessonHour(null);
                return;
            }
        }

        const hasScanned = await api.checkIfAlreadyScanned(user.id, classId, lessonHour);
        if (hasScanned) {
            alert('Anda sudah absen untuk jam pelajaran ini.');
            setView('dashboard');
            setSelectedLessonHour(null);
            return;
        }

        const newRecord: Omit<AttendanceRecord, 'id'> = {
            teacherId: user.id, classId, lessonHour, scanTime: now.toISOString(),
        };
        await api.addAttendanceRecord(newRecord);
        alert('Absensi berhasil!');
        await fetchData();
        setView('dashboard');
        setSelectedLessonHour(null);
    };

    const handleProceedToScan = () => {
        if (!selectedLessonHour) {
            alert('Silakan pilih jam pelajaran terlebih dahulu.');
            return;
        }
        setIsLessonHourModalOpen(false);
        setView('scan');
    };
    
    const handleScanCancel = () => {
        setView('dashboard');
        setSelectedLessonHour(null);
    };

    if (loadingData) {
        return <FullPageSpinner />;
    }
    
    if (view === 'scan' && selectedLessonHour) {
        return <QRScanner onScanSuccess={(classId) => recordAttendance(classId, selectedLessonHour)} onCancel={handleScanCancel} />;
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
                        <span>Logout</span>
                    </button>
                </div>
            </header>

            <main className="p-4 md:p-6 space-y-6">
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

                {/* Action Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <button onClick={() => setIsLessonHourModalOpen(true)} disabled={!isWithinRadius} className="bg-white p-8 rounded-lg shadow-sm text-center hover:shadow-md transition-shadow disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-sm group flex flex-col items-center justify-center gap-4 border border-gray-200">
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
            
            <Modal isOpen={isLessonHourModalOpen} onClose={() => setIsLessonHourModalOpen(false)} title="Pilih Jam Pelajaran">
                <div>
                    <div className="mb-4">
                        <label htmlFor="lessonHourSelect" className="block mb-2 text-sm font-medium text-gray-900">Pilih jam ke berapa Anda mengajar:</label>
                        <select
                            id="lessonHourSelect"
                            value={selectedLessonHour || ''}
                            onChange={(e) => setSelectedLessonHour(e.target.value ? parseInt(e.target.value, 10) : null)}
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                        >
                            <option value="">-- Pilih Jam --</option>
                            {LESSON_HOURS.map(hour => <option key={hour} value={hour}>{hour}</option>)}
                        </select>
                    </div>
                    <div className="flex justify-end gap-2">
                         <button onClick={() => setIsLessonHourModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Batal</button>
                        <button onClick={handleProceedToScan} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Lanjutkan ke Scan</button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} title="Kelola Jadwal Mengajar">
                <TeacherScheduleManager user={user} schedules={userSchedules} onScheduleUpdate={fetchData} classes={classes}/>
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
                                    Dari: {msg.senderName} - {new Date(msg.timestamp).toLocaleString('id-ID')}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </Modal>
        </div>
    );
};

const QRScanner: React.FC<{ onScanSuccess: (decodedText: string) => void; onCancel: () => void; }> = ({ onScanSuccess, onCancel }) => {
    const scannerRef = useRef<any | null>(null);

    useEffect(() => {
        const qrScanner = new Html5Qrcode("qr-reader");
        scannerRef.current = qrScanner;

        const startScanner = async () => {
            try {
                await qrScanner.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 }
                    },
                    (decodedText: string, decodedResult: any) => {
                        try {
                            const data = JSON.parse(decodedText);
                            if (data.type === 'attendance' && data.classId) {
                                onScanSuccess(data.classId);
                                qrScanner.stop();
                            } else {
                                alert("QR Code tidak valid.");
                            }
                        } catch (e) {
                            alert("Format QR Code salah.");
                        }
                    },
                    (errorMessage: string) => {
                        // handle scan error
                    }
                );
            } catch (err) {
                console.error("Gagal memulai scanner", err);
                alert("Tidak dapat mengakses kamera. Pastikan Anda telah memberikan izin.");
            }
        };

        startScanner();

        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch((err: any) => console.error("Gagal menghentikan scanner", err));
            }
        };
    }, [onScanSuccess]);

    return (
        <div className="max-w-md mx-auto bg-white p-4 rounded-lg shadow-lg">
            <h2 className="text-center font-bold text-lg mb-2">Arahkan kamera ke QR Code Kelas</h2>
            <div id="qr-reader" className="w-full"></div>
            <button onClick={onCancel} className="mt-4 w-full bg-gray-300 py-2 rounded-lg hover:bg-gray-400">Batal</button>
        </div>
    );
};


const TeacherScheduleManager: React.FC<{user: User, schedules: Schedule[], onScheduleUpdate: () => Promise<void>, classes: Class[]}> = ({ user, schedules, onScheduleUpdate, classes }) => {
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
            await api.deleteSchedule(id);
            await onScheduleUpdate();
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
                    <span>Admin Panel</span>
                    <button className="md:hidden text-gray-400 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <nav className="flex-grow">
                    <a onClick={() => handleSetView('dashboard')} className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 cursor-pointer">Dashboard</a>
                    <a onClick={() => handleSetView('teachers')} className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 cursor-pointer">Data Guru</a>
                    <a onClick={() => handleSetView('admins')} className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 cursor-pointer">Data Admin</a>
                    <a onClick={() => handleSetView('classes')} className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 cursor-pointer">Data Kelas</a>
                    <a onClick={() => handleSetView('schedules')} className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 cursor-pointer">Jadwal Pelajaran</a>
                    <a onClick={() => handleSetView('reports')} className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 cursor-pointer">Laporan Absensi</a>
                    <a onClick={() => handleSetView('ai-assistant')} className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 cursor-pointer">AI Assistant</a>
                </nav>
                <div className="p-4 border-t border-gray-700">
                    <p>{user.name}</p>
                    <button onClick={onLogout} className="text-sm text-red-400 hover:text-red-300">Logout</button>
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
                    <h1 className="text-xl font-semibold capitalize">{view.replace(/([A-Z])/g, ' $1')}</h1>
                </header>

                {/* Page Content */}
                {view === 'dashboard' && <DashboardHome />}
                {view === 'teachers' && <TeacherManagement adminUser={user}/>}
                {view === 'admins' && <AdminManagement />}
                {view === 'classes' && <ClassManagement />}
                {view === 'schedules' && <ScheduleManagement />}
                {view === 'reports' && <AttendanceReport />}
                {view === 'ai-assistant' && <AIAssistant />}
            </main>
        </div>
    );
};


const DashboardHome: React.FC = () => {
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [teachers, setTeachers] = useState<User[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const [att, tch, cls] = await Promise.all([
                api.getAttendanceRecords(),
                api.getUsersByRole(UserRoleEnum.TEACHER),
                api.getClasses(),
            ]);
            setAttendance(att);
            setTeachers(tch);
            setClasses(cls);
            setLoading(false);
        };
        fetchData();
    }, [])

    const attendanceSummary = useMemo(() => {
        const today = new Date().toISOString().slice(0, 10);
        const todayAttendance = attendance.filter(rec => rec.scanTime.startsWith(today));
        const presentTeacherIds = new Set(todayAttendance.map(rec => rec.teacherId));
        return {
            present: presentTeacherIds.size,
            absent: teachers.length - presentTeacherIds.size,
        };
    }, [attendance, teachers]);
    
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

const SendMessageModal: React.FC<{ teacher: User; adminUser: User; onClose: () => void }> = ({ teacher, adminUser, onClose }) => {
    const [content, setContent] = useState('');
    const [isSending, setIsSending] = useState(false);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
        setIsSending(true);
        try {
            const newMessage: Omit<Message, 'id'> = {
                senderId: adminUser.id,
                senderName: adminUser.name,
                recipientId: teacher.id,
                content: content.trim(),
                timestamp: new Date().toISOString(),
                isRead: false,
            };
            await api.addMessage(newMessage);
            alert(`Pesan berhasil dikirim ke ${teacher.name}`);
            onClose();
        } catch (error: any) {
            alert(`Gagal mengirim pesan: ${error.message}`);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Kirim Pesan ke ${teacher.name}`}>
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

const TeacherManagement: React.FC<{ adminUser: User }> = ({ adminUser }) => {
    const [teachers, setTeachers] = useState<User[]>([]);
    const [messagingTeacher, setMessagingTeacher] = useState<User | null>(null);

    const fetchTeachers = async () => {
        setTeachers(await api.getUsersByRole(UserRoleEnum.TEACHER));
    };

    useEffect(() => {
        fetchTeachers();
    }, []);
    
    const handleDelete = async (id: string) => {
        if (window.confirm("Yakin ingin menghapus guru ini? Ini juga akan menghapus jadwal terkait.")) {
            await api.deleteUser(id);
            setTeachers(teachers.filter(t => t.id !== id));
        }
    };

    const handleResetDevice = async (id: string, name: string) => {
        if (window.confirm(`Yakin ingin mereset perangkat untuk guru "${name}"? Guru ini akan dapat login di perangkat baru setelahnya.`)) {
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
        <>
            <CrudTable
                title="Manajemen Guru"
                columns={['Nama', 'User ID (Email)', 'Aksi']}
                data={teachers}
                renderRow={(teacher: User) => (
                    <tr key={teacher.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{teacher.name}</td>
                        <td className="p-3">{teacher.userId}</td>
                        <td className="p-3 space-x-4">
                            <button onClick={() => setMessagingTeacher(teacher)} className="text-green-600 hover:underline">Kirim Pesan</button>
                            <button onClick={() => handleResetDevice(teacher.id, teacher.name)} className="text-blue-600 hover:underline">Reset Perangkat</button>
                            <button onClick={() => handleDelete(teacher.id)} className="text-red-600 hover:underline">Hapus</button>
                        </td>
                    </tr>
                )}
            />
            <div className="mt-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-lg">
                <p className="font-bold">Informasi Pendaftaran Guru</p>
                <p>Untuk menambahkan guru baru, mereka harus mendaftar melalui halaman login dengan memilih opsi 'Daftar' dan menggunakan peran 'Guru'.</p>
            </div>

            {messagingTeacher && (
                <SendMessageModal
                    teacher={messagingTeacher}
                    adminUser={adminUser}
                    onClose={() => setMessagingTeacher(null)}
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
                        <td className="p-3">
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
        </>
    );
};

const ScheduleManagement: React.FC = () => {
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [teachers, setTeachers] = useState<User[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<Partial<Schedule> | null>(null);

    const fetchData = async () => {
        const [s, c, t] = await Promise.all([
            api.getSchedules(),
            api.getClasses(),
            api.getUsersByRole(UserRoleEnum.TEACHER)
        ]);
        setSchedules(s);
        setClasses(c);
        setTeachers(t);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSchedule || !editingSchedule.teacherId || !editingSchedule.classId || !editingSchedule.day || !editingSchedule.lessonHour || !editingSchedule.startTime || !editingSchedule.endTime || !editingSchedule.subject) {
            alert("Harap isi semua kolom");
            return;
        }

        const scheduleData: Omit<Schedule, 'id'> = {
            teacherId: editingSchedule.teacherId,
            classId: editingSchedule.classId,
            subject: editingSchedule.subject,
            day: editingSchedule.day,
            lessonHour: editingSchedule.lessonHour,
            startTime: editingSchedule.startTime,
            endTime: editingSchedule.endTime
        };

        const result = editingSchedule.id
            ? await api.updateSchedule(editingSchedule.id, scheduleData)
            : await api.addSchedule(scheduleData);
        
        if (result.success) {
            setIsModalOpen(false);
            setEditingSchedule(null);
            fetchData();
        } else {
            alert(result.message);
        }
    };
    
    const handleDelete = async (id: string) => {
        if(window.confirm("Yakin ingin menghapus jadwal ini?")){
            await api.deleteSchedule(id);
            fetchData();
        }
    }
    
    const handleOpenModal = (schedule: Partial<Schedule> | null = null) => {
        setEditingSchedule(schedule || {startTime: '07:00', endTime: '08:00', subject: ''});
        setIsModalOpen(true);
    };

    const getTeacherName = (id: string) => teachers.find(t => t.id === id)?.name || 'N/A';
    const getClassName = (id: string) => classes.find(c => c.id === id)?.name || 'N/A';

    return (
        <>
            <CrudTable
                title="Manajemen Jadwal Pelajaran"
                columns={['Hari', 'Waktu', 'Guru', 'Mata Pelajaran', 'Kelas', 'Jam Ke', 'Aksi']}
                data={schedules}
                onAdd={() => handleOpenModal()}
                renderRow={(s: Schedule) => (
                    <tr key={s.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{HARI_TRANSLATION[s.day]}</td>
                        <td className="p-3">{s.startTime} - {s.endTime}</td>
                        <td className="p-3">{getTeacherName(s.teacherId)}</td>
                        <td className="p-3">{s.subject}</td>
                        <td className="p-3">{getClassName(s.classId)}</td>
                        <td className="p-3">{s.lessonHour}</td>
                        <td className="p-3 space-x-2">
                            <button onClick={() => handleOpenModal(s)} className="text-blue-600 hover:underline">Ubah</button>
                            <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:underline">Hapus</button>
                        </td>
                    </tr>
                )}
            />
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingSchedule?.id ? 'Ubah Jadwal' : 'Tambah Jadwal'}>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block mb-1">Guru</label>
                        <select value={editingSchedule?.teacherId || ''} onChange={e => setEditingSchedule({...editingSchedule, teacherId: e.target.value})} className="w-full p-2 border rounded">
                            <option value="">Pilih Guru</option>
                            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block mb-1">Mata Pelajaran</label>
                        <input type="text" value={editingSchedule?.subject || ''} onChange={e => setEditingSchedule({...editingSchedule, subject: e.target.value})} className="w-full p-2 border rounded" placeholder="Contoh: Sejarah Indonesia"/>
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
                         <select value={editingSchedule?.lessonHour || ''} onChange={e => setEditingSchedule({...editingSchedule, lessonHour: parseInt(e.target.value, 10)})} className="w-full p-2 border rounded">
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
                    <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded-lg">Simpan</button>
                </form>
            </Modal>
        </>
    );
};

const AttendanceReport: React.FC = () => {
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [teachers, setTeachers] = useState<User[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [filter, setFilter] = useState({ teacherId: '', classId: '', startDate: '', endDate: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const [att, tch, cls] = await Promise.all([
                api.getAttendanceRecords(),
                api.getUsersByRole(UserRoleEnum.TEACHER),
                api.getClasses(),
            ]);
            setAttendance(att);
            setTeachers(tch);
            setClasses(cls);
            setLoading(false);
        };
        fetchData();
    }, []);

    const filteredAttendance = useMemo(() => {
        return attendance.filter(rec => {
            const scanDate = new Date(rec.scanTime);
            const startDate = filter.startDate ? new Date(filter.startDate) : null;
            const endDate = filter.endDate ? new Date(filter.endDate) : null;
            if (startDate) startDate.setHours(0,0,0,0);
            if (endDate) endDate.setHours(23,59,59,999);
            
            return (
                (filter.teacherId ? rec.teacherId === filter.teacherId : true) &&
                (filter.classId ? rec.classId === filter.classId : true) &&
                (startDate ? scanDate >= startDate : true) &&
                (endDate ? scanDate <= endDate : true)
            );
        });
    }, [attendance, filter]);

    const getTeacherName = (id: string) => teachers.find(t => t.id === id)?.name || 'N/A';
    const getClassName = (id: string) => classes.find(c => c.id === id)?.name || 'N/A';
    
    const exportToPDF = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.text("Laporan Absensi Guru", 20, 10);
        
        const tableData = filteredAttendance.map(rec => [
            getTeacherName(rec.teacherId),
            getClassName(rec.classId),
            `Jam ke-${rec.lessonHour}`,
            new Date(rec.scanTime).toLocaleString('id-ID'),
        ]);
        
        doc.autoTable({
            head: [['Nama Guru', 'Kelas', 'Jam Pelajaran', 'Waktu Scan']],
            body: tableData,
            startY: 20,
        });

        doc.save('laporan_absensi.pdf');
    };

    const exportToExcel = () => {
        const worksheetData = filteredAttendance.map(rec => ({
            "Nama Guru": getTeacherName(rec.teacherId),
            "Kelas": getClassName(rec.classId),
            "Jam Pelajaran": `Jam ke-${rec.lessonHour}`,
            "Waktu Scan": new Date(rec.scanTime).toLocaleString('id-ID'),
        }));
        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Absensi");
        XLSX.writeFile(workbook, "Laporan_Absensi.xlsx");
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-4">Laporan Absensi</h2>
            
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 p-4 border rounded-lg">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Guru</label>
                    <select value={filter.teacherId} onChange={e => setFilter({...filter, teacherId: e.target.value})} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                        <option value="">Semua Guru</option>
                        {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Kelas</label>
                    <select value={filter.classId} onChange={e => setFilter({...filter, classId: e.target.value})} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                        <option value="">Semua Kelas</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Tanggal Mulai</label>
                    <input type="date" value={filter.startDate} onChange={e => setFilter({...filter, startDate: e.target.value})} className="mt-1 block w-full pl-3 pr-2 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Tanggal Selesai</label>
                    <input type="date" value={filter.endDate} onChange={e => setFilter({...filter, endDate: e.target.value})} className="mt-1 block w-full pl-3 pr-2 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md" />
                </div>
            </div>
            
            {/* Export Buttons */}
            <div className="flex justify-end gap-2 mb-4">
                <button onClick={exportToPDF} className="bg-red-500 text-white px-4 py-2 rounded-lg">Export PDF</button>
                <button onClick={exportToExcel} className="bg-green-500 text-white px-4 py-2 rounded-lg">Export Excel</button>
            </div>

            {/* Table */}
            {loading ? <Spinner/> : (
                <CrudTable
                    title=""
                    columns={['Guru', 'Kelas', 'Jam Ke', 'Waktu Scan']}
                    data={filteredAttendance}
                    renderRow={(rec: AttendanceRecord) => (
                         <tr key={rec.id} className="border-b hover:bg-gray-50">
                            <td className="p-3">{getTeacherName(rec.teacherId)}</td>
                            <td className="p-3">{getClassName(rec.classId)}</td>
                            <td className="p-3">{rec.lessonHour}</td>
                            <td className="p-3">{new Date(rec.scanTime).toLocaleString('id-ID')}</td>
                        </tr>
                    )}
                />
            )}

        </div>
    );
};


const AIAssistant: React.FC = () => {
    const [query, setQuery] = useState('');
    const [response, setResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleQuery = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        setError('');
        setResponse('');

        try {
            const [teachers, classes, schedules, attendance] = await Promise.all([
                api.getUsersByRole(UserRoleEnum.TEACHER),
                api.getClasses(),
                api.getSchedules(),
                api.getAttendanceRecords()
            ]);

            const analysis = await geminiApi.getAIAnalysis({ teachers, classes, schedules, attendance }, query);
            setResponse(analysis);

        } catch (err: any) {
            console.error("Error fetching data or getting AI analysis:", err);
            setError(`Terjadi kesalahan: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">AI Assistant Analisis Absensi</h2>
            <p className="text-gray-600 mb-6">Ajukan pertanyaan tentang data absensi, jadwal, atau guru, dan AI akan membantu Anda menganalisisnya. Contoh: "Siapa guru yang paling sering hadir minggu ini?", "Buat ringkasan absensi untuk kelas VII A hari ini", atau "Berapa total jam mengajar Budi?".</p>
            
            <form onSubmit={handleQuery}>
                <div className="flex gap-2">
                    <input 
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Ketik pertanyaan Anda di sini..."
                        className="flex-grow p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        disabled={isLoading}
                    />
                    <button 
                        type="submit"
                        className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Memproses...' : 'Tanya'}
                    </button>
                </div>
            </form>

            {error && <div className="mt-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded-lg">{error}</div>}

            {isLoading && (
                 <div className="mt-6 text-center">
                    <Spinner />
                    <p className="text-gray-500 mt-2">AI sedang berpikir...</p>
                 </div>
            )}
            
            {response && (
                <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                    <h3 className="font-bold text-lg mb-2">Jawaban AI:</h3>
                    <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: response.replace(/\n/g, '<br />') }}></div>
                </div>
            )}
        </div>
    );
};

// --- Branding Component ---
const SabarLogo = () => (
    <div className="text-center">
        <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight">SABAR</h1>
        <p className="text-md text-gray-500">Sistem Absensi Berbasis QR</p>
    </div>
);


// --- Main App Component ---

const App: React.FC = () => {
    const [user, setUser] = useState<any | null>(null);
    const [userProfile, setUserProfile] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [authView, setAuthView] = useState<'login' | 'register' | 'forgotPassword'>('login');
    const [authMessage, setAuthMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [installPromptEvent, setInstallPromptEvent] = useState<any | null>(null);
    const [isAppInstalled, setIsAppInstalled] = useState(false);

    useEffect(() => {
        // PWA install prompt logic
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setInstallPromptEvent(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Check if the app is already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsAppInstalled(true);
        }

        const unsubscribe = api.onAuthStateChanged(firebaseUser => {
            setUser(firebaseUser);
            if (!firebaseUser) {
                setLoading(false);
            }
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            unsubscribe();
        };
    }, []);

    useEffect(() => {
        let unsubscribeProfile: (() => void) | undefined;
        if (user) {
            unsubscribeProfile = api.onUserProfileChange(user.uid, profile => {
                setUserProfile(profile);
                setLoading(false);
            });
        } else {
             setUserProfile(null);
        }
        return () => {
            if (unsubscribeProfile) {
                unsubscribeProfile();
            }
        };
    }, [user]);

    const handleInstallClick = async () => {
        if (installPromptEvent) {
            installPromptEvent.prompt();
            const { outcome } = await installPromptEvent.userChoice;
            if (outcome === 'accepted') {
                console.log('User accepted the install prompt');
                setIsAppInstalled(true);
            } else {
                console.log('User dismissed the install prompt');
            }
            setInstallPromptEvent(null);
        }
    };

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const { email, password } = e.currentTarget.elements as any;
        setLoading(true);
        setAuthMessage(null);
        try {
            await api.signIn(email.value, password.value);
            // onAuthStateChanged will handle the rest
        } catch (error: any) {
            console.error("Login failed:", error.message);
            setAuthMessage({ type: 'error', text: error.message || "Email atau password salah."});
            setLoading(false);
        }
    };
    
    const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const { name, email, password, confirmPassword, role } = e.currentTarget.elements as any;
        if (password.value !== confirmPassword.value) {
            setAuthMessage({ type: 'error', text: "Password tidak cocok."});
            return;
        }
        setLoading(true);
        setAuthMessage(null);
        try {
            await api.signUp(email.value, password.value, name.value, role.value as UserRole);
        } catch (error: any) {
             console.error("Registration failed:", error.message);
            setAuthMessage({ type: 'error', text: error.message || "Gagal mendaftar."});
            setLoading(false);
        }
    }

    const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const { email } = e.currentTarget.elements as any;
        setLoading(true);
        setAuthMessage(null);
        try {
            await api.sendPasswordResetEmail(email.value);
            setAuthMessage({ type: 'success', text: 'Email untuk reset password telah dikirim. Silakan cek inbox Anda.' });
            setAuthView('login');
        } catch (error: any) {
            console.error("Forgot password failed:", error.message);
            setAuthMessage({ type: 'error', text: error.message || "Gagal mengirim email reset." });
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        setLoading(true);
        await api.signOut();
        // State will be cleared by onAuthStateChanged
    };

    if (loading) {
        return <FullPageSpinner />;
    }

    if (!user || !userProfile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 font-sans">
                <div className="max-w-md w-full bg-white p-10 rounded-xl shadow-lg space-y-6">
                     <SabarLogo />
                    
                    {authView === 'login' && (
                        <>
                            <h2 className="text-2xl font-bold text-center text-gray-800">Login</h2>
                            <form onSubmit={handleLogin} className="space-y-5">
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Email</label>
                                    <input name="email" type="email" required className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition"/>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-sm font-medium text-gray-700">Password</label>
                                        <button type="button" onClick={() => { setAuthView('forgotPassword'); setAuthMessage(null); }} className="text-sm text-blue-600 hover:underline focus:outline-none font-medium">
                                            Lupa Password?
                                        </button>
                                    </div>
                                    <input name="password" type="password" required className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition"/>
                                </div>
                                {authMessage && authMessage.type === 'error' && <p className="text-red-500 text-sm text-center">{authMessage.text}</p>}
                                <div className="pt-2">
                                  <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Login</button>
                                </div>
                                {installPromptEvent && !isAppInstalled && (
                                    <button
                                        type="button"
                                        onClick={handleInstallClick}
                                        className="w-full bg-green-600 text-white py-2.5 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                        aria-label="Install Aplikasi"
                                    >
                                        <DownloadIcon />
                                        Install Aplikasi
                                    </button>
                                )}
                            </form>
                        </>
                    )}

                    {authView === 'register' && (
                        <>
                             <h2 className="text-2xl font-bold text-center text-gray-800">Daftar Akun</h2>
                            <form onSubmit={handleRegister} className="space-y-4">
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Nama Lengkap</label>
                                    <input name="name" type="text" required className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition"/>
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Email</label>
                                    <input name="email" type="email" required className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition"/>
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Password</label>
                                    <input name="password" type="password" required className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition"/>
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Konfirmasi Password</label>
                                    <input name="confirmPassword" type="password" required className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition"/>
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Peran</label>
                                    <select name="role" defaultValue={UserRoleEnum.TEACHER} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
                                        <option value={UserRoleEnum.TEACHER}>Guru</option>
                                        <option value={UserRoleEnum.ADMIN}>Admin</option>
                                    </select>
                                </div>
                                {authMessage && authMessage.type === 'error' && <p className="text-red-500 text-sm text-center">{authMessage.text}</p>}
                                <div className="pt-2">
                                <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Daftar</button>
                                </div>
                            </form>
                        </>
                    )}

                    {authView === 'forgotPassword' && (
                        <>
                            <h2 className="text-2xl font-bold text-center text-gray-800">Lupa Password</h2>
                            <p className="text-sm text-gray-600 text-center">Masukkan email Anda untuk menerima link reset password.</p>
                             <form onSubmit={handleForgotPassword} className="space-y-5">
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">Email</label>
                                    <input name="email" type="email" required className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition"/>
                                </div>
                                {authMessage && authMessage.type === 'error' && <p className="text-red-500 text-sm text-center">{authMessage.text}</p>}
                                 <div className="pt-2">
                                <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Kirim Link Reset</button>
                                </div>
                            </form>
                        </>
                    )}

                    {authMessage && authMessage.type === 'success' && (
                        <p className="mt-4 text-green-600 bg-green-100 p-3 rounded-md text-sm text-center">{authMessage.text}</p>
                    )}
                    
                    <div className="text-center text-sm text-gray-600 pt-4">
                        {authView === 'login' && (
                            <>
                                Belum punya akun?
                                <button onClick={() => { setAuthView('register'); setAuthMessage(null); }} className="font-semibold text-blue-600 hover:underline ml-1 focus:outline-none">Daftar</button>
                            </>
                        )}
                        {authView === 'register' && (
                            <>
                                Sudah punya akun?
                                <button onClick={() => { setAuthView('login'); setAuthMessage(null); }} className="font-semibold text-blue-600 hover:underline ml-1 focus:outline-none">Login</button>
                            </>
                        )}
                        {authView === 'forgotPassword' && (
                            <>
                                Ingat password Anda?
                                <button onClick={() => { setAuthView('login'); setAuthMessage(null); }} className="font-semibold text-blue-600 hover:underline ml-1 focus:outline-none">Kembali ke Login</button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    if (userProfile.role === UserRoleEnum.ADMIN) {
        return <AdminDashboard user={userProfile} onLogout={handleLogout} />;
    }

    return <TeacherDashboard user={userProfile} onLogout={handleLogout} />;
};

export default App;