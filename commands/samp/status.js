import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import query from 'samp-query';
import { stripIndents } from 'common-tags';

export default {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Cek status server SAMP.'),
    contextDescription: null,
    usage: 'status',
    category: 'Samp',
    staffOnly: false,
    run: async (client, interaction) => {
        try {
            await interaction.deferReply();

            const targetIp = client.config.sampIp;
            const targetPort = client.config.sampPort;

            const options = {
                host: targetIp,
                port: parseInt(targetPort)
            };

            query(options, async (error, response) => {
                if (error) {
                      return await  interaction.editReply({
                         content: `❌ **Gagal mengambil data:** Server offline atau IP salah (\`${targetIp}:${targetPort}\`).`
                     });
                    
                }

                const embed = new EmbedBuilder()
                    .setTitle(`🎮 ${response.hostname}`)
                    .setColor('DarkBlue')
                    .addFields(
                        { name: '🌐 Address', value: `\`${targetIp}:${targetPort}\``, inline: true },
                        { name: '👥 Players', value: `${response.players}/${response.maxplayers}`, inline: true },
                        { name: '🗺️ Map', value: response.mapname, inline: true },
                        { name: '🛠️ Gamemode', value: response.gamemode, inline: false },
                        { name: '⏳ Passworded', value: response.passworded ? 'Yes' : 'No', inline: true },
                        { name: '📈 Version', value: response.rules.version || 'Unknown', inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'SAMP Server Query' });

                return await interaction.editReply({ embeds: [embed] });
            });

        } catch (e) {
            console.error(e);
            return await interaction.followUp({
                content: stripIndents`
                **Terjadi kesalahan saat menjalankan \`${interaction.commandName}\`**
                \`\`\`
                ${e.message}
                \`\`\`
                `,
            });
        }
    },
};