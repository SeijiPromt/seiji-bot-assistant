const axios = require("axios");

let monitorInterval = null;
let seenPostIds = new Set();
let seenCommentIds = new Set();

// Change this to your exact UID if you want to be specific
const TARGET_UID = "61586962211234"; 

async function fetchTimeline(api) {
  try {
    const appstate = api.getAppState();
    const cookie = appstate.map(c => `${c.key}=${c.value}`).join('; ');
    
    // We use TARGET_UID instead of api.getCurrentUserID() here
    const res = await axios.get(`https://mbasic.facebook.com/profile.php?id=${TARGET_UID}`, {
      headers: {
        'cookie': cookie,
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9'
      },
      maxRedirects: 5
    });

    const html = res.data;
    const matches = [...html.matchAll(/story_fbid=(\d+)/g), ...html.matchAll(/ft_ent_identifier=(\d+)/g)];
    
    const postIds = [...new Set(matches.map(m => m[1]))];
    return postIds;
  } catch (e) {
    console.error("Timeline fetch error:", e.message);
    return [];
  }
}

module.exports.config = {
  name: "autofeed",
  role: 1,
  hasPrefix: true,
  aliases: ["af", "autopost"],
  description: "Auto monitor feed, react, comment, and reply.",
};

module.exports.run = async ({ api, event, args, utils }) => {
  const action = args[0]?.toLowerCase();

  if (action === "stop") {
    if (monitorInterval) {
      clearInterval(monitorInterval);
      monitorInterval = null;
      return api.sendMessage(utils.success("Auto-Monitor Stopped."), event.threadID);
    }
    return api.sendMessage(utils.error("Auto-Monitor is not currently running."), event.threadID);
  }

  if (action === "on") {
    if (monitorInterval) return api.sendMessage(utils.error("Auto-Monitor is already running."), event.threadID);

    api.sendMessage(utils.success(`Auto-Monitor Activated for UID: ${TARGET_UID}!\n\n• Checking profile every 3 minutes.\n• Will react & comment on new posts.`), event.threadID);

    const runMonitor = async () => {
      const posts = await fetchTimeline(api);
      console.log(`[autofeed] Scanned UID ${TARGET_UID}. Found ${posts.length} posts.`);
      
      for (const pid of posts) {
        if (seenPostIds.has(pid)) continue;
        seenPostIds.add(pid);

        api.postReaction(pid, "❤️", (err) => { if(err) console.error("React err:", err) });
        api.comment("Nice post! 🔥", pid, (err) => { if(err) console.error("Comment err:", err) });

        setInterval(() => {
          api.getComments(pid, 10, (err, comments) => {
            if (err || !comments) return;
            for (const c of comments) {
              if (c.author === TARGET_UID || seenCommentIds.has(c.id)) continue;
              seenCommentIds.add(c.id);
              
              api.setMessageReaction("❤️", c.id, () => {});
              api.comment(`Hello ${c.authorName || 'there'}! Thanks for commenting. 🤖`, pid, () => {}, c.id);
            }
          });
        }, 60000);
      }
    };

    await runMonitor();
    monitorInterval = setInterval(runMonitor, 180000);
    return;
  }

  // Manual fallback remains the same
  const url = args[0];
  if (!url || !url.includes("facebook.com")) {
    return api.sendMessage(utils.error("Usage:\n!af on - Start auto monitor\n!af stop - Stop monitor\n!af <url> - Manual monitor"), event.threadID);
  }

  if (url.includes("/share/")) {
    return api.sendMessage(utils.error("Share links (/share/) are not supported.\nPlease click the timestamp of your post (e.g., 'Just now') and copy the direct URL from the address bar."), event.threadID);
  }

  let postID = null;
  const match = url.match(/(?:posts|permalink|photo|story_fbid)\/(?:.*?)?(\d{10,})/);
  if (match) postID = match[1];
  else if (url.match(/\d{15,}/)) postID = url.match(/\d{15,}/)[0];

  if (!postID) return api.sendMessage(utils.error("Invalid URL. Please use the direct post link."), event.threadID);

  api.postReaction(postID, "❤️", () => {});
  api.comment("Nice post! 🔥", postID, () => {});
  api.sendMessage(utils.success(`Manual Monitor Activated for: ${postID}`), event.threadID);

  setInterval(() => {
    api.getComments(postID, 10, (err, comments) => {
      if (err || !comments) return;
      for (const c of comments) {
        if (c.author === TARGET_UID || seenCommentIds.has(c.id)) continue;
        seenCommentIds.add(c.id);
        api.setMessageReaction("❤️", c.id, () => {});
        api.comment(`Hello ${c.authorName || 'there'}! Thanks for commenting. 🤖`, postID, () => {}, c.id);
      }
    });
  }, 60000);
};
