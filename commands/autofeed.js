const axios = require("axios");

let monitorInterval = null;
let seenPostIds = new Set();
let seenCommentIds = new Set();

const TARGET_UID = "61586962211234";

// Helper to get cookie string from appstate for mbasic reading
function getCookieString(api) {
  return api.getAppState().map(c => `${c.key}=${c.value}`).join('; ');
}

// Fetch timeline using mbasic (works well for scraping)
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

// Use FCA's native httpPost (inherits fb_dtsg tokens) to react
function reactToPost(api, postId) {
  return new Promise((resolve) => {
    const form = {
      av: api.getCurrentUserID(),
      fb_api_caller_class: "RelayModern",
      fb_api_req_friendly_name: "CometUFIReactionMutation",
      variables: JSON.stringify({
        input: {
          feedback_id: Buffer.from(`feedback:${postId}`).toString('base64'),
          reaction_id: "1635855486666999", // Like
          action: "ADD"
        }
      }),
      doc_id: "1494775491804961"
    };
    api.httpPost("https://www.facebook.com/api/graphql/", form, (err, res) => {
      if (err) console.error("React error:", err);
      resolve(!err);
    });
  });
}

// Use FCA's native httpPost to comment
function commentOnPost(api, postId, text, replyToId = null) {
  return new Promise((resolve) => {
    const input = {
      feedback_id: Buffer.from(`feedback:${postId}`).toString('base64'),
      message: { text: text },
      feedback_referrer: "newsfeed",
      actor_id: api.getCurrentUserID(),
      client_mutation_id: "1"
    };
    
    // If replying to a specific comment
    if (replyToId) {
        input.replied_comment_id = replyToId; 
    }

    const form = {
      av: api.getCurrentUserID(),
      fb_api_caller_class: "RelayModern",
      fb_api_req_friendly_name: "CommentCreateMutation",
      variables: JSON.stringify({ input }),
      doc_id: "24285361645632451"
    };
    
    api.httpPost("https://www.facebook.com/api/graphql/", form, (err, res) => {
      if (err) console.error("Comment error:", err);
      resolve(!err);
    });
  });
}

// Fetch comments using mbasic
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

    api.sendMessage(utils.success(`Auto-Monitor Activated for UID: ${TARGET_UID}!\n\n• Checking profile every 3 minutes via mbasic.\n• Will react & comment on new posts via GraphQL.`), event.threadID);

    const runMonitor = async () => {
      const posts = await fetchTimeline(api);
      console.log(`[autofeed] Scanned UID ${TARGET_UID}. Found ${posts.length} posts.`);
      
      for (const pid of posts) {
        if (seenPostIds.has(pid)) continue;
        seenPostIds.add(pid);

        // React and Comment using GraphQL httpPost
        await reactToPost(api, pid);
        await commentOnPost(api, pid, "Nice post! 🔥");

        // Monitor comments for this post
        setInterval(async () => {
          const comments = await fetchComments(api, pid);
          for (const cid of comments) {
            if (seenCommentIds.has(cid)) continue;
            seenCommentIds.add(cid);
            
            // React and reply to comment
            await reactToPost(api, cid);
            await commentOnPost(api, pid, "Hello! Thanks for commenting. 🤖", cid);
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
    return api.sendMessage(utils.error("Share links (/share/) are not supported.\nPlease click the timestamp of your post and copy the direct URL."), event.threadID);
  }

  let postID = null;
  const match = url.match(/(?:posts|permalink|photo|story_fbid)\/(?:.*?)?(\d{10,})/);
  if (match) postID = match[1];
  else if (url.match(/\d{15,}/)) postID = url.match(/\d{15,}/)[0];

  if (!postID) return api.sendMessage(utils.error("Invalid URL. Please use the direct post link."), event.threadID);

  await reactToPost(api, postID);
  await commentOnPost(api, postID, "Nice post! 🔥");
  api.sendMessage(utils.success(`Manual Monitor Activated for: ${postID}`), event.threadID);

  setInterval(async () => {
    const comments = await fetchComments(api, postID);
    for (const cid of comments) {
      if (seenCommentIds.has(cid)) continue;
      seenCommentIds.add(cid);
      
      await reactToPost(api, cid);
      await commentOnPost(api, postID, "Hello! Thanks for commenting. 🤖", cid);
    }
  }, 60000);
};
