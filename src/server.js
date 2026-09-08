const express = require("express");
require("dotenv").config();

const app = express();

app.use(express.json());

// Ruta de prueba inicial
app.get("/", (req, res) => {
  res.send("🤖 Chatbot de WhatsApp funcionando");
});

// 1. VALIDACIÓN DEL WEBHOOK (Meta llama a este endpoint por GET)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  // Verifica que el modo sea 'subscribe' y que el token coincida con su variable de entorno
  if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
    console.log("✅ Webhook verificado correctamente con Meta.");
    res.status(200).send(challenge);
  } else {
    console.error("❌ Fallo en la verificación del Webhook. Los tokens no coinciden.");
    res.sendStatus(403);
  }
});

// 2. RECEPCIÓN DE MENSAJES (Meta envía las notificaciones por POST)
app.post("/webhook", (req, res) => {
  const body = req.body;

  if (body.object === "whatsapp_business_account") {
    // Respondemos de inmediato con 200 OK a Meta para que sepa que recibimos el paquete
    res.status(200).send("EVENT_RECEIVED");

    // Imprimimos el evento en la consola de Railway para depuración
    console.log("📩 Mensaje o evento recibido:", JSON.stringify(body, null, 2));
  } else {
    res.sendStatus(404);
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor funcionando en el puerto ${PORT}`);
});
