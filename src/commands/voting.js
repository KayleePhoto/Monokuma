const fs = require("fs");
const path = require("node:path");
const { v4: uuidv4 } = require("uuid");
const { SlashCommandBuilder } = require("discord.js");
const wait = require ("node:timers/promises").setTimeout;
const User = require("../../secrets/Database/Schema/user.js");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");
const Config = require("../../secrets/Database/Schema/config.js");
const { ConsoleInfoFormatter } = require("../functions");


let globalUUID = [];

module.exports
={
	data: new SlashCommandBuilder()
	.setName("vote")
	.setDescription("Being the voting phase!")
	.setDMPermission(false)
	.addUserOption((option) =>
		option.setName('target')
		.setDescription('The user you want to vote as the killer.')
		.setRequired(true)
	),

	async execute(interaction, client)
	{
		// * DB Entries
		let killer = await User.findOne({ where: { gameServer: interaction.guild.id, isKiller: true } });
		let victim = await User.findOne({ where: { gameServer: interaction.guild.id, isVictim: true } });
		let voter = await User.findOne({ where: { id: interaction.user.id } });
		let config = await Config.findOne({ where: { server: interaction.guild.id } });
		const gameChannel = interaction.guild.channels.cache.get(config["dataValues"].channel);

		// * Extra Variables
		let target = interaction.options.getUser('target');

		// * Before Voting Checks
		if (config["dataValues"].started == false)
		{
			return interaction.reply
			({
				content: 'Please wait for the Class Trial to begin.',
				ephemeral: true
			});
		}
		if (voter.isVictim == true)
		{
			return await interaction.reply
			({
				content: 'You are the victim, you are unable to vote, as you are dead.',
				ephemeral: true
			});
		}

		if (config['dataValues'].isVoting == true)
		{
			let ListOfVotedKillers = config['dataValues'].votedKillers;
			let userExistsInList = {};
			
			// * Loop Through Voted Killers.
			ListOfVotedKillers.forEach
			(async (killer) => {
				if (killer.voters.includes(interaction.user.id))
				{
					return interaction.reply
					({
						content: `You have already voted.\nYou voted for: **${killer.name}**`,
						ephemeral: true
					});
				}
				if (killer.id == target.id)
				{
					return (userExistsInList = killer);
				};
			});

			// * If user doesn't exist, push new user, else push voter.
			if (userExistsInList.length == 0)
			{
				killers.push
				({
					id: target.id,
					name: target.name,
					voters: [interaction.user.id]
				});
			}
			else if (userExistsInList > 0)
			{
				killers[killers.indexOf(killer)].voters.push(interaction.user.id);
			}
			await interaction.reply
			({
				content: `Your vote is locked in!\nYou voted for **${target.user}**`,
				ephemeral: true
			});
			return await config.update({ votedKillers: killers });
		}

		// * Main Code for initial voter
		await interaction.deferReply({ ephemeral: true });
		await config.update
		({
			isVoting: true,
			votedKillers:
			[{
				id: target.id,
				name: target.username,
				voters: [interaction.user.id]
			}]
		});
		await gameChannel.send('The voting process has begun! You have 5 minutes to finalize!\nOnce you vote, you are locked in.\n*Use `/vote` to begin.*');
		
		await wait(1000 * 60 * 2);
		await gameChannel.send('3 minutes left to conclude your votes!\n**Remember! Once you vote, it is locked in!**');
		await wait(1000 * 60 * 3);

		// * Disable voting and reset game.
		await config.update({ isVoting: false, hasGame: false, started: false });
		config = await Config.findOne({ where: { server: interaction.guild.id } });

		// * get killers
		let votedKillers = config["dataValues"].votedKillers;
		let votedUsers = getMaxNum(votedKillers);
		let randomVote;

		if (votedUsers.length > 1)
		{
			await gameChannel.send('There was a tie. Randomly selecting!\n*There may be an update to repeat votes.*');
			randomVote = votedUsers[Math.floor(Math.random * votedUsers.length)];
		}
		else if (votedUsers.length == 1)
		{
			randomVote = votedUsers[0];
		}

		// * Chart Killers and Votes
		try
		{
			await makeChart(votedKillers);
		}
		catch (err)
		{
			console.error(err);
		}

		await gameChannel.send
		({
			content: `The voting has concluded!\n${randomVote.name} has been voted out...`,
			files:
			[{
				attachment: `src/temp/temp-${globalUUID}.png`,
				name: 'chart.png'
			}]
		});
		// * Delete chart
		try
		{
			fs.unlinkSync(`src/temp/temp-${globalUUID}.png`);
			console.info("File Removed: ", `src/temp/temp-${globalUUID}.png`);
		}
		catch (error)
		{
			ConsoleInfoFormatter('38;5;160', error, client);
		}

		// * Was the killer voted?
		if (killer["dataValues"].id == randomVote.id)
		{
			await gameChannel.send
			({
				content: 'Sounds like you found the guilty.\n Let\'s give\'em our all!\nIt\'s punishment time!',
				files:
				[{
					attachment: `src/commands/resources/punishment/${sortRandomImages("punishment")}`,
					name: "SPOILER_Punishment.gif",
					description: "The Killer's Punishment."
				}]
			});
			await killer.update
			({
				isKiller: false,
				gameServer: null,
				caught: killer["dataValues"].caught + 1
			});
		} // * The Killer got away with it
		else
		{
			await gameChannel.send
			({
				content: `Seems like you were wrong... Now you\'ll receieve the ultimate punishment!\nThe killer was: ${interaction.guild.members.cache.get(killer["dataValues"].id)}`,
				files:
				[{
					attachment: `src/commands/resources/punishment/${sortRandomImages("punishment")}`,
					name: "SPOILER_Punishment.gif",
					description: "The Accusers Punishment."
				}]
			});
			await killer.update
			({
				isKiller: false,
				gameServer: null,
				sucKill: killer["dataValues"].sucKill + 1
			});
		}
		
		// * Same in the if/else above, only need to write once like this.
		await victim.update
		({
			isVictim: false,
			gameServer: null,
			victim: victim["dataValues"].victim + 1
		});
	}
}

function sortRandomImages(imgpath) {
	const images = [];
	const imagesPath = path.join(__dirname, `resources/${imgpath}`);
	const imageFiles = fs
		.readdirSync(imagesPath)
		.filter((file) => file.endsWith(".gif"));
	for (const image of imageFiles) {
		images.push(image);
	}
	return images[Math.floor(Math.random() * images.length)];
}

function getMaxNum(array) {
	let amountVoted = [];
	array.forEach((vote) => {
		amountVoted.push(vote.voters.length);
	});
	let num = Math.max.apply(Math, amountVoted);
	let final = [];
	array.forEach((vote) => {
		if (vote.voters.length == num) {
			final.push(vote);
		}
	});
	return final;
}

function getData(jsondata) {
	const xs = [];
	const ys = [];
	jsondata.forEach((column) => {
		xs.push(column.name);
		ys.push(column.voters.length);
	});

	return { xs, ys };
}
      
async function makeChart(JSON) {
	const tempUUID = uuidv4();
	const data = await getData(JSON);
	const configuration = {
		type: "bar",
		data: {
			labels: data.xs,
			datasets: [
				{
					label: "Test",
					data: data.ys,
					backgroundColor: "rgba(167, 26, 26, 0.75)",
					borderRadius: 10,
				},
			],
		},
		options: {
			layout: {
				padding: 10,
			},
			plugins: {
				legend: {
					display: false,
				},
				title: {
					display: true,
					text: "The Votes For the Assumed Killer",
					color: "#C9C9C9",
					font: {
						size: 40,
					},
					weight: 50,
				},
			},
			scales: {
				y: {
					title: {
						display: true,
						text: "Votes",
						color: "#C9C9C9",
						font: {
							size: 40,
						},
						weight: 20,
					},
					ticks: {
						font: {
							size: 35,
						},
						beginAtZero: true,
					},
				},
				x: {
					ticks: {
						font: {
							size: 40,
						},
						color: "#C9C9C9",
					},
				},
			},
		},
		plugins: [
			{
			id: "custom_canvas_background_color",
			beforeDraw: (chart) => {
				const { ctx } = chart;
				ctx.save();
				ctx.globalCompositeOperation = "destination-over";
				ctx.fillStyle = "#202020";
				ctx.fillRect(0, 0, chart.width, chart.height);
				ctx.restore();
				},
			},
		],
	};
	
	
	const chartCallback = (ChartJS) => {
	  ChartJS.defaults.responsive = true;
	  ChartJS.defaults.maintainAspectRatio = false;
	};
	const width = 1440, height = 1440;
	const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, chartCallback });
	const buffer = await chartJSNodeCanvas.renderToBuffer(configuration, 'image/png');
	await fs.writeFile(`./src/temp/temp-${tempUUID}.png`, buffer, 'base64');
	globalUUID = tempUUID;
}