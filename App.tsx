import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { QRCodeCanvas as QRCode } from 'qrcode.react';
import type { User, Class, Schedule, AttendanceRecord, UserRole } from './types';
import { UserRole as UserRoleEnum } from './types';
import { useGeolocation } from './hooks/useGeolocation';
import { CENTRAL_COORDINATES, MAX_RADIUS_METERS, DAYS_OF_WEEK, LESSON_HOURS } from './constants';
import * as api from './services/firebaseService';

// FIX: Add declarations for globally available libraries
declare var Html5Qrcode: any;
declare var XLSX: any;
declare global {
    interface Window {
        jspdf: any;
    }
}


// --- UI Components ---

const Spinner = () => (
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
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
    const [view, setView] = useState<'home' | 'scan' | 'history' | 'schedule'>('home');
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const { distance, isWithinRadius, error: geoError, loading: geoLoading, refreshLocation } = useGeolocation();
    const [isLessonHourModalOpen, setIsLessonHourModalOpen] = useState(false);
    const [selectedLessonHour, setSelectedLessonHour] = useState<number | null>(null);

    const fetchData = useCallback(async () => {
        setClasses(await api.getClasses());
        setSchedules(await api.getSchedules());
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const userSchedules = useMemo(() => schedules.filter(s => s.teacherId === user.id), [schedules, user.id]);

    const recordAttendance = async (classId: string, lessonHour: number) => {
      const now = new Date();
      
      if (!lessonHour) {
          alert("Jam pelajaran tidak valid.");
          return;
      }

      const hasScanned = await api.checkIfAlreadyScanned(user.id, classId, lessonHour);

      if (hasScanned) {
          alert('Anda sudah absen untuk jam pelajaran ini.');
          setView('home');
          setSelectedLessonHour(null);
          return;
      }

      const newRecord: Omit<AttendanceRecord, 'id'> = {
          teacherId: user.id,
          classId: classId,
          lessonHour,
          scanTime: now.toISOString(),
      };
      
      await api.addAttendanceRecord(newRecord);
      alert('Absensi berhasil!');
      setView('home');
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
        setView('home');
        setSelectedLessonHour(null);
    };
    
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <header className="bg-white shadow-md p-4 flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Halo, {user.name}</h1>
                <button onClick={onLogout} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition">Logout</button>
            </header>
            <main className="flex-grow p-4 md:p-6">
                {view === 'home' && (
                    <div className="max-w-md mx-auto">
                        <div className="bg-white p-4 rounded-lg shadow-md mb-6 text-center">
                            <h2 className="text-lg font-semibold mb-2 text-gray-700">Status Lokasi</h2>
                            {geoLoading ? <Spinner /> : 
                                geoError ? <p className="text-red-500">Error: {geoError}</p> :
                                <>
                                    <p className="text-gray-600">Jarak dari sekolah: <strong>{distance?.toFixed(0) ?? '...'} meter</strong></p>
                                    <p className={`font-semibold mt-1 ${isWithinRadius ? 'text-green-600' : 'text-red-600'}`}>
                                        {isWithinRadius ? 'Anda berada dalam radius absen.' : 'Anda di luar radius absen.'}
                                    </p>
                                    <button onClick={refreshLocation} className="mt-2 text-sm text-blue-500 hover:underline">
                                        Refresh Lokasi
                                    </button>
                                </>
                            }
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <button
                                onClick={() => setIsLessonHourModalOpen(true)}
                                disabled={!isWithinRadius}
                                className="bg-blue-600 text-white p-6 rounded-lg shadow-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex flex-col items-center justify-center text-center"
                            >
                                <span className="text-4xl mb-2">📷</span>
                                <span className="font-semibold text-lg">Scan QR Absen</span>
                            </button>
                            <button
                                onClick={() => setView('schedule')}
                                className="bg-green-500 text-white p-6 rounded-lg shadow-lg hover:bg-green-600 transition flex flex-col items-center justify-center text-center"
                            >
                                <span className="text-4xl mb-2">📅</span>
                                <span className="font-semibold text-lg">Kelola Jadwal Pelajaran</span>
                            </button>
                        </div>
                    </div>
                )}
                {view === 'scan' && selectedLessonHour && <QRScanner onScanSuccess={(classId) => recordAttendance(classId, selectedLessonHour)} onCancel={handleScanCancel} />}
                {view === 'history' && <TeacherAttendanceHistory user={user} classes={classes}/>}
                {view === 'schedule' && <TeacherScheduleManager user={user} schedules={userSchedules} setSchedules={setSchedules} classes={classes}/>}
            </main>
            <footer className="bg-white shadow-t-md p-2 sticky bottom-0">
                <nav className="flex justify-around">
                    <button onClick={() => setView('home')} className={`p-2 rounded-lg text-gray-600 hover:bg-gray-100 ${view === 'home' && 'bg-blue-100 text-blue-700'}`}>Home</button>
                    <button onClick={() => setView('schedule')} className={`p-2 rounded-lg text-gray-600 hover:bg-gray-100 ${view === 'schedule' && 'bg-blue-100 text-blue-700'}`}>Jadwal</button>
                    <button onClick={() => setView('history')} className={`p-2 rounded-lg text-gray-600 hover:bg-gray-100 ${view === 'history' && 'bg-blue-100 text-blue-700'}`}>Riwayat</button>
                </nav>
            </footer>
             <Modal isOpen={isLessonHourModalOpen} onClose={() => setIsLessonHourModalOpen(false)} title="Pilih Jam Pelajaran">
                <div>
                    <div className="mb-4">
                        <label htmlFor="lessonHourSelect" className="block mb-2 text-sm font-medium text-gray-900">Pilih jam ke berapa Anda mengajar:</label>
                        <select
                            id="lessonHourSelect"
                            value={selectedLessonHour || ''}
                            onChange={(e) => setSelectedLessonHour(parseInt(e.target.value))}
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


const TeacherScheduleManager: React.FC<{user: User, schedules: Schedule[], setSchedules: React.Dispatch<React.SetStateAction<Schedule[]>>, classes: Class[]}> = ({ user, schedules, setSchedules, classes }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<Partial<Schedule> | null>(null);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSchedule || !editingSchedule.classId || !editingSchedule.day || !editingSchedule.lessonHour) {
            alert("Harap isi semua kolom");
            return;
        }

        const scheduleData = {
          teacherId: user.id,
          classId: editingSchedule.classId,
          day: editingSchedule.day,
          lessonHour: editingSchedule.lessonHour,
        }

        const success = await api.addSchedule(scheduleData);
        
        if(success) {
            setSchedules(await api.getSchedules());
            setIsModalOpen(false);
            setEditingSchedule(null);
        } else {
            alert("Jadwal bentrok! Kelas ini sudah ada yang mengisi pada hari dan jam tersebut.");
        }
    };
    
    const handleDelete = async (id: string) => {
        if(window.confirm("Yakin ingin menghapus jadwal ini?")){
            await api.deleteSchedule(id);
            setSchedules(schedules.filter(s => s.id !== id));
        }
    }
    
    const getClassName = (classId: string) => classes.find(c => c.id === classId)?.name || 'N/A';
    
    return (
        <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Jadwal Mengajar Saya</h2>
                <button onClick={() => { setEditingSchedule({}); setIsModalOpen(true); }} className="bg-blue-500 text-white px-4 py-2 rounded-lg">Tambah Jadwal</button>
            </div>
            <div className="space-y-4">
                {schedules.length === 0 ? <p>Anda belum memiliki jadwal.</p> : schedules.map(s => (
                    <div key={s.id} className="border p-3 rounded-lg flex justify-between items-center">
                        <div>
                            <p className="font-semibold">{s.day}, Jam ke-{s.lessonHour}</p>
                            <p className="text-gray-600">Kelas: {getClassName(s.classId)}</p>
                        </div>
                        <div>
                            <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:text-red-700 text-sm">Hapus</button>
                        </div>
                    </div>
                ))}
            </div>
             <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={'Tambah Jadwal'}>
                <form onSubmit={handleSave}>
                    <div className="mb-4">
                        <label className="block mb-1">Hari</label>
                        <select value={editingSchedule?.day || ''} onChange={e => setEditingSchedule({...editingSchedule, day: e.target.value as Schedule['day']})} className="w-full p-2 border rounded">
                            <option value="">Pilih Hari</option>
                            {DAYS_OF_WEEK.map(day => <option key={day} value={day}>{day}</option>)}
                        </select>
                    </div>
                    <div className="mb-4">
                        <label className="block mb-1">Jam Ke</label>
                        <select value={editingSchedule?.lessonHour || ''} onChange={e => setEditingSchedule({...editingSchedule, lessonHour: parseInt(e.target.value)})} className="w-full p-2 border rounded">
                            <option value="">Pilih Jam</option>
                            {LESSON_HOURS.map(hour => <option key={hour} value={hour}>{hour}</option>)}
                        </select>
                    </div>
                    <div className="mb-4">
                        <label className="block mb-1">Kelas</label>
                        <select value={editingSchedule?.classId || ''} onChange={e => setEditingSchedule({...editingSchedule, classId: e.target.value})} className="w-full p-2 border rounded">
                            <option value="">Pilih Kelas</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded-lg">Simpan</button>
                </form>
            </Modal>
        </div>
    );
};

const TeacherAttendanceHistory: React.FC<{user: User, classes: Class[]}> = ({user, classes}) => {
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

    useEffect(() => {
        const fetchHistory = async () => {
            const allAttendance = await api.getAttendanceRecords();
            const userHistory = allAttendance
                .filter(rec => rec.teacherId === user.id)
                .sort((a,b) => new Date(b.scanTime).getTime() - new Date(a.scanTime).getTime());
            setAttendance(userHistory);
        };
        fetchHistory();
    }, [user.id]);
    
    const getClassName = (classId: string) => classes.find(c => c.id === classId)?.name || 'N/A';

    return (
        <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Riwayat Absensi</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
                {attendance.length === 0 ? <p>Belum ada riwayat absensi.</p> :
                attendance.map(rec => (
                    <div key={rec.id} className="border p-3 rounded-lg">
                        <p className="font-semibold">Tanggal: {new Date(rec.scanTime).toLocaleDateString('id-ID')}</p>
                        <p>Waktu: {new Date(rec.scanTime).toLocaleTimeString('id-ID')}</p>
                        <p>Kelas: {getClassName(rec.classId)}</p>
                        <p>Jam ke: {rec.lessonHour}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}

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
                    <a onClick={() => handleSetView('classes')} className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 cursor-pointer">Data Kelas</a>
                    <a onClick={() => handleSetView('schedules')} className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 cursor-pointer">Jadwal Pelajaran</a>
                    <a onClick={() => handleSetView('reports')} className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 cursor-pointer">Laporan Absensi</a>
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
                {view === 'teachers' && <TeacherManagement />}
                {view === 'classes' && <ClassManagement />}
                {view === 'schedules' && <ScheduleManagement />}
                {view === 'reports' && <AttendanceReport />}
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
    onAdd: () => void;
}> = ({ title, columns, data, renderRow, onAdd }) => (
    <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">{title}</h2>
            <button onClick={onAdd} className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">Tambah</button>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className="bg-gray-50">
                        {columns.map(col => <th key={col} className="p-3 font-semibold text-gray-600">{col}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {data.map(item => renderRow(item))}
                </tbody>
            </table>
        </div>
    </div>
);

const TeacherManagement: React.FC = () => {
    const [teachers, setTeachers] = useState<User[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState<Partial<User> | null>(null);

    const fetchTeachers = async () => {
        setTeachers(await api.getUsersByRole(UserRoleEnum.TEACHER));
    };

    useEffect(() => {
        fetchTeachers();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTeacher || !editingTeacher.name || !editingTeacher.userId || (!editingTeacher.id && !editingTeacher.password)) {
            alert("Harap isi semua kolom.");
            return;
        }

        const teacherData: Omit<User, 'id'> = {
            name: editingTeacher.name,
            userId: editingTeacher.userId,
            password: editingTeacher.password,
            role: UserRoleEnum.TEACHER,
        };

        await api.addUser(teacherData);
        await fetchTeachers();
        
        setIsModalOpen(false);
        setEditingTeacher(null);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Yakin ingin menghapus guru ini? Ini juga akan menghapus jadwal terkait.")) {
            await api.deleteUser(id);
            setTeachers(teachers.filter(t => t.id !== id));
        }
    };

    return (
        <>
            <CrudTable
                title="Manajemen Guru"
                columns={['Nama', 'User ID', 'Aksi']}
                data={teachers}
                onAdd={() => { setEditingTeacher({}); setIsModalOpen(true); }}
                renderRow={(teacher: User) => (
                    <tr key={teacher.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{teacher.name}</td>
                        <td className="p-3">{teacher.userId}</td>
                        <td className="p-3 space-x-2">
                            <button onClick={() => handleDelete(teacher.id)} className="text-red-600 hover:underline">Hapus</button>
                        </td>
                    </tr>
                )}
            />
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Form Guru">
                <form onSubmit={handleSave}>
                    <div className="mb-4">
                        <label className="block mb-1">Nama Lengkap</label>
                        <input type="text" value={editingTeacher?.name || ''} onChange={e => setEditingTeacher({...editingTeacher, name: e.target.value})} className="w-full p-2 border rounded" />
                    </div>
                     <div className="mb-4">
                        <label className="block mb-1">User ID</label>
                        <input type="text" value={editingTeacher?.userId || ''} onChange={e => setEditingTeacher({...editingTeacher, userId: e.target.value})} className="w-full p-2 border rounded" />
                    </div>
                     <div className="mb-4">
                        <label className="block mb-1">Password</label>
                        <input type="password" onChange={e => setEditingTeacher({...editingTeacher, password: e.target.value})} className="w-full p-2 border rounded" placeholder={editingTeacher?.id ? "Kosongkan jika tidak ganti" : ""} />
                    </div>
                    <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded-lg">Simpan</button>
                </form>
            </Modal>
        </>
    );
};

const ClassManagement: React.FC = () => {
    const [classes, setClasses] = useState<Class[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const [selectedClass, setSelectedClass] = useState<Class | null>(null);
    const [editingClass, setEditingClass] = useState<Partial<Class> | null>(null);

    const fetchClasses = async () => {
        setClasses(await api.getClasses());
    };

    useEffect(() => {
        fetchClasses();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingClass || !editingClass.name || !editingClass.grade) {
            alert("Harap isi semua kolom.");
            return;
        }
        
        const classData: Omit<Class, 'id'> = {
            name: editingClass.name,
            grade: editingClass.grade
        };

        await api.addClass(classData);
        await fetchClasses();

        setIsModalOpen(false);
        setEditingClass(null);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Yakin ingin menghapus kelas ini?")) {
            await api.deleteClass(id);
            setClasses(classes.filter(c => c.id !== id));
        }
    };
    
    const showQrCode = (cls: Class) => {
        setSelectedClass(cls);
        setIsQrModalOpen(true);
    };
    
    const printQrCode = () => {
      const canvas = document.getElementById('qr-code-canvas') as HTMLCanvasElement;
      if (canvas) {
        const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
        let downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `qr-code-${selectedClass?.name}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
    };

    return (
        <>
            <CrudTable
                title="Manajemen Kelas"
                columns={['Nama Kelas', 'Tingkat', 'Aksi']}
                data={classes}
                onAdd={() => { setEditingClass({}); setIsModalOpen(true); }}
                renderRow={(cls: Class) => (
                    <tr key={cls.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{cls.name}</td>
                        <td className="p-3">{cls.grade}</td>
                        <td className="p-3 space-x-2">
                             <button onClick={() => showQrCode(cls)} className="text-blue-600 hover:underline">QR Code</button>
                            <button onClick={() => handleDelete(cls.id)} className="text-red-600 hover:underline">Hapus</button>
                        </td>
                    </tr>
                )}
            />
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Form Kelas">
                <form onSubmit={handleSave}>
                    <div className="mb-4">
                        <label className="block mb-1">Nama Kelas</label>
                        <input type="text" value={editingClass?.name || ''} onChange={e => setEditingClass({...editingClass, name: e.target.value})} className="w-full p-2 border rounded" />
                    </div>
                     <div className="mb-4">
                        <label className="block mb-1">Tingkat</label>
                        <input type="number" value={editingClass?.grade || ''} onChange={e => setEditingClass({...editingClass, grade: parseInt(e.target.value) || undefined })} className="w-full p-2 border rounded" />
                    </div>
                    <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded-lg">Simpan</button>
                </form>
            </Modal>
            <Modal isOpen={isQrModalOpen} onClose={() => setIsQrModalOpen(false)} title={`QR Code untuk ${selectedClass?.name}`}>
                <div className="text-center">
                    <QRCode id="qr-code-canvas" value={JSON.stringify({ type: 'attendance', classId: selectedClass?.id })} size={256} />
                    <button onClick={printQrCode} className="mt-4 bg-green-500 text-white px-4 py-2 rounded-lg">Download / Print</button>
                </div>
            </Modal>
        </>
    );
};

const ScheduleManagement: React.FC = () => {
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [teachers, setTeachers] = useState<User[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setSchedules(await api.getSchedules());
            setTeachers(await api.getUsersByRole(UserRoleEnum.TEACHER));
            setClasses(await api.getClasses());
        };
        fetchData();
    }, []);

    const getTeacherName = (id: string) => teachers.find(t => t.id === id)?.name || 'N/A';
    const getClassName = (id: string) => classes.find(c => c.id === id)?.name || 'N/A';
    
    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-4">Semua Jadwal Pelajaran</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="p-3">Guru</th>
                            <th className="p-3">Kelas</th>
                            <th className="p-3">Hari</th>
                            <th className="p-3">Jam Ke</th>
                        </tr>
                    </thead>
                    <tbody>
                        {schedules.map(s => (
                             <tr key={s.id} className="border-b">
                                <td className="p-3">{getTeacherName(s.teacherId)}</td>
                                <td className="p-3">{getClassName(s.classId)}</td>
                                <td className="p-3">{s.day}</td>
                                <td className="p-3">{s.lessonHour}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const AttendanceReport: React.FC = () => {
    const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
    const [teachers, setTeachers] = useState<User[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    
    useEffect(() => {
        const fetchData = async () => {
            setAllAttendance(await api.getAttendanceRecords());
            setTeachers(await api.getUsersByRole(UserRoleEnum.TEACHER));
            setClasses(await api.getClasses());
        };
        fetchData();
    }, []);

    const [filters, setFilters] = useState({ date: '', teacherId: '', classId: '' });
    
    const filteredAttendance = useMemo(() => {
        return allAttendance.filter(rec => {
            const recDate = rec.scanTime.split('T')[0];
            const dateMatch = !filters.date || recDate === filters.date;
            const teacherMatch = !filters.teacherId || rec.teacherId === filters.teacherId;
            const classMatch = !filters.classId || rec.classId === filters.classId;
            return dateMatch && teacherMatch && classMatch;
        });
    }, [allAttendance, filters]);

    const getTeacherName = (id: string) => teachers.find(t => t.id === id)?.name || 'N/A';
    const getClassName = (id: string) => classes.find(c => c.id === id)?.name || 'N/A';

    const handleExport = (format: 'pdf' | 'excel') => {
        const dataToExport = filteredAttendance.map(rec => ({
            'Nama Guru': getTeacherName(rec.teacherId),
            'Kelas': getClassName(rec.classId),
            'Tanggal': new Date(rec.scanTime).toLocaleDateString('id-ID'),
            'Waktu': new Date(rec.scanTime).toLocaleTimeString('id-ID'),
            'Jam Ke': rec.lessonHour,
        }));

        if (format === 'excel') {
            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Absensi");
            XLSX.writeFile(workbook, "Laporan_Absensi.xlsx");
        } else if (format === 'pdf') {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            doc.text("Laporan Absensi", 10, 10);
            (doc as any).autoTable({
                head: [['Nama Guru', 'Kelas', 'Tanggal', 'Waktu', 'Jam Ke']],
                body: dataToExport.map(Object.values),
            });
            doc.save('Laporan_Absensi.pdf');
        }
    };
    
    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-4">Laporan Absensi</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 border rounded-lg">
                <input type="date" value={filters.date} onChange={e => setFilters({...filters, date: e.target.value})} className="p-2 border rounded" />
                <select value={filters.teacherId} onChange={e => setFilters({...filters, teacherId: e.target.value})} className="p-2 border rounded">
                    <option value="">Semua Guru</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <select value={filters.classId} onChange={e => setFilters({...filters, classId: e.target.value})} className="p-2 border rounded">
                     <option value="">Semua Kelas</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button onClick={() => setFilters({ date: '', teacherId: '', classId: '' })} className="p-2 bg-gray-200 rounded">Reset Filter</button>
            </div>
             <div className="flex gap-2 mb-4">
                <button onClick={() => handleExport('excel')} className="bg-green-600 text-white px-4 py-2 rounded">Export Excel</button>
            </div>
            <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="p-3">Guru</th><th className="p-3">Kelas</th>
                            <th className="p-3">Waktu Scan</th><th className="p-3">Jam Ke</th>
                        </tr>
                    </thead>
                     <tbody>
                        {filteredAttendance.map(rec => (
                             <tr key={rec.id} className="border-b">
                                <td className="p-3">{getTeacherName(rec.teacherId)}</td>
                                <td className="p-3">{getClassName(rec.classId)}</td>
                                <td className="p-3">{new Date(rec.scanTime).toLocaleString('id-ID')}</td>
                                <td className="p-3">{rec.lessonHour}</td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
            </div>
        </div>
    );
};

// --- Login/Register Component ---

const AuthScreen: React.FC<{ onLoginSuccess: (user: User) => void }> = ({ onLoginSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState<UserRole>(UserRoleEnum.TEACHER);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);


    const handleLogin = async () => {
        setLoading(true);
        const user = await api.loginUser(userId, password);
        if (user) {
            onLoginSuccess(user);
        } else {
            setError('User ID atau Password salah.');
        }
        setLoading(false);
    };

    const handleRegister = async () => {
        if (!userId || !password || !name) {
            setError('Semua kolom wajib diisi.');
            return;
        }
        setLoading(true);
        const result = await api.registerUser({ userId, password, name, role });
        if (result.success) {
            alert('Registrasi berhasil! Silakan login.');
            setIsLogin(true);
            setError('');
        } else {
            setError(result.message || 'Terjadi kesalahan saat registrasi.');
        }
        setLoading(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (isLogin) {
            handleLogin();
        } else {
            handleRegister();
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
                <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">{isLogin ? 'Login' : 'Daftar'}</h2>
                {error && <p className="bg-red-100 text-red-700 p-3 rounded-md mb-4">{error}</p>}
                <form onSubmit={handleSubmit}>
                    {!isLogin && (
                         <div className="mb-4">
                            <label className="block text-gray-700 mb-2">Nama Lengkap</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                        </div>
                    )}
                     <div className="mb-4">
                        <label className="block text-gray-700 mb-2">User ID</label>
                        <input type="text" value={userId} onChange={e => setUserId(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                    </div>
                     <div className="mb-6">
                        <label className="block text-gray-700 mb-2">Password</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                    </div>
                    {!isLogin && (
                         <div className="mb-4">
                            <label className="block text-gray-700 mb-2">Daftar Sebagai</label>
                            <select value={role} onChange={e => setRole(e.target.value as UserRole)} className="w-full px-3 py-2 border rounded-lg">
                                <option value={UserRoleEnum.TEACHER}>Guru</option>
                                <option value={UserRoleEnum.ADMIN}>Admin</option>
                            </select>
                        </div>
                    )}
                    <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition duration-300 disabled:bg-blue-300" disabled={loading}>
                        {loading ? <Spinner/> : (isLogin ? 'Login' : 'Daftar')}
                    </button>
                </form>
                <p className="text-center text-gray-600 mt-4">
                    {isLogin ? "Belum punya akun?" : "Sudah punya akun?"}
                    <button onClick={() => setIsLogin(!isLogin)} className="text-blue-600 hover:underline ml-1">
                        {isLogin ? 'Daftar di sini' : 'Login di sini'}
                    </button>
                </p>
            </div>
        </div>
    );
};


// --- Main App Component ---

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    const handleLoginSuccess = (user: User) => {
        const { password, ...userWithoutPassword } = user;
        setCurrentUser(userWithoutPassword);
    };

    const handleLogout = () => {
        setCurrentUser(null);
    };

    if (!currentUser) {
        return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
    }

    if (currentUser.role === UserRoleEnum.ADMIN) {
        return <AdminDashboard user={currentUser} onLogout={handleLogout} />;
    }

    if (currentUser.role === UserRoleEnum.TEACHER) {
        return <TeacherDashboard user={currentUser} onLogout={handleLogout} />;
    }

    return <div>Role tidak diketahui.</div>;
};

export default App;