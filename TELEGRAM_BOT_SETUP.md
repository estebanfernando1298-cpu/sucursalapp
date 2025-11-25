# Configuración del Bot de Telegram

Este documento explica cómo configurar un bot de Telegram para controlar el flujo de autenticación.

## Paso 1: Crear el Bot

1. Abre Telegram y busca a [@BotFather](https://t.me/botfather)
2. Envía el comando `/newbot`
3. Sigue las instrucciones para darle un nombre y username al bot
4. Guarda el **token** que te proporciona BotFather

## Paso 2: Configurar el Token

Agrega el token como variable de entorno en Replit:

```bash
TELEGRAM_BOT_TOKEN=tu_token_aqui
```

## Paso 3: Funcionalidad del Bot

El bot está diseñado para:

1. **Recibir notificaciones de login**: Cuando un usuario ingresa username/password, el sistema genera un código dinámico de 6 dígitos.

2. **Enviar código al usuario**: El bot enviará el código dinámico al chat de Telegram del usuario registrado.

3. **Controlar sesiones**: Permite al administrador ver intentos de login y códigos activos.

## Comandos del Bot (a implementar)

- `/start` - Inicia el bot y registra tu chat ID
- `/code` - Obtiene el último código dinámico generado
- `/help` - Muestra ayuda

## API Endpoints para Telegram

### POST /api/telegram/get-code
Obtiene el código dinámico válido para un usuario.

**Body:**
```json
{
  "userId": "user-uuid"
}
```

**Response:**
```json
{
  "code": "123456",
  "expiresAt": "2025-11-24T17:00:00Z"
}
```

## Ejemplo de implementación del bot (Node.js)

```javascript
const TelegramBot = require('node-telegram-bot-api');
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, {polling: true});

// Comando /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '¡Bienvenido! Tu Chat ID es: ' + chatId);
});

// Comando /code
bot.onText(/\/code (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = match[1];
  
  // Llamar a la API para obtener el código
  const response = await fetch('http://tu-app.replit.dev/api/telegram/get-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });
  
  const data = await response.json();
  
  if (data.code) {
    bot.sendMessage(chatId, `Tu código dinámico es: ${data.code}`);
  } else {
    bot.sendMessage(chatId, 'No hay código válido disponible');
  }
});
```

## Flujo Completo

1. Usuario ingresa username/password en la web
2. Backend valida y genera código de 6 dígitos
3. Backend envía código al bot de Telegram (vía API)
4. Bot envía mensaje al usuario con el código
5. Usuario ingresa código en la web
6. Backend valida y permite acceso

## Notas de Seguridad

- Los códigos expiran en 5 minutos
- Cada código solo puede usarse una vez
- Registra todos los intentos de login
- Asocia cada usuario con su Telegram Chat ID
