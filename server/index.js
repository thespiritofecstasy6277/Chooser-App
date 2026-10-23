import { createServer } from "node:http";
import { handleRequest } from "./app.js";

const PORT = Number(process.env.AI_SERVER_PORT ?? 8787);
const HOST = process.env.API_HOST ?? "127.0.0.1";

createServer((request, response) => {
  void handleRequest(request, response).catch((error) => {
    console.error("Prompt API request failed.", error);
    if (!response.headersSent) {
      response.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    }
    if (!response.writableEnded) {
      response.end(JSON.stringify({ error: "The prompt API encountered an unexpected error." }));
    }
  });
}).listen(PORT, HOST, () => {
  console.log(`Prompt API listening on http://${HOST}:${PORT}`);
});
