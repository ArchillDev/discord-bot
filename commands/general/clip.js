import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import path from 'path';
import fs from 'fs';

// Import fungsi-fungsi yang bakal kita buat setelah ini
import { getTranscript, downloadSegment } from '../../util/clip/yt-helper.js';
import { analyzeTranscript } from '../../util/clip/ai-handler.js';
import { renderCinematic } from '../../util/clip/video-engine.js';
import { uploadToCatbox } from '../../util/clip/uploader.js';

export default {
    data: new SlashCommandBuilder()
        .setName('clip')
        .setDescription('AI Cinematic Clip: Portrait (9:16) - Structured Version')
        .addStringOption(o => o.setName('url').setDescription('Link YouTube').setRequired(true))
        .addStringOption(o => o.setName('focus').setDescription('Fokus konten (hype/daging/funny)').setRequired(false)),

    run: async (client, interaction) => {
        await interaction.deferReply();
        const videoUrl = interaction.options.getString('url');
        const focus = interaction.options.getString('focus') || 'hype';
        
        // Setup Folder Temp Lokal
        const tempDir = path.join(process.cwd(), 'temp_clips', `job_${Date.now()}`);
        if (!fs.existsSync(path.join(process.cwd(), 'temp_clips'))) fs.mkdirSync(path.join(process.cwd(), 'temp_clips'));
        fs.mkdirSync(tempDir);

        console.log(`\n[START_JOB] User: ${interaction.user.tag} | URL: ${videoUrl}`);

        try {
            // 1. Ambil Transcript
            await interaction.editReply('📡 **Step 1/5: Mengambil Transcript...**');
            const transcript = await getTranscript(videoUrl, tempDir);
            if (!transcript) throw new Error("Video tidak memiliki transcript/subtitle.");

            // 2. Analisa Gemini
            await interaction.editReply('🧠 **Step 2/5: Menganalisa momen via Gemini...**');
            const aiResults = await analyzeTranscript(transcript, focus);

            const finalEmbeds = [];
            const actionRows = [];

            // 3. Proses Setiap Momen yang ditemukan AI
            for (const moment of aiResults.moments) {
                const rawPath = path.join(tempDir, `raw_${moment.id}.mp4`);
                const outPath = path.join(tempDir, `ArchillClip_${moment.clickbait_title.replace(/\s+/g, '_')}.mp4`);

                console.log(`\n[PROCESS] Working on Moment #${moment.id}: ${moment.clickbait_title}`);
                await interaction.editReply(`📥 **Step 3: Downloading & Rendering Clip ${moment.id}/${aiResults.moments.length}...**`);

                // A. Download Potongan Video
                await downloadSegment(videoUrl, moment.start_time, moment.duration, rawPath);

                // B. Render Cinematic
                await renderCinematic(rawPath, outPath);

                // 4. Upload ke Catbox
                if (fs.existsSync(outPath)) {
                    console.log(`[UPLOAD] Uploading to Catbox...`);
                    await interaction.editReply(`☁️ **Step 4: Uploading Clip ${moment.id}...**`);
                    const url = await uploadToCatbox(outPath);

                    if (url) {
                        const embed = new EmbedBuilder()
                            .setTitle(`🎬 ${moment.clickbait_title}`)
                            .setURL(url)
                            .setColor('#00FF7F')
                            .setDescription(`💡 **AI Reason:** ${moment.reason}`)
                            .setFooter({ text: 'ArchillClip AI Engine' });
                        
                        finalEmbeds.push(embed);
                        actionRows.push(new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setLabel('Download').setURL(url).setStyle(ButtonStyle.Link)
                        ));
                    }
                }
            }

            // 5. Kirim Hasil Akhir
            await interaction.editReply({ 
                content: `🚀 **Selesai, Raka!** Momen viral berhasil diproses.`, 
                embeds: finalEmbeds, 
                components: actionRows.slice(0, 5) 
            });

        } catch (error) {
            console.error(`[JOB_FAILED] ${error.message}`);
            await interaction.editReply(`❌ **Error:** ${error.message}`);
        } finally {
            // Bersihkan folder temp
            if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
            console.log(`[CLEANUP] Temp files for job deleted.`);
        }
    }
};