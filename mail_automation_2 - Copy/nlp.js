const axios = require("axios");

async function extractEntities(emailText) {
  try {
    const response = await axios.post(
      "http://localhost:8000/extract",
      {
        text: emailText,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Extracted Entities:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error calling FastAPI service:", error.message);
    if (error.response) {
      console.error("Response:", error.response.data);
    }
    return null;
  }
}
