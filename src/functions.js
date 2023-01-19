module.exports = {
	/**
	 * Console Info Formatter
	 * @description Takes a ESC Code format and applies it to the String and outputs to Console
	 * @param {*} format [ANSI ESC CODES🔗](https://gist.github.com/fnky/458719343aabd01cfb17a3a4f7296797)
	 * @param {*} string 
	 * @param {*} client Reports back to Dev server, if Client is provided.
	 * @returns console.info
	 */
	ConsoleInfoFormatter: function(format, string, client, data)
	{
		if (client)
		{
			errorReport(client, string);
		}
		if (data)
		{
			return console.info(`\u001b[${format}m${string}\u001b[0m`, data);
		}
		else
		{
			return console.info(`\u001b[${format}m${string}\u001b[0m`);
		}
	}
}

async function errorReport(client, err) {
	console.error(`\n${err}\n`);
	console.error(err + "\n");
    
	let guild = client.guilds.cache.get("846186512462250015");
	let channel = guild.channels.cache.get("895448308733059083");
	return await channel.send(`<@538096686522957825>\nError!\n\`\`\`fix\n${err}\n\`\`\``);
}