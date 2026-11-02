import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import pino from "pino";
import pinoHttp from "pino-http";
import swaggerUi from "swagger-ui-express";
import { env, isTest } from "./config/env";
import { apiLimiter } from "./middlewares/rate-limit";
import { errorHandler, notFoundHandler } from "./middlewares/error";
import { openApiDocument } from "./openapi";
import { analyticsRouter } from "./routes/analytics.routes";
import { authRouter } from "./routes/auth.routes";
import { campaignRouter } from "./routes/campaign.routes";
import { contactRouter } from "./routes/contact.routes";
import { healthRouter } from "./routes/health.routes";
import { webhookRouter } from "./routes/webhook.routes";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(
    helmet({
      contentSecurityPolicy: false
    })
  );

  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]
    })
  );

  if (!isTest) {
    app.use(
      pinoHttp({
        logger: pino({ level: env.LOG_LEVEL }),
        redact: ["req.headers.authorization", "req.headers.cookie"]
      })
    );
  }

  app.use(
    express.json({
      limit: "1mb",
      verify: (req, _res, buffer) => {
        (req as express.Request).rawBody = Buffer.from(buffer);
      }
    })
  );
  app.use(cookieParser());

  app.get("/", (_req, res) => {
    res.json({
      name: "OutboundX API",
      version: "1.0.0",
      docs: "/api/docs",
      health: "/health"
    });
  });

  app.use("/health", healthRouter);
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument, {
    customSiteTitle: "OutboundX API docs",
    swaggerOptions: { persistAuthorization: true }
  }));
  app.get("/api/openapi.json", (_req, res) => {
    res.json(openApiDocument);
  });

  app.use("/api", apiLimiter);
  app.use("/api/auth", authRouter);
  app.use("/api/contacts", contactRouter);
  app.use("/api/campaigns", campaignRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/webhooks", webhookRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
