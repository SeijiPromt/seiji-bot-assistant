const axios = require("axios");
module.exports.config = { name: "imagine", role: 0, hasPrefix: true, aliases: ["img", "draw"] };
module.exports.run = async ({ api, event, args, utils }) => {
  const prompt = args.join(" ");
  if (!prompt) return api.sendMessage(utils.error("Describe the image."), event.threadID);
  const load = await api.sendMessage("🎨 Generating image...", event.threadID);
  try {
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;
    const stream = await axios.get(url, { responseType: 'stream' });
    api.unsendMessage(load.messageID);
    api.sendMessage({ body: utils.format("IMAGE", "Here is your image:"), attachment: stream.data }, event.threadID);
  } catch (e) {
    api.unsendMessage(load.messageID);
    api.sendMessage(utils.error(e.message), event.threadID);
  }
};
