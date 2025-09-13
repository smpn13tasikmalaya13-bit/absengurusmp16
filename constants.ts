import type { Coords } from './types';

export const CENTRAL_COORDINATES: Coords = {
  latitude: -7.280611623629184,
  longitude: 108.1959368131391,
};

export const MAX_RADIUS_METERS = 250;

export const DAYS_OF_WEEK: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday')[] = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

export const LESSON_HOURS = Array.from({ length: 8 }, (_, i) => i + 1);

export const HARI_TRANSLATION: { [key in typeof DAYS_OF_WEEK[number]]: string } = {
    'Monday': 'Senin',
    'Tuesday': 'Selasa',
    'Wednesday': 'Rabu',
    'Thursday': 'Kamis',
    'Friday': 'Jumat',
    'Saturday': 'Sabtu',
    'Sunday': 'Minggu'
};