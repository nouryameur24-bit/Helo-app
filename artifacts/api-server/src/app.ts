import express, { type Express } from "express";
import cors from "cors";
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
    // v4 — Skip access logs for /healthz : Replit Autoscale hits this every
    // ~10s and bruits le log Pino sans valeur ajoutée (status code reste
    // observable côté Replit dashboard). Les autres routes restent loggées
    // normalement.
    autoLogging: {
      ignore: (req) =>
        req.url === "/healthz" ||
        req.url === "/api/healthz" ||
        req.url?.startsWith("/healthz?") === true,
    },
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

// v4 — CORS verrouillé sur le domaine prod uniquement. L'app mobile native
// ne fait pas de check CORS (pas de browser CORS policy côté React Native),
// donc aucune régression côté scan/alternatives. Bloque l'attaque où un site
// tiers ouvert dans le navigateur d'une utilisatrice tente de hammer notre
// budget Anthropic via XHR cross-origin.
app.use(
  cors({
    origin: ["https://gethelo.app"],
    methods: ["GET", "POST", "OPTIONS"],
    credentials: false,
    maxAge: 86400,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
