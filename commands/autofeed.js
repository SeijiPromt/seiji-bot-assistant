let monitorInterval = null;
let seenPostIds = new Set();
let seenCommentIds = new Set();

function fetchTimeline(api) {
  return new Promise((resolve) => {
    const form = {
      av: api.getCurrentUserID(),
      fb_api_caller_class: "RelayModern",
      fb_api_req_friendly_name: "ProfileCometTimelineFeedRefetchQuery",
      variables: JSON.stringify({ count: 3, id: api.getCurrentUserID(), privacy: "EVERYONE", scale: 1 }),
      doc_id: "25955998477519664"
    };
    api.httpPost("https://www.facebook.com/api/graphql/", form, (err, res) => {
      if (err) return resolve([]);
      try {
        const data = JSON.parse(res);
        const edges = data.data?.node?.timeline_feed?.edges || [];
        resolve(edges.map(e => e.node).filter(Boolean));
      } catch (e) { resolve([]); }
    });
  });
}

module.exports.config = {
  name: "autofeed",
  role: 1,
  hasPrefix: true,
  aliases: ["af", "autopost"],
  description: "Auto monitor your feed, react, comment, and reply.",
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

    api.sendMessage(utils.success("Auto-Monitor Activated!\n\n• Checking your profile every 3 minutes.\n• Will react & comment on new posts.\n• Will auto-reply & react to new comments."), event.threadID);

    monitorInterval = setInterval(async () => {
      const posts = await fetchTimeline(api);
      for (const post of posts) {
        const pid = post.post_id;
        if (!pid || seenPostIds.has(pid)) continue;
        
        seenPostIds.add(pid);

        api.postReaction(pid, "❤️", () => {});
        api.comment("Nice post! 🔥", pid, () => {});

        setInterval(() => {
          api.getComments(pid, 10, (err, comments) => {
            if (err || !comments) return;
            for (const c of comments) {
              if (c.author === api.getCurrentUserID() || seenCommentIds.has(c.id)) continue;
              seenCommentIds.add(c.id);
              api.setMessageReaction("❤️", c.id, () => {});
              api.comment(`Hello ${c.authorName || 'there'}! Thanks for commenting. 🤖`, pid, () => {}, c.id);
            }
          });
        }, 60000);
      }
    }, 180000);
    return;
  }

  const url = args[0];
  if (!url || !url.includes("facebook.com")) {
    return api.sendMessage(utils.error("Usage:\n!af on - Start auto monitor\n!af stop - Stop monitor\n!af <url> - Manual monitor"), event.threadID);
  }

  let postID = null;
  const match = url.match(/(?:posts|permalink|photo|story_fbid)\/(?:.*?)?(\d{10,})/);
  if (match) postID = match[1];
  else if (url.match(/\d{10,}/)) postID = url.match(/\d{10,}/)[0];

  if (!postID) return api.sendMessage(utils.error("Invalid URL."), event.threadID);

  api.postReaction(postID, "❤️", () => {});
  api.comment("Nice post! 🔥", postID, () => {});
  api.sendMessage(utils.success(`Manual Monitor Activated for: ${postID}`), event.threadID);

  setInterval(() => {
    api.getComments(postID, 10, (err, comments) => {
      if (err || !comments) return;
      for (const c of comments) {
        if (c.author === api.getCurrentUserID() || seenCommentIds.has(c.id)) continue;
        seenCommentIds.add(c.id);
        api.setMessageReaction("❤️", c.id, () => {});
        api.comment(`Hello ${c.authorName || 'there'}! Thanks for commenting. 🤖`, postID, () => {}, c.id);
      }
    });
  }, 60000);
};
