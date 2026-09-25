import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const source = path.join(
  __dirname,
  "public",
  "icons",
  "icon.svg"
);

const outputDir = path.join(
  __dirname,
  "public",
  "icons"
);

async function generateIcons() {
  console.log("Generating PWA icons...");

  await sharp(source)
    .resize(192, 192)
    .png()
    .toFile(path.join(outputDir, "icon-192.png"));

  console.log("✓ icon-192.png");

  await sharp(source)
    .resize(512, 512)
    .png()
    .toFile(path.join(outputDir, "icon-512.png"));

  console.log("✓ icon-512.png");

  await sharp(source)
    .resize(512, 512)
    .png()
    .toFile(
      path.join(outputDir, "icon-maskable-512.png")
    );

  console.log("✓ icon-maskable-512.png");

  await sharp(source)
    .resize(180, 180)
    .png()
    .toFile(
      path.join(outputDir, "apple-touch-icon.png")
    );

  console.log("✓ apple-touch-icon.png");

  console.log("");
  console.log("All PWA icons generated successfully.");
}

generateIcons().catch((error) => {
  console.error("Failed to generate icons:");
  console.error(error);
  process.exit(1);
});