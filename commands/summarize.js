const axios = require("axios");
module.exports.config = { name: "summarize", role: 0, hasPrefix: true, aliases: ["sum"] };
module.exports.run = async ({ api, event, args, utils }) => {
  const text = args.join(" ");
  if (!text) return api.sendMessage(utils.error("Provide text."), event.threadID);
  const load = await api.sendMessage("📝 Summarizing...", event.threadID);
  try {
    const res = await axios.post("https://text.pollinations.ai/", {
      messages: [{ role: "system", content: "Summarize concisely." }, { role: "user", content: text }], model: "openai",
    });
    api.unsendMessage(load.messageID);
    api.sendMessage(utils.format("SUMMARY", res.data.trim()), event.threadID);
  } catch (e) {
    api.unsendMessage(load.messageID);
    api.sendMessage(utils.error(e.message), event.threadID);
  }
};
