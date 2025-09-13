
export enum UserRole {
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
}

export interface User {
  id: string;
  userId: string;
  password?: string; // Not stored in frontend state after login
  name: string;
  role: UserRole;
  currentSessionId?: string;
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