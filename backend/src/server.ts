import { env } from "./config/env.js";
import { app } from "./app.js";
import { logger } from "./utils/logger.js";

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "JARVIS Home AI backend online");
});
