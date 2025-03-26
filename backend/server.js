/** @format */

const HTTP = require("http");
const app = require("./app");
require("dotenv").config();
const server = HTTP.createServer(app);

const {connectDB} = require("./APP/models/con_db");
const {setupWebSocket} = require("./websocket");


connectDB();
setupWebSocket(server);


server.listen(process.env.PORT, () => {
  console.log(`🚀 Server is listening on port ${process.env.PORT}`);
});
  