import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { spawn } from 'child_process';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
// import { stripIndents } from 'common-tags';

export default {
    data: new SlashCommandBuilder()
        .setName('bomboox')
        .setDescription('Convert YouTube to MP3 with Terminal Logs')
        .addStringOption(option => 
            option.setName('url')
                .setDescription('Link YouTube yang ingin diconvert')
                .setRequired(true)),
    run: async (client, interaction) => {
        await interaction.deferReply().catch(() => {});

        const user = interaction.user;
        const tag = `${user.username}#${user.discriminator || '0'}`;
        const youtubeUrl = interaction.options.getString('url');
        const tempId = Date.now();
        const outputMp3 = path.join(process.cwd(), `audio_${tempId}.mp3`);
        const startTime = Date.now();

        // --- INITIAL LOG ---
        console.log(`[${tag}] - REQUEST - Link: ${youtubeUrl}`);

        let videoTitle = "Unknown Title";
        let videoDuration = "Unknown";
        let videoThumbnail = "";

        try {
            // 1. ANALYZE VIDEO
            console.log(`[${tag}] - ANALYZE - Sedang mengambil metadata...`);
            const getMeta = spawn('yt-dlp', [
                '--print', 'title',
                '--print', 'duration_string',
                '--print', 'thumbnail',
                '--no-playlist',
                youtubeUrl
            ]);

            let metaData = "";
            getMeta.stdout.on('data', (data) => metaData += data.toString());
            await new Promise((resolve) => getMeta.on('close', resolve));
            
            const metaLines = metaData.trim().split('\n');
            videoTitle = metaLines[0] || "Video YouTube";
            videoDuration = metaLines[1] || "N/A";
            videoThumbnail = metaLines[2] || "";

            // 2. DOWNLOAD & CONVERT
            console.log(`[${tag}] - DOWNLOAD - Judul: ${videoTitle}`);
            await interaction.editReply({ embeds: [new EmbedBuilder().setTitle('📥 Mendownload...').setColor('#F4C20D').setDescription(`**${videoTitle}** sedang diproses.`)] });

            const ytProcess = spawn('yt-dlp', [
                '--extract-audio',
                '--audio-format', 'mp3',
                '--no-playlist', 
                '--audio-quality', '128K',
                '-o', outputMp3,
                youtubeUrl
            ]);

            await new Promise((resolve, reject) => {
                ytProcess.on('close', (code) => code === 0 ? resolve() : reject(new Error(`Exit Code ${code}`)));
            });

            // 3. UPLOAD
            console.log(`[${tag}] - UPLOAD - Mengirim file ke Catbox...`);
            await interaction.editReply({ embeds: [new EmbedBuilder().setTitle('🚀 Mengunggah...').setColor('#00FF00').setDescription('Mengirim file ke server...')] });

            const form = new FormData();
            form.append('reqtype', 'fileupload');
            form.append('fileToUpload', fs.createReadStream(outputMp3));

            const res = await axios.post('https://catbox.moe/user/api.php', form, {
                headers: { ...form.getHeaders() },
                timeout: 300000 
            });

            const downloadLink = res.data;
            const fileSize = (fs.statSync(outputMp3).size / 1024 / 1024).toFixed(2);
            const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

            // 4. FINISH LOG
            console.log(`[${tag}] - SUCCESS - Done in ${totalTime}s | Size: ${fileSize}MB`);

            // --- EMBED & BUTTON FINAL ---
            const embedFinal = new EmbedBuilder()
                .setTitle('✅ Konversi Berhasil!')
                .setColor('#2F3136')
                .setThumbnail(videoThumbnail)
                .addFields(
                    { name: '📝 Judul', value: `\`\`\`${videoTitle}\`\`\``, inline: false },
                    { name: '⏱️ Durasi', value: `\`${videoDuration}\``, inline: true },
                    { name: '📦 Ukuran', value: `\`${fileSize} MB\``, inline: true },
                    { name: '⚡ Waktu', value: `\`${totalTime}s\``, inline: true }
                )
                .setFooter({ text: `ArchillDev • ${user.username}`, iconURL: user.displayAvatarURL() })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setLabel('Hasil Convert').setURL(downloadLink).setStyle(ButtonStyle.Link)
            );

            await interaction.editReply({ embeds: [embedFinal], components: [row] });
            
            if (fs.existsSync(outputMp3)) fs.unlinkSync(outputMp3);

        } catch (e) {
            console.error(`[${tag}] - ERROR - ${e.message}`);
            if (fs.existsSync(outputMp3)) fs.unlinkSync(outputMp3);
            
            await interaction.editReply({ 
                embeds: [new EmbedBuilder().setTitle('❌ Gagal').setColor('#FF0000').setDescription(`Error: \`${e.message}\``)] 
            });
        }
    },
};