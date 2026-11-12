module.exports.config = { name: "help", role: 0, hasPrefix: true, aliases: ["menu", "commands"] };
module.exports.run = async ({ api, event, config, utils }) => {
  const p = config.prefix;
  const msg = [
    `Prefix: [ ${p} ]`,
    `━━━━━━━━━━━━━━━━━━`,
    `📡 ${p}autofeed on / stop - Auto feed monitor`,
    `🤖 ${p}autoreact on / off - Auto react to msgs`,
    `📝 ${p}autopost <text> - Post to profile`,
    `━━━━━━━━━━━━━━━━━━`,
    `🧠 ${p}gpt <prompt> - Chat with AI`,
    `🎨 ${p}imagine <prompt> - Generate image`,
    `📝 ${p}summarize <text> - Summarize text`,
    `🌐 ${p}translate <lang> <text> - Translate`,
    `✍️ ${p}poem <topic> - Write a poem`,
    `━━━━━━━━━━━━━━━━━━`,
    `📥 ${p}download <url> - Video DL`,
    `🆔 ${p}uid @user - Get UID`,
    `👑 ${p}admin add/remove/list`,
    `🦵 ${p}kick @user - Kick member`,
    `➕ ${p}adduser <uid> - Add member`,
    `📜 ${p}rules - Show rules`,
    `🔧 ${p}prefix <symbol> - Change prefix`,
    `🏷️ ${p}nickname <name> - Change nickname`,
    `🔄 ${p}restart - Restart bot`
  ].join("\n");
  api.sendMessage(utils.format(`${config.botName} MENU`, msg), event.threadID, event.messageID);
};
