import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';
import { stripIndents } from 'common-tags';

export default {
    data: new SlashCommandBuilder()
        .setName('setverify')
        .setDescription('Membuat pesan verifikasi dengan tombol.')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    contextDescription: null,
    usage: 'setverify',
    category: 'Admin',
    staffOnly: true, 
    run: async (client, interaction) => {
        try {

            const roleId = client.config.verifiedRoleId; 

            const embed = new EmbedBuilder()
                .setTitle('Verify Yourself')
                .setDescription(stripIndents`
                    Welcome to **${interaction.guild.name}**!
                    
                    Silakan klik tombol di bawah untuk mendapatkan akses ke channel lainnya.
                    Dengan mengeklik tombol, kamu setuju dengan peraturan yang ada.
                `)
                .setColor('Green')
                .setThumbnail(interaction.guild.iconURL());

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('verify_user')
                    .setLabel('Verifikasi Sekarang')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅')
                    .setFooter(`${interaction.guild.name}`)
            );

            await interaction.reply({
                content: 'Pesan verifikasi berhasil dibuat!',
                ephemeral: true 
            });

            return await interaction.channel.send({
                embeds: [embed],
                components: [row]
            });

        } catch (e) {
            console.error(e);
            return await interaction.followUp({
                content: `**Error:** ${e.message}`,
                ephemeral: true
            });
        }
    },
};