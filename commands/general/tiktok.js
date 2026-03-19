import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export default {
    data: new SlashCommandBuilder()
        .setName('tiktok')
        .setDescription('Download Video TikTok Tanpa Watermark')
        .addStringOption(option => 
            option.setName('url')
                .setDescription('Link Video TikTok')
                .setRequired(true)),
    run: async (client, interaction) => {
        await interaction.deferReply().catch(() => {});

        const user = interaction.user;
        const tag = `${user.username}#${user.discriminator || '0'}`;
        const tiktokUrl = interaction.options.getString('url');
        const tempId = Date.now();
        const outputPath = path.join(process.cwd(), `tiktok_${tempId}.mp4`);
        const startTime = Date.now();

        console.log(`[${tag}] - TK_REQUEST - Link: ${tiktokUrl}`);

        try {
            await interaction.editReply('⚙️ Sedang mengambil video TikTok tanpa watermark...');

            // --- STEP 1: DOWNLOAD PAKAI YT-DLP ---
            // yt-dlp secara otomatis nyari format terbaik tanpa watermark di TikTok
            const ttProcess = spawn('yt-dlp', [
                '--no-playlist',
                '--no-check-certificates',
                '-f', 'b', // ambil format best (biasanya mp4 tanpa watermark)
                '-o', outputPath,
                tiktokUrl
            ]);

            await new Promise((resolve, reject) => {
                ttProcess.on('close', (code) => {
                    if (code === 0) resolve();
                    else reject(new Error(`Gagal download (Code ${code})`));
                });
            });

            if (!fs.existsSync(outputPath)) throw new Error('File video tidak ditemukan.');

            const stats = fs.statSync(outputPath);
            const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

            // Cek Limit Discord (Misal 25MB)
            if (stats.size > 25 * 1024 * 1024) {
                throw new Error(`Ukuran file terlalu besar (${fileSizeMB}MB). Limit Discord adalah 25MB.`);
            }

            // --- STEP 2: KIRIM LANGSUNG KE DISCORD ---
            console.log(`[${tag}] - TK_SENDING - Size: ${fileSizeMB}MB`);
            await interaction.editReply('🚀 Berhasil! Sedang mengirim video ke sini...');

            const attachment = new AttachmentBuilder(outputPath, { name: `tiktok_archilldev_${tempId}.mp4` });

            await interaction.editReply({ 
                content: `✅ **TikTok Berhasil Diunduh!**\nRequested by: ${user}`,
                files: [attachment] 
            });

            console.log(`[${tag}] - TK_SUCCESS - Done in ${((Date.now() - startTime) / 1000).toFixed(2)}s`);

            // Hapus file sampah
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

        } catch (e) {
            console.error(`[${tag}] - TK_ERROR - ${e.message}`);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            
            await interaction.editReply(`❌ **Gagal:** ${e.message}`);
        }
    },
};