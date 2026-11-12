const axios = require("axios");
module.exports.config = { name: "download", role: 0, hasPrefix: true, aliases: ["dl", "fbdl"] };
module.exports.run = async ({ api, event, args, utils }) => {
  if (!args[0]?.startsWith("http")) return api.sendMessage(utils.error("Provide a URL."), event.threadID);
  const load = await api.sendMessage("⬇️ Downloading...", event.threadID);
  try {
    const res = await axios.get(`https://api.vhtear.com/facebook?link=${encodeURIComponent(args[0])}`);
    if (res.data?.result?.url) {
      const stream = await axios.get(res.data.result.url, { responseType: 'stream' });
      api.unsendMessage(load.messageID);
      api.sendMessage({ body: utils.format("DOWNLOADER", "Here is your video:"), attachment: stream.data }, event.threadID);
    } else throw new Error("No link found.");
  } catch (e) {
    api.unsendMessage(load.messageID);
    api.sendMessage(utils.error(e.message), event.threadID);
  }
};
