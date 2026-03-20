import { GoogleGenAI } from "@google/genai";

// Konfigurasi API Client (Pastikan API Key lo ada di .env)
const ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_KEY
});

/**
 * Menganalisa transcript video menggunakan Gemini 3
 * @param {string} transcript - Teks transcript mentah
 * @param {string} focus - Fokus konten (hype/daging/funny)
 * @returns {object} - Objek berisi array momen viral
 */
export async function analyzeTranscript(transcript, focus) {
    console.log(`[AI-HANDLER] Analyzing with High-Precision Prompt (Focus: ${focus})...`);

    const prompt = `
    Analisa transcript YouTube berikut untuk membuat clip viral pendek (Shorts/TikTok/Reels).
    
    TRANSCRIPT:
    "${transcript}"

    TUGAS LO (WAJIB PATUH):
    1. CARI MOMEN: Pilih 2 momen paling ${focus} yang BERBEDA topiknya. Jangan duplikat!
    2. AKURASI WAKTU: Cari titik start saat pembicara MULAI membahas topik baru, dan titik end saat pembicara SELESAI kalimatnya.
    3. PADDING (PENTING): Berikan jeda 1-2 detik sebelum start dan 2-3 detik setelah end agar kalimat pembicara tidak terpotong (ngomongnya tuntas).
    4. DURASI: Setiap momen harus berdurasi antara 20 sampai 50 detik.
    5. JUDUL: Buat judul clickbait "ArchillClip_Judul" yang sangat menarik dalam Bahasa Indonesia.

    OUTPUT FORMAT (HANYA JSON):
    {
      "moments": [
        {
          "id": 1,
          "start_time": "HH:MM:SS",
          "duration": 30,
          "clickbait_title": "Judul_Viral_Satu",
          "reason": "Alasan kenapa momen ini daging/hype"
        }
      ]
    }

    PERINGATAN: 
    - JANGAN memberikan dua momen yang membahas hal yang sama.
    - Pastikan start_time sesuai dengan konteks kalimat di transcript.
    - Output HARUS JSON murni tanpa teks tambahan.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", 
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                temperature: 0.3 // Kita turunin biar AI lebih fokus dan gak "ngelantur"
            }
        });

        const resultData = JSON.parse(response.text.replace(/```json/g, "").replace(/```/g, "").trim());
        
        // Filter Duplikat (Jaga-jaga kalau AI bandel)
        const uniqueMoments = [];
        const seenTimes = new Set();
        
        for (const m of resultData.moments) {
            if (!seenTimes.has(m.start_time)) {
                uniqueMoments.push(m);
                seenTimes.add(m.start_time);
            }
        }
        
        resultData.moments = uniqueMoments;
        console.log(`[AI-HANDLER] Found ${resultData.moments.length} unique & precise moments.`);
        return resultData;

    } catch (error) {
        console.error(`[AI-HANDLER_ERROR] ${error.message}`);
        throw error;
    }
}