const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const fs = require("fs");
const path = require("path");

// TOKEN desde variable de entorno
const TOKEN = process.env.BOT_TOKEN;

// Tu ID de Telegram (admin)
const ADMIN_ID = 7759212225;

// 📁 Directorio persistente (Render Disk montado en /data)
const DATA_DIR = process.env.DATA_DIR || "/data"; // opcional: podés usar variable, pero con /data va bien

// Nos aseguramos de que exista la carpeta
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ruta completa del archivo de usuarios
const USERS_FILE = path.join(DATA_DIR, "usuarios.json");

let usuarios = [];

// Si ya existe el archivo, cargamos los usuarios guardados
if (fs.existsSync(USERS_FILE)) {
  try {
    const raw = fs.readFileSync(USERS_FILE);
    usuarios = JSON.parse(raw);
    console.log("✅ Usuarios cargados:", usuarios.length);
  } catch (e) {
    console.error("❌ Error leyendo usuarios.json:", e);
    usuarios = [];
  }
} else {
  console.log("ℹ️ No existe usuarios.json, se creará al guardar el primero.");
}

function guardarUsuarios() {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(usuarios, null, 2));
    console.log("💾 Usuarios guardados. Total:", usuarios.length);
  } catch (e) {
    console.error("❌ Error guardando usuarios:", e);
  }
}

const bot = new TelegramBot(TOKEN, { polling: true });

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

bot.onText(/\/broadcast (.+)/, (msg, match) => {
  if (msg.from.id !== ADMIN_ID) {
    bot.sendMessage(msg.chat.id, "❌ No tenés permiso para usar este comando.");
    return;
  }

  const mensaje = match[1];

  console.log("Usuarios registrados:", usuarios);
  console.log("Cantidad de usuarios:", usuarios.length);

  usuarios.forEach((id) => {
    bot.sendMessage(id, mensaje).catch((e) =>
      console.log("Error enviando a", id, e.message || e)
    );
  });

  bot.sendMessage(msg.chat.id, "✅ Mensaje enviado a todos los usuarios.");
});

// Express para que Render vea que el servicio está vivo
const app = express();
app.get("/", (req, res) => res.send("Bot funcionando en Render"));
app.listen(process.env.PORT || 10000, () =>
  console.log("Servidor iniciado")
);
