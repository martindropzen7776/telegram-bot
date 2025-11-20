const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const fs = require("fs");
const path = require("path");

/* ============================
   🔐 VARIABLES DEL BOT
=============================== */

const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) throw new Error("Falta la variable BOT_TOKEN");

// 👑 Tu ID de Telegram (para /broadcast)
const ADMIN_ID = 7759212225;

/* ============================
   📁 DISK /data EN RENDER
=============================== */

const DATA_DIR = "/data"; // Render monta el disk aquí

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
   Estructura: [{ chatId, email }]
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

function setEmail(chatId, email) {
  const idx = emails.findIndex((e) => e.chatId === chatId);
  if (idx === -1) {
    emails.push({ chatId, email });
  } else {
    emails[idx].email = email;
  }
  guardarEmails();
}

/* ============================
   🤖 BOT TELEGRAM
=============================== */

const bot = new TelegramBot(TOKEN, { polling: true });

/* ----- /start → registra usuario y pide email ----- */

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  if (!usuarios.includes(chatId)) {
    usuarios.push(chatId);
    guardarUsuarios();
  }

bot.sendMessage(
  chatId,
  `Tu <b>BONO DE BIENVENIDA</b> es:
<b>WELCOME</b>

🔄 <b>Para activarlo:</b>
1️⃣ Entra en el icono de la personita arriba a la derecha
2️⃣ En la parte de código promocional ingresa el código
3️⃣ Escribí: <b>WELCOME</b>

🎁 <b>BONO EXTRA SORPRESA:</b>
Solo por abrir este chat, te damos un BONO EXTRA de regalo, exclusivo para vos.

Para recibirlo ahora, escribí a nuestro agente oficial 👇
👉 <a href="https://t.me/m/j2MrUv6LOWI5">Haz click aquí para jugar</a> 👈

🥇 <b>Tip:</b> Guardá este chat.
Acá te mandamos regalos sorpresa, bonos privados y beneficios especiales que no publicamos en ningún otro lado.
`,
   { parse_mode: "HTML", disable_web_page_preview: true }
 );
}); // 👈 ESTE CIERRE FALTABA

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
   📧 CAPTURAR EMAIL
   (solo guarda en /data/emails.json)
=============================== */

bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();

  // ignorar comandos tipo /start, /broadcast, etc.
  if (!text || text.startsWith("/")) return;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(text)) {
    // Si querés, podés responder algo acá
    // bot.sendMessage(chatId, "Por favor enviá un email válido 😊");
    return;
  }

  const email = text.toLowerCase();

  // Guardar email en /data/emails.json
  setEmail(chatId, email);

bot.sendMessage(
  chatId,
  `🎁 <b>Bono exclusivo para vos</b> 🎁
Te regalamos un <b>30%</b> en tu próxima carga. 
Solo tenés que hablarnos a TG 👉 <a href="https://t.me/m/eCMJ3EBWZjNh">Haz click aquí</a> 
o realizar tu carga directa 👉 <a href="https://winplay.space/home">Click para cargar</a>

🚨 Si realizás tu carga directa, dejanos un comentario que diga:
<b>"quiero mi bono del 30%"</b>

✨ Unite a nuestro canal para recibir promos exclusivas todos los días  
👉 <a href="https://t.me/+Q6G0LB5WK1lhNmJh">Unirme al canal</a> ✨`,
  { parse_mode: "HTML", disable_web_page_preview: true }
  );
});

/* ============================
   🌐 EXPRESS PARA RENDER
=============================== */

const app = express();

app.get("/", (req, res) => {
  res.send("Bot Telegram funcionando ✅ (sin integración Meta Pixel)");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🌍 Server listo en puerto", PORT);
});

module.exports = {};
