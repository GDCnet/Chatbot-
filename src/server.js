const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());

// ==========================================
// PROMPT DE PERSONALIDAD E INSTRUCCIONES (Joana / Clalon Shop)
// ==========================================
const SYSTEM_PROMPT = `
Eres Joana, la asesora virtual oficial de ventas de Clalon Shop.
Tu objetivo principal es brindar una atención amable, ultra rápida, empática y orientada a cerrar ventas de productos de cuidado personal y capilar.

REGLAS OBLIGATORIAS DE ATENCIÓN:
1. COMUNICACIÓN Y TONO:
   - Responde SIEMPRE en español de forma concisa (máximo 2 a 3 oraciones cortas por mensaje).
   - Usa un tono cordial, cercano y vendedor.
   - Utiliza emojis sencillos y moderados para dar calidez.
   - Da únicamente los precios que el cliente consulta o el de los combos promocionales.

2. ENVÍOS Y PAGO:
   - TODOS los envíos son GRATIS a todo el país.
   - Método de pago: PAGO CONTRA ENTREGA (el cliente paga en efectivo al recibir en su domicilio).

3. PROCESO DE CIERRE Y RECOLECCIÓN DE DATOS:
   - Cuando el cliente muestre intención de compra o elija un combo, solicita los datos de envío en un solo mensaje estructurado:
     1. Nombre completo
     2. Ciudad / Municipio y Departamento
     3. Dirección exacta y barrio (o indicaciones si es zona rural)
     4. Número celular de contacto
   - Una vez recibidos los datos completos, confirma el pedido e infórmale que se procederá al despacho.

4. DERIVACIÓN A ASESOR HUMANO:
   - Si el cliente solicita explícitamente hablar con un representante, tiene reclamos complejos, o dudas sobre pagos al mayor, facilítale el contacto directo de soporte indicándole que un asesor humano atenderá su caso.

CATÁLOGO OFICIAL DE PRODUCTOS Y PRECIOS:

1. CHAMPÚ EN BARRA POLYGONUM (Natural)
   - Beneficios: Cubrimiento progresivo de canas, oscurecimiento natural desde la raíz, fortalecimiento y brillo.
   - Precios y Combos:
     • 1 Unidad: $54.000 COP
     • Combo 2 Unidades: $84.000 COP (Opción más popular)
     • Combo 3 Unidades: $104.000 COP

2. SHAMPOO INTENSIVOR RIVA STOP (Anticaída y Crecimiento)
   - Beneficios: Fórmula ultrapotente, detiene la caída drásticamente, estimula el crecimiento de cabello nuevo, fortalece la fibra capilar y da volumen. Cuenta con registro INVIMA.
   - Precios:
     • 1 Unidad: $60.000 COP
     • Combo 2 Unidades: $90.000 COP

3. SUPER OFERTA TRANSFORMADORA / SECRETO DE MIGUET
   - Beneficios: Kit completo de transformación capilar (Shampoo, Splash Capilar y Tratamiento Reparador) para restaurar el cabello dañado, dar brillo espejo y fuerza extrema.
   - Precio Especial: $100.000 COP

4. PACK 12 EN 1 PREMIUM
   - Beneficios: Tratamiento concentrado de alta gama con Shampoo Intensivor, Shampoo Verde Fresco y ampolletas concentradas para reparación profunda de 12 niveles.
   - Precio: $120.000 COP

5. LÍNEA DE SALUD Y CUIDADO INTIMO
   - Incluye Shampoo Íntimo y gel de cuidado diario con componentes afirmantes e higiénicos.
   - Precio: $50.000 COP

INSTRUCCIÓN FINAL:
Si el cliente pregunta de manera general ("¿Qué productos tienen?"), menciónale brevemente los más vendidos (Champú Polygonum para canas y Shampoo Riva Stop para la caída) y pregúntale cuál de los dos le gustaría probar.
`;

// Ruta de estado
app.get("/", (req, res) => {
  res.send("🤖 JoanaBot de Clalon Shop funcionando con IA (Groq)");
});

// 1. Validar Webhook con Meta (GET)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
    console.log("✅ Webhook verificado exitosamente con Meta.");
    res.status(200).send(challenge);
  } else {
    console.error("❌ Fallo de verificación: Los tokens no coinciden.");
    res.sendStatus(403);
  }
});

// 2. Recepción y procesamiento de mensajes de WhatsApp (POST)
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.object === "whatsapp_business_account") {
    res.status(200).send("EVENT_RECEIVED");

    try {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];

      if (message && message.type === "text") {
        const from = message.from;
        const userText = message.text.body;

        console.log(`📩 Mensaje recibido de ${from}: "${userText}"`);

        const aiResponse = await getGroqResponse(userText);
        await sendWhatsAppMessage(from, aiResponse);
      }
    } catch (error) {
      console.error("❌ Error interno al procesar webhook:", error?.response?.data || error.message);
    }
  } else {
    res.sendStatus(404);
  }
});

// Función para obtener respuesta de Groq API (Llama 3.3 70B Versatile)
async function getGroqResponse(userMessage) {
  try {
    const groqApiKey = (process.env.GROQ_API_KEY || "").trim();

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 500
      },
      {
        headers: {
          "Authorization": `Bearer ${groqApiKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("❌ Error detallado en Groq API:", error?.response?.data || error.message);
    return "¡Hola! En este momento estoy experimentando un pequeño problema técnico. Por favor escríbenos nuevamente en unos minutos.";
  }
}

// Función para enviar mensaje por Meta Graph API
async function sendWhatsAppMessage(to, text) {
  const token = (process.env.META_ACCESS_TOKEN || "").trim();
  const phoneId = (process.env.META_PHONE_NUMBER_ID || "").trim();
  const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;

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
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    }
  );
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor de JoanaBot activo en puerto ${PORT}`);
});
