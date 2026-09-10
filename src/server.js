const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());

// ==========================================
// PROMPT DE PERSONALIDAD E INSTRUCCIONES
// (Joana / Clalon Shop)
// ==========================================
const SYSTEM_PROMPT = `
Eres Joana, la asistente virtual oficial de Clalon Shop.
Atiendes a los clientes de forma amable, cercana, rápida y profesional.

INFORMACIÓN DE LA TIENDA Y PRODUCTOS:
- Especialidad: Cuidado personal y capilar.
- Productos destacados: Champú en barra de Polygonum, aceite de Batana, tintes multifuncionales y tratamientos de crecimiento capilar.
- Modalidad de entrega: Envíos a todo el país con opción de pago contra entrega (pagas al recibir en tu domicilio).

REGLAS DE ATENCIÓN:
1. Responde en español de forma concisa (máximo 2 a 3 oraciones por mensaje).
2. Sé cordial y servicial, usando emojis sencillos para mantener la calidez sin saturar.
3. Si el cliente pregunta por un producto, destaca sus beneficios principales y pregúntale si desea realizar un pedido o conocer la oferta.
4. Si la consulta requiere atención humana o seguimiento especial, facilítale contacto directo con soporte.
`;

// ==========================================
// RUTA PRINCIPAL
// ==========================================
app.get("/", (req, res) => {
  res.send("🤖 JoanaBot de Clalon Shop funcionando con IA (Groq)");
});

// ==========================================
// 1. VALIDAR WEBHOOK CON META (GET)
// ==========================================
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (
    mode === "subscribe" &&
    token === process.env.META_VERIFY_TOKEN
  ) {
    console.log("✅ Webhook verificado exitosamente con Meta.");
    res.status(200).send(challenge);
  } else {
    console.error("❌ Fallo de verificación: Los tokens no coinciden.");
    res.sendStatus(403);
  }
});

// ==========================================
// 2. RECEPCIÓN DE MENSAJES DE WHATSAPP
// ==========================================
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.object === "whatsapp_business_account") {
    // Confirmación inmediata a Meta
    res.status(200).send("EVENT_RECEIVED");

    try {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];

      // Procesar solo mensajes de texto
      if (message && message.type === "text") {
        const from = message.from;
        const userText = message.text.body;

        console.log(
          `📩 Mensaje recibido de ${from}: "${userText}"`
        );

        // Consultar la IA
        const aiResponse = await getGroqResponse(userText);

        // Responder por WhatsApp
        await sendWhatsAppMessage(from, aiResponse);
      }
    } catch (error) {
      console.error(
        "❌ Error interno al procesar webhook:",
        error?.response?.data || error.message
      );
    }
  } else {
    res.sendStatus(404);
  }
});

// ==========================================
// 3. FUNCIÓN PARA OBTENER RESPUESTA DE GROQ
// ==========================================
async function getGroqResponse(userMessage) {
  try {
    const groqKey = process.env.GROQ_API_KEY
      ? process.env.GROQ_API_KEY.trim()
      : "";

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        // MODELO ACTUALIZADO
        model: "openai/gpt-oss-120b",

        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT
          },
          {
            role: "user",
            content: userMessage
          }
        ],

        temperature: 0.7
      },
      {
        headers: {
          "Authorization": `Bearer ${groqKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.choices[0].message.content;

  } catch (error) {
    console.error(
      "❌ Error en Groq API:",
      error?.response?.data || error.message
    );

    return "¡Hola! En este momento estoy experimentando un pequeño problema técnico. Por favor escríbenos nuevamente en unos minutos.";
  }
}

// ==========================================
// 4. FUNCIÓN PARA ENVIAR MENSAJE POR WHATSAPP
// ==========================================
async function sendWhatsAppMessage(to, text) {
  const url = `https://graph.facebook.com/v19.0/${process.env.META_PHONE_NUMBER_ID}/messages`;

  await axios.post(
    url,
    {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to,
      type: "text",
      text: {
        body: text
      }
    },
    {
      headers: {
        "Authorization": `Bearer ${process.env.META_ACCESS_TOKEN.trim()}`,
        "Content-Type": "application/json"
      }
    }
  );
}

// ==========================================
// 5. INICIAR SERVIDOR
// ==========================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(
    `Servidor de JoanaBot activo en puerto ${PORT}`
  );
});
