const axios = require("axios");
module.exports.config = { name: "poem", role: 0, hasPrefix: true };
module.exports.run = async ({ api, event, args, utils }) => {
  const topic = args.join(" ") || "love";
  const load = await api.sendMessage("✍️ Writing...", event.threadID);
  try {
    const res = await axios.post("https://text.pollinations.ai/", {
      messages: [{ role: "user", content: `Write a beautiful poem about ${topic}.` }], model: "openai",
    });
    api.unsendMessage(load.messageID);
    api.sendMessage(utils.format("POETRY", res.data.trim()), event.threadID);
  } catch (e) {
    api.unsendMessage(load.messageID);
    api.sendMessage(utils.error(e.message), event.threadID);
  }
};
