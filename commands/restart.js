module.exports.config = { name: "restart", role: 1, hasPrefix: true };
module.exports.run = async ({ api, event, utils }) => {
  api.sendMessage(utils.success("Restarting Seiji Bot..."), event.threadID, () => process.exit(1));
};
