const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const fs = require("fs");
const path = require("path");

// 🔐 TOKEN desde variable de entorno
const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) {
  throw new Error("Falta la variable de entorno BOT_TOKEN");
}

// 👑 Tu ID de Telegram (admin)
const ADMIN_ID = 7759212225;

// 📁 Directorio del disk persistente en Render (mount path = /data)
const DATA_DIR = "/data";
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 📄 Archivo donde se guardan los usuarios
const USERS_FILE = path.join(DATA_DIR, "usuarios.json");

console.log("📁 Archivo de usuarios:", USERS_FILE);
console.log("📂 ¿Existe al iniciar?:", fs.existsSync(USERS_FILE));

let usuarios = [];

// 🧾 Cargar usuarios al iniciar el bot
if (fs.existsSync(USERS_FILE)) {
  try {
    const raw = fs.readFileSync(USERS_FILE, "utf8");
    usuarios = JSON.parse(raw);
    console.log("✅ Usuarios cargados al iniciar:", usuarios.length);
  } catch (err) {
    console.error("❌ Error leyendo usuarios.json:", err);
    usuarios = [];
  }
} else {
  console.log("ℹ️ No existe usuarios.json, se creará al guardar el primero.");
}

// 💾 Guardar usuarios en el archivo persistente
function guardarUsuarios() {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(usuarios, null, 2));
    console.log("💾 Usuarios guardados. Total:", usuarios.length);
  } catch (err) {
    console.error("❌ Error guardando usuarios:", err);
  }
}

// 🤖 Inicializar bot en modo polling
const bot = new TelegramBot(TOKEN, { polling: true });

// /start → registra usuario y manda mensaje de bienvenida
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  if (!usuarios.includes(chatId)) {
    usuarios.push(chatId);
    guardarUsuarios();
  }

  bot.sendMessage(
    chatId,
    `👋 ¡Bienvenido/a!

Gracias por llegar hasta acá 🙌
Ya quedaste registrado en nuestro bot oficial, así vas a recibir bonos, promos y alertas exclusivas.

🎁 Tu BONO DE BIENVENIDA es:
WELCOME

🔄 Para activarlo, seguí estos pasos:
1️⃣ Entrá a la sección “Códigos” en la página.
2️⃣ Escribí: WELCOME
3️⃣ ¡Listo! Se activa tu doble beneficio 💸💰

💻 Recordá:
Siempre podés cargar y retirar directamente por la página.
Es la forma más rápida, segura y automática.

🍀 ¡Que la suerte te acompañe!`
  );
});

// /broadcast <mensaje> → envía a todos los usuarios registrados
bot.onText(/\/broadcast (.+)/, (msg, match) => {
  if (msg.from.id !== ADMIN_ID) {
    bot.sendMessage(msg.chat.id, "❌ No tenés permiso para usar este comando.");
    return;
  }

  const mensaje = match[1];

  console.log("📢 Enviando broadcast a", usuarios.length, "usuarios");

  if (usuarios.length === 0) {
    bot.sendMessage(
      msg.chat.id,
      "⚠️ No hay usuarios registrados todavía (nadie hizo /start)."
    );
    return;
  }

  usuarios.forEach((id) => {
    bot
      .sendMessage(id, mensaje)
      .catch((e) =>
        console.log("Error enviando mensaje a", id, "→", e.message || e)
      );
  });

  bot.sendMessage(msg.chat.id, "✅ Mensaje enviado a todos los usuarios.");
});

// 🌐 Servidor HTTP para que Render vea que el servicio está vivo
const app = express();
app.get("/", (req, res) => {
  res.send("Bot funcionando en Render ✅");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Servidor HTTP iniciado en puerto", PORT);
});

module.exports = {};
