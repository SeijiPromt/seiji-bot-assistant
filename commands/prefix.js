const fs = require("fs"); const path = require("path");
module.exports.config = { name: "prefix", role: 1, hasPrefix: true };
module.exports.run = async ({ api, event, args, config, utils }) => {
  if (!args[0]) return api.sendMessage(utils.format("PREFIX", `Current prefix: ${config.prefix}`), event.threadID);
  const cfgPath = path.join(__dirname, "..", "config.json");
  const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  cfg.prefix = args[0]; fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
  api.sendMessage(utils.success(`Prefix changed to: ${args[0]}`), event.threadID);
};
