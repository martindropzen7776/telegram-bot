const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const fs = require("fs");

// TOKEN desde variable de entorno
const TOKEN = process.env.BOT_TOKEN;

// Tu ID de Telegram (admin)
const ADMIN_ID = 7759212225;

let usuarios = [];

if (fs.existsSync("usuarios.json")) {
  usuarios = JSON.parse(fs.readFileSync("usuarios.json"));
}

function guardarUsuarios() {
  fs.writeFileSync("usuarios.json", JSON.stringify(usuarios, null, 2));
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
    "👋 ¡Bienvenido/a!

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

🍀 ¡Que la suerte te acompañe! "
  );
});

bot.onText(/\/broadcast (.+)/, (msg, match) => {
  if (msg.from.id !== ADMIN_ID) {
    bot.sendMessage(msg.chat.id, "❌ No tenés permiso para usar este comando.");
    return;
  }

  const mensaje = match[1];

  usuarios.forEach((id) => {
    bot.sendMessage(id, mensaje).catch((e) => console.log(e));
  });

  bot.sendMessage(msg.chat.id, "✅ Mensaje enviado a todos los usuarios.");
});

const app = express();
app.get("/", (req, res) => res.send("Bot funcionando en Render"));
app.listen(process.env.PORT || 10000, () =>
  console.log("Servidor iniciado")
);
