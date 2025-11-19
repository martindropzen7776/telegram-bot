const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

/* ============================
   🔐 VARIABLES DEL BOT / META
=============================== */

const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) throw new Error("Falta la variable BOT_TOKEN");

const META_PIXEL_ID = process.env.META_PIXEL_ID;
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

// 👑 Tu ID de Telegram (para /broadcast)
const ADMIN_ID = 7759212225;

/* ============================
   📁 DISK DE RENDER (/data)
=============================== */

// Render monta el disco en /data
const DATA_DIR = "/data";
const USERS_FILE = path.join(DATA_DIR, "usuarios.json");

console.log("📂 Archivo usuarios:", USERS_FILE);

/* ============================
   📌 CARGAR USUARIOS
=============================== */

let usuarios = [];

if (fs.existsSync(USERS_FILE)) {
  try {
    usuarios = JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
    console.log("✅ Usuarios cargados al iniciar:", usuarios.length);
  } catch (e) {
    console.error("❌ Error leyendo usuarios.json:", e);
    usuarios = [];
  }
} else {
  console.log("ℹ️ usuarios.json no existe, se creará al guardar el primero.");
}

function guardarUsuarios() {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(usuarios, null, 2));
    console.log("💾 Guardados usuarios:", usuarios.length);
  } catch (e) {
    console.error("❌ Error guardando usuarios:", e);
  }
}

/* ============================
   📡 ENVIAR LEAD A META (CAPI)
=============================== */

async function enviarLeadMeta(chatId) {
  if (!META_PIXEL_ID || !META_ACCESS_TOKEN) {
    console.log("⚠️ Pixel o Access Token de Meta no configurados, no se envía evento.");
    return;
  }

  const url = `https://graph.facebook.com/v18.0/${META_PIXEL_ID}/events`;

  // Mandamos external_id (NO hasheado) + user_agent
  const user_data = {
    external_id: String(chatId),
    client_user_agent: "telegram-bot"
  };

  const payload = {
    data: [
      {
        event_name: "Lead",
        event_time: Math.floor(Date.now() / 1000),
        action_source: "system_generated",
        user_data
      }
    ],
    access_token: META_ACCESS_TOKEN
  };

  try {
    const res = await axios.post(url, payload);
    console.log("📨 Lead enviado a Meta OK:", res.data);
  } catch (err) {
    console.error("❌ Error Meta CAPI:", err.response?.data || err.message);
  }
}

/* ============================
   🤖 BOT TELEGRAM
=============================== */

const bot = new TelegramBot(TOKEN, { polling: true });

/* ----- /start → registra usuario + Lead ----- */

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  if (!usuarios.includes(chatId)) {
    usuarios.push(chatId);
    guardarUsuarios();
  }

  // Enviar evento Lead a Meta
  enviarLeadMeta(chatId);

  bot.sendMessage(
    chatId,
    `👋 ¡Bienvenido/a!

Ya quedaste registrado en nuestro bot oficial. Desde ahora vas a recibir bonos, promos y alertas exclusivas 🎁

🍀 ¡Mucha suerte!`
  );
});

/* ----- /broadcast <mensaje> (solo admin) ----- */

bot.onText(/\/broadcast (.+)/, (msg, match) => {
  if (msg.from.id !== ADMIN_ID) {
    return bot.sendMessage(msg.chat.id, "❌ No tenés permiso para usar este comando.");
  }

  const mensaje = match[1];

  if (usuarios.length === 0) {
    bot.sendMessage(msg.chat.id, "⚠️ No hay usuarios registrados todavía.");
    return;
  }

  console.log("📢 Enviando broadcast a", usuarios.length, "usuarios");

  usuarios.forEach((id) => {
    bot
      .sendMessage(id, mensaje)
      .catch((e) => console.log("Error enviando a", id, "→", e.message || e));
  });

  bot.sendMessage(msg.chat.id, "✅ Broadcast enviado a todos los usuarios.");
});

/* ============================
   🌐 EXPRESS PARA RENDER
=============================== */

const app = express();

app.get("/", (req, res) => {
  res.send("Bot funcionando en Render ✅");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🌍 Server listo en puerto", PORT);
});

module.exports = {};
