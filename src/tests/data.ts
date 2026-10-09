import type { Captured } from "./fake-browser.js";

export const captured: Captured = {
  "query": "tomates",
  "productUrl": "https://www.mescoursesdeproximite.com/produit/casino-bio-tomates-concassees-en-des-biologique-400g-400g-spar-59114/TL944/984321",
  "expected": {
    "productId": "29872645",
    "name": "Casino Bio Tomates concassées - En dés - Biologique - 400g",
    "price": 1.08
  },
  "searchRaw": [
    {
      "product_id": "29872645",
      "name": "Casino Bio Tomates concassées - En dés - Biologique - 400g",
      "url": "https://www.mescoursesdeproximite.com/produit/casino-bio-tomates-concassees-en-des-biologique-400g-400g-spar-59114/TL944/984321",
      "price": "1.08 €",
      "unit_price": "2,70 €/KILO",
      "orderable": true
    },
    {
      "product_id": "29875942",
      "name": "Rochefontaine Tomates pelées entières 400g",
      "url": "https://www.mescoursesdeproximite.com/produit/rochefontaine-tomates-pelees-entieres-400g-2400kg-spar-59114/TL944/272833",
      "price": "0.90 €",
      "unit_price": "3,75 €/KILO",
      "orderable": true
    },
    {
      "product_id": "29880376",
      "name": "Casino Coulis de tomates 3 x 200g",
      "url": "https://www.mescoursesdeproximite.com/produit/casino-coulis-de-tomates-3-x-200g-3x200g-spar-59114/TL944/218535",
      "price": "1.74 €",
      "unit_price": "2,90 €/KILO",
      "orderable": true
    }
  ],
  "productRaw": {
    "product_id": "29872645",
    "name": "Casino Bio Tomates concassées - En dés - Biologique - 400g",
    "brand": "Casino Bio",
    "description": "Casino Bio Tomates concassées - En dés - Biologique - 400g",
    "gtin": "3222474969196",
    "price": 1.08,
    "availability": {
      "@type": "ItemAvailability",
      "@id": "https://schema.org/InStock"
    },
    "orderable": true,
    "ingredients": "Tomates 66%* - purée de tomates 33%* - correcteur d'acidité : acide citrique."
  },
  "cartEmpty": {
    "total": "0,00 €",
    "lines": []
  },
  "cartFilled": {
    "quantity": 2,
    "raw": {
      "total": "2,16 €",
      "lines": [
        {
          "product_id": "29872645",
          "quantity": "2",
          "brand": "Casino Bio",
          "name": "Casino Bio Tomates concassées - En dés - Biologique - 400g",
          "url": "https://www.mescoursesdeproximite.com/produit/casino-bio-tomates-concassees-en-des-biologique-400g-400g-spar-59114/TL944/984321",
          "line_total": "2.16 €"
        }
      ]
    }
  }
};
