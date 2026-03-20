import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Mengambil transcript dari URL YouTube
 * @param {string} url - Link YouTube
 * @param {string} dir - Folder temporary untuk simpan sub
 */
export function getTranscript(url, dir) {
    return new Promise((resolve) => {
        console.log(`[YT-HELPER] Fetching transcript: ${url}`);
        
        const child = spawn('yt-dlp', [
            '--skip-download',
            '--write-auto-subs',
            '--sub-lang', 'id,en',
            '--output', path.join(dir, 'sub'),
            url
        ]);

        child.on('close', (code) => {
            const files = fs.readdirSync(dir).filter(f => f.startsWith('sub.') && (f.endsWith('.srt') || f.endsWith('.vtt')));
            
            if (files.length > 0) {
                const content = fs.readFileSync(path.join(dir, files[0]), 'utf8');
                
                // Pembersihan teks transcript agar Gemini mudah baca
                const cleanText = content
                    .replace(/\d+\r?\n\d{2}:\d{2}:\d{2},\d{3}.*/g, '')
                    .replace(/\d{2}:\d{2}:\d{2}.\d{3} --> .*/g, '')
                    .replace(/<[^>]*>/g, '')
                    .replace(/WEBVTT|Kind: captions|Language: .*/g, '')
                    .replace(/^\s*[\r\n]/gm, '')
                    .substring(0, 10000); 

                console.log(`[YT-HELPER] Transcript extracted successfully.`);
                resolve(cleanText);
            } else {
                console.error(`[YT-HELPER] No transcript found.`);
                resolve(null);
            }
        });
    });
}

/**
 * Download potongan video KUALITAS TERTINGGI (HQ)
 * @param {string} url - Link YouTube
 * @param {string} start - Waktu mulai (HH:MM:SS)
 * @param {number} duration - Durasi detik
 * @param {string} out - Path output file mentah
 */
export function downloadSegment(url, start, duration, out) {
    return new Promise((resolve, reject) => {
        const rawTmp = out + '.tmp'; // Lokasi file mentah sementara
        console.log(`[YT-HELPER] Phase 1: Downloading Raw File...`);

        // Paksa yt-dlp pakai nama file yang KITA mau (bukan yang dia mau)
        const dl = spawn('yt-dlp', [
            '-f', 'mp4', // Paksa format mp4 biar gak jadi mkv/webm
            '--no-playlist',
            '--force-overwrites',
            '--no-part', // Gak pake file .part, langsung ke nama asli
            '-o', rawTmp,
            url
        ]);

        dl.stdout.on('data', (data) => {
            const msg = data.toString();
            if (msg.includes('%')) {
                process.stdout.write(`\r[YT-HELPER] Download Progress: ${msg.trim()}`);
            }
        });

        dl.on('close', (code) => {
            // Kita cek filenya ada gak (pake pengecekan yang lebih fleksibel)
            if (code !== 0) return reject(new Error('yt-dlp gagal download.'));
            
            // Cari file yang ada tulisan '.tmp' di folder tersebut
            if (!fs.existsSync(rawTmp)) {
                return reject(new Error(`Gagal nemu file mentah: ${rawTmp}`));
            }

            console.log(`\n[YT-HELPER] Phase 2: Cutting Segment with FFmpeg...`);
            
            // POTONG LOKAL (Super Cepat)
            const cut = spawn('ffmpeg', [
                '-ss', start,
                '-t', duration.toString(),
                '-i', rawTmp,
                '-c', 'copy', // Tinggal gunting, gak ngerender ulang
                '-y',
                out
            ]);

            cut.on('close', (fCode) => {
                // Hapus sampah .tmp
                if (fs.existsSync(rawTmp)) fs.unlinkSync(rawTmp);

                if (fCode === 0 && fs.existsSync(out)) {
                    console.log(`[YT-HELPER] Cutting Success: ${out}`);
                    resolve(out);
                } else {
                    reject(new Error('Gagal memotong video (FFmpeg Error).'));
                }
            });
        });
    });
}

/**
 * INTERNAL HELPER: Menghitung waktu akhir untuk rentang download
 */
/**
 * INTERNAL HELPER: Menghitung waktu akhir yang PASTI format HH:MM:SS
 */
function calculateEndTime(start, duration) {
    // 1. Pecah start time dan pastiin jadi detik
    const parts = start.split(':').map(Number);
    let startInSeconds = 0;

    if (parts.length === 3) { // HH:MM:SS
        startInSeconds = (parts[0] * 3600) + (parts[1] * 60) + parts[2];
    } else if (parts.length === 2) { // MM:SS
        startInSeconds = (parts[0] * 60) + parts[1];
    } else { // SS
        startInSeconds = parts[0];
    }

    // 2. Tambahin durasi
    const endInSeconds = startInSeconds + duration;

    // 3. Balikin ke format HH:MM:SS (WAJIB 3 BAGIAN)
    const h = Math.floor(endInSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((endInSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(endInSeconds % 60).toString().padStart(2, '0');

    // 4. Kita juga harus pastiin START TIME nya diformat ulang jadi HH:MM:SS biar sinkron
    return {
        start: formatToFullTime(startInSeconds),
        end: `${h}:${m}:${s}`
    };
}

function formatToFullTime(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}