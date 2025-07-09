const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const { createCanvas } = require('canvas');

// Create WhatsApp client with saved session
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true, // Show browser or not
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// Generate an image with text using canvas
function generateImage(text = 'Hello!', outputPath = './output.png') {
  const width = 512;
  const height = 512;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Fill background
  ctx.fillStyle = '#64C8FF'; // light blue background
  ctx.fillRect(0, 0, width, height);

  // Draw text
  ctx.fillStyle = '#000000'; // black text
  ctx.font = 'bold 40px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);

  // Save image
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
}

// When QR code is ready
client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
  console.log('Scan the QR code above to log in.');
});

// When ready
client.on('ready', () => {
  console.log('✅ WhatsApp bot is ready!');
});

// When message received
client.on('message', async (message) => {
  const text = message.body.toLowerCase();

  if (text === 'hi') {
    // Generate image with custom text
    const outputPath = './output.png';
    generateImage('Hello from your bot!', outputPath);

    // Wait for image to save
    setTimeout(async () => {
      await message.reply('👋 Hi! Here is your generated image:');
      const media = MessageMedia.fromFilePath(outputPath);
      await message.reply(media);
    }, 500); // short delay to ensure image is written

    return;
  }

  // Optional default response
  // await message.reply('Type "hi" to get an image!');
});

// Start bot
client.initialize();
