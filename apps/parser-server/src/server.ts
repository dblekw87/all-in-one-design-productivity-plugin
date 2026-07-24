import { createApp } from "./app.js";
import { loadParserServerConfig } from "./config.js";

const config = loadParserServerConfig();
const app = createApp(config);

const shutdown = async (signal: string) => {
  app.log.info({ signal }, "Shutting down parser server");
  await app.close();
};

process.once("SIGINT", () => {
  void shutdown("SIGINT");
});

process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});

await app.listen({ host: config.host, port: config.port });
