import { spawn } from 'child_process';
import fs from 'fs';

/**
 * Melakukan rendering video menjadi format Cinematic Portrait (9:16)
 * @param {string} input - Path file video mentah (raw)
 * @param {string} output - Path file video hasil render (final)
 */
export function renderCinematic(input, output) {
    return new Promise((resolve, reject) => {
        console.log(`[VIDEO-ENGINE] Starting Cinematic Render for: ${input}`);

        // FILTER COMPLEX: 
        // [bg] Membuat background blur 9:16
        // [fg] Membuat foreground (video utama) di tengah
        const filter = [
            `[0:v]scale=ih*9/16:ih,boxblur=40:20,setsar=1,scale=1080:1920[bg]`,
            `[0:v]scale=1080:-1[fg]`,
            `[bg][fg]overlay=(W-w)/2:(H-h)/2`
        ].join(';');

        const ff = spawn('ffmpeg', [
            '-i', input,
            '-filter_complex', filter,
            '-c:v', 'libx264',
            '-preset', 'ultrafast', // Paling ringan buat CPU
            '-crf', '26',           // Kualitas seimbang, ukuran file kecil
            '-c:a', 'copy',          // Copy audio asli tanpa re-encode (cepet!)
            '-y',                   // Overwrite jika file sudah ada
            output
        ]);

        // MONITOR PROGRESS FRAME
        ff.stderr.on('data', (data) => {
            const msg = data.toString();
            if (msg.includes('frame=')) {
                const frameMatch = msg.match(/frame=\s*(\d+)/);
                if (frameMatch) {
                    process.stdout.write(`\r[VIDEO-ENGINE] Rendering Frame: ${frameMatch[1]}`);
                }
            }
        });

        ff.on('close', (code) => {
            process.stdout.write('\n'); // New line setelah progress frame selesai
            console.log(`[VIDEO-ENGINE] FFmpeg finished with code ${code}`);
            
            if (code === 0 && fs.existsSync(output)) {
                console.log(`[VIDEO-ENGINE] Render Success: ${output}`);
                resolve(output);
            } else {
                console.error(`[VIDEO-ENGINE_ERROR] FFmpeg failed to render.`);
                reject(new Error('Gagal melakukan rendering cinematic.'));
            }
        });
    });
}