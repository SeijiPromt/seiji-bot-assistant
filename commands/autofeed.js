const puppeteer = require("puppeteer");
const axios = require("axios");

let monitorInterval = null;
let seenPostIds = new Set();
let seenCommentIds = new Set();

const TARGET_UID = "61586962211234"; 

function getCookieString(api) {
  return api.getAppState().map(c => `${c.key}=${c.value}`).join('; ');
}

// Fetch recent posts from your profile via mbasic
async function fetchTimeline(api) {
  try {
    const res = await axios.get(`https://mbasic.facebook.com/profile.php?id=${TARGET_UID}`, {
      headers: { 'cookie': getCookieString(api), 'user-agent': 'Mozilla/5.0' }
    });
    const matches = [...res.data.matchAll(/story_fbid=(\d+)/g), ...res.data.matchAll(/ft_ent_identifier=(\d+)/g)];
    return [...new Set(matches.map(m => m[1]))];
  } catch (e) {
    console.error("Timeline fetch error:", e.message);
    return [];
  }
}

// Fetch comments for a specific post via mbasic
async function fetchComments(api, postId) {
  try {
    const res = await axios.get(`https://mbasic.facebook.com/${postId}`, {
      headers: { 'cookie': getCookieString(api), 'user-agent': 'Mozilla/5.0' }
    });
    const matches = [...res.data.matchAll(/id="comment_(\d+)"/g)];
    return [...new Set(matches.map(m => m[1]))];
  } catch (e) {
    return [];
  }
}

// Use Puppeteer (invisible browser) to react and comment
async function executeBrowserAction(api, postId, action, text = null, replyToId = null) {
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    const page = await browser.newPage();
    await page.setCookie(...api.getAppState().map(c => ({
      name: c.key,
      value: c.value,
      domain: ".facebook.com"
    })));

    await page.goto(`https://mbasic.facebook.com/${postId}`, { waitUntil: "domcontentloaded" });

    if (action === "react") {
      const likeBtn = await page.$('a[href*="ufi/reaction"]');
      if (likeBtn) await likeBtn.click();
    } 
    else if (action === "comment" && text) {
      const inputSelector = 'input[name="comment_text"], textarea[name="comment_text"]';
      await page.waitForSelector(inputSelector, { timeout: 5000 });
      await page.type(inputSelector, text);
      
      const submitBtn = await page.$('input[type="submit"], button[type="submit"]');
      if (submitBtn) {
          await Promise.all([
              page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 10000 }).catch(() => {}),
              submitBtn.click(),
          ]);
      }
    }

    await browser.close();
    return true;
  } catch (err) {
    console.error("Puppeteer Error:", err.message);
    if (browser) await browser.close();
    return false;
  }
}

module.exports.config = {
  name: "autofeed",
  role: 1,
  hasPrefix: true,
  aliases: ["af", "autopost"],
  description: "Auto monitor feed, react, comment, and reply using invisible browser.",
};

module.exports.run = async ({ api, event, args, utils }) => {
  const action = args[0]?.toLowerCase();

  if (action === "stop") {
    if (monitorInterval) {
      clearInterval(monitorInterval);
      monitorInterval = null;
      return api.sendMessage(utils.success("Auto-Feed Monitor Stopped."), event.threadID);
    }
    return api.sendMessage(utils.error("Auto-Feed Monitor is not running."), event.threadID);
  }

  if (action === "on") {
    if (monitorInterval) return api.sendMessage(utils.error("Auto-Feed Monitor is already running."), event.threadID);

    api.sendMessage(utils.success(`Auto-Feed Activated!\n\n• Checking profile every 3 minutes.\n• Using invisible browser to react & comment.`), event.threadID);

    const runMonitor = async () => {
      const posts = await fetchTimeline(api);
      console.log(`[autofeed] Scanned UID ${TARGET_UID}. Found ${posts.length} posts.`);
      
      for (const pid of posts) {
        if (seenPostIds.has(pid)) continue;
        seenPostIds.add(pid);

        // React and Comment on the post
        await executeBrowserAction(api, pid, "react");
        await executeBrowserAction(api, pid, "comment", "Nice post! 🔥");

        // Monitor comments for this post
        setInterval(async () => {
          const comments = await fetchComments(api, pid);
          for (const cid of comments) {
            if (seenCommentIds.has(cid)) continue;
            seenCommentIds.add(cid);
            
            // React and reply to comment
            await executeBrowserAction(api, cid, "react");
            await executeBrowserAction(api, pid, "comment", "Hello! Thanks for commenting. 🤖", cid);
          }
        }, 60000);
      }
    };

    await runMonitor();
    monitorInterval = setInterval(runMonitor, 180000);
    return;
  }

  const url = args[0];
  if (!url || !url.includes("facebook.com")) {
    return api.sendMessage(utils.error("Usage:\n!af on - Start auto monitor\n!af stop - Stop monitor\n!af <url> - Manual monitor"), event.threadID);
  }

  if (url.includes("/share/")) {
    return api.sendMessage(utils.error("Share links (/share/) are not supported.\nPlease click the timestamp of your post (e.g., 'Just now') and copy the direct URL."), event.threadID);
  }

  let postID = null;
  const match = url.match(/(?:posts|permalink|photo|story_fbid)\/(?:.*?)?(\d{10,})/);
  if (match) postID = match[1];
  else if (url.match(/\d{15,}/)) postID = url.match(/\d{15,}/)[0];

  if (!postID) return api.sendMessage(utils.error("Invalid URL. Please use the direct post link."), event.threadID);

  const loading = await api.sendMessage("⏳ Launching invisible browser for manual monitor...", event.threadID);
  
  await executeBrowserAction(api, postID, "react");
  await executeBrowserAction(api, postID, "comment", "Nice post! 🔥");
  
  api.unsendMessage(loading.messageID);
  api.sendMessage(utils.success(`Manual Monitor Activated for: ${postID}`), event.threadID);

  setInterval(async () => {
    const comments = await fetchComments(api, postID);
    for (const cid of comments) {
      if (seenCommentIds.has(cid)) continue;
      seenCommentIds.add(cid);
      
      await executeBrowserAction(api, cid, "react");
      await executeBrowserAction(api, postID, "comment", "Hello! Thanks for commenting. 🤖", cid);
    }
  }, 60000);
};
