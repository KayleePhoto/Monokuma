const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");
const Config = require('../../secrets/Database/Schema/config');
const { createConfig } = require('../../secrets/Database/create/config.js');

module.exports = {
	data: new SlashCommandBuilder()
	.setName("config")
	.setDescription("Set all required IDs to use the bot.")
	.addChannelOption((option) =>
		option
		.setName("channel")
		.setDescription("Select the channel you want to send game messages in.")
		.setRequired(true)
	)
	.addRoleOption((option) =>
		option
		.setName("game-role")
		.setDescription("Select the role you want to be used for the game.")
		.setRequired(true)
	)
	.addBooleanOption((option) =>
		option
		.setName('ping-role')
		.setDescription('Enable or disable the game role ping on kills.')
		.setRequired(true)
	)
	.setDMPermission(false)
	.setDefaultMemberPermissions
	(PermissionFlagsBits.KickMembers, PermissionFlagsBits.BanMembers),

	async execute(interaction)
	{
		let role = interaction.options.getRole('game-role');
		let channel = interaction.options.getChannel('channel');
		let ping = interaction.options.getBoolean('ping-role');
		let config = await Config.findOne({ where: { server: interaction.guild.id } });

		if (channel.type == ChannelType.GuildCategory || channel.type == ChannelType.GuildVoice) {
			return interaction.reply('Please make sure this is a TextChannel, not a category.');
		}
		
		if (!config) {
			await createConfig(interaction.guild.id);
		}
		config = await Config.findOne({ where: {server: interaction.guild.id } });
		await config.update({
			channel: channel.id,
			role: role.id,
			pingable: ping
		});

		await interaction.reply({
			content: `Channel has been set to: **${channel}**\nGame role has been set to: **${role}** (Ping ${ping == 1 ? "Enabled" : "Disable"})`
		});
	}
}