const axios = require("axios");
module.exports.config = { name: "gpt", role: 0, hasPrefix: true, aliases: ["ai", "ask"] };
module.exports.run = async ({ api, event, args, utils }) => {
  const prompt = args.join(" ");
  if (!prompt) return api.sendMessage(utils.error("Please provide a prompt."), event.threadID);
  const load = await api.sendMessage("🤖 Thinking...", event.threadID);
  try {
    const res = await axios.post("https://text.pollinations.ai/", {
      messages: [{ role: "user", content: prompt }], model: "openai",
    });
    api.unsendMessage(load.messageID);
    api.sendMessage(utils.format("GPT AI", res.data.trim()), event.threadID);
  } catch (e) {
    api.unsendMessage(load.messageID);
    api.sendMessage(utils.error(e.message), event.threadID);
  }
};
