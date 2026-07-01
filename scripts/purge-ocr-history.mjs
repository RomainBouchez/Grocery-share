// Maintenance : retire de l'historique perso (UserProduct) les libellés issus
// des tickets scannés (= label égal à un ReceiptItem.rawLabel OCR). Les aliments
// saisis à la main sont conservés.
//
// Dry-run :  node scripts/purge-ocr-history.mjs
// Appliquer : node scripts/purge-ocr-history.mjs --apply
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const apply = process.argv.includes("--apply");

const raws = await p.receiptItem.findMany({ select: { rawLabel: true } });
const rawSet = [...new Set(raws.map(r => r.rawLabel).filter(Boolean))];

const toDelete = await p.userProduct.findMany({
  where: { label: { in: rawSet } },
  select: { label: true },
});
const labels = [...new Set(toDelete.map(u => u.label))];

console.log(JSON.stringify({
  receiptRawLabels: rawSet.length,
  userProductsMatched: toDelete.length,
  labels,
  apply,
}, null, 2));

if (apply) {
  const del = await p.userProduct.deleteMany({ where: { label: { in: rawSet } } });
  const remaining = await p.userProduct.count();
  console.log(JSON.stringify({ deleted: del.count, remaining }, null, 2));
}
await p.$disconnect();
