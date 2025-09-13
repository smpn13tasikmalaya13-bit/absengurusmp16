
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { User, Class, Schedule, AttendanceRecord } from '../types';

// This is a hard requirement. The API key must be read from process.env.API_KEY.
const API_KEY = process.env.API_KEY;

let ai: GoogleGenAI | null = null;
if (API_KEY) {
    ai = new GoogleGenAI({ apiKey: API_KEY });
} else {
    console.error("API_KEY environment variable not set. AI Assistant will not work.");
}

const model = 'gemini-2.5-flash';

interface AnalysisData {
    teachers: User[];
    classes: Class[];
    schedules: Schedule[];
    attendance: AttendanceRecord[];
}

export const getAIAnalysis = async (data: AnalysisData, query: string): Promise<string> => {
    if (!ai) {
        return "Konfigurasi API Key untuk AI tidak ditemukan. Fitur ini tidak dapat digunakan.";
    }
    try {
        const dataString = JSON.stringify(data, null, 2);
        
        // A simple way to prevent overly large contexts. A more robust solution might involve summarizing data.
        const maxContextLength = 150000; 
        const truncatedDataString = dataString.length > maxContextLength ? dataString.substring(0, maxContextLength) + "\n... (data truncated)" : dataString;

        const systemInstruction = `Anda adalah asisten AI yang cerdas untuk menganalisis data absensi guru di sebuah sekolah. Tugas Anda adalah menjawab pertanyaan dari admin berdasarkan data JSON yang disediakan.
- Jawablah pertanyaan secara akurat dan hanya berdasarkan data yang diberikan.
- Jika data tidak cukup untuk menjawab, katakan bahwa Anda tidak memiliki informasi yang cukup.
- Berikan jawaban yang ringkas, jelas, dan profesional dalam Bahasa Indonesia.
- Gunakan format markdown untuk membuat jawaban lebih mudah dibaca (misalnya, list, tebal).
- Data waktu dalam 'scanTime' (absensi) dan 'startTime'/'endTime' (jadwal) adalah relevan. Asumsikan tanggal hari ini adalah ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
- 'boundDeviceId' pada data guru adalah informasi teknis dan tidak perlu disebutkan kecuali ditanya secara spesifik.`;

        const prompt = `Berikut adalah data absensi sekolah dalam format JSON:
\`\`\`json
${truncatedDataString}
\`\`\`

Berdasarkan data di atas, jawablah pertanyaan berikut dengan saksama: "${query}"`;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.3,
                topP: 0.95,
                topK: 64
            }
        });

        return response.text;
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        return "Maaf, terjadi kesalahan saat menghubungi asisten AI. Silakan periksa konsol untuk detailnya dan coba lagi nanti.";
    }
};
