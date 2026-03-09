const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
require("dotenv").config({ path: "./config.env" });

const BOT_NAME = process.env.BOT_NAME || "LUCVOICE-XMD";
const OWNER_NAME = process.env.OWNER_NAME || "lucvoice";
const PREFIX = process.env.PREFIX || ".";
const START_MESSAGE = process.env.START_MESSAGE || `${BOT_NAME} is now online!`;

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("session");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    logger: pino({ level: "silent" }),
    printQRInTerminal: true,   // QR code in console
    auth: state,
    version
  });

  // Save credentials automatically
  sock.ev.on("creds.update", saveCreds);

  // Connection events
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if(connection === "close") {
      const reason = (lastDisconnect.error)?.output?.statusCode;
      console.log("🔌 Disconnected:", reason);
      // Reconnect if not logged out
      if(reason !== DisconnectReason.loggedOut) {
        console.log("♻️ Reconnecting...");
        startBot();
      }
    } else if(connection === "open") {
      console.log(`✅ ${BOT_NAME} connected to WhatsApp!`);
      sock.sendMessage(sock.user.id, { text: START_MESSAGE });
    }
  });

  // Listen for messages
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if(!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

    if(!body.startsWith(PREFIX)) return;
    const command = body.slice(PREFIX.length).trim().split(/ +/)[0].toLowerCase();

    switch(command) {
      case "ping":
        await sock.sendMessage(from, { text: "🏓 Pong! Bot is alive." });
        break;

      case "menu":
        await sock.sendMessage(from, {
          text: `
╭───〔 ${BOT_NAME} MENU 〕
│
│ ${PREFIX}ping
│ ${PREFIX}menu
│
╰─────────────
`
        });
        break;

      // You can add more commands here
    }
  });
}

startBot();
