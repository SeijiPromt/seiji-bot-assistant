module.exports.config = { name: "leave", event: ["log:unsubscribe"] };
module.exports.run = async ({ api, event, utils }) => {
  if (event.logMessageData.leftParticipantFbId === api.getCurrentUserID()) return;
  api.sendMessage(utils.format("GOODBYE", "A member has left the group."), event.threadID);
};
