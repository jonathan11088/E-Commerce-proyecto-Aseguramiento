import fs from "fs";
import path from "path";
import { AppDataSource } from "../config/data-source";
import { Product } from "../entities/Product";
import { SubCategory } from "../entities/SubCategory";

type CsvProductRow = {
  name: string;
  description: string;
  price: string;
  stock: string;
  imagePath: string;
  subCategoryId?: string;
  subCategoryName?: string;
};

const PRODUCTS_CSV_PATH  = path.resolve(__dirname, "data/cleaned_products.csv");
const FURNITURE_CSV_PATH = path.resolve(__dirname, "data/cleaned_furniture.csv");

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  result.push(current);
  return result.map(v => v.trim());
}

function loadCsvRows(csvPath: string): CsvProductRow[] {
  if (!fs.existsSync(csvPath)) {
    console.warn(`  ⚠ CSV not found: ${csvPath}`);
    return [];
  }

  const content = fs.readFileSync(csvPath, "utf-8");
  const lines   = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

  if (lines.length <= 1) return [];

  const headers = parseCsvLine(lines[0]);

  const rows: CsvProductRow[] = [];
  for (const line of lines.slice(1)) {
    const values = parseCsvLine(line);
    if (values.length !== headers.length) continue;

    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });

    rows.push({
      name:            row.name,
      description:     row.description,
      price:           row.price,
      stock:           row.stock,
      imagePath:       row.imagePath,
      subCategoryId:   row.subCategoryId,
      subCategoryName: row.subCategoryName,
    });
  }
  return rows;
}

type SubCategoryLookup = {
  bySubName: Map<string, SubCategory>;
  byCatName: Map<string, SubCategory>;
  byId: Map<number, SubCategory>;
};

function buildSubCategoryLookup(subCategories: SubCategory[]): SubCategoryLookup {
  // Map: exact subcategory name → SubCategory
  const bySubName = new Map<string, SubCategory>(
    subCategories.map(s => [s.name.trim().toLowerCase(), s])
  );

  // Map: category name → first SubCategory of that category (fallback)
  const byCatName = new Map<string, SubCategory>();
  for (const s of subCategories) {
    const catName = s.category?.name?.trim().toLowerCase();
    if (catName && !byCatName.has(catName)) {
      byCatName.set(catName, s);
    }
  }

  // Map: numeric id → SubCategory
  const byId = new Map<number, SubCategory>(
    subCategories.map(s => [s.id, s])
  );

  return { bySubName, byCatName, byId };
}

// Resolve subcategory — try name first, then category fallback, then id
function resolveSubCategory(row: CsvProductRow, lookup: SubCategoryLookup): SubCategory | undefined {
  const subName = (row.subCategoryName ?? "").trim().toLowerCase();
  const byName = subName ? lookup.bySubName.get(subName) ?? lookup.byCatName.get(subName) : undefined;
  if (byName) return byName;

  const id = Number(row.subCategoryId);
  return row.subCategoryId && !isNaN(id) ? lookup.byId.get(id) : undefined;
}

export async function seedProducts(): Promise<void> {
  const productRepo = AppDataSource.getRepository(Product);
  const subRepo     = AppDataSource.getRepository(SubCategory);

  // ── Log resolved CSV paths for debugging ──────────────────────────
  console.log("  Products CSV :", PRODUCTS_CSV_PATH);
  console.log("  Furniture CSV:", FURNITURE_CSV_PATH);
  console.log("  Products exists:", fs.existsSync(PRODUCTS_CSV_PATH));
  console.log("  Furniture exists:", fs.existsSync(FURNITURE_CSV_PATH));

  // ── Idempotent — skip if already seeded ───────────────────────────
  const existingCount = await productRepo.count();
  if (existingCount > 0) {
    console.log(`  Products already seeded (${existingCount} found), skipping.`);
    return;
  }

  // ── Load CSV rows ─────────────────────────────────────────────────
  const rows = [
    ...loadCsvRows(PRODUCTS_CSV_PATH),
    ...loadCsvRows(FURNITURE_CSV_PATH),
  ];

  if (rows.length === 0) {
    console.log("  No CSV rows found. Check file paths above.");
    return;
  }

  console.log(`  Loaded ${rows.length} rows from CSV files.`);

  // ── Load all subcategories into lookup maps ───────────────────────
  const subCategories = await subRepo.find({ relations: ["category"] });

  const lookup = buildSubCategoryLookup(subCategories);

  // ── Build products to insert ──────────────────────────────────────
  const seen = new Set<string>();
  const toInsert: Product[] = [];
  let skipped = 0;

  for (const row of rows) {
    const price = Number(row.price);
    const stock = Number(row.stock);

    if (!row.name || !row.description || isNaN(price) || isNaN(stock)) {
      skipped++;
      continue;
    }

    const subCategory = resolveSubCategory(row, lookup);
    if (!subCategory) {
      console.log(`  ⚠ No subcategory found for: "${row.name}" (subCategoryName="${row.subCategoryName}")`);
      skipped++;
      continue;
    }

    // Deduplication
    const key = `${row.name.trim().toLowerCase()}::${(row.imagePath ?? "").trim()}`;
    if (seen.has(key)) { skipped++; continue; }
    seen.add(key);

    toInsert.push(productRepo.create({
      name:        row.name,
      description: row.description,
      price,
      stock,
      imagePath:   row.imagePath || null,
      subCategory,
    }));
  }

  if (toInsert.length === 0) {
    console.log("  No new products to insert.");
    return;
  }

  // Insert in batches of 20 to avoid SQLite lock issues
  const BATCH = 20;
  for (let i = 0; i < toInsert.length; i += BATCH) {
    await productRepo.save(toInsert.slice(i, i + BATCH));
  }

  console.log(`  ✓ ${toInsert.length} products inserted.`);
  if (skipped > 0) console.log(`  ${skipped} rows skipped.`);
}