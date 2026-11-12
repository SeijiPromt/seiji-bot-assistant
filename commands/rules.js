module.exports.config = { name: "rules", role: 0, hasPrefix: true };
module.exports.run = async ({ api, event, utils }) => {
  api.sendMessage(utils.format("GROUP RULES", "1. Be respectful.\n2. No spamming.\n3. No inappropriate content."), event.threadID);
};
