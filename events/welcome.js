module.exports.config = { name: "welcome", event: ["log:subscribe"] };
module.exports.run = async ({ api, event, utils }) => {
  const botID = api.getCurrentUserID();
  if (event.logMessageData.addedParticipants.some(p => p.userFbId === botID)) {
    return api.sendMessage(utils.format("HELLO", "Thanks for adding me! Type !help to see my commands."), event.threadID);
  }
  for (const p of event.logMessageData.addedParticipants) {
    api.sendMessage(utils.format("WELCOME", `Welcome to the group, ${p.fullName}!`), event.threadID);
  }
};
