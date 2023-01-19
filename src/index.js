const
{
	Client,
	GatewayIntentBits,
	Events,
	ActivityType,
	Collection
} = require('discord.js');
const fs = require("fs");
const path = require("node:path");
const dbConnection = require('../secrets/connect');
const { ConsoleInfoFormatter } = require('./functions');
require('dotenv').config({ path: __dirname + '/.env' });
const Config = require('../secrets/Database/Schema/config');
const DBUser = require('../secrets/Database/Schema/user.js');
const { createUser } = require('../secrets/Database/create/user');
const { createConfig } = require('../secrets/Database/create/config');

const client = new Client
({
	intents:
	[
		GatewayIntentBits.Guilds
	]
});
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles)
{
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	client.commands.set(command.data.name, command);
}

// * Client Ready * //
client.on
(Events.ClientReady, c => {
	ConsoleInfoFormatter('38;5;219', `Logged in as ${c.user.tag}`);
	c.user.setPresence // * Set Status and Activity * //
	({
		status: 'dnd',
		activities:
		[{
			name: 'Creating Despair with another Killing Game! Puhuhuhu',
			type: ActivityType.Playing
		}]
	});
});

// * Database Connection * //
try
{
	dbConnection.authenticate();
	ConsoleInfoFormatter('38;5;46', "Connected to the Jackel Database.");
}
catch (error)
{
	return ConsoleInfoFormatter('38;5;160', error);
}

// * Command interaction * //
client.on
(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;
	const command = interaction.client.commands.get(interaction.commandName);

	// * Check if DB entry exists, if not, create * //
	if (!await DBUser.findOne({ where: { id: interaction.user.id } }))
	{
		try
		{
			await createUser(interaction.user.id, 0, 0, null);
		}
		catch (error)
		{
			await interaction.reply
			({
				content: "There was an error creating your User data.",
				ephemeral: true
			});
			return ConsoleInfoFormatter('38;5;160', error, client);
		}
	}
	if (!await Config.findOne({ where: { server: interaction.guild.id } }))
	{
		try
		{
			await createConfig(interaction.guild.id);
		}
		catch (error)
		{
			await interaction.reply
			({
				content: 'There was an error creating the Server Config.',
				ephemeral: true
			});
			return ConsoleInfoFormatter("38;5;160", error, client);
		}
	}

	// * Execute Command * //
	if (!command) return;
	try
	{
		await command.execute(interaction, client);
	}
	catch (error)
	{
		console.error(error);
		return ConsoleInfoFormatter('38;5;160', error, client);
	}
});

client.login(process.env.TOKEN);