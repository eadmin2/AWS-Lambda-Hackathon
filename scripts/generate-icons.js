import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sourcePath = path.join(__dirname, '../public/Logo.png');
const sizes = [192, 512];

async function generateIcons() {
  try {
    const image = sharp(sourcePath);
    const metadata = await image.metadata();

    // Generate regular icons
    for (const size of sizes) {
      await image
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .toFile(path.join(__dirname, `../public/icon-${size}x${size}.png`));

      // Generate maskable icons (with padding for safe area)
      const safePadding = Math.floor(size * 0.1); // 10% padding
      await image
        .resize(size - (safePadding * 2), size - (safePadding * 2), {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .extend({
          top: safePadding,
          bottom: safePadding,
          left: safePadding,
          right: safePadding,
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .toFile(path.join(__dirname, `../public/icon-${size}x${size}-maskable.png`));
    }

    console.log('✅ Icons generated successfully!');
  } catch (error) {
    console.error('❌ Error generating icons:', error);
  }
}

generateIcons(); 