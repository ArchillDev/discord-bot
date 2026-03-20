// import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
// import { GoogleGenAI } from "@google/genai";
// import { spawn } from 'child_process';
// import fs from 'fs';
// import path from 'path';
// import os from 'os';
// import axios from 'axios';
// import FormData from 'form-data';

// // --- GLOBAL QUEUE SYSTEM ---
// const clipQueue = [];
// let isProcessing = false;

// /**
//  * Fungsi Penambah Antrian
//  */
// const addToQueue = (task) => {
//     return new Promise((resolve, reject) => {
//         clipQueue.push({ task, resolve, reject });
//         processQueue();
//     });
// };

// /**
//  * Mesin Penjalan Antrian (Satu per satu)
//  */
// const processQueue = async () => {
//     if (isProcessing || clipQueue.length === 0) return;
    
//     isProcessing = true;
//     const { task, resolve, reject } = clipQueue.shift();

//     try {
//         const result = await task();
//         resolve(result);
//     } catch (err) {
//         reject(err);
//     } finally {
//         isProcessing = false;
//         // Jeda 3 detik sebelum lanjut ke orang berikutnya biar CPU napas
//         setTimeout(processQueue, 3000);
//     }
// };

// // --- CONFIGURATION ---
// const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_KEY });

// // Skema JSON agar output AI konsisten & Anti-Bug
// const AI_SCHEMA = {
//     description: "Analisa momen terbaik dan judul clickbait viral",
//     type: "object",
//     properties: {
//         moments: {
//             type: "array",
//             items: {
//                 type: "object",
//                 properties: {
//                     id: { type: "number" },
//                     start_time: { type: "string", description: "Format HH:MM:SS" },
//                     duration: { type: "number", description: "Detik (20-50)" },
//                     clickbait_title: { type: "string", description: "Judul penasaran" },
//                     title: { type: "string", description: "Judul teknis isi" },
//                     reason: { type: "string", description: "Alasan dipilih" }
//                 },
//                 required: ["id", "start_time", "duration", "clickbait_title", "title", "reason"]
//             }
//         }
//     },
//     required: ["moments"]
// };

// export default {
//     data: new SlashCommandBuilder()
//         .setName('clip')
//         .setDescription('AI Highlights: Potong Momen Viral Otomatis (Catbox HQ)')
//         .addStringOption(option => 
//             option.setName('url')
//                 .setDescription('Link YouTube Video')
//                 .setRequired(true))
//         .addStringOption(option =>
//             option.setName('focus')
//                 .setDescription('Fokus konten clip')
//                 .addChoices(
//                     { name: '🔥 Hype/Seru (Gaming/Vlog)', value: 'hype' },
//                     { name: '💡 Ilmu/Daging (Podcast/Tutorial)', value: 'daging' },
//                     { name: '😂 Lucu/Meme', value: 'funny' }
//                 )),

//     run: async (client, interaction) => {
        
//         await interaction.deferReply();

//         const videoUrl = interaction.options.getString('url');
//         if (!isValidYoutubeUrl(videoUrl)) {
//             return interaction.editReply("❌ **Link YouTube nggak valid, Raka!** Masukin link yang bener (Contoh: https://youtube.com/watch?v=xxxx)");
//         }

//         if (isProcessing || clipQueue.length > 0) {
//             await interaction.editReply(`⏳ **Antrian Terdeteksi!** Kamu di posisi ke-**${clipQueue.length + 1}**. Bot lagi ngerender clip lain, tunggu ya Raka...`);
//         }

        
        
        
//         const focusType = interaction.options.getString('focus') || 'hype';

//         await addToQueue(async () => {
//         const tempId = Date.now();
//         const jobId = `clip_${tempId}_${interaction.user.id}`;
//         const tempDir = path.join(os.tmpdir(), jobId);

//         // Buat folder kerja unik agar tidak bentrok antar user
//         if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

//         try {

//             console.log(`[CLIP] Job Start: ${jobId}`);
            
//             // --- STEP 1: TRANSCRIPT ENGINE ---
//             await interaction.editReply('📡 **Step 1/5: Menarik Data Transcript...**');
//             const transcriptData = await getTranscript(videoUrl, tempDir);
            
//             if (!transcriptData || transcriptData.length < 10) {
//                 throw new Error("Gagal mengambil transcript. Pastikan video memiliki subtitle atau auto-caption.");
//             }

//             await interaction.editReply(`✅ **Transcript didapat (${transcriptData.length} karakter).**\n🧠 **Step 2: Menghubungi Gemini AI...**`);

//             // --- STOP: LANJUT KE PART 2 (AI ANALYZER) SETELAH RAKA KONFIRMASI ---

//             // --- STEP 2: GEMINI AI ANALYSIS ---
//             await interaction.editReply('🧠 **Step 2/5: Menganalisa momen & judul viral via Gemini 3...**');

//             try {
//                 const response = await ai.models.generateContent({
//                     model: "gemini-3-flash-preview", // Pake model terbaru sesuai docs lo
//                     contents: [
//                         {
//                             role: "user",
//                             parts: [{ text: `Analisa transcript ini: "${transcriptData}". Cari 1-3 momen (20-50s) kategori ${focusType}. Berikan jawaban HANYA JSON sesuai skema: ${JSON.stringify(AI_SCHEMA)}` }]
//                         }
//                     ],
//                     config: {
//                         responseMimeType: "application/json",
//                         temperature: 0.7
//                     }
//                 });

//                 const text = response.text;
//                 // Bersihin kode blok ```json kalo si AI ngeyel ngasih markdown
//                 const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
//                 const resultData = JSON.parse(cleanJson);

//                 if (!resultData.moments || resultData.moments.length === 0) {
//                     throw new Error("AI tidak menemukan momen yang pas.");
//                 }

//             // --- STOP: LANJUT KE PART 3 (FFMPEG ENGINE) SETELAH RAKA KONFIRMASI ---

//             // --- STEP 3: SEQUENTIAL RENDERING (FFmpeg Queue) ---
//             await interaction.editReply('🎬 **Step 3/5: Memulai Antrian Rendering...**');

//             const renderedClips = [];
//             const moments = resultData.moments;

//             // Kita looping satu-satu biar CPU stabil (Zero Bug)
//             for (const moment of moments) {
//                 const clipName = `clip_${moment.id}_${tempId}.mp4`;
//                 const clipOutputPath = path.join(tempDir, clipName);
                
//                 console.log(`[CLIP] [${jobId}] Rendering Clip #${moment.id}: ${moment.clickbait_title}`);
//                 await interaction.editReply(`✂️ **Rendering Clip ${moment.id}/${moments.length}:** *${moment.clickbait_title}*...`);

//                 try {
//                     const startTimeFormatted = formatTimestamp(m.start_time);
//                     await renderClip(videoUrl, startTimeFormatted, m.duration, outputPath);
                    
//                     // Pastikan file beneran ada dan nggak kosong (0 byte)
//                     if (fs.existsSync(clipOutputPath) && fs.statSync(clipOutputPath).size > 0) {
//                         renderedClips.push({
//                             path: clipOutputPath,
//                             title: moment.clickbait_title,
//                             id: moment.id,
//                             reason: moment.reason
//                         });
//                         console.log(`[CLIP] [${jobId}] Success Render: ${clipName}`);
//                     }
//                 } catch (aiError) {
//                     console.error("[GEMINI_3_ERROR]", aiError);
//                     throw new Error("Gagal koneksi ke Gemini 3 API.");
//                 }
//             }

//             if (renderedClips.length === 0) {
//                 throw new Error("Semua proses rendering gagal. Pastikan FFmpeg & yt-dlp terinstall.");
//             }

//             await interaction.editReply(`✅ **Rendering Selesai! (${renderedClips.length} Clip)**\n🚀 **Step 4: Mengunggah High-Quality ke Catbox...**`);

//             // --- STOP: LANJUT KE PART 4 (CATBOX UPLOADER) SETELAH RAKA KONFIRMASI ---

//             // --- STEP 4: MULTI-UPLOAD TO CATBOX (NO COMPRESSION) ---
//             await interaction.editReply('📦 **Step 4/5: Mengunggah High-Quality Clips ke Catbox...**');

//             const finalEmbeds = [];
//             const actionRows = [];

//             for (const clip of renderedClips) {
//                 console.log(`[CLIP] [${jobId}] Uploading Clip #${clip.id} to Catbox...`);
//                 await interaction.editReply(`☁️ **Uploading Clip ${clip.id}/${renderedClips.length}:** *${clip.title}*...`);

//                 try {
//                     // Pakai fungsi upload Catbox (Daging banget, tanpa limit 25MB)
//                     const catboxLink = await uploadToCatbox(clip.path);
                    
//                     if (catboxLink) {
//                         const clipEmbed = new EmbedBuilder()
//                             .setTitle(`🎬 Clip #${clip.id}: ${clip.title}`)
//                             .setURL(catboxLink)
//                             .setColor('#00FF7F')
//                             .setDescription(`✅ **Momen Berhasil Di-clip!**\n📝 *${clip.title}*\n\n💡 **Insight AI:** ${clip.reason}`)
//                             .setFooter({ text: `ArchillDev AI • High Quality Render` });
                        
//                         finalEmbeds.push(clipEmbed);

//                         // Button download biar user bisa ambil buat bahan edit lagi
//                         const row = new ActionRowBuilder().addComponents(
//                             new ButtonBuilder()
//                                 .setLabel(`Download Clip #${clip.id}`)
//                                 .setURL(catboxLink)
//                                 .setStyle(ButtonStyle.Link)
//                                 .setEmoji('📥')
//                         );
//                         actionRows.push(row);
//                     }
//                 } catch (uploadError) {
//                     console.error(`[CLIP_ERROR] Failed to upload clip ${clip.id}:`, uploadError);
//                     // Lanjut ke clip berikutnya kalau satu gagal
//                 }
//             }

//             // --- STEP 5: FINAL OUTPUT ---
//             if (finalEmbeds.length > 0) {
//                 // Discord limit max 5 action rows & 10 embeds per message (aman)
//                 await interaction.editReply({ 
//                     content: `🚀 **Selesai!** Ini dia momen "Daging" buat lo dengan kualitas jernih, Raka.`, 
//                     embeds: finalEmbeds, 
//                     components: actionRows.slice(0, 5) 
//                 });
//             } else {
//                 throw new Error("Gagal mengunggah semua clip ke Catbox.");
//             }

//         await interaction.editReply('🎬 **Giliranmu tiba!** Memulai proses AI & Rendering...');

//         } catch (error) {
//             console.error(`[CLIP_FATAL_ERROR]`, error);
//             if (!interaction.replied) await interaction.editReply(`❌ **Fatal Error:** ${error.message}`);
//             else await interaction.followUp(`❌ **Proses Terhenti:** ${error.message}`).catch(() => {});
//         } finally {
//             // --- AUTO CLEANUP (Penting biar VPS nggak meledak) ---
//             if (fs.existsSync(tempDir)) {
//                 fs.rmSync(tempDir, { recursive: true, force: true });
//                 console.log(`[CLIP] [${jobId}] Temporary files cleaned up.`);
//             }
//         }
//         return true;  

    
//         }); // Penutup addToQueue
//     }
// };



// // --- STOP: LANJUT KE PART 5 (HELPER FUNCTIONS) SETELAH RAKA KONFIRMASI ---


// /**
//  * Helper: Ambil Transcript menggunakan yt-dlp (Auto-Sub Engine)
//  */
// function getTranscript(url, dir) {
//     return new Promise(res => {
//         // Tambahin flag --write-subs & --all-subs biar semua jenis sub ditarik
//         const child = spawn('yt-dlp', [
//             '--skip-download',
//             '--write-subs',         // Ambil sub yang dibuat manual oleh creator
//             '--write-auto-subs',    // Ambil sub buatan AI YouTube
//             '--sub-lang', 'id,en.*', // Ambil indo atau semua jenis inggris
//             '--output', path.join(dir, 'sub'),
//             url
//         ]);

//         child.on('close', () => {
//             // Cari file apapun yang depannya 'sub.' dan belakangnya '.srt' atau '.vtt'
//             const files = fs.readdirSync(dir).filter(f => f.startsWith('sub.') && (f.endsWith('.srt') || f.endsWith('.vtt')));
            
//             if (files.length > 0) {
//                 // Ambil file pertama yang ketemu
//                 const subPath = path.join(dir, files[0]);
//                 const content = fs.readFileSync(subPath, 'utf8');
                
//                 // Bersihin sampah-sampah timing & tag HTML
//                 const clean = content
//                     .replace(/\d+\r?\n\d{2}:\d{2}:\d{2},\d{3}.*/g, '') // SRT Timing
//                     .replace(/\d{2}:\d{2}:\d{2}.\d{3} --> .*/g, '')    // VTT Timing
//                     .replace(/<[^>]*>/g, '')                           // HTML Tags
//                     .replace(/WEBVTT/g, '')                            // VTT Header
//                     .replace(/Kind: captions/g, '')
//                     .replace(/Language: .*/g, '')
//                     .replace(/^\s*[\r\n]/gm, '')                       // Baris kosong
//                     .substring(0, 15000); 

//                 res(clean);
//             } else {
//                 console.error("[TRANSCRIPT_ERROR] No subtitle files found in directory.");
//                 res(null);
//             }
//         });
//     });
// }

// /**
//  * Helper: FFmpeg Precision Rendering (High Quality)
//  */
// function renderClip(url, start, duration, outputPath) {
//     return new Promise((res, rej) => {
//         // Teknik Fast-Seek (-ss sebelum -i) agar render instan
//         const ff = spawn('ffmpeg', [
//             '-ss', start, 
//             '-t', duration.toString(), 
//             '-i', url, 
//             '-c:v', 'libx264', 
//             '-preset', 'veryfast', 
//             '-crf', '22', // Kualitas Jernih (Daging!)
//             '-c:a', 'aac', 
//             '-b:a', '128k',
//             '-y', 
//             outputPath
//         ]);

//         let err = "";
//         ff.stderr.on('data', (d) => err += d.toString());

//         ff.on('close', (code) => {
//             if (code === 0) res();
//             else {
//                 console.error("FFmpeg Error:", err);
//                 rej(new Error(`Rendering gagal (Code ${code})`));
//             }
//         });
//     });
// }

// /**
//  * Helper: Upload ke Catbox API (High Quality Storage)
//  */
// async function uploadToCatbox(file) {
//     const fd = new FormData();
//     fd.append('reqtype', 'fileupload');
//     fd.append('fileToUpload', fs.createReadStream(file));

//     try {
//         const resp = await axios.post('https://catbox.moe/user/api.php', fd, { 
//             headers: fd.getHeaders(),
//             maxContentLength: Infinity,
//             maxBodyLength: Infinity
//         });
//         return resp.data; // Balikin URL (https://files.catbox.moe/xxx.mp4)
//     } catch (e) {
//         console.error("Catbox Upload Error:", e.message);
//         return null;
//     }
// }

// /**
//  * Helper: Validasi URL YouTube agar bot nggak crash kalau dikasih link sampah
//  */
// function isValidYoutubeUrl(url) {
//     const p = /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
//     return url.match(p);
// }

// /**
//  * Helper: Memastikan format waktu start_time selalu HH:MM:SS atau MM:SS
//  * Kadang Gemini ngasih format "1:20" (tanpa 0 di depan), ini buat benerin itu.
//  */
// function formatTimestamp(timeStr) {
//     if (!timeStr) return "00:00:00";
    
//     // Pecah berdasarkan ":"
//     const parts = timeStr.split(':').map(p => p.padStart(2, '0'));
    
//     // Jika cuma MM:SS, tambahkan 00 di depan untuk jam (HH:MM:SS)
//     if (parts.length === 2) {
//         return `00:${parts[0]}:${parts[1]}`;
//     } else if (parts.length === 1) {
//         return `00:00:${parts[0]}`;
//     }
    
//     return parts.join(':');
// }


import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { GoogleGenAI } from "@google/genai"; // SDK Terbaru 2026
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import axios from 'axios';
import FormData from 'form-data';

// --- CONFIGURATION ---
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_KEY || "ISI_API_KEY_LO_DI_SINI" });

// Global Queue System
const clipQueue = [];
let isProcessing = false;

const AI_SCHEMA = {
    description: "Analisa momen terbaik dan judul clickbait viral",
    type: "object",
    properties: {
        moments: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    id: { type: "number" },
                    start_time: { type: "string" },
                    duration: { type: "number" },
                    clickbait_title: { type: "string" },
                    title: { type: "string" },
                    reason: { type: "string" }
                },
                required: ["id", "start_time", "duration", "clickbait_title", "title", "reason"]
            }
        }
    },
    required: ["moments"]
};

// Queue Engines
const addToQueue = (task) => new Promise((resolve, reject) => {
    clipQueue.push({ task, resolve, reject });
    processQueue();
});

const processQueue = async () => {
    if (isProcessing || clipQueue.length === 0) return;
    isProcessing = true;
    const { task, resolve, reject } = clipQueue.shift();
    try { await task(); resolve(); } catch (err) { reject(err); } 
    finally { isProcessing = false; setTimeout(processQueue, 3000); }
};

export default {
    data: new SlashCommandBuilder()
        .setName('clip')
        .setDescription('AI Cinematic Clip: Portrait (9:16) - Gemini 3 Powered')
        .addStringOption(o => o.setName('url').setDescription('Link YouTube').setRequired(true))
        .addStringOption(o => o.setName('focus').setDescription('Fokus konten').addChoices(
            { name: '🔥 Hype', value: 'hype' }, 
            { name: '💡 Daging', value: 'daging' }, 
            { name: '😂 Funny', value: 'funny' }
        )),

    run: async (client, interaction) => {
        await interaction.deferReply();
        const videoUrl = interaction.options.getString('url');
        const focusType = interaction.options.getString('focus') || 'hype';

        if (!videoUrl.includes('youtu')) return interaction.editReply("❌ Link YouTube gak valid!");
        if (isProcessing || clipQueue.length > 0) await interaction.editReply(`⏳ Antrian Ke-${clipQueue.length + 1}...`);

        console.log(`\n[NEW_JOB] User: ${interaction.user.tag} | URL: ${videoUrl}`);

        // MASUK KE ANTRIAN
        addToQueue(async () => {
            const tempDir = path.join(os.tmpdir(), `clip_${Date.now()}`);
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

            try {
                // STEP 1: TRANSCRIPT
                console.log(`[STEP 1] Fetching transcript for: ${videoUrl}`);
                await interaction.editReply('📡 **Step 1/5: Ambil Transcript...**');
                const transcript = await getTranscript(videoUrl, tempDir);
                if (!transcript) throw new Error("Gagal ambil transcript (Video gak ada sub).");
                console.log(`[STEP 1] Transcript fetched (${transcript.length} characters)`);

                // STEP 2: GEMINI 3 ANALYSIS
                console.log(`[STEP 2] Sending to Gemini 3 AI (Focus: ${focusType})...`);
                await interaction.editReply('🧠 **Step 2/5: Analisa Gemini 3...**');
                const response = await ai.models.generateContent({
                    model: "gemini-3-flash-preview",
                    contents: [{ role: "user", parts: [{ text: `Analisa: "${transcript}". Pilih 1-3 momen (20-50s) kategori ${focusType}. Output JSON: ${JSON.stringify(AI_SCHEMA)}` }] }],
                    config: { responseMimeType: "application/json", temperature: 0.7 }
                });

                const resultData = JSON.parse(response.text.replace(/```json/g, "").replace(/```/g, "").trim());
                console.log(`[STEP 2] AI found ${resultData.moments.length} moments.`)

                // STEP 3: RENDERING
                const renderedClips = [];
                for (const m of resultData.moments) {
                    const out = path.join(tempDir, `clip_${m.id}.mp4`);
                    console.log(`[STEP 3] Rendering Clip #${m.id}: ${m.start_time} for ${m.duration}s`);
                    await interaction.editReply(`✂️ **Rendering Clip ${m.id}/${resultData.moments.length}:** *${m.clickbait_title}*...`);
                    await renderCinematic(videoUrl, formatTimestamp(m.start_time), m.duration, out);
                    if (fs.existsSync(out)) {
                        console.log(`[STEP 3] Clip #${m.id} Rendered Successfully.`);
                        renderedClips.push({ path: out, title: m.clickbait_title, reason: m.reason });
                    }
                }

                // STEP 4 & 5: UPLOAD & SEND
                const embeds = [], rows = [];
                for (const clip of renderedClips) {
                    console.log(`[STEP 4] Uploading ${clip.title} to Catbox...`);
                    await interaction.editReply(`☁️ **Uploading ${clip.title}...**`);
                    const url = await uploadToCatbox(clip.path);
                    if (url) {
                        console.log(`[STEP 4] Upload Success: ${url}`);
                        embeds.push(new EmbedBuilder().setTitle(clip.title).setURL(url).setColor('#00FF7F').setDescription(`💡 ${clip.reason}`));
                        rows.push(new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Download').setURL(url).setStyle(ButtonStyle.Link)));
                    }
                }
                await interaction.editReply({ content: '🚀 **Selesai!**', embeds, components: rows.slice(0, 5) });
                onsole.log(`[FINISH] Job Completed for ${interaction.user.tag}`);

            } catch (error) {
                console.error(error);
                await interaction.editReply(`❌ **Error:** ${error.message}`);
            } finally {
                if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
            }
        }).catch(err => console.error("Queue Fail:", err));
    }
};

// --- HELPERS ---
function getTranscript(url, dir) {
    return new Promise(res => {
        const child = spawn('yt-dlp', ['--skip-download', '--write-auto-subs', '--sub-lang', 'id,en', '--output', path.join(dir, 'sub'), url]);
        child.on('close', () => {
           
            const files = fs.readdirSync(dir).filter(f => f.startsWith('sub.') && (f.endsWith('.srt') || f.endsWith('.vtt')));
            if (files.length > 0) {
                const content = fs.readFileSync(path.join(dir, files[0]), 'utf8');
                res(content.replace(/\d+\r?\n\d{2}:\d{2}:\d{2},\d{3}.*/g, '').replace(/<[^>]*>/g, '').substring(0, 15000));
            } else res(null);
        });
    });
}

function renderCinematic(url, start, duration, out) {
    return new Promise((res, rej) => {
        console.log(`[FFMPEG] Starting Render...`);
        // STEP A: Ambil Direct Stream URL dari YouTube pake yt-dlp
        const ytdlp = spawn('yt-dlp', ['-g', '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best', url]);
        let streamUrl = '';

        ytdlp.stdout.on('data', (data) => {
            streamUrl += data.toString().trim();
        });

        ytdlp.on('close', (code) => {
            
            if (code !== 0 || !streamUrl) {
                return rej(new Error('Gagal mendapatkan stream URL dari YouTube.'));
            }

            // Pisah link video dan audio (yt-dlp -g biasanya keluarin 2 baris)
            const urls = streamUrl.split('\n');
            const videoLink = urls[0];
            const audioLink = urls[1] || urls[0];

            // STEP B: Kasih Link Mentah tadi ke FFmpeg
            const filter = [
                `[0:v]scale=ih*9/16:ih,boxblur=40:20,setsar=1,scale=1080:1920[bg]`,
                `[0:v]scale=1080:-1[fg]`,
                `[bg][fg]overlay=(W-w)/2:(H-h)/2`
            ].join(';');

            const ff = spawn('ffmpeg', [
                '-ss', start,
                '-t', duration.toString(),
                '-i', videoLink, // Link video mentah
                '-ss', start,
                '-t', duration.toString(),
                '-i', audioLink, // Link audio mentah
                '-filter_complex', filter,
                '-map', '[outv]', // Kita kasih label buat output filter
                '-map', '1:a',    // Ambil audio dari input kedua
                '-c:v', 'libx264',
                '-preset', 'ultrafast',
                '-crf', '28',
                '-c:a', 'aac',
                '-y',
                out
            ].filter(arg => arg !== '[outv]' && arg !== '-map')); 
            
            // Re-adjusting args for simplicity to avoid map errors
            const simpleFF = spawn('ffmpeg', [
                '-ss', start, '-t', duration.toString(), '-i', videoLink,
                '-ss', start, '-t', duration.toString(), '-i', audioLink,
                '-filter_complex', `${filter}[v]`,
                '-map', '[v]', '-map', '1:a',
                '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', '-y', out
            ]);

            simpleFF.on('close', (fcode) => {
                console.log(`\n[FFMPEG] Finished with code ${fcode}`);
                fcode === 0 ? res() : rej(new Error(`FFmpeg Gagal ngerender. Code: ${fcode}`));
            });
            
            // Optional: Munculin log FFmpeg di console biar lo bisa pantau
            simpleFF.stderr.on('data', (d) => {
                if(d.toString().includes('frame=')) {
                    const progress = d.toString().match(/frame=\s*(\d+)/);
                    if(progress) console.log(`[RENDER] Processing frame: ${progress[1]}`);
                }
            });
        });
    });
}

async function uploadToCatbox(file) {
    const fd = new FormData();
    fd.append('reqtype', 'fileupload');
    fd.append('fileToUpload', fs.createReadStream(file));
    try { const r = await axios.post('https://catbox.moe/user/api.php', fd, { headers: fd.getHeaders() }); return r.data; } catch { return null; }
}

function formatTimestamp(t) {
    if (!t) return "00:00:00";
    const p = t.split(':').map(v => v.padStart(2, '0'));
    return p.length === 2 ? `00:${p[0]}:${p[1]}` : (p.length === 1 ? `00:00:${p[0]}` : p.join(':'));
}
