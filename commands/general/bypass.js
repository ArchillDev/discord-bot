// import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } from 'discord.js';
// import puppeteer from 'puppeteer-extra';
// import StealthPlugin from 'puppeteer-extra-plugin-stealth';
// import { stripIndents } from 'common-tags';
// import fs from 'fs';

// puppeteer.use(StealthPlugin());

// export default {
//     data: new SlashCommandBuilder()
//         .setName('bypass')
//         .setDescription('Bypass Pro: Fokus tombol Open & Redirect Target')
//         .addStringOption(option => 
//             option.setName('url')
//                 .setDescription('Link Safelinku (Wajib https://)')
//                 .setRequired(true)),
//     run: async (client, interaction) => {
//         await interaction.deferReply().catch(() => {});

//         const targetUrl = interaction.options.getString('url');
//         const user = interaction.user;
//         const tag = `${user.username}#${user.discriminator || '0'}`;
//         const startTime = Date.now();
//         const screenshots = [];

//         console.log(`\n[${tag}] === OPEN-BUTTON HUNTER START ===`);

//         let browser;
//         try {
//             await interaction.editReply('🎯 **Menyiapkan Radar Tombol "Open"...**');

//             browser = await puppeteer.launch({ 
//                 headless: "new", 
//                 args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-popup-blocking'] 
//             });

//             // --- RADAR TAB BARU (LISTEN FOR WINDOW.OPEN) ---
//             let finalUrl = "";
//             browser.on('targetcreated', async (target) => {
//                 if (target.type() === 'page') {
//                     const newPage = await target.page();
//                     const u = newPage.url();
                    
//                     // Jika ketemu link 'bersih' (Drive/Mediafire/Mega)
//                     if (u.includes('drive.google.com') || u.includes('mediafire.com') || u.includes('mega.nz')) {
//                         finalUrl = u;
//                         console.log(`[${tag}] [RADAR] TARGET LOCKED: ${finalUrl}`);
//                     }
//                 }
//             });

//             const page = await browser.newPage();
//             await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

//             await interaction.editReply('🔍 **Membuka Halaman & Mencari Tombol Open...**');
//             await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });

//             // --- MULTI-CLICK ENGINE (Klik sampai 5x kalau perlu) ---
//             for (let step = 1; step <= 5; step++) {
//                 if (finalUrl) break; // Berhenti kalau radar udah dapet link asli

//                 console.log(`[${tag}] [DEBUG] Step ${step}: Scanning for "Open" buttons...`);
//                 await new Promise(res => setTimeout(res, 7000)); // Tunggu timer Safelinku

//                 // Hapus overlay iklan transparan yang sering nutupin tombol
//                 await page.evaluate(() => {
//                     const overlays = document.querySelectorAll('div[style*="position: fixed"], div[style*="z-index: 99999"]');
//                     overlays.forEach(o => o.remove());
//                 }).catch(() => {});

//                 const clickResult = await page.evaluate(() => {
//                     // Prioritas cari teks "Open", "Open Link", atau "Go to Link"
//                     const texts = ["open", "open link", "go to link", "get link", "continue"];
//                     const elements = Array.from(document.querySelectorAll('button, a, div.btn, span.btn'));
                    
//                     const targetBtn = elements.find(el => {
//                         const txt = el.innerText.toLowerCase().trim();
//                         return texts.some(t => txt === t || txt.includes(t)) && el.offsetParent !== null;
//                     });

//                     if (targetBtn) {
//                         targetBtn.scrollIntoView();
//                         targetBtn.click();
//                         return { found: true, text: targetBtn.innerText.trim() };
//                     }
//                     return { found: false };
//                 });

//                 if (clickResult.found) {
//                     console.log(`[${tag}] [DEBUG] Berhasil klik tombol: "${clickResult.text}"`);
//                     await new Promise(res => setTimeout(res, 5000)); // Tunggu navigasi/popup
                    
//                     const scPath = `./sc_step${step}_${Date.now()}.png`;
//                     await page.screenshot({ path: scPath }).catch(() => {});
//                     screenshots.push(scPath);
//                 } else {
//                     console.log(`[${tag}] [DEBUG] Tidak ada tombol "Open" yang ditemukan di step ini.`);
//                 }
                
//                 // Cek apakah URL utama sudah berubah jadi link tujuan
//                 const currentUrl = page.url();
//                 if (currentUrl.includes('drive.google.com') || currentUrl.includes('mediafire.com')) {
//                     finalUrl = currentUrl;
//                     break;
//                 }
//             }

//             // --- FINAL OUTPUT ---
//             if (finalUrl && !finalUrl.includes('safelinku') && !finalUrl.includes('khaddavi')) {
//                 const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
//                 const embed = new EmbedBuilder()
//                     .setTitle('🔓 Bypass Berhasil!')
//                     .setColor('#2ECC71')
//                     .addFields(
//                         { name: '🔗 Link Awal', value: `\`\`\`${targetUrl}\`\`\`` },
//                         { name: '🚀 Link Tujuan', value: `\`\`\`${finalUrl}\`\`\`` }
//                     )
//                     .setFooter({ text: `ArchillDev Target Hunter • ${totalTime}s` });

//                 const row = new ActionRowBuilder().addComponents(
//                     new ButtonBuilder().setLabel('Buka Link').setURL(finalUrl).setStyle(ButtonStyle.Link).setEmoji('🚀')
//                 );

//                 await interaction.editReply({ content: '✅ **Link Ditembus!**', embeds: [embed], components: [row], files: [] });
//                 console.log(`[${tag}] [SUCCESS] Result: ${finalUrl}`);
//             } else {
//                 const attachments = screenshots.map(p => new AttachmentBuilder(p));
//                 await interaction.editReply({ 
//                     content: `❌ **Gagal.** Bot tidak menemukan tombol Open yang valid atau link tertahan di iklan.\nURL Terakhir: \`${page.url()}\``, 
//                     files: attachments 
//                 });
//             }

//         } catch (e) {
//             console.error(`[${tag}] [ERROR] ${e.message}`);
//             await interaction.editReply(`❌ **Error:** \`${e.message}\``);
//         } finally {
//             if (browser) await browser.close();
//             screenshots.forEach(p => { if (fs.existsSync(p)) fs.unlinkSync(p); });
//         }
//     },
// };

import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } from 'discord.js';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { stripIndents } from 'common-tags';
import fs from 'fs';

puppeteer.use(StealthPlugin());

export default {
    data: new SlashCommandBuilder()
        .setName('bypass')
        .setDescription('Bypass Patient Hunter: Nunggu Timer Sampai 0 Baru Klik')
        .addStringOption(option => 
            option.setName('url')
                .setDescription('Link Safelinku (Wajib https://)')
                .setRequired(true)),
    run: async (client, interaction) => {
        await interaction.deferReply().catch(() => {});

        const targetUrl = interaction.options.getString('url');
        const user = interaction.user;
        const tag = `${user.username}#${user.discriminator || '0'}`;
        const startTime = Date.now();
        const screenshots = [];

        console.log(`\n[${tag}] === PATIENT HUNTER START ===`);

        let browser;
        try {
            await interaction.editReply('🎯 **Menyiapkan Radar & Browser Siluman...**');

            browser = await puppeteer.launch({ 
                headless: "new", 
                args: [
                    '--no-sandbox', 
                    '--disable-setuid-sandbox',
                    '--disable-popup-blocking',
                    '--window-size=1280,800'
                ] 
            });

            // --- RADAR TAB (NANGKEP WINDOW.OPEN) ---
            let finalUrl = "";
            browser.on('targetcreated', async (target) => {
                if (target.type() === 'page') {
                    const newPage = await target.page();
                    const u = newPage.url();
                    // Fokus target utama
                    if (u.includes('drive.google.com') || u.includes('mediafire.com') || u.includes('mega.nz')) {
                        finalUrl = u;
                        console.log(`[${tag}] [RADAR] TARGET LOCKED: ${finalUrl}`);
                    }
                }
            });

            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

            await interaction.editReply('🔍 **Membuka Halaman & Memantau Timer...**');
            await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });

            // --- MULTI-STEP PATIENT CLICKER ---
            for (let step = 1; step <= 5; step++) {
                if (finalUrl) break;

                console.log(`[${tag}] [DEBUG] Step ${step}: Scanning page elements...`);
                await new Promise(res => setTimeout(res, 3000)); // Nafas bentar tiap step

                // Hapus Iklan Overlay yang nutupin tombol
                await page.evaluate(() => {
                    const ads = document.querySelectorAll('div[style*="fixed"], div[style*="z-index: 99999"], iframe');
                    ads.forEach(a => a.remove());
                }).catch(() => {});

                // LOGIC: CARI & TUNGGU TIMER
                const clickResult = await page.evaluate(async () => {
                    const targets = ["open", "get link", "continue", "go to link"];
                    const elements = Array.from(document.querySelectorAll('button, a, div.btn, span.btn, #getlink'));

                    // Cari tombol yang ada teks target atau ada kata "Wait" / angka timer
                    const btn = elements.find(el => {
                        const txt = el.innerText.toLowerCase().trim();
                        return (targets.some(t => txt.includes(t)) || /wait|\d+/.test(txt)) && el.offsetParent !== null;
                    });

                    if (btn) {
                        btn.scrollIntoView();
                        
                        // --- FUNGSI SABAR (Tunggu sampai "Wait" ilang atau jadi 0) ---
                        let waitTime = 0;
                        while (waitTime < 20) { // Max nunggu 20 detik
                            const currentTxt = btn.innerText.toLowerCase();
                            // Jika sudah tidak ada "wait" dan tidak ada angka (kecuali angka 0), atau sudah ada kata target
                            const isReady = targets.some(t => currentTxt === t) || 
                                            (!currentTxt.includes('wait') && !/[1-9]/.test(currentTxt)) ||
                                            currentTxt.includes('0');

                            if (isReady) {
                                btn.click();
                                return { found: true, text: btn.innerText.trim(), waited: waitTime };
                            }
                            
                            await new Promise(r => setTimeout(r, 1000));
                            waitTime++;
                        }
                        // Kalau kelamaan nunggu tapi tetep nggak ready, coba paksa klik aja
                        btn.click();
                        return { found: true, text: btn.innerText.trim(), forced: true };
                    }
                    return { found: false };
                });

                if (clickResult.found) {
                    const status = clickResult.forced ? "FORCED" : `WAITED ${clickResult.waited}s`;
                    console.log(`[${tag}] [DEBUG] Clicked: "${clickResult.text}" (${status})`);
                    
                    await new Promise(res => setTimeout(res, 6000)); // Tunggu efek redirect/popup
                    
                    const scPath = `./sc_step${step}_${Date.now()}.png`;
                    await page.screenshot({ path: scPath }).catch(() => {});
                    screenshots.push(scPath);
                }

                // Cek URL utama (takutnya redirect di tab yang sama)
                const currentUrl = page.url();
                if (currentUrl.includes('drive.google.com') || currentUrl.includes('mediafire.com')) {
                    finalUrl = currentUrl;
                    break;
                }
            }

            // --- FINAL OUTPUT ---
            if (finalUrl && !finalUrl.includes('safelinku') && !finalUrl.includes('khaddavi')) {
                const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
                const embed = new EmbedBuilder()
                    .setTitle('🔓 Bypass Sukses (Patient Mode)!')
                    .setColor('#2ECC71')
                    .addFields(
                        { name: '🔗 Link Awal', value: `\`\`\`${targetUrl}\`\`\`` },
                        { name: '🚀 Link Tujuan', value: `\`\`\`${finalUrl}\`\`\`` }
                    )
                    .setFooter({ text: `ArchillDev Patient Engine • Done in ${totalTime}s` });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setLabel('Buka Link').setURL(finalUrl).setStyle(ButtonStyle.Link).setEmoji('🚀')
                );

                await interaction.editReply({ content: '✅ **Target Ditemukan!**', embeds: [embed], components: [row], files: [] });
                console.log(`[${tag}] [SUCCESS] Result: ${finalUrl}`);
            } else {
                const attachments = screenshots.map(p => new AttachmentBuilder(p));
                await interaction.editReply({ 
                    content: `❌ **Gagal.** Bot sudah nunggu timer tapi link asli nggak muncul.\nLink Terakhir: \`${page.url()}\``, 
                    files: attachments 
                });
            }

        } catch (e) {
            console.error(`[${tag}] [ERROR] ${e.message}`);
            await interaction.editReply(`❌ **System Error:** \`${e.message}\``);
        } finally {
            if (browser) await browser.close();
            screenshots.forEach(p => { if (fs.existsSync(p)) fs.unlinkSync(p); });
        }
    },
};