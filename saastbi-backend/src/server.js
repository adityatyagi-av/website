import "dotenv/config";
import app from "./app.js";
import { apiResponse } from "./utils/responseUtils.js";
import { Messages } from "./utils/messageUtils.js";
import { createServer } from "http";
import { initializeSocket, getIO } from "./sockets/chatSocket.js";
import { initializeUniversalChatSocket } from "./sockets/universalChatSocket.js";
import { initializeEventLiveSocket } from "./sockets/eventLiveSocket.js";
import { initializeNotificationSocket } from "./sockets/notificationSocket.js";
import { syncModuleRegistry } from "./config/modules.sync.js";
import { flushAccessCache } from "./config/redisClient.js";

const server = createServer(app);

const io = initializeSocket(server);
initializeUniversalChatSocket(io);
initializeEventLiveSocket(io);
initializeNotificationSocket(io);

app.get("/test", (req, res, next) => {
  return apiResponse.sendSuccess(res);
});

app.use((req, res) => {
  return apiResponse.sendNotFound(res, `Route ${req.originalUrl} not found`);
});

app.use((err, req, res, next) => {
  const status = err.statusCode || 500;
  console.error("=== API ERROR ===");
  console.error(err);
  console.error(err.stack);
  console.error("=================");

  apiResponse.sendCustomResponse(
    res,
    status,
    null,
    err.message || Messages.InternalServerError
  );
});

server.listen(process.env.PORT || 7000, async () => {
  console.log(`Server is connected with port ${process.env.PORT}`);
  console.log(`Socket.IO initialized`);
  if ((process.env.MODULE_SYNC_ON_BOOT || "on").toLowerCase() !== "off") {
    try {
      await syncModuleRegistry();
    } catch (err) {
      console.error("[modules.sync] boot sync failed:", err.message);
    }
  }
  // Flush stale access cache entries so all tenants get fresh module data
  await flushAccessCache();
});