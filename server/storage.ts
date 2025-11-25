import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { 
  users, 
  loginAttempts, 
  dynamicCodes,
  bannedIps,
  type User, 
  type InsertUser,
  type LoginAttempt,
  type InsertLoginAttempt,
  type DynamicCode,
  type InsertDynamicCode,
  type BannedIp
} from "@shared/schema";
import { eq, and, gt } from "drizzle-orm";

// Configure WebSocket for serverless environment
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool);

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserTelegramChatId(userId: string, chatId: string): Promise<void>;
  logLoginAttempt(attempt: InsertLoginAttempt): Promise<LoginAttempt>;
  createDynamicCode(code: InsertDynamicCode): Promise<DynamicCode>;
  getValidDynamicCode(userId: string): Promise<DynamicCode | undefined>;
  markCodeAsUsed(codeId: string): Promise<void>;
  banIp(ip: string): Promise<BannedIp>;
  isIpBanned(ip: string): Promise<boolean>;
}

export class DbStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUserTelegramChatId(userId: string, chatId: string): Promise<void> {
    await db
      .update(users)
      .set({ telegramChatId: chatId })
      .where(eq(users.id, userId));
  }

  async logLoginAttempt(attempt: InsertLoginAttempt): Promise<LoginAttempt> {
    const result = await db.insert(loginAttempts).values(attempt).returning();
    return result[0];
  }

  async createDynamicCode(code: InsertDynamicCode): Promise<DynamicCode> {
    const result = await db.insert(dynamicCodes).values(code).returning();
    return result[0];
  }

  async getValidDynamicCode(userId: string): Promise<DynamicCode | undefined> {
    const now = new Date();
    const result = await db
      .select()
      .from(dynamicCodes)
      .where(
        and(
          eq(dynamicCodes.userId, userId),
          eq(dynamicCodes.used, false),
          gt(dynamicCodes.expiresAt, now)
        )
      )
      .orderBy(dynamicCodes.createdAt)
      .limit(1);
    return result[0];
  }

  async markCodeAsUsed(codeId: string): Promise<void> {
    await db
      .update(dynamicCodes)
      .set({ used: true })
      .where(eq(dynamicCodes.id, codeId));
  }

  async banIp(ip: string): Promise<BannedIp> {
    const result = await db.insert(bannedIps).values({ ip }).returning();
    return result[0];
  }

  async isIpBanned(ip: string): Promise<boolean> {
    const result = await db.select().from(bannedIps).where(eq(bannedIps.ip, ip)).limit(1);
    return result.length > 0;
  }
}

export const storage = new DbStorage();
