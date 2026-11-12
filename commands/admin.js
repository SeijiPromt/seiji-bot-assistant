const fs = require("fs"); const path = require("path");
module.exports.config = { name: "admin", role: 1, hasPrefix: true, aliases: ["setadmin"] };
module.exports.run = async ({ api, event, args, utils }) => {
  const cfgPath = path.join(__dirname, "..", "config.json");
  const config = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  const action = args[0]?.toLowerCase();
  const target = Object.keys(event.mentions)[0] || event.messageReply?.senderID;
  if (action === "list") {
    const names = await Promise.all(config.admins.map(async id => {
      const info = await api.getUserInfo(id);
      return `• ${info[id]?.name || id}`;
    }));
    return api.sendMessage(utils.format("BOT ADMINS", names.join("\n")), event.threadID);
  }
  if (!target) return api.sendMessage(utils.error("Mention/reply to a user."), event.threadID);
  if (action === "add") {
    if (config.admins.includes(target)) return api.sendMessage(utils.error("Already admin."), event.threadID);
    config.admins.push(target); fs.writeFileSync(cfgPath, JSON.stringify(config, null, 2));
    return api.sendMessage(utils.success("Added as admin."), event.threadID);
  }
  if (action === "remove") {
    if (!config.admins.includes(target)) return api.sendMessage(utils.error("Not an admin."), event.threadID);
    config.admins = config.admins.filter(id => id !== target); fs.writeFileSync(cfgPath, JSON.stringify(config, null, 2));
    return api.sendMessage(utils.success("Removed from admins."), event.threadID);
  }
  api.sendMessage(utils.error("Usage: !admin list | add @user | remove @user"), event.threadID);
};
