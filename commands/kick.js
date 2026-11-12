module.exports.config = { name: "kick", role: 2, hasPrefix: true };
module.exports.run = async ({ api, event, utils }) => {
  if (!event.isGroup) return api.sendMessage(utils.error("Group chat only."), event.threadID);
  const target = Object.keys(event.mentions)[0] || event.messageReply?.senderID;
  if (!target) return api.sendMessage(utils.error("Mention/reply to the user."), event.threadID);
  api.removeUserFromGroup(target, event.threadID, (err) => {
    if (err) api.sendMessage(utils.error("Failed. Ensure bot is Admin."), event.threadID);
    else api.sendMessage(utils.success("User kicked."), event.threadID);
  });
};
