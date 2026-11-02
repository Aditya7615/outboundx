export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "OutboundX API",
    version: "1.0.0",
    description:
      "B2B outbound marketing API. Authenticate with the httpOnly session cookie set by /auth/login or send an Authorization: Bearer <token> header. Contact lists use cursor pagination."
  },
  servers: [{ url: "/api", description: "Current deployment" }],
  tags: [
    { name: "Auth" },
    { name: "Contacts" },
    { name: "Campaigns" },
    { name: "Analytics" },
    { name: "Webhooks" }
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      cookieAuth: { type: "apiKey", in: "cookie", name: "ox_token" }
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              message: { type: "string" },
              details: { type: "object", nullable: true }
            }
          }
        }
      },
      User: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          email: { type: "string" },
          createdAt: { type: "string", format: "date-time" }
        }
      },
      Contact: {
        type: "object",
        properties: {
          id: { type: "integer" },
          email: { type: "string" },
          phone: { type: "string", nullable: true },
          firstName: { type: "string", nullable: true },
          lastName: { type: "string", nullable: true },
          company: { type: "string", nullable: true },
          status: { type: "string", enum: ["active", "unsubscribed"] },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" }
        }
      },
      CampaignStats: {
        type: "object",
        properties: {
          recipients: { type: "integer" },
          sent: { type: "integer" },
          opened: { type: "integer" },
          clicked: { type: "integer" }
        }
      },
      Campaign: {
        type: "object",
        properties: {
          id: { type: "integer" },
          title: { type: "string" },
          content: { type: "string" },
          status: { type: "string", enum: ["draft", "scheduled", "sending", "completed"] },
          audienceType: { type: "string", enum: ["all_active", "selected"] },
          audienceContactIds: {
            type: "array",
            items: { type: "integer" },
            nullable: true
          },
          scheduledFor: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          stats: { $ref: "#/components/schemas/CampaignStats" }
        }
      }
    }
  },
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  paths: {
    "/health": {
      get: {
        tags: ["Auth"],
        security: [],
        summary: "Liveness and database health",
        responses: { "200": { description: "Healthy" }, "503": { description: "Degraded" } }
      }
    },
    "/auth/register": {
      post: {
        tags: ["Auth"],
        security: [],
        summary: "Create an account",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                  name: { type: "string", example: "Aditya Goyal" },
                  email: { type: "string", example: "aditya@example.com" },
                  password: { type: "string", minLength: 8, example: "Demo@12345" }
                }
              }
            }
          }
        },
        responses: {
          "201": { description: "Account created and session cookie set" },
          "409": { description: "Email already registered" }
        }
      }
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        security: [],
        summary: "Start a session",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", example: "demo@outboundx.dev" },
                  password: { type: "string", example: "Demo@12345" }
                }
              }
            }
          }
        },
        responses: { "200": { description: "Authenticated" }, "401": { description: "Invalid credentials" } }
      }
    },
    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "End the session",
        responses: { "204": { description: "Logged out" } }
      }
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Current user",
        responses: {
          "200": {
            description: "Current user",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { data: { $ref: "#/components/schemas/User" } }
                }
              }
            }
          },
          "401": { description: "Unauthenticated" }
        }
      }
    },
    "/contacts": {
      get: {
        tags: ["Contacts"],
        summary: "List contacts with cursor pagination",
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer", default: 25, maximum: 100 } },
          { name: "cursor", in: "query", schema: { type: "string" } },
          { name: "search", in: "query", schema: { type: "string" } },
          {
            name: "status",
            in: "query",
            schema: { type: "string", enum: ["active", "unsubscribed"] }
          }
        ],
        responses: {
          "200": {
            description: "Cursor page",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Contact" }
                    },
                    pageInfo: {
                      type: "object",
                      properties: {
                        nextCursor: { type: "string", nullable: true },
                        hasMore: { type: "boolean" },
                        limit: { type: "integer" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ["Contacts"],
        summary: "Create a contact",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: { type: "string" },
                  phone: { type: "string" },
                  firstName: { type: "string" },
                  lastName: { type: "string" },
                  company: { type: "string" },
                  status: { type: "string", enum: ["active", "unsubscribed"] }
                }
              }
            }
          }
        },
        responses: { "201": { description: "Created" }, "409": { description: "Duplicate email" } }
      }
    },
    "/contacts/stats": {
      get: {
        tags: ["Contacts"],
        summary: "Contact totals",
        responses: { "200": { description: "Counts" } }
      }
    },
    "/contacts/audience": {
      get: {
        tags: ["Contacts"],
        summary: "Active contacts available for campaign audiences",
        responses: { "200": { description: "Contact options" } }
      }
    },
    "/contacts/import": {
      post: {
        tags: ["Contacts"],
        summary: "Bulk import contacts from CSV",
        description:
          "Multipart upload with field name `file`. Accepted headers: email, phone, first_name, last_name, company, status. Max 5 MB and 20,000 rows. Parsed as a stream in batches of 500 to keep memory flat.",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: { file: { type: "string", format: "binary" } }
              }
            }
          }
        },
        responses: {
          "201": { description: "Import summary" },
          "413": { description: "File or row limit exceeded" }
        }
      }
    },
    "/contacts/{id}": {
      patch: {
        tags: ["Contacts"],
        summary: "Update a contact",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } }
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/Contact" } } }
        },
        responses: { "200": { description: "Updated" }, "404": { description: "Not found" } }
      },
      delete: {
        tags: ["Contacts"],
        summary: "Delete a contact",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } }
        ],
        responses: { "204": { description: "Deleted" }, "404": { description: "Not found" } }
      }
    },
    "/campaigns": {
      get: {
        tags: ["Campaigns"],
        summary: "List campaigns with engagement stats",
        parameters: [
          {
            name: "status",
            in: "query",
            schema: { type: "string", enum: ["draft", "scheduled", "sending", "completed"] }
          }
        ],
        responses: { "200": { description: "Campaigns" } }
      },
      post: {
        tags: ["Campaigns"],
        summary: "Create a campaign",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "content"],
                properties: {
                  title: { type: "string" },
                  content: { type: "string" },
                  audienceType: { type: "string", enum: ["all_active", "selected"] },
                  audienceContactIds: { type: "array", items: { type: "integer" } },
                  scheduledFor: { type: "string", format: "date-time" }
                }
              }
            }
          }
        },
        responses: { "201": { description: "Created" } }
      }
    },
    "/campaigns/{id}": {
      get: {
        tags: ["Campaigns"],
        summary: "Campaign detail",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Campaign" }, "404": { description: "Not found" } }
      },
      patch: {
        tags: ["Campaigns"],
        summary: "Update a draft or scheduled campaign",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Updated" }, "409": { description: "Campaign locked" } }
      },
      delete: {
        tags: ["Campaigns"],
        summary: "Delete a campaign",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "204": { description: "Deleted" } }
      }
    },
    "/campaigns/{id}/dispatch": {
      post: {
        tags: ["Campaigns"],
        summary: "Send a campaign through the email provider",
        description:
          "Resolves the audience, sends each message through the configured provider and records one campaign_logs row per recipient.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Dispatch summary" } }
      }
    },
    "/campaigns/{id}/logs": {
      get: {
        tags: ["Campaigns"],
        summary: "Cursor paginated campaign logs",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 25 } },
          { name: "cursor", in: "query", schema: { type: "string" } }
        ],
        responses: { "200": { description: "Logs" } }
      }
    },
    "/analytics/overview": {
      get: {
        tags: ["Analytics"],
        summary: "Dashboard aggregates",
        parameters: [
          { name: "days", in: "query", schema: { type: "integer", default: 30, minimum: 7, maximum: 90 } }
        ],
        responses: { "200": { description: "Overview metrics" } }
      }
    },
    "/webhooks/email": {
      post: {
        tags: ["Webhooks"],
        security: [],
        summary: "Email provider engagement webhook",
        description:
          "Requires the `x-webhook-signature` header containing the hex HMAC-SHA256 of the raw request body using WEBHOOK_SECRET.",
        parameters: [
          {
            name: "x-webhook-signature",
            in: "header",
            required: true,
            schema: { type: "string" }
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["messageId", "type"],
                properties: {
                  messageId: { type: "string", example: "mock_7f18..." },
                  type: { type: "string", enum: ["opened", "clicked"] },
                  timestamp: { type: "string", format: "date-time" }
                }
              }
            }
          }
        },
        responses: { "200": { description: "Event applied" }, "401": { description: "Bad signature" } }
      }
    },
    "/internal/dispatch-due": {
      post: {
        tags: ["Internal"],
        security: [],
        summary: "Dispatch due scheduled campaigns",
        description: "Requires `Authorization: Bearer <CRON_SECRET>`. Invoked by the GitHub Actions scheduler.",
        parameters: [
          {
            name: "Authorization",
            in: "header",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          "200": { description: "Dispatch run completed" },
          "401": { description: "Invalid cron secret" }
        }
      }
    }
  }
} as const;
