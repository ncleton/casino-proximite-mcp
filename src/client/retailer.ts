// Fichier généré par generate.mjs à partir de retailers/casino-proximite/spec.json. Ne pas modifier ici.
export interface ScopeField { key: string; env: string; description: string; example: string; pattern?: string }
export const RETAILER: {
  id: string; slug: string; version: string; label: string; origin: string; entryUrl: string; loginUrl: string; signupUrl: string;
  platform: string; fulfillment: ReadonlyArray<"delivery" | "click_and_collect">; accountRequired: boolean;
  scopeFields: ReadonlyArray<ScopeField>;
} = {
  "id": "casino-proximite",
  "slug": "casino_proximite",
  "version": "0.1.0",
  "label": "Casino proximité",
  "origin": "https://www.mescoursesdeproximite.com",
  "entryUrl": "https://www.mescoursesdeproximite.com/courses-en-ligne/spar-59114/TL944",
  "loginUrl": "https://www.mescoursesdeproximite.com/compte/",
  "signupUrl": "https://www.mescoursesdeproximite.com/compte/",
  "platform": "mescoursesdeproximite",
  "fulfillment": [
    "click_and_collect",
    "delivery"
  ],
  "accountRequired": false,
  "scopeFields": [
    {
      "key": "store_url",
      "env": "CASINO_PROXIMITE_STORE_URL",
      "description": "URL du magasin choisi sur mescoursesdeproximite.com.",
      "example": "https://www.mescoursesdeproximite.com/courses-en-ligne/spar-59114/TL944",
      "pattern": "^https://www\\.mescoursesdeproximite\\.com/courses-en-ligne/[a-z0-9-]+/[A-Za-z0-9]+/?$"
    },
    {
      "key": "store_label",
      "env": "CASINO_PROXIMITE_STORE_LABEL",
      "description": "Libellé lisible du magasin.",
      "example": "SPAR Steenvoorde"
    }
  ]
};
