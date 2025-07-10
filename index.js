const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const { createCanvas } = require('canvas');
const dotenv = require('dotenv');
const { GoogleGenAI } = require('@google/genai');

dotenv.config();

// ---------- Custom Canvas Image Generator ----------
function generateImage(text = 'Hello!', outputPath = './output.png') {
  const width = 512;
  const height = 512;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#64C8FF';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 40px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
}

// ---------- Gemini AI Setup ----------
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_CLOUD_API_KEY });
const model = 'gemini-1.5-flash';
const generationConfig = {
  maxOutputTokens: 2048,
  temperature: 0.9,
  topP: 1,
  seed: 0,
  safetySettings: [
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'OFF' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'OFF' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'OFF' },
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'OFF' },
  ],
};
const injectedMemory = `
I use this Ai for Whatsapp bot. Bot owner Naveen Hiranya. Bot use Java Script Language. and hosted my laptop. laptop name is cyborg 15.
`;

async function askGemini(userMsg) {
  try {
    const req = {
      model,
      contents: [{ role: 'user', parts: [{ text: userMsg }] }],
      generationConfig,
    };
    const stream = await ai.models.generateContentStream(req);
    let response = '';
    for await (const chunk of stream) {
      if (chunk.text) response += chunk.text;
    }
    return response || '⚠️ Gemini could not generate a response.';
  } catch (err) {
    console.error('Gemini API error:', err);
    return '❌ Gemini API Error: ' + (err.message || 'Unknown error');
  }
}

// ---------- WhatsApp Bot Setup ----------
const bot = new Client({ authStrategy: new LocalAuth() });

bot.on('qr', qr => {
  qrcode.generate(qr, { small: true });
});

bot.on('ready', async () => {
  console.log('✅ Bot is ready!');
  const myChatId = '94756884847@c.us';
  try {
    await bot.sendMessage(myChatId, '👋 Your bot is online!');
  } catch (err) {
    console.error('Startup message error:', err);
  }
});

// ---------- Message Handler ----------
bot.on('message_create', async message => {
  try {
    const text = message.body.trim().toLowerCase();

    // === hi / hello ===
    if (text === 'hi' || text === 'hello') {
      generateImage(`Hello! 👋`, './output.png');
      setTimeout(async () => {
        // await message.reply();
        const media = MessageMedia.fromFilePath('./output.png');
        await message.reply(media, undefined, {
          caption: '*WaBot V1* \n .menu -> commands',
        });
      }, 500);
      return;
    }

    // === .menu ===
    if (text === '.menu') {
      return await message.reply(
        `📋 *Main Menu*\n- Say "hi" to get a canvas image\n- .cat = get a cat image\n- .image <text> = custom image from your text\n- !ask = talk to Gemini AI`
      );
    }

    // === .cat ===
    if (text === '.cat') {
      const media = MessageMedia.fromFilePath('./cat.jpg');
      return await message.reply(media, undefined, {
        caption: '🐱 Here is your cat, meow!',
      });
    }

    // === .image custom canvas ===
    if (text.startsWith('.image')) {
      const content = message.body.replace('.image', '').trim();
      if (!content) return await message.reply('❓ Usage: `.image your text here`');

      generateImage(content, './output.png');

      setTimeout(async () => {
        const media = MessageMedia.fromFilePath('./output.png');
        await message.reply(media, undefined, {
          caption: `🖼️ Your image for: "${content}"`,
        });
      }, 500);

      return;
    }

    // === !ask ===
    if (text.startsWith('!ask')) {
      const userPrompt = message.body.replace('!ask', '').trim();
      if (!userPrompt) return await message.reply('❓ Usage: `!ask What is AI?`');
      const finalPrompt = `${injectedMemory}\n\nUser: ${userPrompt}`;
      const answer = await askGemini(finalPrompt);
      return await message.reply(answer);
    }

  } catch (err) {
    console.error('Message handler error:', err);
    await message.reply('⚠️ Bot error. Try again later.');
  }
});

// ---------- Start the bot ----------
bot.initialize();
