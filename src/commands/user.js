const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const User = require("../../secrets/Database/Schema/user.js");

module.exports =
{
	data: new SlashCommandBuilder()
	.setName("stats")
	.setDescription('Check Your/Others overall stats.')
	.setDMPermission(false)
	.addUserOption
	((option) => 
		option
		.setName("user")
		.setDescription('The user you want to view.')
		.setRequired(false)
	),
	
	async execute(interaction)
	{
		let user = interaction.options.getUser("user")
		? [interaction.options.getUser("user").username, interaction.options.getUser('user').id]
		: [interaction.user.username, interaction.user.id];
		let userData = await User.findOne({ where: { id: user[1] } });

		if (!userData)
		{
			return interaction.reply('This user does not have any stats.');
		}

		await interaction.reply
		({

			embeds:
			[new EmbedBuilder({
				title: `${user[0]}'s Overall Stats!`,
				fields:
				[{
					name: "Successful Kills",
					value: `**${userData["dataValues"].sucKill}**`,
					inline: true
				},
				{
					name: "Times Caught",
					value: `**${userData["dataValues"].caught}**`,
					inline: true,
				},
				{
					name: "Times as Victim",
					value: `**${userData["dataValues"].victim}**`,
					inline: true,
				}],
				footer: { text: "These are stats across all servers." }
			})],
			ephemeral: true
		});
	}
}