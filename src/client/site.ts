import {
  ROBOT_PATTERN, decodeHtml, escapeRegExp, formatEuro, hasVeganClaim, isObject, isOrganic, parsePrice, str, stripTags,
  type Adapter, type MutationInput, type SessionSignals,
} from "./adapter.js";
import type { ShopConfig } from "./config.js";
import { ContractChangedError, ShopError } from "./errors.js";
import type { CartInput, ProductInput, SummaryInput } from "./types.js";

const HOST = "www.mescoursesdeproximite.com";

function storePath(config: ShopConfig): string {
  return new URL(config.scope.store_url).pathname.replace(/\/+$/, "");
}

function storeCode(config: ShopConfig): string {
  return storePath(config).split("/").filter(Boolean).pop() ?? "";
}

const PRELUDE = String.raw`
const clean = (value) => String(value == null ? "" : value).replace(/\s+/g, " ").trim();
const parseCart = (doc) => {
  const lines = Array.prototype.slice.call(doc.querySelectorAll(".ligne-panier")).map((line) => {
    const holder = line.querySelector(".container-btn-ajouter-au-panier");
    const link = line.querySelector("a[href*='/produit/']");
    const infos = Array.prototype.map.call(line.querySelectorAll(".infos p"), (node) => clean(node.textContent));
    const prices = Array.prototype.map.call(line.querySelectorAll("p"), (node) => clean(node.textContent)).filter((text) => /^\d+[.,]\d{2}\s*€$/.test(text));
    return {
      product_id: holder ? holder.getAttribute("data-produit") : null, quantity: holder ? holder.getAttribute("data-qte") : null,
      brand: infos[0] || null, name: infos[1] || null, url: link ? new URL(link.getAttribute("href"), location.origin).toString() : null,
      line_total: prices.length ? prices[prices.length - 1] : null,
    };
  });
  const totalText = clean((doc.querySelector(".total-panier") || {}).textContent);
  const match = totalText.match(/Total commande\s*:\s*([\d.,]+)\s*€/i);
  return { total: match ? match[1] + " €" : (lines.length ? null : "0,00 €"), lines: lines };
};
const readCart = async () => {
  const response = await fetch(STORE, { credentials: "include" });
  if (!response.ok) throw new Error("Panier HTTP " + response.status);
  return parseCart(new DOMParser().parseFromString(await response.text(), "text/html"));
};
`;

function searchExpression(store: string, code: string, query: string, limit: number): string {
  return String.raw`(async () => {
    const STORE = ${JSON.stringify(store)};
    ${PRELUDE}
    const response = await fetch("/recherche/" + ${JSON.stringify(code)} + "?produit_recherche=" + encodeURIComponent(${JSON.stringify(query)}), { credentials: "include" });
    if (!response.ok) throw new Error("Recherche HTTP " + response.status);
    const doc = new DOMParser().parseFromString(await response.text(), "text/html");
    const cards = Array.prototype.slice.call(doc.querySelectorAll("div.card-body")).filter((card) => card.querySelector("a[href*='/produit/']"));
    if (!cards.length) {
      if (!/aucun produit/i.test(clean(doc.body && doc.body.textContent))) throw new Error("Contrat liste produits absent");
      return [];
    }
    return cards.slice(0, ${limit}).map((card) => {
      const link = card.querySelector("a[href*='/produit/']");
      const holder = card.querySelector(".container-btn-ajouter-au-panier");
      const name = card.querySelector("h3");
      const unit = card.querySelector(".produit-desc span");
      const price = Array.prototype.map.call(card.querySelectorAll("span"), (node) => clean(node.textContent)).find((text) => /^\d+[.,]\d{2}\s*€$/.test(text));
      return {
        product_id: holder ? holder.getAttribute("data-produit") : null, name: name ? clean(name.textContent) : null, url: new URL(link.getAttribute("href"), location.origin).toString(),
        price: price || null, unit_price: unit ? clean(unit.textContent) : null, orderable: !!holder,
      };
    });
  })()`;
}

function productExpression(store: string, productUrl: string): string {
  return String.raw`(async () => {
    const STORE = ${JSON.stringify(store)};
    ${PRELUDE}
    const target = new URL(${JSON.stringify(productUrl)});
    const response = await fetch(target.pathname, { credentials: "include" });
    if (!response.ok) throw new Error("Fiche HTTP " + response.status);
    const doc = new DOMParser().parseFromString(await response.text(), "text/html");
    let product = null;
    for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const json = JSON.parse(script.textContent);
        const found = (Array.isArray(json) ? json : (json["@graph"] || [json])).find((entry) => entry && entry["@type"] === "Product");
        if (found) { product = found; break; }
      } catch (error) { /* bloc JSON-LD non exploitable */ }
    }
    if (!product) throw new Error("Contrat JSON-LD Product absent");
    const holder = doc.querySelector(".container-btn-ajouter-au-panier");
    const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers;
    let ingredients = null;
    for (const element of Array.prototype.slice.call(doc.querySelectorAll("h2, h3, h4, h5, strong, b, dt, p, div, li, span")).reverse()) {
      const text = clean(element.textContent);
      if (/^ingr[ée]dients?\b\s*[:\-–]?\s*\S/.test(text) && !/^ingr[ée]dients?\s*[:\-–]?\s*$/i.test(text) && text.length < 4000 && element.children.length < 6) { ingredients = text.replace(/^ingr[ée]dients?\b\s*[:\-–]?\s*/i, ""); break; }
      if (/^ingr[ée]dients?\s*[:\-–]?\s*$/i.test(text)) {
        const next = element.nextElementSibling ? clean(element.nextElementSibling.textContent) : "";
        if (next && next.length < 4000) { ingredients = next; break; }
      }
    }
    return {
      product_id: holder ? holder.getAttribute("data-produit") : null, name: product.name, brand: product.brand && (product.brand.name || product.brand) || null,
      description: product.description || "", gtin: product.gtin13 || product.gtin || product.gtin14 || null, price: offer && offer.price, availability: offer && offer.availability || null,
      orderable: !!holder, ingredients: ingredients,
    };
  })()`;
}

function cartExpression(store: string): string {
  return String.raw`(async () => { const STORE = ${JSON.stringify(store)}; ${PRELUDE} return readCart(); })()`;
}

function mutationExpression(store: string, input: MutationInput): string {
  return String.raw`(async () => {
    const STORE = ${JSON.stringify(store)};
    ${PRELUDE}
    const productId = ${JSON.stringify(input.productId)};
    const target = ${input.targetQuantity};
    const before = await readCart();
    const line = before.lines.find((item) => String(item.product_id) === productId);
    const current = line ? Number(line.quantity) : 0;
    if (current === target) return { before, after: before, applied: false };
    const response = await fetch("/commande/ajouter-panier", { method: "POST", credentials: "include", headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "X-Requested-With": "XMLHttpRequest" }, body: "idProduit=" + encodeURIComponent(productId) + "&qte=" + target + "&reloadCommande=false&famille=&sousfamille=" });
    if (!response.ok) throw new Error("Panier refusé HTTP " + response.status);
    const json = await response.json();
    if (json.success === false) throw new Error("Panier refusé par le magasin");
    return { before, after: await readCart(), applied: true };
  })()`;
}

export const adapter: Adapter = {
  entryUrl: (config) => config.scope.store_url,
  matchesTab: (url) => url.protocol === "https:" && url.hostname === HOST,
  validateScope(scope) {
    const url = new URL(scope.store_url);
    if (url.protocol !== "https:" || url.hostname !== HOST || !/^\/courses-en-ligne\/[a-z0-9-]+\/[A-Za-z0-9]+\/?$/.test(url.pathname)) {
      throw new ShopError("CASINO_PROXIMITE_STORE_URL ne désigne pas un magasin officiel.", "invalid_configuration", "Utilisez l’URL du magasin choisie sur mescoursesdeproximite.com, de la forme https://www.mescoursesdeproximite.com/courses-en-ligne/spar-59114/TL944.");
    }
  },
  scopeLabel: (config) => config.scope.store_label,
  inspectSession({ snapshot, tabUrl, config }): SessionSignals {
    let onStore = false;
    try {
      const url = new URL(tabUrl);
      onStore = url.hostname === HOST && url.pathname.includes(`/${storeCode(config)}`);
    } catch { onStore = false; }
    const labelVisible = new RegExp(escapeRegExp(config.scope.store_label), "i").test(snapshot);
    const robotVisible = ROBOT_PATTERN.test(snapshot);
    return { ready: (onStore || labelVisible) && !robotVisible && snapshot.trim().length > 0, robotVisible, accountConnected: /d[ée]connexion|se d[ée]connecter/i.test(snapshot) };
  },
  validateProductUrl(url, config) {
    if (url.protocol !== "https:" || url.hostname !== HOST || !url.pathname.startsWith("/produit/")) throw new Error("Hors des fiches produit du site.");
    if (!url.pathname.includes(`/${storeCode(config)}/`)) throw new Error("Fiche d’un autre magasin.");
  },
  searchExpression: (config, query, limit) => searchExpression(config.scope.store_url, storeCode(config), query, limit),
  normalizeSearch(raw): SummaryInput[] {
    if (!Array.isArray(raw)) throw new ContractChangedError("La recherche n’a pas retourné une liste de produits.");
    return raw.map((entry): SummaryInput => {
      if (!isObject(entry)) throw new ContractChangedError("Un produit n’est plus un objet exploitable.");
      const name = str(entry, "name");
      const price = parsePrice(entry.price);
      const url = str(entry, "url");
      const id = str(entry, "product_id");
      if (!name || price === null || !url || typeof entry.orderable !== "boolean") throw new ContractChangedError("Un produit ne contient plus son nom, son prix, son adresse ou son état commandable.");
      if (entry.orderable && !id) throw new ContractChangedError("Un produit commandable ne contient plus son identifiant de ligne.");
      return {
        product_id: id ?? (url.split("/").pop() ?? url), name: decodeHtml(name), brand: null, price, unit_price: str(entry, "unit_price"),
        availability: entry.orderable ? "available" : "out_of_stock", available_quantity: null, organic: isOrganic(name), product_url: url,
      };
    });
  },
  productExpression: (config, url) => productExpression(config.scope.store_url, url),
  normalizeProduct(raw, _config, requestedUrl): ProductInput {
    if (!isObject(raw)) throw new ContractChangedError("La fiche n’a pas retourné l’objet produit attendu.");
    const name = str(raw, "name");
    const price = parsePrice(raw.price);
    const id = str(raw, "product_id");
    if (!name || price === null || typeof raw.orderable !== "boolean") throw new ContractChangedError("La fiche ne contient plus son nom, son prix ou son état commandable.");
    if (raw.orderable && !id) throw new ContractChangedError("Un produit commandable ne contient plus son identifiant de ligne.");
    const text = `${name} ${stripTags(str(raw, "description") ?? "")}`;
    return {
      product_id: id ?? (requestedUrl.split("/").pop() ?? requestedUrl), name: decodeHtml(name), brand: str(raw, "brand"), price, unit_price: null,
      availability: raw.orderable ? "available" : "out_of_stock", available_quantity: null, organic: isOrganic(text), product_url: requestedUrl,
      ean: str(raw, "gtin"), ingredients: str(raw, "ingredients"), vegan_claim: hasVeganClaim(text), nutrition: [],
    };
  },
  cartExpression: (config) => cartExpression(config.scope.store_url),
  normalizeCart(raw): CartInput {
    if (!isObject(raw) || !Array.isArray(raw.lines)) throw new ContractChangedError("Le panier n’a plus la forme observée.");
    const items = raw.lines.map((entry) => {
      if (!isObject(entry)) throw new ContractChangedError("Une ligne de panier n’est plus exploitable.");
      const id = str(entry, "product_id");
      const quantity = Number(entry.quantity);
      if (!id || !Number.isInteger(quantity) || quantity < 0) throw new ContractChangedError("Une ligne de panier ne contient plus son identifiant ou sa quantité.");
      const total = parsePrice(entry.line_total);
      return { product_id: id, name: str(entry, "name"), quantity, available_quantity: null, unit_price: total === null || quantity === 0 ? null : Math.round((total / quantity) * 100) / 100, line_total: total };
    });
    const total = parsePrice(raw.total);
    if (total === null) throw new ContractChangedError("Le total du panier n’est plus publié.");
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    return { empty: totalQuantity === 0, total_quantity: totalQuantity, total_price: formatEuro(total), items };
  },
  mutationExpression: (config, input) => mutationExpression(config.scope.store_url, input),
};
