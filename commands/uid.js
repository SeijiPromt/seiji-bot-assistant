module.exports.config = { name: "uid", role: 0, hasPrefix: true, aliases: ["id"] };
module.exports.run = async ({ api, event, utils }) => {
  const target = Object.keys(event.mentions)[0] || event.messageReply?.senderID || event.senderID;
  api.sendMessage(utils.format("USER ID", `UID: ${target}`), event.threadID);
};
