
export enum UserRole {
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
  PEMBINA_ESKUL = 'PEMBINA_ESKUL',
}

export interface User {
  id: string;
  userId: string;
  password?: string; // Not stored in frontend state after login
  name: string;
  role: UserRole;
  boundDeviceId?: string;
}

export interface Class {
  id: string;
  name: string;
  grade: number;
}

export interface Schedule {
  id: string;
  teacherId: string;
  classId: string;
  subject: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  lessonHour: number; // e.g., 1 for 1st hour
  startTime: string; // e.g., "07:00"
  endTime: string; // e.g., "08:30"
}

export interface AttendanceRecord {
  id: string;
  teacherId: string;
  classId: string;
  lessonHour: number;
  scanTime: string; // ISO string
}

export type Coords = {
  latitude: number;
  longitude: number;
};

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  content: string;
  timestamp: string; // ISO string
  isRead: boolean;
}

// --- Extracurricular Interfaces ---
export interface Eskul {
  id: string;
  name: string;
}

export interface EskulSchedule {
  id: string;
  pembinaId: string;
  eskulId: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  startTime: string; // "14:00"
  endTime: string;   // "16:00"
}

export interface EskulAttendanceRecord {
  id: string;
  pembinaId: string;
  eskulScheduleId: string;
  date: string; // YYYY-MM-DD
  checkInTime: string; // ISO string
  checkOutTime?: string; // ISO string
}
