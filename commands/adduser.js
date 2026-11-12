module.exports.config = { name: "adduser", role: 2, hasPrefix: true, aliases: ["add"] };
module.exports.run = async ({ api, event, args, utils }) => {
  if (!event.isGroup) return api.sendMessage(utils.error("Group chat only."), event.threadID);
  if (!args[0]) return api.sendMessage(utils.error("Provide UID."), event.threadID);
  api.addUserToGroup(args[0], event.threadID, (err) => {
    if (err) api.sendMessage(utils.error("Failed."), event.threadID);
    else api.sendMessage(utils.success("User added."), event.threadID);
  });
};
