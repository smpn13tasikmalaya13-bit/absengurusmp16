// FIX: Corrected the import statement to include React hooks and fix syntax errors.
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { QRCodeCanvas as QRCode } from 'qrcode.react';
import type { User, Class, Schedule, AttendanceRecord, UserRole, Message, Eskul, EskulSchedule, EskulAttendanceRecord, AbsenceRecord, AbsenceStatus, StudentAbsenceRecord } from './types';
import { UserRole as UserRoleEnum, AbsenceStatus as AbsenceStatusEnum } from './types';
import { useGeolocation } from './hooks/useGeolocation';
import { CENTRAL_COORDINATES, MAX_RADIUS_METERS, DAYS_OF_WEEK, LESSON_HOURS, HARI_TRANSLATION } from './constants';
import * as api from './services/firebaseService';


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
const QrScanIcon = () => (<div className="w-12 h-12 flex items-center justify-center rounded-full bg-green-900 bg-opacity-50 text-green-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h-1m-1 6v-1M4 12H3m17 0h-1m-1-6V4M7 7V4m6 16v-1M7 17H4m16 0h-3m-1-6h-1m-4 0H8m12-1V7M4 7v3m0 4v3m3-13h1m4 0h1m-1 16h1m-4 0h1" /></svg></div>);
const ScheduleIcon = () => (<div className="w-12 h-12 flex items-center justify-center rounded-full bg-blue-900 bg-opacity-50 text-blue-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>);
const ReportIcon = () => (<div className="w-12 h-12 flex items-center justify-center rounded-full bg-yellow-900 bg-opacity-50 text-yellow-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>);
const UserRemoveIcon = () => (<div className="w-12 h-12 flex items-center justify-center rounded-full bg-orange-900 bg-opacity-50 text-orange-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a7 7 0 00-7 7h14a7 7 0 00-7-7zm8-4h-6" /></svg></div>);
const UsersEmptyIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.125-1.274-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.125-1.274.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>);
const QrCodeEmptyIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h-1m-1 6v-1M4 12H3m17 0h-1m-1-6V4M7 7V4m6 16v-1M7 17H4m16 0h-3m-1-6h-1m-4 0H8m12-1V7M4 7v3m0 4v3m3-13h1m4 0h1m-1 16h1m-4 0h1" /></svg>);
const CalendarEmptyIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>);
const LogoutIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>);
const MessageIcon = ({ hasUnread }: { hasUnread?: boolean }) => (
    <div className="relative">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        {hasUnread && <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-gray-800"></span>}
    </div>
);
const DownloadIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>);


// --- UI Components ---

const Spinner = () => (
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
);

const FullPageSpinner = () => (
    <div className="fixed inset-0 bg-gray-900 flex flex-col justify-center items-center z-50 p-4">
        {/* App Icon with pulse animation */}
        <div className="w-48 h-48 mb-8">
            <svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-pulse">
                <defs>
                    <linearGradient id="bg_gradient_loader" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#1e3a8a"/>
                        <stop offset="1" stopColor="#2563eb"/>
                    </linearGradient>
                    <linearGradient id="icon_gradient_loader" x1="128" y1="128" x2="384" y2="384" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#22d3ee"/>
                        <stop offset="1" stopColor="#a3e635"/>
                    </linearGradient>
                </defs>
                <rect width="512" height="512" rx="90" fill="url(#bg_gradient_loader)"/>
                <g>
                    {/* Left vertical bar of 'H' */}
                    <path d="M144 144 C144 126.34 158.34 112 176 112 H 192 C209.66 112 224 126.34 224 144 V 368 C224 385.66 209.66 400 192 400 H 176 C158.34 400 144 385.66 144 368 V 144 Z" fill="url(#icon_gradient_loader)"/>
                    {/* Right vertical bar of 'H', creatively shaped as a checkmark */}
                    <path d="M288 144 C288 126.34 302.34 112 320 112 H 336 C353.66 112 368 126.34 368 144 V 240 L 400 208 C 412.4 195.6 432.4 195.6 444.8 208 L 458.8 222 C 471.2 234.4 471.2 254.4 458.8 266.8 L 352 374 C 339.6 386.4 319.6 386.4 307.2 374 L 288 354.8 V 144 Z" fill="url(#icon_gradient_loader)"/>
                    {/* Center connecting bar, stylized */}
                    <rect x="224" y="240" width="64" height="32" rx="16" fill="url(#icon_gradient_loader)"/>
                </g>
            </svg>
        </div>

        {/* Loading Text */}
        <p className="text-xl text-gray-300">Memuat data...</p>

        {/* Copyright notice at the bottom */}
        <div className="absolute bottom-8 text-center w-full">
            <p className="text-gray-400 text-sm">© 2025 Rullp. All rights reserved.</p>
            <p className="text-gray-300 font-semibold mt-1">SMP Negeri 13 Tasikmalaya</p>
        </div>
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
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
            <div className="bg-gray-800 text-white rounded-lg shadow-xl w-full max-w-md border border-gray-700">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-xl font-semibold">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                </div>
                <div className="p-4">{children}</div>
            </div>
        </div>
    );
};

// --- Teacher Dashboard Components ---
const AbsenceReportModal: React.FC<{
    user: User;
    onClose: () => void;
    onSuccess: () => void;
}> = ({ user, onClose, onSuccess }) => {
    const [status, setStatus] = useState<AbsenceStatus>(AbsenceStatusEnum.SAKIT);
    const [reason, setReason] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await api.addOrUpdateAbsenceRecord({
                teacherId: user.id,
                date: new Date().toISOString().slice(0, 10),
                status,
                reason: reason.trim(),
            });
            alert('Laporan ketidakhadiran berhasil disimpan.');
            onSuccess();
        } catch (error: any) {
            console.error('Failed to save absence report:', error);
            alert(`Gagal menyimpan laporan: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Lapor Ketidakhadiran Hari Ini">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block mb-1 text-gray-300">Status Kehadiran</label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as AbsenceStatus)}
                        className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white"
                    >
                        <option value={AbsenceStatusEnum.SAKIT}>Sakit</option>
                        <option value={AbsenceStatusEnum.IZIN}>Izin</option>
                        <option value={AbsenceStatusEnum.TUGAS_LUAR}>Tugas Luar</option>
                    </select>
                </div>
                <div>
                    <label className="block mb-1 text-gray-300">Keterangan (Opsional)</label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={3}
                        className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white"
                        placeholder="Contoh: Mengikuti Rapat Dinas"
                    />
                </div>
                <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 rounded-lg flex justify-center items-center transition duration-150 disabled:bg-blue-800 hover:bg-blue-700"
                    disabled={isSaving}
                >
                    {isSaving ? 'Menyimpan...' : 'Kirim Laporan'}
                </button>
            </form>
        </Modal>
    );
};

const StudentAbsenceModal: React.FC<{
    user: User;
    onClose: () => void;
    onSuccess: () => void;
    classes: Class[];
    todaySchedules: Schedule[];
}> = ({ user, onClose, onSuccess, classes, todaySchedules }) => {
    const [scheduleId, setScheduleId] = useState('');
    const [students, setStudents] = useState([{ id: Date.now(), name: '', reason: '' }]);
    const [isSaving, setIsSaving] = useState(false);

    const getClassName = (classId: string) => classes.find(c => c.id === classId)?.name || 'N/A';

    const handleAddStudent = () => {
        setStudents([...students, { id: Date.now(), name: '', reason: '' }]);
    };

    const handleStudentChange = (id: number, field: 'name' | 'reason', value: string) => {
        setStudents(students.map(student => student.id === id ? { ...student, [field]: value } : student));
    };

    const handleRemoveStudent = (id: number) => {
        setStudents(students.filter(student => student.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const selectedSchedule = todaySchedules.find(s => s.id === scheduleId);
        if (!selectedSchedule) {
            alert('Harap pilih jadwal pelajaran terlebih dahulu.');
            return;
        }

        const validStudents = students.filter(s => s.name.trim() !== '' && s.reason.trim() !== '');

        if (validStudents.length === 0) {
            alert('Harap isi data siswa yang tidak hadir.');
            return;
        }

        setIsSaving(true);
        try {
            const recordsToSave: Omit<StudentAbsenceRecord, 'id'>[] = validStudents.map(student => ({
                teacherId: user.id,
                teacherName: user.name,
                classId: selectedSchedule.classId,
                lessonHour: selectedSchedule.lessonHour,
                studentName: student.name.trim(),
                reason: student.reason.trim(),
                date: new Date().toISOString().slice(0, 10),
                timestamp: new Date().toISOString(),
            }));

            const result = await api.addMultipleStudentAbsenceRecords(recordsToSave);

            if (result.success) {
                alert('Laporan siswa absen berhasil disimpan.');
                onSuccess();
            } else {
                alert(result.message);
            }
        } catch (error: any) {
            console.error('Failed to save student absence report:', error);
            alert(`Terjadi kesalahan tak terduga: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Lapor Siswa Tidak Hadir">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block mb-1 text-gray-300">Jadwal Pelajaran</label>
                    <select
                        value={scheduleId}
                        onChange={(e) => setScheduleId(e.target.value)}
                        className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white"
                        required
                    >
                        <option value="">Pilih Jadwal</option>
                        {todaySchedules.map(s => (
                            <option key={s.id} value={s.id}>
                                {s.subject} - {getClassName(s.classId)} (Jam ke-{s.lessonHour})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {students.map((student, index) => (
                        <div key={student.id} className="p-3 bg-gray-700 rounded-lg border border-gray-600 space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="block text-sm font-medium text-gray-300">Siswa #{index + 1}</label>
                                {students.length > 1 && (
                                    <button type="button" onClick={() => handleRemoveStudent(student.id)} className="text-red-400 hover:text-red-300 text-xs font-semibold">Hapus</button>
                                )}
                            </div>
                            <input
                                type="text"
                                value={student.name}
                                onChange={(e) => handleStudentChange(student.id, 'name', e.target.value)}
                                className="w-full p-2 border border-gray-600 rounded bg-gray-800 text-white"
                                placeholder="Nama Siswa"
                                required
                            />
                            <textarea
                                value={student.reason}
                                onChange={(e) => handleStudentChange(student.id, 'reason', e.target.value)}
                                rows={2}
                                className="w-full p-2 border border-gray-600 rounded bg-gray-800 text-white"
                                placeholder="Keterangan (Sakit, Izin, Alpa)"
                                required
                            />
                        </div>
                    ))}
                </div>
                
                <button type="button" onClick={handleAddStudent} className="w-full border-2 border-dashed border-gray-600 text-gray-400 py-2 rounded-lg hover:bg-gray-700 hover:text-white transition">
                    + Tambah Siswa
                </button>

                <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 rounded-lg flex justify-center items-center transition duration-150 disabled:bg-blue-800 hover:bg-blue-700"
                    disabled={isSaving}
                >
                    {isSaving ? 'Menyimpan...' : 'Simpan Laporan'}
                </button>
            </form>
        </Modal>
    );
};

const TeacherDashboard: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [todaysAbsence, setTodaysAbsence] = useState<AbsenceRecord | null>(null);
    const [studentAbsences, setStudentAbsences] = useState<StudentAbsenceRecord[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [scanResult, setScanResult] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const { isWithinRadius } = useGeolocation();

    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
    const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
    const [isStudentAbsenceModalOpen, setIsStudentAbsenceModalOpen] = useState(false);

    const unreadMessagesCount = useMemo(() => messages.filter(m => !m.isRead).length, [messages]);

    const getClassName = useCallback((classId: string) => classes.find(c => c.id === classId)?.name || 'N/A', [classes]);

    const fetchData = useCallback(async () => {
        setLoadingData(true);
        const todayString = new Date().toISOString().slice(0, 10);
        const results = await Promise.allSettled([
            api.getClasses(),
            api.getSchedules(),
            api.getAttendanceRecordsForTeacher(user.id),
            api.getAbsenceRecordForTeacherOnDate(user.id, todayString),
            api.getStudentAbsenceRecordsForTeacherOnDate(user.id, todayString)
        ]);

        const [classesResult, schedulesResult, attendanceResult, absenceResult, studentAbsenceResult] = results;

        if (classesResult.status === 'fulfilled') setClasses(classesResult.value);
        else console.error("Gagal memuat kelas:", classesResult.reason);

        if (schedulesResult.status === 'fulfilled') setSchedules(schedulesResult.value);
        else console.error("Gagal memuat jadwal:", schedulesResult.reason);

        if (attendanceResult.status === 'fulfilled') setAttendance(attendanceResult.value);
        else console.error("Gagal memuat absensi:", attendanceResult.reason);

        if (absenceResult.status === 'fulfilled') setTodaysAbsence(absenceResult.value);
        else console.error("Gagal memuat laporan absen:", absenceResult.reason);
        
        if (studentAbsenceResult.status === 'fulfilled') setStudentAbsences(studentAbsenceResult.value);
        else console.error("Gagal memuat laporan siswa absen:", studentAbsenceResult.reason);

        setLoadingData(false);
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
            await fetchData();
        } catch (error: any) {
            console.error("Gagal menghapus jadwal:", error);
            alert(`Terjadi kesalahan: ${error.message}`);
        }
    };

    const handleScanSuccess = async (qrData: string) => {
        setIsScanning(false); 
    
        if (todaysAbsence) {
            setScanResult({ type: 'error', message: `Anda tidak dapat absen karena telah melaporkan '${todaysAbsence.status}' hari ini.` });
            return;
        }

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
    
        const activeSchedules = userSchedules.filter(s => {
            if (s.classId !== classId || s.day !== todayName || !s.startTime || !s.endTime) return false;
            
            const [startHour, startMinute] = s.startTime.split(':').map(Number);
            const startTime = new Date(now);
            startTime.setHours(startHour, startMinute, 0, 0);
    
            const [endHour, endMinute] = s.endTime.split(':').map(Number);
            const endTime = new Date(now);
            endTime.setHours(endHour, endMinute, 0, 0);
            
            const leewayMilliseconds = 15 * 60 * 1000;
    
            return now.getTime() >= (startTime.getTime() - leewayMilliseconds) && now.getTime() <= endTime.getTime();
        });
    
        if (activeSchedules.length === 0) {
            setScanResult({ type: 'error', message: `Tidak ada jadwal mengajar yang aktif saat ini untuk kelas ${getClassName(classId)}.` });
            return;
        }
    
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayScannedLessonHours = new Set(
            attendance
                .filter(rec => new Date(rec.scanTime) >= today)
                .map(rec => `${rec.classId}-${rec.lessonHour}`)
        );
    
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
            await fetchData();
            setScanResult({ type: 'success', message: `Absensi berhasil: Kelas ${getClassName(classId)} (Jam ke-${scheduleToScan.lessonHour}).` });
        } catch (error: any) {
            setScanResult({ type: 'error', message: `Gagal menyimpan absensi: ${error.message}` });
        }
    };

    const attendanceStats = useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const dayOfWeek = now.getDay();
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
      <div className="bg-gray-900 text-white min-h-screen font-sans">
            <header className="bg-gray-800 p-4 flex justify-between items-center shadow-md">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white">Dashboard Guru</h1>
                    <p className="text-sm text-gray-400">Selamat datang, {user.name}</p>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={handleOpenMessageModal} className="text-gray-300 hover:text-white transition-colors">
                        <MessageIcon hasUnread={unreadMessagesCount > 0} />
                    </button>
                    <button onClick={onLogout} className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white transition-colors px-4 py-2 rounded-md border border-gray-600 hover:border-gray-500">
                        <LogoutIcon />
                        <span>Keluar</span>
                    </button>
                </div>
            </header>

            <main className="p-4 md:p-6 space-y-6">
                {scanResult && (
                    <div className={`p-4 rounded-md mb-6 shadow-lg ${scanResult.type === 'success' ? 'bg-green-900 bg-opacity-50 text-green-300 border border-green-700' : 'bg-red-900 bg-opacity-50 text-red-300 border border-red-700'}`}>
                        <p className="font-medium">{scanResult.type === 'success' ? 'Berhasil!' : 'Gagal'}</p>
                        <p className="text-sm">{scanResult.message}</p>
                    </div>
                )}
                
                {/* Action Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                     <button onClick={() => setIsScanning(true)} disabled={!isWithinRadius || !!todaysAbsence} className="bg-gray-800 p-8 rounded-lg shadow-md text-center hover:bg-gray-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-gray-800 group flex flex-col items-center justify-center gap-4 border border-gray-700">
                        <QrScanIcon />
                        <div>
                            <h3 className="text-lg font-bold text-white group-disabled:text-gray-500">Scan QR Code</h3>
                            <p className="text-gray-400 text-sm mt-1">Scan QR Code kelas untuk absensi</p>
                            {!isWithinRadius && <p className="text-xs text-red-500 mt-1">Anda berada di luar radius sekolah.</p>}
                            {todaysAbsence && <p className="text-xs text-yellow-500 mt-1">Absensi nonaktif karena Anda melaporkan '{todaysAbsence.status}'.</p>}
                        </div>
                    </button>
                     <button onClick={() => setIsScheduleModalOpen(true)} className="bg-gray-800 p-8 rounded-lg shadow-md text-center hover:bg-gray-700 transition-colors flex flex-col items-center justify-center gap-4 border border-gray-700">
                        <ScheduleIcon />
                        <div>
                            <h3 className="text-lg font-bold text-white">Jadwal Mengajar</h3>
                            <p className="text-gray-400 text-sm mt-1">Lihat dan kelola jadwal mengajar Anda</p>
                        </div>
                    </button>
                     <button onClick={() => setIsAbsenceModalOpen(true)} disabled={!!todaysAbsence} className="bg-gray-800 p-8 rounded-lg shadow-md text-center hover:bg-gray-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-gray-800 group flex flex-col items-center justify-center gap-4 border border-gray-700">
                        <ReportIcon />
                        <div>
                            <h3 className="text-lg font-bold text-white group-disabled:text-gray-500">{todaysAbsence ? `Status Hari Ini: ${todaysAbsence.status}` : 'Lapor Ketidakhadiran'}</h3>
                            <p className="text-gray-400 text-sm mt-1">{todaysAbsence ? 'Laporan Anda sudah tersimpan' : 'Laporkan jika tidak dapat hadir hari ini'}</p>
                        </div>
                    </button>
                    <button 
                        onClick={() => setIsStudentAbsenceModalOpen(true)} 
                        disabled={todaySchedules.length === 0}
                        className="bg-gray-800 p-8 rounded-lg shadow-md text-center hover:bg-gray-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-gray-800 group flex flex-col items-center justify-center gap-4 border border-gray-700"
                    >
                        <UserRemoveIcon />
                        <div>
                            <h3 className="text-lg font-bold text-white group-disabled:text-gray-500">Lapor Siswa Absen</h3>
                            <p className="text-gray-400 text-sm mt-1">Input siswa yang tidak hadir hari ini</p>
                            {todaySchedules.length === 0 && <p className="text-xs text-yellow-500 mt-1">Tidak ada jadwal hari ini.</p>}
                        </div>
                    </button>
                </div>
                
                {/* Top Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700">
                        <div className="flex justify-between items-center mb-1">
                             <p className="font-semibold text-gray-300">Absensi Hari Ini</p>
                            <div className="text-gray-500"><CalendarIcon /></div>
                        </div>
                        <p className="text-3xl font-bold text-white">{attendanceStats.today}</p>
                        <p className="text-xs text-gray-400">Jam pelajaran yang sudah diabsen</p>
                    </div>
                    <div className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700">
                         <div className="flex justify-between items-center mb-1">
                            <p className="font-semibold text-gray-300">Minggu Ini</p>
                            <div className="text-gray-500"><ClockIcon /></div>
                        </div>
                        <p className="text-3xl font-bold text-white">{attendanceStats.week}</p>
                        <p className="text-xs text-gray-400">Total absensi minggu ini</p>
                    </div>
                    <div className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700">
                        <div className="flex justify-between items-center mb-1">
                            <p className="font-semibold text-gray-300">Total Absensi</p>
                            <div className="text-gray-500"><UserIcon /></div>
                        </div>
                        <p className="text-3xl font-bold text-white">{attendanceStats.total}</p>
                        <p className="text-xs text-gray-400">Semua absensi Anda</p>
                    </div>
                </div>

                {/* Data Display Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700">
                        <h3 className="font-bold text-lg">Riwayat Absensi Terbaru</h3>
                        <p className="text-sm text-gray-400 mb-4">10 absensi terakhir Anda</p>
                        <div className="space-y-3">
                            {attendance.length === 0 ? (
                                <div className="text-center py-10 text-gray-500">
                                    <QrCodeEmptyIcon />
                                    <p className="font-semibold mt-2 text-gray-300">Belum ada riwayat absensi</p>
                                    <p className="text-sm">Scan QR Code kelas untuk mulai absensi</p>
                                </div>
                            ) : (
                                attendance.slice(0, 10).map(rec => (
                                    <div key={rec.id} className="border-b border-gray-700 last:border-b-0 pb-3 pt-2">
                                        <p className="font-semibold">Kelas {getClassName(rec.classId)} - Jam ke-{rec.lessonHour}</p>
                                        <p className="text-sm text-gray-400">{new Date(rec.scanTime).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                     <div className="bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700">
                        <h3 className="font-bold text-lg">Jadwal Hari Ini</h3>
                        <p className="text-sm text-gray-400 mb-4">Jadwal mengajar Anda hari ini</p>
                         <div className="space-y-3">
                            {todaySchedules.length === 0 ? (
                                <div className="text-center py-10 text-gray-500">
                                    <CalendarEmptyIcon />
                                    <p className="font-semibold mt-2 text-gray-300">Belum ada jadwal mengajar</p>
                                    <p className="text-sm">Hubungi admin untuk mengatur jadwal</p>
                                </div>
                            ) : (
                                todaySchedules.map(s => (
                                    <div key={s.id} className="bg-gray-700 p-4 rounded-lg flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold text-white">{s.subject}</p>
                                            <p className="text-sm text-gray-400">{getClassName(s.classId)}</p>
                                        </div>
                                        <span className="text-sm font-medium text-gray-300">{s.startTime} - {s.endTime}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    <div className="bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700 lg:col-span-2">
                        <h3 className="font-bold text-lg">Laporan Siswa Tidak Hadir Hari Ini</h3>
                        <p className="text-sm text-gray-400 mb-4">Daftar siswa yang Anda laporkan tidak hadir</p>
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                            {studentAbsences.length === 0 ? (
                                <div className="text-center py-10 text-gray-500">
                                    <UsersEmptyIcon />
                                    <p className="font-semibold mt-2 text-gray-300">Belum ada laporan</p>
                                    <p className="text-sm">Klik tombol 'Lapor Siswa Absen' untuk menambahkan.</p>
                                </div>
                            ) : (
                                studentAbsences.map(rec => (
                                    <div key={rec.id} className="border-b border-gray-700 last:border-b-0 pb-3 pt-2">
                                        <p className="font-semibold">{rec.studentName} - Kelas {getClassName(rec.classId)} (Jam ke-{rec.lessonHour})</p>
                                        <p className="text-sm text-gray-400">Keterangan: {rec.reason}</p>
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
                        <p className="text-gray-400 text-center py-4">Tidak ada pesan.</p>
                    ) : (
                        messages.map(msg => (
                            <div key={msg.id} className={`p-3 rounded-lg ${msg.isRead ? 'bg-gray-700' : 'bg-blue-900 bg-opacity-40 border border-blue-800'}`}>
                                <p className="text-sm text-gray-200">{msg.content}</p>
                                <p className="text-xs text-gray-400 mt-2 text-right">
                                    Dari: {msg.senderName} - {new Date(msg.timestamp).toLocaleString('id-ID')}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </Modal>
            {isAbsenceModalOpen && (
                <AbsenceReportModal 
                    user={user} 
                    onClose={() => setIsAbsenceModalOpen(false)} 
                    onSuccess={() => {
                        setIsAbsenceModalOpen(false);
                        fetchData();
                    }}
                />
            )}
            {isStudentAbsenceModalOpen && (
                <StudentAbsenceModal
                    user={user}
                    onClose={() => setIsStudentAbsenceModalOpen(false)}
                    onSuccess={() => {
                        setIsStudentAbsenceModalOpen(false);
                        fetchData();
                    }}
                    classes={classes}
                    todaySchedules={todaySchedules}
                />
            )}
            <footer className="text-center text-sm text-gray-500 py-6">
                © 2025 Rullp. All rights reserved.
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
        
        if (!scannerRef.current) {
            scannerRef.current = new Html5Qrcode(scannerId);
        }
        const scannerInstance = scannerRef.current;

        const cleanupScanner = () => {
            if (scannerInstance && scannerInstance.isScanning) {
                scannerInstance.stop().catch((err: any) => {
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
                        cleanupScanner();
                        onScanSuccess(decodedText);
                    },
                    (errorMessage: string) => {}
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

        return () => {
            cleanupScanner();
        };
    }, [onScanSuccess]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="w-full bg-gray-800 rounded-2xl shadow-xl max-w-sm mx-auto overflow-hidden">
                <div className="p-4 text-center space-y-3">
                    <h2 className="font-bold text-lg text-white">
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
                        className="w-full bg-gray-600 text-white font-semibold py-3 rounded-lg hover:bg-gray-500 transition-colors"
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

            // Untuk guru, kita lewati pengecekan konflik kelas untuk efisiensi dan
            // untuk menghindari potensi error izin jika aturan diperketat.
            const options = { skipClassConflictCheck: true };

            const result = editingSchedule.id
                ? await api.updateSchedule(editingSchedule.id, scheduleData, options)
                : await api.addSchedule(scheduleData, options);
            
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
        <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Jadwal Mengajar Saya</h2>
                <button onClick={() => handleOpenModal()} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Tambah Jadwal</button>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto">
                {schedules.length === 0 ? <p className="text-gray-400">Anda belum memiliki jadwal.</p> : schedules.map(s => (
                    <div key={s.id} className="border border-gray-700 p-3 rounded-lg flex justify-between items-center">
                        <div>
                            <p className="font-semibold text-white">{s.subject}</p>
                            <p className="text-gray-300">Kelas: {getClassName(s.classId)} ({HARI_TRANSLATION[s.day]}, Jam ke-{s.lessonHour})</p>
                             <p className="text-sm text-gray-400">Waktu: {s.startTime} - {s.endTime}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button onClick={() => handleOpenModal(s)} className="text-blue-400 hover:underline text-sm font-medium">Ubah</button>
                            <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:underline text-sm font-medium">Hapus</button>
                        </div>
                    </div>
                ))}
            </div>
             <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingSchedule?.id ? 'Ubah Jadwal' : 'Tambah Jadwal'}>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block mb-1 text-gray-300">Mata Pelajaran</label>
                        <input type="text" value={editingSchedule?.subject || ''} onChange={e => setEditingSchedule({...editingSchedule, subject: e.target.value})} className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white" placeholder="Contoh: Matematika"/>
                    </div>
                     <div>
                        <label className="block mb-1 text-gray-300">Kelas</label>
                        <select value={editingSchedule?.classId || ''} onChange={e => setEditingSchedule({...editingSchedule, classId: e.target.value})} className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white">
                            <option value="">Pilih Kelas</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block mb-1 text-gray-300">Hari</label>
                        <select value={editingSchedule?.day || ''} onChange={e => setEditingSchedule({...editingSchedule, day: e.target.value as Schedule['day']})} className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white">
                            <option value="">Pilih Hari</option>
                            {DAYS_OF_WEEK.map(day => <option key={day} value={day}>{HARI_TRANSLATION[day]}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block mb-1 text-gray-300">Jam Ke</label>
                        <select 
                            value={editingSchedule?.lessonHour || ''} 
                            onChange={e => {
                                const value = parseInt(e.target.value, 10);
                                setEditingSchedule({...editingSchedule, lessonHour: isNaN(value) ? undefined : value });
                            }} 
                            className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white"
                        >
                            <option value="">Pilih Jam</option>
                            {LESSON_HOURS.map(hour => <option key={hour} value={hour}>{hour}</option>)}
                        </select>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-1 text-gray-300">Waktu Mulai</label>
                            <input type="time" value={editingSchedule?.startTime || ''} onChange={e => setEditingSchedule({...editingSchedule, startTime: e.target.value})} className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white" />
                        </div>
                        <div>
                            <label className="block mb-1 text-gray-300">Waktu Selesai</label>
                            <input type="time" value={editingSchedule?.endTime || ''} onChange={e => setEditingSchedule({...editingSchedule, endTime: e.target.value})} className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white" />
                        </div>
                    </div>
                    
                    <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg flex justify-center items-center transition duration-150 disabled:bg-blue-800 hover:bg-blue-700" disabled={isSaving}>
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
const PembinaEskulDashboard: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [schedules, setSchedules] = useState<EskulSchedule[]>([]);
    const [eskuls, setEskuls] = useState<Eskul[]>([]);
    const [attendance, setAttendance] = useState<EskulAttendanceRecord[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [scanResult, setScanResult] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const { isWithinRadius } = useGeolocation();

    const getEskulName = useCallback((eskulId: string) => eskuls.find(e => e.id === eskulId)?.name || 'N/A', [eskuls]);

    const fetchData = useCallback(async () => {
        setLoadingData(true);
    
        const results = await Promise.allSettled([
            api.getEskuls(),
            api.getEskulSchedules(user.id),
            api.getEskulAttendanceRecords(user.id)
        ]);

        const [eskulsResult, schedulesResult, attendanceResult] = results;

        if (eskulsResult.status === 'fulfilled') {
            setEskuls(eskulsResult.value);
            if (eskulsResult.value.length === 0) {
                 alert("Peringatan: Tidak ada data Ekstrakurikuler yang ditemukan. Ini mungkin disebabkan oleh aturan keamanan (security rules) di Firebase atau karena belum ada data Eskul yang ditambahkan.");
            }
        } else {
            console.error("Gagal memuat eskul:", eskulsResult.reason);
            alert(`Gagal memuat daftar eskul: ${eskulsResult.reason.message}. Anda tidak akan bisa menambah jadwal baru.`);
        }

        if (schedulesResult.status === 'fulfilled') {
            setSchedules(schedulesResult.value);
        } else {
             console.error("Gagal memuat jadwal eskul:", schedulesResult.reason);
             alert(`Gagal memuat jadwal eskul Anda: ${schedulesResult.reason.message}`);
        }
        
        if (attendanceResult.status === 'fulfilled') {
            setAttendance(attendanceResult.value);
        } else {
            console.error("Gagal memuat absensi eskul:", attendanceResult.reason);
            alert(`Gagal memuat riwayat absensi eskul: ${attendanceResult.reason.message}`);
        }

        setLoadingData(false);
    }, [user.id]);


    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    useEffect(() => {
        if (scanResult) {
            const timer = setTimeout(() => setScanResult(null), 5000);
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
            const startTime = new Date(now);
            startTime.setHours(startHour, startMinute, 0, 0);
    
            const [endHour, endMinute] = s.endTime.split(':').map(Number);
            const endTime = new Date(now);
            endTime.setHours(endHour, endMinute, 0, 0);

            // Allow scanning 30 mins before start and up to 60 mins after end
            const leewayStart = 30 * 60 * 1000;
            const leewayEnd = 60 * 60 * 1000;

            return now.getTime() >= (startTime.getTime() - leewayStart) && now.getTime() <= (endTime.getTime() + leewayEnd);
        });

        if (!activeSchedule) {
            setScanResult({ type: 'error', message: `Tidak ada jadwal eskul ${getEskulName(eskulId)} yang aktif saat ini.` });
            return;
        }

        const todayDateString = now.toISOString().slice(0, 10);
        
        try {
            const existingRecord = await api.findEskulAttendanceForToday(user.id, activeSchedule.id, todayDateString);

            if (existingRecord) {
                if (existingRecord.checkOutTime) {
                    setScanResult({ type: 'error', message: 'Anda sudah absen pulang untuk kegiatan ini hari ini.' });
                } else {
                    // This is a check-out
                    const result = await api.updateEskulAttendanceRecord(existingRecord.id, { checkOutTime: now.toISOString() });
                    if (result.success) {
                        setScanResult({ type: 'success', message: `Absen PULANG berhasil untuk ${getEskulName(eskulId)}.` });
                        fetchData();
                    } else {
                        setScanResult({ type: 'error', message: result.message });
                    }
                }
            } else {
                // This is a check-in
                const newRecord: Omit<EskulAttendanceRecord, 'id'> = {
                    pembinaId: user.id,
                    eskulScheduleId: activeSchedule.id,
                    date: todayDateString,
                    checkInTime: now.toISOString(),
                };
                const result = await api.addEskulAttendanceRecord(newRecord);
                if (result.success) {
                    setScanResult({ type: 'success', message: `Absen DATANG berhasil untuk ${getEskulName(eskulId)}.` });
                    fetchData();
                } else {
                     setScanResult({ type: 'error', message: result.message });
                }
            }
        } catch (error: any) {
             setScanResult({ type: 'error', message: `Gagal menyimpan absensi: ${error.message}` });
        }
    };
    
    if (loadingData) return <FullPageSpinner />;
    if (isScanning) return <QRScanner onScanSuccess={handleScanSuccess} onCancel={() => setIsScanning(false)} />;

    const todaySchedules = schedules.filter(s => s.day === new Date().toLocaleDateString('en-US', { weekday: 'long' }));

    return (
        <div className="bg-gray-900 text-white min-h-screen font-sans">
            <header className="bg-gray-800 p-4 flex justify-between items-center shadow-md">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white">Dashboard Pembina Eskul</h1>
                    <p className="text-sm text-gray-400">Selamat datang, {user.name}</p>
                </div>
                <button onClick={onLogout} className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white transition-colors px-4 py-2 rounded-md border border-gray-600 hover:border-gray-500">
                    <LogoutIcon />
                    <span>Keluar</span>
                </button>
            </header>
            <main className="p-4 md:p-6 space-y-6">
                {scanResult && (
                    <div className={`p-4 rounded-md mb-6 shadow-lg ${scanResult.type === 'success' ? 'bg-green-900 bg-opacity-50 text-green-300 border border-green-700' : 'bg-red-900 bg-opacity-50 text-red-300 border border-red-700'}`}>
                        <p className="font-medium">{scanResult.type === 'success' ? 'Berhasil!' : 'Gagal'}</p>
                        <p className="text-sm">{scanResult.message}</p>
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button onClick={() => setIsScanning(true)} disabled={!isWithinRadius} className="bg-gray-800 p-8 rounded-lg shadow-md text-center hover:bg-gray-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-gray-800 group flex flex-col items-center justify-center gap-4 border border-gray-700">
                        <QrScanIcon />
                        <div>
                            <h3 className="text-lg font-bold text-white group-disabled:text-gray-500">Scan Absensi Eskul</h3>
                            <p className="text-gray-400 text-sm mt-1">Pindai QR untuk absensi datang & pulang</p>
                            {!isWithinRadius && <p className="text-xs text-red-500 mt-1">Anda berada di luar radius sekolah.</p>}
                        </div>
                    </button>
                    <button onClick={() => setIsScheduleModalOpen(true)} className="bg-gray-800 p-8 rounded-lg shadow-md text-center hover:bg-gray-700 transition-colors flex flex-col items-center justify-center gap-4 border border-gray-700">
                        <ScheduleIcon />
                        <div>
                            <h3 className="text-lg font-bold text-white">Jadwal Eskul</h3>
                            <p className="text-gray-400 text-sm mt-1">Lihat dan kelola jadwal eskul Anda</p>
                        </div>
                    </button>
                </div>
                 <div className="grid grid-cols-1 gap-6">
                     <div className="bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700">
                        <h3 className="font-bold text-lg">Jadwal Hari Ini</h3>
                         <div className="space-y-3 mt-4">
                            {todaySchedules.length === 0 ? (
                                <div className="text-center py-10 text-gray-500">
                                    <CalendarEmptyIcon />
                                    <p className="font-semibold mt-2 text-gray-300">Tidak ada jadwal eskul hari ini</p>
                                </div>
                            ) : (
                                todaySchedules.map(s => (
                                    <div key={s.id} className="bg-gray-700 p-4 rounded-lg flex justify-between items-center">
                                        <p className="font-semibold text-white">{getEskulName(s.eskulId)}</p>
                                        <span className="text-sm font-medium text-gray-300">{s.startTime} - {s.endTime}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    <div className="bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700">
                        <h3 className="font-bold text-lg">Riwayat Absensi Eskul Terbaru</h3>
                        <div className="space-y-3 mt-4">
                            {attendance.length === 0 ? (
                                <div className="text-center py-10 text-gray-500">
                                    <QrCodeEmptyIcon />
                                    <p className="font-semibold mt-2 text-gray-300">Belum ada riwayat absensi</p>
                                </div>
                            ) : (
                                attendance.slice(0, 5).map(rec => {
                                    const schedule = schedules.find(s => s.id === rec.eskulScheduleId);
                                    return (
                                        <div key={rec.id} className="border-b border-gray-700 last:border-b-0 pb-3 pt-2">
                                            <p className="font-semibold">{schedule ? getEskulName(schedule.eskulId) : 'Kegiatan Dihapus'}</p>
                                            <p className="text-sm text-gray-400">Tanggal: {new Date(rec.checkInTime).toLocaleDateString('id-ID')}</p>
                                            <p className="text-sm text-gray-400">Datang: {new Date(rec.checkInTime).toLocaleTimeString('id-ID')}</p>
                                            {rec.checkOutTime && <p className="text-sm text-gray-400">Pulang: {new Date(rec.checkOutTime).toLocaleTimeString('id-ID')}</p>}
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
             <footer className="text-center text-sm text-gray-500 py-6">
                © 2025 Rullp. All rights reserved.
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
        <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Jadwal Eskul Saya</h2>
                <button onClick={() => handleOpenModal()} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Tambah</button>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto">
                {schedules.map(s => (
                    <div key={s.id} className="border border-gray-700 p-3 rounded-lg flex justify-between items-center">
                        <div>
                            <p className="font-semibold text-white">{getEskulName(s.eskulId)}</p>
                            <p className="text-gray-300">{HARI_TRANSLATION[s.day]}, {s.startTime} - {s.endTime}</p>
                        </div>
                        <div>
                            <button onClick={() => handleOpenModal(s)} className="text-blue-400 hover:underline text-sm font-medium">Ubah</button>
                            <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:underline text-sm font-medium ml-2">Hapus</button>
                        </div>
                    </div>
                ))}
            </div>
             <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingSchedule?.id ? 'Ubah Jadwal' : 'Tambah Jadwal'}>
                <form onSubmit={handleSave} className="space-y-4">
                     <div>
                        <label className="block mb-1 text-gray-300">Kegiatan Eskul</label>
                        <select value={editingSchedule?.eskulId || ''} onChange={e => setEditingSchedule({...editingSchedule, eskulId: e.target.value})} className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white">
                            <option value="">Pilih Eskul</option>
                            {eskuls.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block mb-1 text-gray-300">Hari</label>
                        <select value={editingSchedule?.day || ''} onChange={e => setEditingSchedule({...editingSchedule, day: e.target.value as EskulSchedule['day']})} className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white">
                            <option value="">Pilih Hari</option>
                            {DAYS_OF_WEEK.map(day => <option key={day} value={day}>{HARI_TRANSLATION[day]}</option>)}
                        </select>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-1 text-gray-300">Waktu Mulai</label>
                            <input type="time" value={editingSchedule?.startTime || ''} onChange={e => setEditingSchedule({...editingSchedule, startTime: e.target.value})} className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white" />
                        </div>
                        <div>
                            <label className="block mb-1 text-gray-300">Waktu Selesai</label>
                            <input type="time" value={editingSchedule?.endTime || ''} onChange={e => setEditingSchedule({...editingSchedule, endTime: e.target.value})} className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white" />
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">Simpan</button>
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
        studentAbsences: 'Laporan Siswa Absen',
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
                    <a onClick={() => handleSetView('reports')} className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 cursor-pointer">Laporan Absensi Guru</a>
                    <a onClick={() => handleSetView('studentAbsences')} className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 cursor-pointer">Laporan Siswa Absen</a>
                </nav>
                <div className="p-4 border-t border-gray-700">
                    <p className="text-white">{user.name}</p>
                    <button onClick={onLogout} className="text-sm text-red-400 hover:text-red-300">Keluar</button>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 p-6 bg-gray-900 overflow-auto">
                {/* Header with hamburger button for mobile */}
                <header className="flex items-center justify-between mb-6 md:hidden">
                    <button onClick={() => setIsSidebarOpen(true)} className="text-gray-400 focus:outline-none">
                        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                        </svg>
                    </button>
                    <h1 className="text-xl font-semibold text-white">{viewTitles[view] || 'Halaman'}</h1>
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
                {view === 'studentAbsences' && <StudentAbsenceReport />}
                <footer className="text-center text-sm text-gray-500 pt-8 pb-2">
                    © 2025 Rullp. All rights reserved.
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
        <div className="text-white">
            <h1 className="text-3xl font-bold mb-6 hidden md:block">Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700">
                    <h3 className="font-semibold text-gray-400">Total Guru</h3>
                    <p className="text-3xl font-bold text-white">{teachers.length}</p>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700">
                    <h3 className="font-semibold text-gray-400">Guru Hadir Hari Ini</h3>
                    <p className="text-3xl font-bold text-green-500">{attendanceSummary.present}</p>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700">
                    <h3 className="font-semibold text-gray-400">Guru Absen Hari Ini</h3>
                    <p className="text-3xl font-bold text-red-500">{attendanceSummary.absent}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <div className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700">
                    <h2 className="text-xl font-bold mb-4">Ringkasan Absensi Hari Ini</h2>
                     <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label fill="#8884d8">
                                {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                            <Legend wrapperStyle={{ color: '#d1d5db' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700">
                    <h2 className="text-xl font-bold mb-4">Aktivitas Absensi Terbaru</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                           <thead>
                               <tr className="border-b border-gray-700">
                                   <th className="p-2">Guru</th>
                                   <th className="p-2">Kelas</th>
                                   <th className="p-2">Waktu</th>
                               </tr>
                           </thead>
                            <tbody>
                                {attendance.slice(-5).reverse().map(rec => (
                                    <tr key={rec.id} className="border-b border-gray-700 last:border-none">
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
    <div className="bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">{title}</h2>
            {onAdd && (
                <button onClick={onAdd} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Tambah</button>
            )}
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left text-gray-300">
                <thead>
                    <tr className="bg-gray-700">
                        {columns.map(col => <th key={col} className="p-3 font-semibold text-gray-200">{col}</th>)}
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
            const newMessage: Omit<Message, 'id'> = {
                senderId: adminUser.id,
                senderName: adminUser.name,
                recipientId: staff.id,
                content: content.trim(),
                timestamp: new Date().toISOString(),
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
                    className="w-full p-2 border rounded-md bg-gray-700 border-gray-600 text-white"
                    placeholder="Ketik pesan Anda..."
                    required
                ></textarea>
                <div className="flex justify-end mt-4">
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-800" disabled={isSending}>
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
                    <tr key={member.id} className="border-b border-gray-700 hover:bg-gray-700">
                        <td className="p-3">{member.name}</td>
                        <td className="p-3">{member.userId}</td>
                        <td className="p-3">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${member.role === UserRoleEnum.TEACHER ? 'bg-blue-900 text-blue-300' : 'bg-green-900 text-green-300'}`}>
                                {roleTranslation[member.role] || member.role}
                            </span>
                        </td>
                        <td className="p-3 space-x-4">
                            <button onClick={() => setMessagingStaff(member)} className="text-green-400 hover:underline">Kirim Pesan</button>
                            <button onClick={() => handleResetDevice(member.id, member.name)} className="text-blue-400 hover:underline">Reset Perangkat</button>
                            <button onClick={() => handleDelete(member.id)} className="text-red-400 hover:underline">Hapus</button>
                        </td>
                    </tr>
                )}
            />
            <div className="mt-6 p-4 bg-yellow-900 bg-opacity-50 border-l-4 border-yellow-600 text-yellow-300 rounded-lg">
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
                <tr key={admin.id} className="border-b border-gray-700 hover:bg-gray-700">
                    <td className="p-3">{admin.name}</td>
                    <td className="p-3">{admin.userId}</td>
                    <td className="p-3">
                        <button onClick={() => handleResetDevice(admin.id, admin.name)} className="text-blue-400 hover:underline">Reset Perangkat</button>
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
                    <tr key={c.id} className="border-b border-gray-700 hover:bg-gray-700">
                        <td className="p-3">{c.name}</td>
                        <td className="p-3">{c.grade}</td>
                        <td className="p-3 space-x-4">
                            <button onClick={() => setQrClass(c)} className="text-blue-400 hover:underline">QR Code</button>
                            <button onClick={() => handleDelete(c.id)} className="text-red-400 hover:underline">Hapus</button>
                        </td>
                    </tr>
                )}
            />
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Tambah Kelas Baru">
                <form onSubmit={handleAdd}>
                    <div className="mb-4">
                        <label className="block mb-2 text-gray-300">Nama Kelas (Contoh: X-A)</label>
                        <input value={newClassName} onChange={e => setNewClassName(e.target.value)} className="w-full p-2 border rounded bg-gray-700 border-gray-600 text-white"/>
                    </div>
                     <div className="mb-4">
                        <label className="block mb-2 text-gray-300">Tingkat (Contoh: 10)</label>
                        <input type="number" value={newClassGrade} onChange={e => setNewClassGrade(e.target.value ? parseInt(e.target.value, 10) : '')} className="w-full p-2 border rounded bg-gray-700 border-gray-600 text-white"/>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">Simpan</button>
                </form>
            </Modal>

            <Modal isOpen={!!qrClass} onClose={() => setQrClass(null)} title={`QR Code Absensi - Kelas ${qrClass?.name}`}>
                {qrClass && (
                    <div className="text-center p-4">
                        <div className="bg-white p-4 inline-block rounded-lg">
                            <QRCode
                                value={JSON.stringify({ type: 'attendance', classId: qrClass.id })}
                                size={256}
                                level={"H"}
                                includeMargin={true}
                            />
                        </div>
                        <p className="mt-4 text-gray-300">Pindai kode ini untuk melakukan absensi di kelas {qrClass.name}.</p>
                        <p className="text-sm text-gray-400 mt-2">Pastikan guru memindai dari dalam radius sekolah.</p>
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
                alert(`Ekstrakurikuler "${trimmedName}" sudah ada.`);
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
        if (window.confirm("Yakin ingin menghapus eskul ini? Ini juga akan menghapus jadwal terkait.")) {
            const result = await api.deleteEskul(id);
            if(result.success) {
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
                columns={['Nama Kegiatan', 'Aksi']}
                data={eskuls}
                onAdd={() => setIsModalOpen(true)}
                renderRow={(e: Eskul) => (
                    <tr key={e.id} className="border-b border-gray-700 hover:bg-gray-700">
                        <td className="p-3">{e.name}</td>
                        <td className="p-3 space-x-4">
                            <button onClick={() => setQrEskul(e)} className="text-blue-400 hover:underline">QR Code</button>
                            <button onClick={() => handleDelete(e.id)} className="text-red-400 hover:underline">Hapus</button>
                        </td>
                    </tr>
                )}
            />
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Tambah Eskul Baru">
                <form onSubmit={handleAdd}>
                    <div className="mb-4">
                        <label className="block mb-2 text-gray-300">Nama Eskul (Contoh: Pramuka)</label>
                        <input value={newEskulName} onChange={e => setNewEskulName(e.target.value)} className="w-full p-2 border rounded bg-gray-700 border-gray-600 text-white"/>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">Simpan</button>
                </form>
            </Modal>

            <Modal isOpen={!!qrEskul} onClose={() => setQrEskul(null)} title={`QR Code Absensi - ${qrEskul?.name}`}>
                {qrEskul && (
                    <div className="text-center p-4">
                         <div className="bg-white p-4 inline-block rounded-lg">
                            <QRCode
                                value={JSON.stringify({ type: 'eskul_attendance', eskulId: qrEskul.id })}
                                size={256}
                                level={"H"}
                                includeMargin={true}
                            />
                        </div>
                        <p className="mt-4 text-gray-300">Pindai kode ini untuk absensi kegiatan {qrEskul.name}.</p>
                    </div>
                )}
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
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);

        const results = await Promise.allSettled([
            api.getClasses(),
            api.getUsersByRole(UserRoleEnum.TEACHER),
            api.getSchedules()
        ]);

        const [classesResult, teachersResult, schedulesResult] = results;

        if (classesResult.status === 'fulfilled') {
            setClasses(classesResult.value);
            if (classesResult.value.length === 0) {
                alert("Peringatan: Tidak ada data Kelas yang ditemukan. Dropdown akan kosong.");
            }
        } else {
            console.error("Gagal memuat kelas:", classesResult.reason);
            alert(`Gagal memuat daftar Kelas: ${classesResult.reason.message}`);
        }

        if (teachersResult.status === 'fulfilled') {
            setTeachers(teachersResult.value);
            if (teachersResult.value.length === 0) {
                alert("Peringatan: Tidak ada data Guru yang ditemukan. Dropdown akan kosong.");
            }
        } else {
            console.error("Gagal memuat guru:", teachersResult.reason);
            alert(`Gagal memuat daftar Guru: ${teachersResult.reason.message}`);
        }

        if (schedulesResult.status === 'fulfilled') {
            setSchedules(schedulesResult.value);
        } else {
            console.error("Gagal memuat jadwal:", schedulesResult.reason);
            alert(`Gagal memuat daftar jadwal: ${schedulesResult.reason.message}`);
        }

        setLoading(false);
    }, []);


    useEffect(() => {
        fetchData();
    }, [fetchData]);

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

    if (loading) {
        return (
            <div className="bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700">
                <h2 className="text-2xl font-bold mb-4 text-white">Manajemen Jadwal Pelajaran</h2>
                <Spinner />
            </div>
        );
    }

    return (
        <>
            <CrudTable
                title="Manajemen Jadwal Pelajaran"
                columns={['Hari', 'Waktu', 'Guru', 'Mata Pelajaran', 'Kelas', 'Jam Ke', 'Aksi']}
                data={schedules}
                renderRow={(s: Schedule) => (
                    <tr key={s.id} className="border-b border-gray-700 hover:bg-gray-700">
                        <td className="p-3">{HARI_TRANSLATION[s.day]}</td>
                        <td className="p-3">{s.startTime} - {s.endTime}</td>
                        <td className="p-3">{getTeacherName(s.teacherId)}</td>
                        <td className="p-3">{s.subject}</td>
                        <td className="p-3">{getClassName(s.classId)}</td>
                        <td className="p-3">{s.lessonHour}</td>
                        <td className="p-3 space-x-2">
                            <button onClick={() => handleOpenModal(s)} className="text-blue-400 hover:underline">Ubah</button>
                            <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:underline">Hapus</button>
                        </td>
                    </tr>
                )}
            />
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingSchedule?.id ? 'Ubah Jadwal' : 'Tambah Jadwal'}>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block mb-1 text-gray-300">Guru</label>
                        <select value={editingSchedule?.teacherId || ''} onChange={e => setEditingSchedule({...editingSchedule, teacherId: e.target.value})} className="w-full p-2 border rounded bg-gray-700 border-gray-600 text-white">
                            <option value="">Pilih Guru</option>
                            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block mb-1 text-gray-300">Mata Pelajaran</label>
                        <input type="text" value={editingSchedule?.subject || ''} onChange={e => setEditingSchedule({...editingSchedule, subject: e.target.value})} className="w-full p-2 border rounded bg-gray-700 border-gray-600 text-white" placeholder="Contoh: Sejarah Indonesia"/>
                    </div>
                     <div>
                        <label className="block mb-1 text-gray-300">Kelas</label>
                        <select value={editingSchedule?.classId || ''} onChange={e => setEditingSchedule({...editingSchedule, classId: e.target.value})} className="w-full p-2 border rounded bg-gray-700 border-gray-600 text-white">
                            <option value="">Pilih Kelas</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block mb-1 text-gray-300">Hari</label>
                        <select value={editingSchedule?.day || ''} onChange={e => setEditingSchedule({...editingSchedule, day: e.target.value as Schedule['day']})} className="w-full p-2 border rounded bg-gray-700 border-gray-600 text-white">
                            <option value="">Pilih Hari</option>
                            {DAYS_OF_WEEK.map(day => <option key={day} value={day}>{HARI_TRANSLATION[day]}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block mb-1 text-gray-300">Jam Ke</label>
                         <select value={editingSchedule?.lessonHour || ''} onChange={e => setEditingSchedule({...editingSchedule, lessonHour: parseInt(e.target.value, 10)})} className="w-full p-2 border rounded bg-gray-700 border-gray-600 text-white">
                            <option value="">Pilih Jam</option>
                            {LESSON_HOURS.map(hour => <option key={hour} value={hour}>{hour}</option>)}
                        </select>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-1 text-gray-300">Waktu Mulai</label>
                            <input type="time" value={editingSchedule?.startTime || ''} onChange={e => setEditingSchedule({...editingSchedule, startTime: e.target.value})} className="w-full p-2 border rounded bg-gray-700 border-gray-600 text-white" />
                        </div>
                        <div>
                            <label className="block mb-1 text-gray-300">Waktu Selesai</label>
                            <input type="time" value={editingSchedule?.endTime || ''} onChange={e => setEditingSchedule({...editingSchedule, endTime: e.target.value})} className="w-full p-2 border rounded bg-gray-700 border-gray-600 text-white" />
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">Simpan</button>
                </form>
            </Modal>
        </>
    );
};

const AdminEskulScheduleManagement: React.FC = () => {
    const [schedules, setSchedules] = useState<EskulSchedule[]>([]);
    const [eskuls, setEskuls] = useState<Eskul[]>([]);
    const [pembinas, setPembinas] = useState<User[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<Partial<EskulSchedule> | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);

        const results = await Promise.allSettled([
            api.getEskuls(),
            api.getUsersByRole(UserRoleEnum.PEMBINA_ESKUL),
            api.getAllEskulSchedules()
        ]);

        const [eskulsResult, pembinasResult, schedulesResult] = results;

        if (eskulsResult.status === 'fulfilled') {
            setEskuls(eskulsResult.value);
            if (eskulsResult.value.length === 0) {
                alert("Peringatan: Tidak ada data Ekstrakurikuler ditemukan. Dropdown akan kosong.");
            }
        } else {
            console.error("Gagal memuat eskul:", eskulsResult.reason);
            alert(`Gagal memuat daftar Ekstrakurikuler: ${eskulsResult.reason.message}`);
        }

        if (pembinasResult.status === 'fulfilled') {
            setPembinas(pembinasResult.value);
            if (pembinasResult.value.length === 0) {
                alert("Peringatan: Tidak ada data Pembina Eskul ditemukan. Dropdown akan kosong.");
            }
        } else {
            console.error("Gagal memuat pembina:", pembinasResult.reason);
            alert(`Gagal memuat daftar Pembina: ${pembinasResult.reason.message}`);
        }

        if (schedulesResult.status === 'fulfilled') {
            setSchedules(schedulesResult.value);
        } else {
            console.error("Gagal memuat jadwal eskul:", schedulesResult.reason);
            alert(`Gagal memuat daftar jadwal eskul: ${schedulesResult.reason.message}`);
        }

        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSchedule || !editingSchedule.pembinaId || !editingSchedule.eskulId || !editingSchedule.day || !editingSchedule.startTime || !editingSchedule.endTime) {
            alert("Harap isi semua kolom");
            return;
        }

        const scheduleData = {
            pembinaId: editingSchedule.pembinaId,
            eskulId: editingSchedule.eskulId,
            day: editingSchedule.day,
            startTime: editingSchedule.startTime,
            endTime: editingSchedule.endTime
        };

        const result = editingSchedule.id
            ? await api.updateEskulSchedule(editingSchedule.id, scheduleData)
            : await api.addEskulSchedule(scheduleData);
        
        if (result.success) {
            setIsModalOpen(false);
            setEditingSchedule(null);
            fetchData();
        } else {
            alert(result.message);
        }
    };
    
    const handleDelete = async (id: string) => {
        if(window.confirm("Yakin ingin menghapus jadwal eskul ini?")){
            const result = await api.deleteEskulSchedule(id);
             if (result.success) {
                fetchData();
            } else {
                alert(result.message);
            }
        }
    }
    
    const handleOpenModal = (schedule: Partial<EskulSchedule> | null = null) => {
        setEditingSchedule(schedule || {startTime: '14:00', endTime: '16:00'});
        setIsModalOpen(true);
    };

    const getPembinaName = (id: string) => pembinas.find(p => p.id === id)?.name || 'N/A';
    const getEskulName = (id: string) => eskuls.find(e => e.id === id)?.name || 'N/A';

    if (loading) {
        return (
            <div className="bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700">
                <h2 className="text-2xl font-bold mb-4 text-white">Manajemen Jadwal Ekstrakurikuler</h2>
                <Spinner />
            </div>
        );
    }

    return (
        <>
            <CrudTable
                title="Manajemen Jadwal Ekstrakurikuler"
                columns={['Hari', 'Waktu', 'Pembina', 'Kegiatan', 'Aksi']}
                data={schedules}
                renderRow={(s: EskulSchedule) => (
                    <tr key={s.id} className="border-b border-gray-700 hover:bg-gray-700">
                        <td className="p-3">{HARI_TRANSLATION[s.day]}</td>
                        <td className="p-3">{s.startTime} - {s.endTime}</td>
                        <td className="p-3">{getPembinaName(s.pembinaId)}</td>
                        <td className="p-3">{getEskulName(s.eskulId)}</td>
                        <td className="p-3 space-x-2">
                            <button onClick={() => handleOpenModal(s)} className="text-blue-400 hover:underline">Ubah</button>
                            <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:underline">Hapus</button>
                        </td>
                    </tr>
                )}
            />
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingSchedule?.id ? 'Ubah Jadwal Eskul' : 'Tambah Jadwal Eskul'}>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block mb-1 text-gray-300">Pembina</label>
                        <select value={editingSchedule?.pembinaId || ''} onChange={e => setEditingSchedule({...editingSchedule, pembinaId: e.target.value})} className="w-full p-2 border rounded bg-gray-700 border-gray-600 text-white">
                            <option value="">Pilih Pembina</option>
                            {pembinas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block mb-1 text-gray-300">Kegiatan Eskul</label>
                        <select value={editingSchedule?.eskulId || ''} onChange={e => setEditingSchedule({...editingSchedule, eskulId: e.target.value})} className="w-full p-2 border rounded bg-gray-700 border-gray-600 text-white">
                            <option value="">Pilih Eskul</option>
                            {eskuls.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block mb-1 text-gray-300">Hari</label>
                        <select value={editingSchedule?.day || ''} onChange={e => setEditingSchedule({...editingSchedule, day: e.target.value as EskulSchedule['day']})} className="w-full p-2 border rounded bg-gray-700 border-gray-600 text-white">
                            <option value="">Pilih Hari</option>
                            {DAYS_OF_WEEK.map(day => <option key={day} value={day}>{HARI_TRANSLATION[day]}</option>)}
                        </select>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-1 text-gray-300">Waktu Mulai</label>
                            <input type="time" value={editingSchedule?.startTime || ''} onChange={e => setEditingSchedule({...editingSchedule, startTime: e.target.value})} className="w-full p-2 border rounded bg-gray-700 border-gray-600 text-white" />
                        </div>
                        <div>
                            <label className="block mb-1 text-gray-300">Waktu Selesai</label>
                            <input type="time" value={editingSchedule?.endTime || ''} onChange={e => setEditingSchedule({...editingSchedule, endTime: e.target.value})} className="w-full p-2 border rounded bg-gray-700 border-gray-600 text-white" />
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">Simpan</button>
                </form>
            </Modal>
        </>
    );
};


const AttendanceReport: React.FC = () => {
    const [reportType, setReportType] = useState<'kelas' | 'eskul'>('kelas');
    
    // State for class attendance
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [teachers, setTeachers] = useState<User[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [absenceRecords, setAbsenceRecords] = useState<AbsenceRecord[]>([]);
    const [filter, setFilter] = useState({ teacherId: '', classId: '', startDate: '', endDate: '' });

    // State for eskul attendance
    const [eskulAttendance, setEskulAttendance] = useState<EskulAttendanceRecord[]>([]);
    const [pembinas, setPembinas] = useState<User[]>([]);
    const [eskuls, setEskuls] = useState<Eskul[]>([]);
    const [eskulSchedules, setEskulSchedules] = useState<EskulSchedule[]>([]);
    const [eskulFilter, setEskulFilter] = useState({ pembinaId: '', eskulId: '', startDate: '', endDate: '' });

    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [
                att, sch, tch, cls, absRecs, // Class data
                eskulAtt, pbn, es, eskSch // Eskul data
            ] = await Promise.all([
                api.getAttendanceRecords(),
                api.getSchedules(),
                api.getUsersByRole(UserRoleEnum.TEACHER),
                api.getClasses(),
                api.getAbsenceRecords(),
                api.getAllEskulAttendanceRecords(),
                api.getUsersByRole(UserRoleEnum.PEMBINA_ESKUL),
                api.getEskuls(),
                api.getAllEskulSchedules()
            ]);
            // Set class data
            setAttendance(att);
            setSchedules(sch);
            setTeachers(tch);
            setClasses(cls);
            setAbsenceRecords(absRecs);
            // Set eskul data
            setEskulAttendance(eskulAtt);
            setPembinas(pbn);
            setEskuls(es);
            setEskulSchedules(eskSch);
        } catch (error) {
            console.error("Failed to fetch report data:", error);
            alert(`Gagal memuat data laporan: ${error}`);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const classReportData = useMemo(() => {
        if (!filter.startDate || !filter.endDate) {
            return [];
        }

        const report: any[] = [];
        const startDate = new Date(filter.startDate);
        const endDate = new Date(filter.endDate);

        const getTeacherName = (id: string) => teachers.find(t => t.id === id)?.name || 'N/A';
        const getClassName = (id: string) => classes.find(c => c.id === id)?.name || 'N/A';

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const currentDate = new Date(d);
            const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }) as Schedule['day'];
            const dateString = currentDate.toISOString().slice(0, 10);

            const dailySchedules = schedules.filter(s => 
                s.day === dayName &&
                (filter.teacherId ? s.teacherId === filter.teacherId : true) &&
                (filter.classId ? s.classId === filter.classId : true)
            );

            for (const schedule of dailySchedules) {
                const attendanceRecord = attendance.find(rec => 
                    rec.teacherId === schedule.teacherId &&
                    rec.classId === schedule.classId &&
                    rec.lessonHour === schedule.lessonHour &&
                    new Date(rec.scanTime).toDateString() === currentDate.toDateString()
                );

                if (attendanceRecord) {
                    let lateness = 'Tepat Waktu';
                    if (schedule.startTime) {
                        const scanTime = new Date(attendanceRecord.scanTime);
                        const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
                        const scheduledStartTime = new Date(scanTime);
                        scheduledStartTime.setHours(startHour, startMinute, 0, 0);
                        const diffMs = scanTime.getTime() - scheduledStartTime.getTime();
                        if (diffMs > 60000) {
                            lateness = `${Math.round(diffMs / 60000)} menit`;
                        }
                    }
                    report.push({
                        id: attendanceRecord.id,
                        date: currentDate.toLocaleDateString('id-ID'),
                        teacherName: getTeacherName(schedule.teacherId),
                        className: getClassName(schedule.classId),
                        subject: schedule.subject,
                        lessonHour: schedule.lessonHour,
                        status: 'Hadir',
                        scanTime: new Date(attendanceRecord.scanTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit'}),
                        lateness: lateness,
                        keterangan: '-',
                    });
                } else {
                    const absenceRecord = absenceRecords.find(ar => ar.teacherId === schedule.teacherId && ar.date === dateString);
                    report.push({
                        id: `${schedule.id}-${dateString}`,
                        date: currentDate.toLocaleDateString('id-ID'),
                        teacherName: getTeacherName(schedule.teacherId),
                        className: getClassName(schedule.classId),
                        subject: schedule.subject,
                        lessonHour: schedule.lessonHour,
                        status: absenceRecord ? absenceRecord.status : 'Alpa',
                        scanTime: '-',
                        lateness: '-',
                        keterangan: absenceRecord?.reason || '-',
                    });
                }
            }
        }
        return report.sort((a, b) => new Date(a.date.split('/').reverse().join('-')).getTime() - new Date(b.date.split('/').reverse().join('-')).getTime() || a.teacherName.localeCompare(b.teacherName));
    }, [attendance, schedules, teachers, classes, filter, absenceRecords]);
    
    const eskulReportData = useMemo(() => {
        if (!eskulFilter.startDate || !eskulFilter.endDate) {
            return [];
        }

        const report: any[] = [];
        const startDate = new Date(eskulFilter.startDate);
        const endDate = new Date(eskulFilter.endDate);
        
        const getPembinaName = (id: string) => pembinas.find(p => p.id === id)?.name || 'N/A';
        const getEskulName = (id: string) => eskuls.find(e => e.id === id)?.name || 'N/A';

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const currentDate = new Date(d);
            const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }) as EskulSchedule['day'];

            const dailySchedules = eskulSchedules.filter(s => 
                s.day === dayName &&
                (eskulFilter.pembinaId ? s.pembinaId === eskulFilter.pembinaId : true) &&
                (eskulFilter.eskulId ? s.eskulId === eskulFilter.eskulId : true)
            );

            for (const schedule of dailySchedules) {
                const attendanceRecord = eskulAttendance.find(rec =>
                    rec.pembinaId === schedule.pembinaId &&
                    rec.eskulScheduleId === schedule.id &&
                    new Date(rec.checkInTime).toDateString() === currentDate.toDateString()
                );

                if (attendanceRecord) {
                    let lateness = 'Tepat Waktu';
                    const checkInTime = new Date(attendanceRecord.checkInTime);
                    const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
                    const scheduledStartTime = new Date(checkInTime);
                    scheduledStartTime.setHours(startHour, startMinute, 0, 0);

                    const latenessMs = checkInTime.getTime() - scheduledStartTime.getTime();
                    if (latenessMs > 60000) {
                        lateness = `${Math.round(latenessMs / 60000)} menit`;
                    }

                    let earlyDeparture = '-';
                    if (attendanceRecord.checkOutTime && schedule.endTime) {
                        const checkOutTime = new Date(attendanceRecord.checkOutTime);
                        const [endHour, endMinute] = schedule.endTime.split(':').map(Number);
                        const scheduledEndTime = new Date(checkOutTime);
                        scheduledEndTime.setHours(endHour, endMinute, 0, 0);

                        const earlyMs = scheduledEndTime.getTime() - checkOutTime.getTime();
                        if (earlyMs > 60000) { 
                            earlyDeparture = `${Math.round(earlyMs / 60000)} menit`;
                        }
                    }
                    
                    report.push({
                        id: attendanceRecord.id,
                        date: currentDate.toLocaleDateString('id-ID'),
                        pembinaName: getPembinaName(schedule.pembinaId),
                        eskulName: getEskulName(schedule.eskulId),
                        status: 'Hadir',
                        checkInTime: checkInTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit'}),
                        checkOutTime: attendanceRecord.checkOutTime ? new Date(attendanceRecord.checkOutTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit'}) : '-',
                        lateness,
                        earlyDeparture,
                    });
                } else {
                    report.push({
                        id: `${schedule.id}-${currentDate.toISOString()}`,
                        date: currentDate.toLocaleDateString('id-ID'),
                        pembinaName: getPembinaName(schedule.pembinaId),
                        eskulName: getEskulName(schedule.eskulId),
                        status: 'Tidak Hadir',
                        checkInTime: '-',
                        checkOutTime: '-',
                        lateness: '-',
                        earlyDeparture: '-',
                    });
                }
            }
        }
        return report.sort((a, b) => new Date(a.date.split('/').reverse().join('-')).getTime() - new Date(b.date.split('/').reverse().join('-')).getTime() || a.pembinaName.localeCompare(b.pembinaName));
    }, [eskulAttendance, eskulSchedules, pembinas, eskuls, eskulFilter]);

    const exportToPDF = () => {
        const { jsPDF } = window.jspdf;
        // @ts-ignore
        const doc = new jsPDF.default();
         // @ts-ignore
        if (!doc.autoTable) {
            console.error("jsPDF autoTable plugin is not loaded!");
            return;
        }

        if (reportType === 'kelas') {
            doc.text("Laporan Absensi Guru", 14, 16);
            const tableData = classReportData.map(rec => [
                rec.date,
                rec.teacherName,
                rec.className,
                rec.subject,
                `Jam ke-${rec.lessonHour}`,
                rec.status,
                rec.scanTime,
                rec.lateness,
                rec.keterangan,
            ]);
            doc.autoTable({
                head: [['Tanggal', 'Guru', 'Kelas', 'Pelajaran', 'Jam Ke', 'Status', 'Waktu Scan', 'Telat', 'Keterangan']],
                body: tableData,
                startY: 20,
            });
            doc.save('laporan_absensi_kelas.pdf');
        } else { // eskul
            doc.text("Laporan Absensi Ekstrakurikuler", 14, 16);
            const tableData = eskulReportData.map(rec => [
                rec.date,
                rec.pembinaName,
                rec.eskulName,
                rec.status,
                rec.checkInTime,
                rec.checkOutTime,
                rec.lateness,
                rec.earlyDeparture,
            ]);
            doc.autoTable({
                head: [['Tanggal', 'Pembina', 'Eskul', 'Status', 'Datang', 'Pulang', 'Keterlambatan', 'Pulang Awal']],
                body: tableData,
                startY: 20,
            });
            doc.save('laporan_absensi_eskul.pdf');
        }
    };

    const exportToExcel = () => {
        let worksheetData, fileName;

        if (reportType === 'kelas') {
            worksheetData = classReportData.map(rec => ({
                "Tanggal": rec.date,
                "Nama Guru": rec.teacherName,
                "Kelas": rec.className,
                "Mata Pelajaran": rec.subject,
                "Jam Pelajaran": `Jam ke-${rec.lessonHour}`,
                "Status": rec.status,
                "Waktu Scan": rec.scanTime,
                "Keterlambatan": rec.lateness,
                "Keterangan": rec.keterangan,
            }));
            fileName = "Laporan_Absensi_Kelas.xlsx";
        } else {
             worksheetData = eskulReportData.map(rec => ({
                "Tanggal": rec.date,
                "Nama Pembina": rec.pembinaName,
                "Kegiatan Eskul": rec.eskulName,
                "Status": rec.status,
                "Waktu Datang": rec.checkInTime,
                "Waktu Pulang": rec.checkOutTime,
                "Keterlambatan": rec.lateness,
                "Pulang Lebih Awal": rec.earlyDeparture,
            }));
            fileName = "Laporan_Absensi_Eskul.xlsx";
        }

        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan");
        XLSX.writeFile(workbook, fileName);
    };

    const isClassReportReady = filter.startDate && filter.endDate;
    const isEskulReportReady = eskulFilter.startDate && eskulFilter.endDate;
    
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Hadir':
                return 'bg-green-900 text-green-300';
            case 'Sakit':
            case 'Izin':
            case 'Tugas Luar':
                return 'bg-yellow-900 text-yellow-300';
            case 'Alpa':
            case 'Tidak Hadir':
                return 'bg-red-900 text-red-300';
            default:
                return 'bg-gray-700 text-gray-300';
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700">
            <h2 className="text-2xl font-bold mb-4 text-white">Laporan Absensi Guru</h2>
            
            <div className="mb-4 border-b border-gray-700">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setReportType('kelas')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${reportType === 'kelas' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}
                    >
                        Absensi Kelas
                    </button>
                    <button
                        onClick={() => setReportType('eskul')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${reportType === 'eskul' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}
                    >
                        Absensi Ekstrakurikuler
                    </button>
                </nav>
            </div>

            {/* Filters */}
            {reportType === 'kelas' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 p-4 border border-gray-700 rounded-lg bg-gray-900">
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Guru</label>
                        <select value={filter.teacherId} onChange={e => setFilter({...filter, teacherId: e.target.value})} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-gray-700 text-white">
                            <option value="">Semua Guru</option>
                            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300">Kelas</label>
                        <select value={filter.classId} onChange={e => setFilter({...filter, classId: e.target.value})} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-gray-700 text-white">
                            <option value="">Semua Kelas</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300">Tanggal Mulai</label>
                        <input type="date" value={filter.startDate} onChange={e => setFilter({...filter, startDate: e.target.value})} className="mt-1 block w-full pl-3 pr-2 py-2 text-base border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-gray-700 text-white" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300">Tanggal Selesai</label>
                        <input type="date" value={filter.endDate} onChange={e => setFilter({...filter, endDate: e.target.value})} className="mt-1 block w-full pl-3 pr-2 py-2 text-base border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-gray-700 text-white" />
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 p-4 border border-gray-700 rounded-lg bg-gray-900">
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Pembina</label>
                        <select value={eskulFilter.pembinaId} onChange={e => setEskulFilter({...eskulFilter, pembinaId: e.target.value})} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-gray-700 text-white">
                            <option value="">Semua Pembina</option>
                            {pembinas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300">Eskul</label>
                        <select value={eskulFilter.eskulId} onChange={e => setEskulFilter({...eskulFilter, eskulId: e.target.value})} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-gray-700 text-white">
                            <option value="">Semua Eskul</option>
                            {eskuls.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300">Tanggal Mulai</label>
                        <input type="date" value={eskulFilter.startDate} onChange={e => setEskulFilter({...eskulFilter, startDate: e.target.value})} className="mt-1 block w-full pl-3 pr-2 py-2 text-base border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-gray-700 text-white" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300">Tanggal Selesai</label>
                        <input type="date" value={eskulFilter.endDate} onChange={e => setEskulFilter({...eskulFilter, endDate: e.target.value})} className="mt-1 block w-full pl-3 pr-2 py-2 text-base border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-gray-700 text-white" />
                    </div>
                </div>
            )}
            
            {/* Export Buttons */}
            <div className="flex justify-end gap-2 mb-4">
                <button onClick={exportToPDF} disabled={(reportType === 'kelas' && !isClassReportReady) || (reportType === 'eskul' && !isEskulReportReady)} className="bg-red-700 text-white px-4 py-2 rounded-lg hover:bg-red-800 disabled:bg-gray-600 disabled:cursor-not-allowed">Ekspor PDF</button>
                <button onClick={exportToExcel} disabled={(reportType === 'kelas' && !isClassReportReady) || (reportType === 'eskul' && !isEskulReportReady)} className="bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800 disabled:bg-gray-600 disabled:cursor-not-allowed">Ekspor Excel</button>
            </div>

            {/* Table */}
            {loading ? <Spinner/> : (
                reportType === 'kelas' ? (
                    !isClassReportReady ? (
                        <div className="text-center py-10 text-gray-400 bg-gray-800 rounded-lg">
                            <p className="font-semibold">Pilih rentang tanggal untuk menampilkan laporan.</p>
                            <p className="text-sm">Laporan lengkap termasuk data guru yang tidak hadir akan ditampilkan di sini.</p>
                        </div>
                    ) : (
                        <CrudTable
                            title=""
                            columns={['Tanggal', 'Guru', 'Kelas', 'Pelajaran', 'Jam Ke', 'Status', 'Waktu Scan', 'Keterlambatan', 'Keterangan']}
                            data={classReportData}
                            renderRow={(rec: any) => (
                                 <tr key={rec.id} className="border-b border-gray-700 hover:bg-gray-700">
                                    <td className="p-3">{rec.date}</td>
                                    <td className="p-3">{rec.teacherName}</td>
                                    <td className="p-3">{rec.className}</td>
                                    <td className="p-3">{rec.subject}</td>
                                    <td className="p-3 text-center">{rec.lessonHour}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(rec.status)}`}>
                                            {rec.status}
                                        </span>
                                    </td>
                                    <td className="p-3">{rec.scanTime}</td>
                                    <td className="p-3">{rec.lateness}</td>
                                    <td className="p-3">{rec.keterangan}</td>
                                </tr>
                            )}
                        />
                    )
                ) : ( // eskul report
                    !isEskulReportReady ? (
                         <div className="text-center py-10 text-gray-400 bg-gray-800 rounded-lg">
                            <p className="font-semibold">Pilih rentang tanggal untuk menampilkan laporan.</p>
                            <p className="text-sm">Laporan lengkap termasuk data pembina yang tidak hadir akan ditampilkan di sini.</p>
                        </div>
                    ) : (
                        <CrudTable
                            title=""
                            columns={['Tanggal', 'Pembina', 'Eskul', 'Status', 'Datang', 'Pulang', 'Keterlambatan', 'Pulang Awal']}
                            data={eskulReportData}
                            renderRow={(rec: any) => (
                                 <tr key={rec.id} className="border-b border-gray-700 hover:bg-gray-700">
                                    <td className="p-3">{rec.date}</td>
                                    <td className="p-3">{rec.pembinaName}</td>
                                    <td className="p-3">{rec.eskulName}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${rec.status === 'Hadir' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                                            {rec.status}
                                        </span>
                                    </td>
                                    <td className="p-3">{rec.checkInTime}</td>
                                    <td className="p-3">{rec.checkOutTime}</td>
                                    <td className="p-3">{rec.lateness}</td>
                                    <td className="p-3">{rec.earlyDeparture}</td>
                                </tr>
                            )}
                        />
                    )
                )
            )}
        </div>
    );
};

const StudentAbsenceReport: React.FC = () => {
    const [studentAbsences, setStudentAbsences] = useState<StudentAbsenceRecord[]>([]);
    const [teachers, setTeachers] = useState<User[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ teacherId: '', classId: '', startDate: '', endDate: '' });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [absences, teacherList, classList] = await Promise.all([
                api.getAllStudentAbsenceRecords(),
                api.getUsersByRole(UserRoleEnum.TEACHER),
                api.getClasses(),
            ]);
            setStudentAbsences(absences);
            setTeachers(teacherList);
            setClasses(classList);
        } catch (error) {
            console.error("Failed to fetch student absence data:", error);
            alert(`Gagal memuat data laporan siswa: ${error}`);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getClassName = useCallback((classId: string) => classes.find(c => c.id === classId)?.name || 'N/A', [classes]);

    const filteredReportData = useMemo(() => {
        return studentAbsences
            .filter(rec => {
                const recDate = new Date(rec.date);
                const startDate = filter.startDate ? new Date(filter.startDate) : null;
                const endDate = filter.endDate ? new Date(filter.endDate) : null;

                if (startDate && recDate < startDate) return false;
                if (endDate && recDate > endDate) return false;
                if (filter.teacherId && rec.teacherId !== filter.teacherId) return false;
                if (filter.classId && rec.classId !== filter.classId) return false;

                return true;
            })
            .map(rec => ({
                ...rec,
                className: getClassName(rec.classId),
            }));
    }, [studentAbsences, filter, classes, getClassName]);

    const exportToPDF = () => {
        const { jsPDF } = window.jspdf;
        // @ts-ignore
        const doc = new jsPDF.default();
        if (!doc.autoTable) {
            console.error("jsPDF autoTable plugin is not loaded!");
            return;
        }

        doc.text("Laporan Siswa Tidak Hadir", 14, 16);
        const tableData = filteredReportData.map(rec => [
            new Date(rec.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
            rec.teacherName,
            rec.className,
            rec.studentName,
            `Jam ke-${rec.lessonHour}`,
            rec.reason,
        ]);
        doc.autoTable({
            head: [['Hari / Tanggal', 'Guru Pelapor', 'Kelas', 'Nama Siswa', 'Tidak Hadir Jam Ke', 'Keterangan']],
            body: tableData,
            startY: 20,
        });
        doc.save('laporan_siswa_absen.pdf');
    };

    const exportToExcel = () => {
        const worksheetData = filteredReportData.map(rec => ({
            "Hari / Tanggal": new Date(rec.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
            "Guru Pelapor": rec.teacherName,
            "Kelas": rec.className,
            "Nama Siswa": rec.studentName,
            "Tidak Hadir Jam Ke": `Jam ke-${rec.lessonHour}`,
            "Keterangan": rec.reason,
        }));
        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Siswa Absen");
        XLSX.writeFile(workbook, "Laporan_Siswa_Absen.xlsx");
    };
    
    const isReportReady = filter.startDate && filter.endDate;

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700">
            <h2 className="text-2xl font-bold mb-4 text-white">Laporan Siswa Tidak Hadir</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 p-4 border border-gray-700 rounded-lg bg-gray-900">
                <div>
                    <label className="block text-sm font-medium text-gray-300">Guru Pelapor</label>
                    <select value={filter.teacherId} onChange={e => setFilter({...filter, teacherId: e.target.value})} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-gray-700 text-white">
                        <option value="">Semua Guru</option>
                        {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-300">Kelas</label>
                    <select value={filter.classId} onChange={e => setFilter({...filter, classId: e.target.value})} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-gray-700 text-white">
                        <option value="">Semua Kelas</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-300">Tanggal Mulai</label>
                    <input type="date" value={filter.startDate} onChange={e => setFilter({...filter, startDate: e.target.value})} className="mt-1 block w-full pl-3 pr-2 py-2 text-base border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-gray-700 text-white" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-300">Tanggal Selesai</label>
                    <input type="date" value={filter.endDate} onChange={e => setFilter({...filter, endDate: e.target.value})} className="mt-1 block w-full pl-3 pr-2 py-2 text-base border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-gray-700 text-white" />
                </div>
            </div>

            <div className="flex justify-end gap-2 mb-4">
                <button onClick={exportToPDF} disabled={!isReportReady} className="bg-red-700 text-white px-4 py-2 rounded-lg hover:bg-red-800 disabled:bg-gray-600 disabled:cursor-not-allowed">Ekspor PDF</button>
                <button onClick={exportToExcel} disabled={!isReportReady} className="bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800 disabled:bg-gray-600 disabled:cursor-not-allowed">Ekspor Excel</button>
            </div>
            
            {loading ? <Spinner/> : !isReportReady ? (
                <div className="text-center py-10 text-gray-400 bg-gray-900 rounded-lg">
                    <p className="font-semibold">Pilih rentang tanggal untuk menampilkan laporan.</p>
                </div>
            ) : (
                <CrudTable
                    title=""
                    columns={['Hari / Tanggal', 'Guru Pelapor', 'Kelas', 'Nama Siswa', 'Jam Ke', 'Keterangan']}
                    data={filteredReportData}
                    renderRow={(rec: StudentAbsenceRecord & { className: string }) => (
                         <tr key={rec.id} className="border-b border-gray-700 hover:bg-gray-700">
                            <td className="p-3">{new Date(rec.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</td>
                            <td className="p-3">{rec.teacherName}</td>
                            <td className="p-3">{rec.className}</td>
                            <td className="p-3">{rec.studentName}</td>
                            <td className="p-3 text-center">{rec.lessonHour}</td>
                            <td className="p-3">{rec.reason}</td>
                        </tr>
                    )}
                />
            )}
        </div>
    );
};


// --- Main App Component ---

const App: React.FC = () => {
    const [user, setUser] = useState<any | null>(null);
    const [userProfile, setUserProfile] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [authView, setAuthView] = useState<'login' | 'register' | 'forgotPassword'>('login');
    const [authMessage, setAuthMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
    const [showAdminCode, setShowAdminCode] = useState(false);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setInstallPromptEvent(e);
            console.log('beforeinstallprompt event has been fired and saved.');
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = () => {
        if (installPromptEvent) {
            installPromptEvent.prompt();
            installPromptEvent.userChoice.then((choiceResult: any) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the A2HS prompt');
                } else {
                    console.log('User dismissed the A2HS prompt');
                }
                setInstallPromptEvent(null);
            });
        }
    };

    useEffect(() => {
        const unsubscribeAuth = api.onAuthStateChanged(newUser => {
            setUser(newUser);
            if (!newUser) {
                setUserProfile(null);
                setLoading(false);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        let unsubscribeProfile: (() => void) | null = null;
        if (user) {
            unsubscribeProfile = api.onUserProfileChange(user.uid, profile => {
                setUserProfile(profile);
                setLoading(false);
            });
        }
        return () => {
            if (unsubscribeProfile) {
                unsubscribeProfile();
            }
        };
    }, [user]);

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const { email, password } = e.currentTarget.elements as any;
        setAuthMessage(null);
        try {
            await api.signIn(email.value, password.value);
        } catch (error: any) {
            setAuthMessage({ type: 'error', text: error.message || "Email atau password salah." });
        }
    };
    
    const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const { name, email, password, role, adminCode } = e.currentTarget.elements as any;
        setAuthMessage(null);
        try {
            await api.signUp(
                email.value, 
                password.value, 
                name.value, 
                role.value as UserRole,
                adminCode ? adminCode.value : undefined
            );
            setAuthMessage({ type: 'success', text: "Pendaftaran berhasil! Anda akan dialihkan secara otomatis." });
        } catch (error: any) {
            setAuthMessage({ type: 'error', text: error.message || "Pendaftaran gagal." });
        }
    };
    
    const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const { email } = e.currentTarget.elements as any;
        setAuthMessage(null);
        try {
            await api.sendPasswordResetEmail(email.value);
            setAuthMessage({ type: 'success', text: "Email pemulihan password telah dikirim." });
        } catch (error: any) {
            setAuthMessage({ type: 'error', text: error.message || "Gagal mengirim email." });
        }
    };

    const handleLogout = async () => {
        await api.signOut();
    };

    if (loading) {
        return <FullPageSpinner />;
    }

    if (!user || !userProfile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
                <div className="w-full max-w-md bg-gray-800 rounded-xl shadow-lg p-8 space-y-6 border border-gray-700">
                    <div className="text-center">
                        <h1 className="text-5xl font-extrabold text-blue-500 mb-2">HadirKu</h1>
                        <p className="text-gray-400">Sistem Absensi Guru Digital</p>
                    </div>

                    {authView === 'login' && (
                        <div>
                             <h2 className="text-2xl font-bold text-center text-white mb-6">Login</h2>
                            <form onSubmit={handleLogin} className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-300 block mb-1">Email</label>
                                    <input name="email" type="email" required className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"/>
                                </div>
                                <div>
                                    <div className="flex justify-between items-baseline">
                                        <label className="text-sm font-medium text-gray-300 block mb-1">Password</label>
                                        <a href="#" onClick={(e) => { e.preventDefault(); setAuthView('forgotPassword'); setAuthMessage(null); }} className="text-sm text-blue-400 hover:underline">Lupa Password?</a>
                                    </div>
                                    <input name="password" type="password" required className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"/>
                                </div>
                                <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-300">Login</button>
                            </form>
                             
                            {installPromptEvent && (
                                <div className="mt-6 text-center bg-gray-700 p-4 rounded-lg border border-gray-600 space-y-3">
                                    <p className="text-sm font-medium text-gray-200">
                                        Instal Aplikasi untuk Pengalaman Terbaik
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        Akses lebih cepat dan fitur offline dengan menambahkan aplikasi ini ke layar utama (home screen) Anda.
                                    </p>
                                    <button
                                        onClick={handleInstallClick}
                                        className="w-full bg-green-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-green-700 transition duration-300 flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                                    >
                                        <DownloadIcon />
                                        <span>Instal Aplikasi</span>
                                    </button>
                                </div>
                            )}

                            <p className="text-center text-sm text-gray-400 mt-6">
                                Belum punya akun? <a href="#" onClick={(e) => { e.preventDefault(); setAuthView('register'); setAuthMessage(null); }} className="font-medium text-blue-400 hover:underline">Daftar</a>
                            </p>
                        </div>
                    )}
                    
                    {authView === 'register' && (
                         <div>
                            <h2 className="text-2xl font-bold text-center text-white mb-6">Daftar Akun Baru</h2>
                            <form onSubmit={handleRegister} className="space-y-4">
                                 <div>
                                    <label className="text-sm font-medium text-gray-300 block mb-1">Nama Lengkap</label>
                                    <input name="name" type="text" required className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"/>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-300 block mb-1">Email</label>
                                    <input name="email" type="email" required className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"/>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-300 block mb-1">Password</label>
                                    <input name="password" type="password" required className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"/>
                                </div>
                                 <div>
                                    <label className="text-sm font-medium text-gray-300 block mb-1">Daftar sebagai</label>
                                    <select 
                                        name="role" 
                                        defaultValue={UserRoleEnum.TEACHER} 
                                        className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
                                        onChange={(e) => setShowAdminCode(e.target.value === UserRoleEnum.ADMIN)}
                                    >
                                        <option value={UserRoleEnum.TEACHER}>Guru</option>
                                        <option value={UserRoleEnum.PEMBINA_ESKUL}>Pembina Ekstrakurikuler</option>
                                        <option value={UserRoleEnum.ADMIN}>Admin</option>
                                    </select>
                                </div>
                                {showAdminCode && (
                                     <div>
                                        <label className="text-sm font-medium text-gray-300 block mb-1">Kode Pendaftaran Admin</label>
                                        <input name="adminCode" type="text" required className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white" placeholder="Masukkan kode khusus"/>
                                    </div>
                                )}
                                <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-300">Daftar</button>
                            </form>
                             <p className="text-center text-sm text-gray-400 mt-6">
                                Sudah punya akun? <a href="#" onClick={(e) => { e.preventDefault(); setAuthView('login'); setAuthMessage(null); }} className="font-medium text-blue-400 hover:underline">Login</a>
                            </p>
                        </div>
                    )}
                    
                    {authView === 'forgotPassword' && (
                        <div>
                            <h2 className="text-2xl font-bold text-center text-white mb-6">Reset Password</h2>
                             <form onSubmit={handleForgotPassword} className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-300 block mb-1">Email</label>
                                    <input name="email" type="email" required className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"/>
                                </div>
                                <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-300">Kirim Link Reset</button>
                            </form>
                            <p className="text-center text-sm text-gray-400 mt-6">
                                Kembali ke <a href="#" onClick={(e) => { e.preventDefault(); setAuthView('login'); setAuthMessage(null); }} className="font-medium text-blue-400 hover:underline">Login</a>
                            </p>
                        </div>
                    )}

                    {authMessage && (
                        <div className={`mt-4 text-center p-3 rounded-lg ${authMessage.type === 'success' ? 'bg-green-900 bg-opacity-50 text-green-300' : 'bg-red-900 bg-opacity-50 text-red-300'}`}>
                            {authMessage.text}
                        </div>
                    )}

                    <div className="text-center text-xs text-gray-500 mt-8">
                        © 2025 Rullp. All rights reserved.
                    </div>
                </div>
            </div>
        );
    }

    if (userProfile.role === UserRoleEnum.ADMIN) {
        return <AdminDashboard user={userProfile} onLogout={handleLogout} />;
    }
    if (userProfile.role === UserRoleEnum.TEACHER) {
        return <TeacherDashboard user={userProfile} onLogout={handleLogout} />;
    }
    if (userProfile.role === UserRoleEnum.PEMBINA_ESKUL) {
        return <PembinaEskulDashboard user={userProfile} onLogout={handleLogout} />;
    }

    // Fallback for unknown roles
    return <div>Peran pengguna tidak dikenali.</div>;
};

export default App;