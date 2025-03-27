/** @format */

const WebSocket = require("ws");
const mongoose = require("mongoose");
require("dotenv").config();

const Response = require("./APP/models/responses_model"); // Import Response model

function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server, clientTracking: true });

  // Allow connections from your frontend
wss.on("connection", (ws, req) => {
  const origin = req.headers.origin;
  if (origin !== process.env.CLIENT_URL) {
    ws.close();
    console.log(`❌ WebSocket connection blocked from: ${origin}`);
    return;
  }

  console.log("⚡ New WebSocket client connected");

  ws.on("message", (message) => {
    console.log(`📩 Received message from client: ${message}`);
  });

  ws.on("close", () => {
    console.log("❌ Client disconnected");
  });
});

  // Ensure database is connected before setting up change streams
  const db = mongoose.connection;

  db.once("open", () => {
    console.log("👀 Watching collections...");

    // Watch forums collection
    const forumsCollection = db.collection("forums");
    const forumChangeStream = forumsCollection.watch();

    forumChangeStream.on("change", (change) => {
      console.log("🔄 Forum Change detected:", JSON.stringify(change, null, 2));

      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "forumUpdate", data: change }));
        }
      });
    });

    // Watch responses collection
    const responsesCollection = db.collection("responses");
    const responseChangeStream = responsesCollection.watch();

    responseChangeStream.on("change", async (change) => {
      console.log(
        "🔄 Response Change detected:",
        JSON.stringify(change, null, 2)
      );

      let responseData = change;

      // ✅ Only fetch full document with populated `created_by` on insert
      if (change.operationType === "insert" && change.fullDocument) {
        try {
          const fullResponse = await Response.findById(
            change.fullDocument._id
          ).populate("created_by", "username"); // Populate only the username

          if (fullResponse) {
            responseData.data = fullResponse;
          }
        } catch (error) {
          console.error("❌ Error populating response:", error);
        }
      }

      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({ type: "responseUpdate", data: responseData })
          );
        }
      });
    });

    responseChangeStream.on("error", (err) => {
      console.error("❌ Response Change Stream Error:", err);
    });

    console.log("✅ WebSocket setup complete");
  });
}

module.exports = { setupWebSocket };
