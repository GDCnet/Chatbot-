const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());

// ==========================================
// 1. AQUÍ VA TU PROMPT (Instrucciones del bot)
// ==========================================
const SYSTEM_PROMPT = `
Eres un asistente virtual amable, profesional y eficiente para atención al cliente.
Tu objetivo es responder las consultas de los clientes de forma clara, concisa y servicial.
Mantén un tono respetuoso y cercano en español.
`;

// Ruta base de prueba
app.get("/", (req, res) => {
  res.send("🤖 Chatbot de WhatsApp con IA funcionando");
});

// Validación del Webhook con Meta
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
    console.log("✅ Webhook verificado correctamente.");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Recepción de mensajes de WhatsApp
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.object === "whatsapp_business_account") {
    res.status(200).send("EVENT_RECEIVED");

    try {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];

      // Verificar que sea un mensaje de texto entrante
      if (message && message.type === "text") {
        const from = message.from; // Número del cliente
        const text = message.text.body; // Texto que envió el cliente

        console.log(`📩 Mensaje recibido de ${from}: "${text}"`);

        // Generar respuesta con la IA (Groq)
        const aiResponse = await getGroqResponse(text);

        // Enviar la respuesta por WhatsApp
        await sendWhatsAppMessage(from, aiResponse);
      }
    } catch (error) {
      console.error("❌ Error al procesar el mensaje:", error?.response?.data || error.message);
    }
  } else {
    res.sendStatus(404);
  }
});

// Función para consultar a Groq API
async function getGroqResponse(userMessage) {
  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage }
        ],
        temperature: 0.7
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("❌ Error en Groq API:", error?.response?.data || error.message);
    return "Lo siento, en este momento no puedo procesar tu solicitud. Inténtalo más tarde.";
  }
}

// Función para enviar mensaje a WhatsApp mediante Meta Graph API
async function sendWhatsAppMessage(to, text) {
  const url = `https://graph.facebook.com/v19.0/${process.env.META_PHONE_NUMBER_ID}/messages`;

  await axios.post(
    url,
    {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to,
      type: "text",
      text: { body: text }
    },
    {
      headers: {
        "Authorization": `Bearer ${process.env.META_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      }
    }
  );
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor funcionando en el puerto ${PORT}`);
});
