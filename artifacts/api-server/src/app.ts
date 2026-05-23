import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import pinoHttp from "pino-http";

import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Replit (and most prod hosts) front the app with a reverse proxy that sets
// X-Forwarded-For. Required so express-rate-limit can identify clients by
// their real IP instead of the loopback proxy address.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/download/design", (_req, res) => {
  const file = path.resolve("/home/runner/workspace/helo_design.tar.gz");
  res.download(file, "helo_design.tar.gz");
});

app.use("/api", router);

export default app;
