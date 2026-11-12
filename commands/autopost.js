const puppeteer = require("puppeteer");

module.exports.config = {
  name: "autopost",
  role: 1,
  hasPrefix: true,
  aliases: ["post"],
  description: "Post a status to the bot's profile",
};

module.exports.run = async ({ api, event, args, utils }) => {
  const text = args.join(" ");
  if (!text) return api.sendMessage(utils.error("Please provide text to post. Ex: !post Hello World!"), event.threadID);

  const loading = await api.sendMessage("⏳ Launching invisible browser to post...", event.threadID);
  
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    const page = await browser.newPage();
    const appstate = api.getAppState();
    
    // Set cookies
    await page.setCookie(...appstate.map(c => ({
      name: c.key,
      value: c.value,
      domain: ".facebook.com"
    })));

    // Go to mbasic homepage
    await page.goto("https://mbasic.facebook.com/", { waitUntil: "networkidle2" });

    // Type the post
    const textareaSelector = 'textarea[name="xc_message"]';
    await page.waitForSelector(textareaSelector, { timeout: 10000 });
    await page.type(textareaSelector, text);

    // Click post button
    const submitBtnSelector = 'input[name="view_post"]';
    await page.waitForSelector(submitBtnSelector);
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle2" }),
      page.click(submitBtnSelector)
    ]);

    await browser.close();
    api.unsendMessage(loading.messageID);
    api.sendMessage(utils.success("Successfully posted to your profile!"), event.threadID);

  } catch (err) {
    if (browser) await browser.close();
    api.unsendMessage(loading.messageID);
    api.sendMessage(utils.error(`Failed to post: ${err.message}`), event.threadID);
  }
};
