const axios = require("axios");
module.exports.config = { name: "translate", role: 0, hasPrefix: true, aliases: ["tr"] };
module.exports.run = async ({ api, event, args, utils }) => {
  const text = args.join(" ");
  if (!text) return api.sendMessage(utils.error("Ex: !tr Spanish Hello"), event.threadID);
  const load = await api.sendMessage("🌐 Translating...", event.threadID);
  try {
    const res = await axios.post("https://text.pollinations.ai/", {
      messages: [{ role: "system", content: "Translate to specified language." }, { role: "user", content: text }], model: "openai",
    });
    api.unsendMessage(load.messageID);
    api.sendMessage(utils.format("TRANSLATOR", res.data.trim()), event.threadID);
  } catch (e) {
    api.unsendMessage(load.messageID);
    api.sendMessage(utils.error(e.message), event.threadID);
  }
};
