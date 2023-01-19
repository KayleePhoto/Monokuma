const fs = require("fs");
const path = require("node:path");
const { SlashCommandBuilder } = require("discord.js");
const { ConsoleInfoFormatter } = require("../functions");
const wait = require ("node:timers/promises").setTimeout;
const User = require("../../secrets/Database/Schema/user.js");
const Config = require("../../secrets/Database/Schema/config.js");
const { createUser } = require("../../secrets/Database/create/user");

module.exports
={
	data: new SlashCommandBuilder()
	.setName('kill')
	.setDescription('Kill someone to start the killing game!')
	.setDMPermission(false)
	.addUserOption
	((option) =>
		option
		.setName('target')
		.setDescription('The person you wish to kill.')
		.setRequired(true)
	),

	async execute(interaction, client)
	{
		let target = interaction.options.getUser('target');
		let targetInGuild = interaction.guild.members.cache.get(target.id);

		// * Get DB Entries * //
		let config = await Config.findOne({ where: { server: interaction.guild.id } });
		let killer = await User.findOne({ where: { id: interaction.user.id } });
		let targetUser = await User.findOne({ where: { id: target.id } });
		
		const gameChannel = interaction.guild.channels.cache.get(config["dataValues"].channel);

		// * Before Game Checks * //
		if (!config["dataValues"].channel || !config["dataValues"].role)
		{
			return interaction.reply
			({
				content: 'Please make sure that the Channel and Game Role are set in the `/config` command!\nPlease contact a server moderator, if needed.',
				ephemeral: true
			});
		}
		if (config["dataValues"].hasGame == 1)
		{
			return interaction.reply
			({
				content: 'There is already a game happening in this server. Please wait for it to conclude.',
				ephemeral: true
			});
		}
		
		// * User Checks * //
		if (!interaction.guild.members.cache.get(interaction.user.id).roles.cache.get(config["dataValues"].role) || !targetInGuild.roles.cache.get(config["dataValues"].role))
		{
			let gameRole = interaction.guild.roles.cache.get(config["dataValues"].role);
			return interaction.reply
			({
				content: !targetInGuild.roles.cache.get(config["dataValues"]) ? `${target.username} does not have the ${gameRole.name} role.` : `You do not have the ${gameRole.name} role.`,
				ephemeral: true
			});
		}
		if (interaction.user.id == target.id)
		{
			return interaction.reply
			({
				content: 'You can not kill yourself.',
				ephemeral: true	
			});
		}
		if (!targetUser)
		{
			await createUser(target.id, 0, 0, null);
			targetUser = await User.findOne({ where: { id: target.id } });
		}
		if (targetUser["dataValues"].isVictim == 1)
		{
			return interaction.reply
			({
				content: 'This user is already in an instance.',
				ephemeral: true
			});
		}
		// ! UPDATE TARGET, UNABLE TO DO IN CREATE ^
		await targetUser.update({ isVictim: true, gameServer: interaction.guild.id });
		targetUser = await User.findOne({ where: { id: target.id } });
		
		// * Begin Game With DB Updates * //
		try
		{
			await config.update({ hasGame: 1 });
			await killer.update({ isKiller: 1, gameServer: interaction.guild.id });
			killer = await User.findOne({ where: { id: interaction.user.id } });

			await gameChannel.send
			({
				content: `**Game start** || ${config["dataValues"].pingable == true ? `${interaction.guild.roles.cache.get(config["dataValues"].role)}\n*Disable role ping with \`/config (channel) (role) false\`*` : interaction.guild.roles.cache.get(config["dataValues"].role).name + `\n*Enable role ping with \`/config (channel) (role) true\`*`}\n\n**${target.username}** has been found dead. As you know, sometime after the body has been discovered, a class trial will start.\nSo, feel free to investigate in the mean time.\n*(10 minutes, this is to class trial start. You can take as long as you need.)*`,
				files:
				[{
					attachment: `src/commands/resources/body/${sortRandomImages('body')}`,
					name: 'SPOILER_Body.png',
					description: 'A dead body. | *Descriptive, I know.*'
				}]
			});
		}
		catch (error)
		{
			// * If Game Start Fails, Reset DB Updates and End Command * //
			await killer.update({ isKiller: 0, gameServer: null });
			await targetUser.update({ isVictim: 0, gameServer: null });
			await config.update({ hasGame: 0 });
			await interaction.reply
			({
				content: 'There was an error. Please check the bots permissions.\nPlease make sure it can **Send Attachments** to the Game Channel.',
				ephemeral: true
			});
			return ConsoleInfoFormatter('38;5;160', error, client);
		}

		// * If Start Succeeds, continue * //
		await interaction.deferReply({ephemeral: true});
		// * Error handling for Database,
		// * to prevent locked "started" * //
		try
		{
			await wait(1000*60*10); // ! 10 minutes
			await config.update({ started: 1 });
		}
		catch (error)
		{
			await config.update({ started: 0, hasGame: 0 });
			await killer.update({ isKiller: 0, gameServer: null });
			await targetUser.update({ isVictim: 0, gameServer: null });
			await gameChannel.send('Please try again. There was an error.\n\n*If this error is not fixed, please wait as the error has been sent to Kaylee#9999.*\n*If it\'s been more than 12 hours (**ONLY DO THIS IF IT\'S BEEN 12+ HOURS.**), please contact me.*');
			return ConsoleInfoFormatter(`38;5;160`, error, client);
		}

		await gameChannel.send
		({
			content: `**The class trial is starting!!**\nEveryone take your seats and prepare your arguments!`,
			files:
			[{
				attachment: `src/commands/resources/class-trial/${sortRandomImages('class-trial')}`,
				name: 'Trial.png',
				description: 'The trial has begun!'
			}]
		});
	}
}

function sortRandomImages(imgpath)
{
	const images = [];
	const imagesPath = path.join(__dirname, `resources/${imgpath}`);
	const imageFiles = fs
		.readdirSync(imagesPath)
		.filter((file) => file.endsWith(".png"));
	for (const image of imageFiles) {
		images.push(image);
	}
	return images[Math.floor(Math.random() * images.length)];
}