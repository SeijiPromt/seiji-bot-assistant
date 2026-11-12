module.exports.config = {
  name: "autoreact",
  role: 1,
  hasPrefix: true,
  aliases: ["ar"],
  description: "Auto react to incoming messages",
};

module.exports.run = async ({ api, event, args, utils, state }) => {
  const action = args[0]?.toLowerCase();
  const currentState = state.getAutoReact();

  if (action === "on") {
    state.setAutoReact(true);
    return api.sendMessage(utils.success("Auto-React to Messages is now ON."), event.threadID);
  }
  
  if (action === "off") {
    state.setAutoReact(false);
    return api.sendMessage(utils.success("Auto-React to Messages is now OFF."), event.threadID);
  }

  api.sendMessage(utils.format("AUTO REACT", `Status: ${currentState ? "ON" : "OFF"}\n\nUsage:\n!autoreact on\n!autoreact off`), event.threadID);
};
