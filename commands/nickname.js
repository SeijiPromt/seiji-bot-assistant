module.exports.config = { name: "nickname", role: 2, hasPrefix: true, aliases: ["nick"] };
module.exports.run = async ({ api, event, args, utils }) => {
  if (!event.isGroup) return api.sendMessage(utils.error("Group chat only."), event.threadID);
  const target = Object.keys(event.mentions)[0] || event.senderID;
  const name = args.join(" ").replace(/@\S+/g, "").trim();
  if (!name) return api.sendMessage(utils.error("Provide a name."), event.threadID);
  api.changeNickname(name, event.threadID, target, (err) => {
    if (err) api.sendMessage(utils.error("Failed."), event.threadID);
    else api.sendMessage(utils.success("Nickname changed."), event.threadID);
  });
};
