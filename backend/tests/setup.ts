process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "mysql://root@localhost:3306/outboundx_test";
process.env.JWT_SECRET = "test-secret-that-is-at-least-32-characters-long";
process.env.WEBHOOK_SECRET = "test-webhook-secret-at-least-16";
process.env.CORS_ORIGIN = "http://localhost:5173";
process.env.LOG_LEVEL = "silent";
