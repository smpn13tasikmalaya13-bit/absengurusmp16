import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { QRCodeCanvas as QRCode } from 'qrcode.react';
import type { User, Class, Schedule, AttendanceRecord, UserRole } from './types';
import { UserRole as UserRoleEnum } from './types';
import { useGeolocation } from './hooks/useGeolocation';
import { CENTRAL_COORDINATES, MAX_RADIUS_METERS, DAYS_OF_WEEK, LESSON_HOURS } from './constants';

// FIX: Add declarations for globally available libraries
declare var Html5Qrcode: any;
declare var XLSX: any;
declare global {
    interface Window {
        jspdf: any;
    }
}

// --- MOCK API (using localStorage) ---
const db = {
  getItem: <T,>(key: string): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error reading from localStorage key “${key}”:`, error);
      return null;
    }
  },
  setItem: <T,>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error writing to localStorage key “${key}”:`, error);
    }
  },
};

const initializeMockData = () => {
    if (!db.getItem('users')) {
        const adminUser: User = { id: 'admin1', userId: 'admin', password: 'password', name: 'Admin Utama', role: UserRoleEnum.ADMIN };
        db.setItem('users', [adminUser]);
    }
    if (!db.getItem('classes')) {
        db.setItem('classes', []);
    }
    if (!db.getItem('schedules')) {
        db.setItem('schedules', []);
    }
    if (!db.getItem('attendance')) {
        db.setItem('attendance', []);
    }
};

initializeMockData();

// --- UI Components ---

const Spinner = () => (
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
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
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800">&times;</button>
                </div>
                <div className="p-4">{children}</div>
            </div>
        </div>
    );
};

// --- Teacher Dashboard Components ---
const TeacherDashboard: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
    const [view, setView] = useState<'home' | 'scan' | 'history' | 'schedule'>('home');
    const [schedules, setSchedules] = useState<Schedule[]>(db.getItem('schedules') || []);
    const [classes, setClasses] = useState<Class[]>(db.getItem('classes') || []);
    const { distance, isWithinRadius, error: geoError, loading: geoLoading, refreshLocation } = useGeolocation();

    const userSchedules = useMemo(() => schedules.filter(s => s.teacherId === user.id), [schedules, user.id]);

    const recordAttendance = (classId: string) => {
      const now = new Date();
      // This is a simplified way to get lesson hour. A real app might have defined time slots.
      const currentHour = now.getHours();
      let lessonHour = 0;
      if (currentHour >= 7 && currentHour < 8) lessonHour = 1;
      else if (currentHour >= 8 && currentHour < 9) lessonHour = 2;
      // ... and so on
      else lessonHour = Math.max(1, currentHour - 6);

      const allAttendance: AttendanceRecord[] = db.getItem('attendance') || [];
      const today = now.toISOString().split('T')[0];
      const hasScannedToday = allAttendance.some(
          // FIX: Changed `className` to `classId` to match the function parameter.
          rec => rec.teacherId === user.id && rec.classId === classId && rec.lessonHour === lessonHour && rec.scanTime.startsWith(today)
      );

      if (hasScannedToday) {
          alert('Anda sudah absen untuk jam pelajaran ini.');
          return;
      }

      const newRecord: AttendanceRecord = {
          id: `att-${Date.now()}`,
          teacherId: user.id,
          classId: classId,
          lessonHour,
          scanTime: now.toISOString(),
      };
      db.setItem('attendance', [...allAttendance, newRecord]);
      alert('Absensi berhasil!');
      setView('home');
    };
    
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <header className="bg-white shadow-md p-4 flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Halo, {user.name}</h1>
                <button onClick={onLogout} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition">Logout</button>
            </header>
            <main className="flex-grow p-4 md:p-6">
                {view === 'home' && (
                    <div className="text-center">
                        <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm mx-auto">
                            <h2 className="text-xl font-semibold mb-4">Absensi QR Code</h2>
                            {geoLoading ? <Spinner /> : 
                                geoError ? <p className="text-red-500">Error: {geoError}</p> :
                                <>
                                    <p className="mb-2 text-gray-600">Jarak Anda dari sekolah: {distance?.toFixed(0) ?? '...'} meter</p>
                                    <p className={`font-bold mb-4 ${isWithinRadius ? 'text-green-600' : 'text-red-600'}`}>
                                        {isWithinRadius ? 'Anda berada dalam radius absen' : 'Anda berada di luar radius absen'}
                                    </p>
                                    <button
                                        onClick={() => setView('scan')}
                                        disabled={!isWithinRadius}
                                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold text-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                                    >
                                        Scan QR Absen
                                    </button>
                                     <button onClick={refreshLocation} className="mt-2 text-sm text-blue-500 hover:underline">
                                        Refresh Lokasi
                                     </button>
                                </>
                            }
                        </div>
                    </div>
                )}
                {view === 'scan' && <QRScanner onScanSuccess={recordAttendance} onCancel={() => setView('home')} />}
                {view === 'history' && <TeacherAttendanceHistory user={user} classes={classes}/>}
                {view === 'schedule' && <TeacherScheduleManager user={user} schedules={userSchedules} setSchedules={setSchedules} classes={classes}/>}
            </main>
            <footer className="bg-white shadow-t-md p-2">
                <nav className="flex justify-around">
                    <button onClick={() => setView('home')} className={`p-2 rounded-lg ${view === 'home' && 'bg-blue-100 text-blue-700'}`}>Home</button>
                    <button onClick={() => setView('schedule')} className={`p-2 rounded-lg ${view === 'schedule' && 'bg-blue-100 text-blue-700'}`}>Jadwal</button>
                    <button onClick={() => setView('history')} className={`p-2 rounded-lg ${view === 'history' && 'bg-blue-100 text-blue-700'}`}>Riwayat</button>
                </nav>
            </footer>
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

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSchedule || !editingSchedule.classId || !editingSchedule.day || !editingSchedule.lessonHour) {
            alert("Harap isi semua kolom");
            return;
        }

        const allSchedules: Schedule[] = db.getItem('schedules') || [];
        if (editingSchedule.id) {
            const updatedSchedules = allSchedules.map(s => s.id === editingSchedule.id ? { ...s, ...editingSchedule } as Schedule : s);
            db.setItem('schedules', updatedSchedules);
            setSchedules(updatedSchedules);
        } else {
            const newSchedule: Schedule = {
                id: `sch-${Date.now()}`,
                teacherId: user.id,
                ...editingSchedule
            } as Schedule;
            const updatedSchedules = [...allSchedules, newSchedule];
            db.setItem('schedules', updatedSchedules);
            setSchedules(updatedSchedules);
        }
        setIsModalOpen(false);
        setEditingSchedule(null);
    };
    
    const handleDelete = (id: string) => {
        if(window.confirm("Yakin ingin menghapus jadwal ini?")){
            const allSchedules: Schedule[] = db.getItem('schedules') || [];
            const updatedSchedules = allSchedules.filter(s => s.id !== id);
            db.setItem('schedules', updatedSchedules);
            setSchedules(updatedSchedules);
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
             <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingSchedule?.id ? 'Edit Jadwal' : 'Tambah Jadwal'}>
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
    const attendance: AttendanceRecord[] = useMemo(() => {
        const allAttendance = db.getItem<AttendanceRecord[]>('attendance') || [];
        return allAttendance.filter(rec => rec.teacherId === user.id).sort((a,b) => new Date(b.scanTime).getTime() - new Date(a.scanTime).getTime());
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
    return (
        <div className="flex h-screen bg-gray-100">
            <aside className="w-64 bg-gray-800 text-white flex flex-col">
                <div className="p-4 text-xl font-bold border-b border-gray-700">Admin Panel</div>
                <nav className="flex-grow">
                    <a onClick={() => setView('dashboard')} className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 cursor-pointer">Dashboard</a>
                    <a onClick={() => setView('teachers')} className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 cursor-pointer">Data Guru</a>
                    <a onClick={() => setView('classes')} className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 cursor-pointer">Data Kelas</a>
                    <a onClick={() => setView('schedules')} className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 cursor-pointer">Jadwal Pelajaran</a>
                    <a onClick={() => setView('reports')} className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 cursor-pointer">Laporan Absensi</a>
                </nav>
                <div className="p-4 border-t border-gray-700">
                    <p>{user.name}</p>
                    <button onClick={onLogout} className="text-sm text-red-400 hover:text-red-300">Logout</button>
                </div>
            </aside>
            <main className="flex-1 p-6 overflow-auto">
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
    const attendance = db.getItem<AttendanceRecord[]>('attendance') || [];
    const teachers = db.getItem<User[]>('users')?.filter(u => u.role === UserRoleEnum.TEACHER) || [];
    const classes = db.getItem<Class[]>('classes') || [];

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

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
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
    const [teachers, setTeachers] = useState<User[]>(db.getItem<User[]>('users')?.filter(u => u.role === UserRoleEnum.TEACHER) || []);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState<Partial<User> | null>(null);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTeacher || !editingTeacher.name || !editingTeacher.userId || (!editingTeacher.id && !editingTeacher.password)) {
            alert("Harap isi semua kolom.");
            return;
        }

        const allUsers: User[] = db.getItem('users') || [];

        if (editingTeacher.id) { // Editing
            const updatedUsers = allUsers.map(u => u.id === editingTeacher.id ? { ...u, ...editingTeacher } : u);
            db.setItem('users', updatedUsers);
        } else { // Adding
            const newUser: User = {
                id: `user-${Date.now()}`,
                role: UserRoleEnum.TEACHER,
                ...editingTeacher
            } as User;
            db.setItem('users', [...allUsers, newUser]);
        }
        setTeachers(db.getItem<User[]>('users')?.filter(u => u.role === UserRoleEnum.TEACHER) || []);
        setIsModalOpen(false);
        setEditingTeacher(null);
    };

    const handleDelete = (id: string) => {
        if (window.confirm("Yakin ingin menghapus guru ini? Ini juga akan menghapus jadwal terkait.")) {
            let allUsers = db.getItem<User[]>('users') || [];
            let allSchedules = db.getItem<Schedule[]>('schedules') || [];
            db.setItem('users', allUsers.filter(u => u.id !== id));
            db.setItem('schedules', allSchedules.filter(s => s.teacherId !== id));
            setTeachers(teachers.filter(t => t.id !== id));
        }
    };
    
    const handleReset = (id: string) => {
        if (window.confirm("Yakin ingin mereset akun guru ini? Device yang terhubung akan dihapus.")) {
             let allUsers = db.getItem<User[]>('users') || [];
             const updatedUsers = allUsers.map(u => u.id === id ? {...u, deviceId: undefined} : u);
             db.setItem('users', updatedUsers);
             setTeachers(updatedUsers.filter(u => u.role === UserRoleEnum.TEACHER));
             alert("Akun berhasil direset.");
        }
    }

    return (
        <>
            <CrudTable
                title="Manajemen Guru"
                columns={['Nama', 'User ID', 'Device Terhubung', 'Aksi']}
                data={teachers}
                onAdd={() => { setEditingTeacher({}); setIsModalOpen(true); }}
                renderRow={(teacher: User) => (
                    <tr key={teacher.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{teacher.name}</td>
                        <td className="p-3">{teacher.userId}</td>
                        <td className="p-3">{teacher.deviceId ? 'Ya' : 'Tidak'}</td>
                        <td className="p-3 space-x-2">
                             <button onClick={() => handleReset(teacher.id)} className="text-yellow-600 hover:underline">Reset</button>
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
    const [classes, setClasses] = useState<Class[]>(db.getItem('classes') || []);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const [selectedClass, setSelectedClass] = useState<Class | null>(null);
    const [editingClass, setEditingClass] = useState<Partial<Class> | null>(null);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingClass || !editingClass.name || !editingClass.grade) {
            alert("Harap isi semua kolom.");
            return;
        }
        
        const allClasses: Class[] = db.getItem('classes') || [];

        if (editingClass.id) { // Editing
            const updatedClasses = allClasses.map(c => c.id === editingClass.id ? { ...c, ...editingClass } as Class : c);
            db.setItem('classes', updatedClasses);
        } else { // Adding
            const newClass: Class = {
                id: `cls-${Date.now()}`,
                ...editingClass
            } as Class;
            db.setItem('classes', [...allClasses, newClass]);
        }
        setClasses(db.getItem('classes') || []);
        setIsModalOpen(false);
        setEditingClass(null);
    };

    const handleDelete = (id: string) => {
        if (window.confirm("Yakin ingin menghapus kelas ini?")) {
            const allClasses = db.getItem<Class[]>('classes') || [];
            db.setItem('classes', allClasses.filter(c => c.id !== id));
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
                        <input type="number" value={editingClass?.grade || ''} onChange={e => setEditingClass({...editingClass, grade: parseInt(e.target.value)})} className="w-full p-2 border rounded" />
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
    // This is similar to TeacherScheduleManager but for admin view.
    // For brevity, this will be a simplified view. An admin would manage all schedules.
    // This functionality can be expanded similarly to TeacherManagement.
    const [schedules, setSchedules] = useState<Schedule[]>(db.getItem('schedules') || []);
    const teachers = useMemo(() => db.getItem<User[]>('users')?.filter(u => u.role === UserRoleEnum.TEACHER) || [], []);
    const classes = useMemo(() => db.getItem<Class[]>('classes') || [], []);

    const getTeacherName = (id: string) => teachers.find(t => t.id === id)?.name || 'N/A';
    const getClassName = (id: string) => classes.find(c => c.id === id)?.name || 'N/A';
    
    // CRUD functionality for schedules by admin can be added here using a Modal and form.
    
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
    const allAttendance = useMemo(() => db.getItem<AttendanceRecord[]>('attendance') || [], []);
    const teachers = useMemo(() => db.getItem<User[]>('users')?.filter(u => u.role === UserRoleEnum.TEACHER) || [], []);
    const classes = useMemo(() => db.getItem<Class[]>('classes') || [], []);
    
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
                {/* PDF export requires jspdf-autotable which is not added via CDN for simplicity, so this might not work out of the box. */}
                {/* <button onClick={() => handleExport('pdf')} className="bg-red-600 text-white px-4 py-2 rounded">Export PDF</button> */}
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

    const handleLogin = () => {
        const users: User[] = db.getItem('users') || [];
        const user = users.find(u => u.userId === userId && u.password === password);
        if (user) {
            // Device binding for teachers
            if(user.role === UserRoleEnum.TEACHER) {
                // FIX: Specified generic type for `db.getItem` to ensure `deviceId` is a string.
                const deviceId = db.getItem<string>('deviceId') || `dev-${crypto.randomUUID()}`;
                db.setItem('deviceId', deviceId);

                if(!user.deviceId) { // First login, bind device
                    user.deviceId = deviceId;
                    db.setItem('users', users);
                } else if(user.deviceId !== deviceId) {
                    setError('Akun ini hanya bisa diakses dari perangkat pertama yang digunakan.');
                    return;
                }
            }
            onLoginSuccess(user);
        } else {
            setError('User ID atau Password salah.');
        }
    };

    const handleRegister = () => {
        if (!userId || !password || !name) {
            setError('Semua kolom wajib diisi.');
            return;
        }
        const users: User[] = db.getItem('users') || [];
        if (users.some(u => u.userId === userId)) {
            setError('User ID sudah digunakan.');
            return;
        }
        const newUser: User = {
            id: `user-${Date.now()}`,
            userId, password, name, role
        };
        db.setItem('users', [...users, newUser]);
        alert('Registrasi berhasil! Silakan login.');
        setIsLogin(true);
        setError('');
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
                    <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition duration-300">
                        {isLogin ? 'Login' : 'Daftar'}
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
