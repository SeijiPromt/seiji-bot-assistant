const fs = require("fs");
const path = require("path");
const http = require("http");
const login = require("@dongdev/fca-unofficial");
const utils = require("./utils");

let config;
try {
  config = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"));
} catch (e) {
  console.error("Failed to load config.json");
  process.exit(1);
}

const commands = new Map();
const aliases = new Map();
const events = new Map();

// Auto React State
let autoReactEnabled = false;

const cmdPath = path.join(__dirname, "commands");
if (fs.existsSync(cmdPath)) {
  const files = fs.readdirSync(cmdPath).filter(f => f.endsWith(".js"));
  for (const file of files) {
    try {
      const cmd = require(path.join(cmdPath, file));
      if (cmd.config && cmd.run) {
        commands.set(cmd.config.name, cmd);
        if (cmd.config.aliases) {
          for (const alias of cmd.config.aliases) {
            aliases.set(alias, cmd.config.name);
          }
        }
      }
    } catch (e) {
      console.error(`Error loading command ${file}:`, e.message);
    }
  }
  console.log(`Loaded ${commands.size} commands.`);
}

const evtPath = path.join(__dirname, "events");
if (fs.existsSync(evtPath)) {
  const files = fs.readdirSync(evtPath).filter(f => f.endsWith(".js"));
  for (const file of files) {
    try {
      const evt = require(path.join(evtPath, file));
      if (evt.config && evt.run) {
        events.set(evt.config.name, evt);
      }
    } catch (e) {
      console.error(`Error loading event ${file}:`, e.message);
    }
  }
  console.log(`Loaded ${events.size} events.`);
}

function loadAppstate() {
  if (process.env.APPSTATE) {
    const raw = process.env.APPSTATE.trim();
    if (raw.startsWith("[")) return JSON.parse(raw);
    return JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
  }
  const file = path.join(__dirname, "appstate.json");
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
  throw new Error("no appstate: set APPSTATE env or drop appstate.json");
}

async function handleEvent(api, event) {
  const tid = event.threadID;
  const sender = event.senderID;
  
  if (event.type === "message" || event.type === "message_reply") {
    if (!event.body) return;
    if (sender === api.getCurrentUserID()) return;

    // --- AUTO REACT TO MESSAGES ---
    if (autoReactEnabled) {
      api.setMessageReaction("❤️", event.messageID, (err) => {}, true);
    }

    const body = event.body.trim();
    const hasPrefix = body.startsWith(config.prefix);
    const cmdBody = hasPrefix ? body.slice(config.prefix.length).trim() : body;
    const [cmdName, ...args] = cmdBody.split(/\s+/);
    const lowerCmd = cmdName.toLowerCase();

    const resolvedName = aliases.get(lowerCmd) || lowerCmd;
    const command = commands.get(resolvedName);

    if (command) {
      const cmdConfig = command.config;
      if (cmdConfig.hasPrefix !== false && !hasPrefix) return;

      const isBotAdmin = config.admins.includes(sender);
      let isGroupAdmin = false;
      if (event.isGroup) {
        try {
          const info = await api.getThreadInfo(tid);
          isGroupAdmin = info.adminIDs.some(a => a.id === sender);
        } catch (_) {}
      }

      if (cmdConfig.role === 1 && !isBotAdmin) {
        return api.sendMessage(utils.error("This command is only for Bot Admins."), tid, event.messageID);
      }
      if (cmdConfig.role === 2 && !isGroupAdmin && !isBotAdmin) {
        return api.sendMessage(utils.error("This command is only for Group Admins."), tid, event.messageID);
      }

      try {
        await command.run({ api, event, args, config, utils, prefix: config.prefix, state: { setAutoReact: (val) => autoReactEnabled = val, getAutoReact: () => autoReactEnabled } });
      } catch (err) {
        console.error(err);
        api.sendMessage(utils.error(err.message), tid, event.messageID);
      }
    }
  } 
  else if (event.type === "event") {
    for (const evt of events.values()) {
      if (evt.config.event.includes(event.logMessageType)) {
        try {
          await evt.run({ api, event, config, utils });
        } catch (e) {
          console.error(`Event ${evt.config.name} error:`, e.message);
        }
      }
    }
  }
}

function startListener(api) {
  api.setOptions({ listenEvents: true, selfListen: false, logLevel: "silent" });

  api.listenMqtt((err, event) => {
    if (err) {
      console.error("[mqtt]", err.error || err.message || err);
      setTimeout(() => startListener(api), 5000);
      return;
    }
    if (!event || !event.type) return;
    handleEvent(api, event).catch(e => console.error("[handler]", e.message || e));
  });
}

function boot() {
  let appState;
  try { appState = loadAppstate(); } 
  catch (e) { console.error("[boot]", e.message); process.exit(1); }

  login({ appState }, (err, api) => {
    if (err) { console.error("[login]", err.error || err); process.exit(1); }
    console.log("[login] uid", api.getCurrentUserID());
    startListener(api);
  });
}

const server = http.createServer((req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, name: "Seiji Bot" }));
    return;
  }
  res.writeHead(404);
  res.end();
});

server.listen(process.env.PORT || 8000, () => {
  console.log("[http] health on", process.env.PORT || 8000);
  boot();
});

process.on("unhandledRejection", e => console.error("[unhandled]", e));
process.on("uncaughtException", e => console.error("[uncaught]", e.message));
