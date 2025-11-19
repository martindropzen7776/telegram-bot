const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const crypto = require("crypto");

/* ============================
   🔐 VARIABLES DEL BOT / META
=============================== */

const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) throw new Error("Falta la variable BOT_TOKEN");

const META_PIXEL_ID = process.env.META_PIXEL_ID;
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

// 👑 Tu ID de Telegram (cambiá si hace falta)
const ADMIN_ID = 7759212225;

/* ============================
   🔧 HELPERS
=============================== */

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/* ============================
   📁 CONFIGURAR DISK DE RENDER
=============================== */

// Render monta el disco en /data (no lo creamos nosotros)
const DATA_DIR = "/data";

const USERS_FILE = path.join(DATA_DIR, "usuarios.json");
const EMAILS_FILE = path.join(DATA_DIR, "emails.json");

console.log("📂 Archivo usuarios:", USERS_FILE);
console.log("📂 Archivo emails:", EMAILS_FILE);

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
   📌 CARGAR EMAILS
=============================== */

let emails = [];

if (fs.existsSync(EMAILS_FILE)) {
  try {
    emails = JSON.parse(fs.readFileSync(EMAILS_FILE, "utf8"));
    console.log("✅ Emails cargados al iniciar:", emails.length);
  } catch (e) {
    console.error("❌ Error leyendo emails.json:", e);
    emails = [];
  }
} else {
  console.log("ℹ️ emails.json no existe, se creará al guardar el primero.");
}

function guardarEmails() {
  try {
    fs.writeFileSync(EMAILS_FILE, JSON.stringify(emails, null, 2));
    console.log("📩 Emails guardados:", emails.length);
  } catch (e) {
    console.error("❌ Error guardando emails:", e);
  }
}

/* ============================
   📡 ENVIAR EVENTO A META (CAPI)
=============================== */

async function enviarEventoMeta({ eventName, chatId, email }) {
  if (!META_PIXEL_ID || !META_ACCESS_TOKEN) {
    console.log("⚠️ Pixel o Access Token de Meta no configurados, no se envía evento.");
    return;
  }

  const url = `https://graph.facebook.com/v18.0/${META_PIXEL_ID}/events`;

  // Siempre mandamos al menos external_id hasheado
  const user_data = {
    client_user_agent: `telegram_chat_${chatId}`,
    external_id: sha256(String(chatId)) // identificador estable
  };

  // Si tenemos email, lo normalizamos y lo mandamos hasheado
  if (email) {
    const normalizedEmail = email.trim().toLowerCase();
    user_data.em = [sha256(normalizedEmail)];
  }

  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: "system_generated",
        user_data
      }
    ],
    access_token: META_ACCESS_TOKEN
  };

  try {
    const res = await axios.post(url, payload);
    console.log("📨 Enviado a Meta OK:", res.data);
  } catch (err) {
    console.error("❌ Error Meta CAPI:", err.response?.data || err.message);
  }
}

/* ============================
   🤖 INICIAR BOT TELEGRAM
=============================== */

const bot = new TelegramBot(TOKEN, { polling: true });

/* ----- /start ----- */

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  if (!usuarios.includes(chatId)) {
    usuarios.push(chatId);
    guardarUsuarios();
  }

  // Evento Lead (sin email todavía)
  enviarEventoMeta({ eventName: "Lead", chatId, email: null });

  bot.sendMessage(
    chatId,
    `👋 ¡Bienvenido/a!

Ya estás registrado y vas a recibir bonos y alertas exclusivas 🎁

📧 Si querés recibir beneficios también por email,
enviame tu correo (por ejemplo: tunombre@gmail.com).

🍀 ¡Mucha suerte!`
  );
});

/* ----- /broadcast <mensaje> ----- */

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
   📧 DETECTAR EMAILS AUTOMÁTICO
=============================== */

bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();

  // ignorar comandos (/start, /broadcast, etc.)
  if (!text || text.startsWith("/")) return;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (emailRegex.test(text)) {
    const email = text.toLowerCase();

    const exist = emails.find((e) => e.chatId === chatId);
    if (exist) {
      exist.email = email;
    } else {
      emails.push({ chatId, email });
    }

    guardarEmails();

    // Evento CompleteRegistration con email
    enviarEventoMeta({ eventName: "CompleteRegistration", chatId, email });

    bot.sendMessage(
      chatId,
      `📩 Email guardado: ${email}\n\nSi querés que lo borre, avisame.`
    );
  }
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
