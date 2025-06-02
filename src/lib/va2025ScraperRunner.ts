import { scrapeVA2025Tables } from "./va2025Scraper";
import { writeFile } from "fs/promises";
import path from "path";

async function main() {
  try {
    console.log("Scraping VA 2025 tables...");
    const data = await scrapeVA2025Tables();
    const outPath = path.resolve(__dirname, "../../public/va2025-tables.json");
    await writeFile(outPath, JSON.stringify(data, null, 2), "utf-8");
    console.log("VA 2025 tables saved to", outPath);
  } catch (err) {
    console.error("Error scraping VA 2025 tables:", err);
    process.exit(1);
  }
}

main();
