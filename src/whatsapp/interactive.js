
const axios = require("axios");

async function sendButtons(to, bodyText, buttons) {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v23.0/${process.env.META_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: to,
        type: "interactive",
        interactive: {
          type: "button",
          body: {
            text: bodyText
          },
          action: {
            buttons: buttons.map((button, index) => ({
              type: "reply",
              reply: {
                id: button.id || `button_${index + 1}`,
                title: button.title
              }
            }))
          }
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("✅ Botones enviados correctamente");
    return response.data;

  } catch (error) {
    console.error(
      "❌ Error enviando botones:",
      error.response?.data || error.message
    );
  }
}

module.exports = {
  sendButtons
};
