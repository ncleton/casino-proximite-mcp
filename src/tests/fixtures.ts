import { buildShop } from "./fake-browser.js";
import { captured } from "./data.js";

export const productUrl = captured.productUrl;
export const expected = { query: captured.query, ...captured.expected };
export const robotSnapshot = 'heading "Vérification de sécurité"\nlink "Mon compte"';

type RawCart = { total: string; lines: Array<Record<string, unknown>> };

export function createShop() {
  const filled = captured.cartFilled.raw as RawCart;
  const line = filled.lines[0];
  const total = Number(String(line.line_total).replace(/[^0-9,.]/g, "").replace(",", "."));
  const unit = total / captured.cartFilled.quantity;
  return buildShop(captured, { store_url: "https://www.mescoursesdeproximite.com/courses-en-ligne/spar-59114/TL944", store_label: "SPAR Steenvoorde" }, (count) => {
    if (count === 0) return captured.cartEmpty;
    const lineTotal = (unit * count).toFixed(2).replace(".", ",") + " €";
    return { total: lineTotal, lines: [{ ...line, quantity: String(count), line_total: lineTotal }] };
  });
}
