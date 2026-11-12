const axios = require("axios");

let monitorInterval = null;
let seenPostIds = new Set();
let seenCommentIds = new Set();

const TARGET_UID = "61586962211234";

// Helper to get cookie string from appstate
function getCookieString(api) {
  return api.getAppState().map(c => `${c.key}=${c.value}`).join('; ');
}

async function fetchTimeline(api) {
  try {
    const res = await axios.get(`https://mbasic.facebook.com/profile.php?id=${TARGET_UID}`, {
      headers: { 'cookie': getCookieString(api), 'user-agent': 'Mozilla/5.0' }
    });
    const matches = [...res.data.matchAll(/story_fbid=(\d+)/g), ...res.data.matchAll(/ft_ent_identifier=(\d+)/g)];
    return [...new Set(matches.map(m => m[1]))];
  } catch (e) {
    return [];
  }
}

async function mbasicReact(api, postId, type = 2) { // 2 = Love
  try {
    await axios.get(`https://mbasic.facebook.com/ufi/reaction/?ft_ent_identifier=${postId}&reaction_type=${type}`, {
      headers: { 'cookie': getCookieString(api), 'user-agent': 'Mozilla/5.0' }
    });
  } catch (e) {}
}

async function mbasicComment(api, postId, text, replyToId = null) {
  try {
    let url = `https://mbasic.facebook.com/a/comment.php?ft_ent_identifier=${postId}`;
    if (replyToId) url += `&reply_fbid=${replyToId}`;
    
    await axios.post(url, `comment_text=${encodeURIComponent(text)}`, {
      headers: { 
        'cookie': getCookieString(api), 
        'user-agent': 'Mozilla/5.0',
        'content-type': 'application/x-www-form-urlencoded'
      }
    });
  } catch (e) {}
}

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

    api.sendMessage(utils.success(`Auto-Monitor Activated for UID: ${TARGET_UID}!\n\n• Checking profile every 3 minutes via mbasic.\n• Will react & comment on new posts.`), event.threadID);

    const runMonitor = async () => {
      const posts = await fetchTimeline(api);
      console.log(`[autofeed] Scanned UID ${TARGET_UID}. Found ${posts.length} posts.`);
      
      for (const pid of posts) {
        if (seenPostIds.has(pid)) continue;
        seenPostIds.add(pid);

        // React (Love = 2) and Comment on the post
        await mbasicReact(api, pid, 2);
        await mbasicComment(api, pid, "Nice post! 🔥");

        // Monitor comments for this post
        setInterval(async () => {
          const comments = await fetchComments(api, pid);
          for (const cid of comments) {
            if (seenCommentIds.has(cid)) continue;
            seenCommentIds.add(cid);
            
            // React to comment (Love = 2) and reply
            await mbasicReact(api, cid, 2);
            await mbasicComment(api, pid, "Hello! Thanks for commenting. 🤖", cid);
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
    return api.sendMessage(utils.error("Share links (/share/) are not supported.\nPlease click the timestamp of your post (e.g., 'Just now') and copy the direct URL from the address bar."), event.threadID);
  }

  let postID = null;
  const match = url.match(/(?:posts|permalink|photo|story_fbid)\/(?:.*?)?(\d{10,})/);
  if (match) postID = match[1];
  else if (url.match(/\d{15,}/)) postID = url.match(/\d{15,}/)[0];

  if (!postID) return api.sendMessage(utils.error("Invalid URL. Please use the direct post link."), event.threadID);

  await mbasicReact(api, postID, 2);
  await mbasicComment(api, postID, "Nice post! 🔥");
  api.sendMessage(utils.success(`Manual Monitor Activated for: ${postID}`), event.threadID);

  setInterval(async () => {
    const comments = await fetchComments(api, postID);
    for (const cid of comments) {
      if (seenCommentIds.has(cid)) continue;
      seenCommentIds.add(cid);
      
      await mbasicReact(api, cid, 2);
      await mbasicComment(api, postID, "Hello! Thanks for commenting. 🤖", cid);
    }
  }, 60000);
};
