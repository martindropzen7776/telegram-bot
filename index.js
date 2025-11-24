const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const fs = require("fs");
const path = require("path");

/* ============================
   🔐 VARIABLES DEL BOT
=============================== */

const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) throw new Error("Falta la variable BOT_TOKEN");

// 👑 IDs de Telegram que pueden usar /broadcast y /stats
// Poné acá TODOS los admins:
const ADMINS = [
  7759212225, // yo
  7656259776, // gerard 
  7928936124, // tuli
];

/* ============================
   📁 DISK /data EN RENDER
=============================== */

const DATA_DIR = "/data"; // Render monta el disk aquí
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
   🤖 BOT TELEGRAM
=============================== */

const bot = new TelegramBot(TOKEN, { polling: true });

/* ----- /start → registra usuario y loguea datos ----- */

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from.username || "";
  const firstName = msg.from.first_name || "";
  const lastName = msg.from.last_name || "";

  if (!usuarios.includes(chatId)) {
    usuarios.push(chatId);
    guardarUsuarios();
    console.log(
      `🆕 Nuevo usuario: id=${chatId} username=@${username} nombre=${firstName} ${lastName}`
    );
  } else {
    console.log(
      `🔁 Usuario repetido: id=${chatId} username=@${username} nombre=${firstName} ${lastName}`
    );
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
👉 <a href="https://t.me/m/GhGxuC_AYTQx">Haz click aquí para jugar</a> 👈

🥇 <b>Tip:</b> Guardá este chat.
Acá te mandamos regalos sorpresa, bonos privados y beneficios especiales que no publicamos en ningún otro lado.
`,
    { parse_mode: "HTML", disable_web_page_preview: true }
  );
});

/* ----- /broadcast <mensaje> (solo admins) ----- */

bot.onText(/\/broadcast (.+)/, (msg, match) => {
  if (!ADMINS.includes(msg.from.id)) {
    return bot.sendMessage(
      msg.chat.id,
      "❌ No tenés permiso para usar este comando."
    );
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

/* ----- /stats → ver cantidad de usuarios (solo admins) ----- */

bot.onText(/\/stats/, (msg) => {
  if (!ADMINS.includes(msg.from.id)) {
    return bot.sendMessage(
      msg.chat.id,
      "❌ No tenés permiso para usar este comando."
    );
  }

  console.log("📊 Stats pedidas. Total usuarios:", usuarios.length);
  bot.sendMessage(
    msg.chat.id,
    `📊 Usuarios registrados que tocaron /start: <b>${usuarios.length}</b>`,
    { parse_mode: "HTML" }
  );
});

/* ============================
   🌐 EXPRESS PARA RENDER
=============================== */

const app = express();

app.get("/", (req, res) => {
  res.send("Bot Telegram funcionando ✅ (solo usuarios, sin emails)");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🌍 Server listo en puerto", PORT);
});

module.exports = {};
