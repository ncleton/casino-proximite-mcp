# Casino proximité MCP

Serveur MCP et CLI non officiels pour [Casino proximité](https://www.mescoursesdeproximite.com) : chercher le catalogue actuel, lire les fiches produit et préparer le panier dans une session web Camoufox persistante qui appartient à l’utilisateur.

Réseau de magasins de proximité Casino, Spar et Vival : le catalogue, les prix et la disponibilité dépendent du magasin choisi, qui doit être configuré explicitement.

## Achat en ligne

Modes de réception proposés par Casino proximité : retrait en magasin ou en point de retrait (click and collect) et livraison à domicile. Chaque magasin Casino, Spar ou Vival propose, selon ses réglages, le retrait en magasin, le drive et la livraison à domicile ; le mode et le créneau se choisissent sur le site officiel au moment de commander.

Un compte Casino proximité est facultatif pour remplir un panier ; il devient nécessaire pour finaliser la commande et choisir le mode de réception.

Le MCP ne choisit aucun créneau, ne valide aucune commande et ne réalise aucun paiement : il remplit et relit le panier, la commande se termine sur le site officiel.

## Capacités

- `connect_casino_proximite` : ouvre Casino proximité dans le profil Camoufox isolé et propose le wizard local de connexion ou de création de compte ;
- `session_status` : prouve Camoufox, le site officiel, son périmètre exact et l’état de connexion visible ;
- `search_products` : retourne les produits actuels, leur prix et leur disponibilité ;
- `get_product` : lit une fiche retournée par la recherche (ingrédients, EAN, nutrition lorsqu’ils sont publiés) ;
- `get_cart` : lit le panier sans exposer l’identité, l’adresse, le créneau ou le paiement ;
- `add_to_cart` : prévisualise puis ajoute une fiche fraîche après confirmation ;
- `remove_from_cart` : prévisualise puis retire un produit présent après confirmation.

## Prérequis

- Node.js 22.12 ou supérieur ;
- `camofox-browser` 2.4.6 ou une version compatible ;
- un compte Casino proximité autorisé par son propriétaire (facultatif pour remplir un panier) ;
- l’URL exacte du magasin retenu, de la forme https://www.mescoursesdeproximite.com/courses-en-ligne/<enseigne-codepostal>/<code> ;
- le nom du magasin, tel qu’il apparaît sur le site officiel ;

Installation de Camoufox :

```bash
npm install --global camofox-browser@2.4.6
```

Créez une clé aléatoire forte dans votre gestionnaire de secrets, puis démarrez le service local avec `CAMOFOX_AUTH_MODE=required` et `CAMOFOX_API_KEY` définis dans son environnement :

```bash
camofox server start --background
```

Ne transmettez jamais cette clé, vos cookies, votre mot de passe, un code 2FA ou un CAPTCHA à un assistant.

## Installation du MCP

```bash
git clone https://github.com/ncleton/casino-proximite-mcp.git
cd casino-proximite-mcp
npm ci
npm run build
cp .env.example .env
```

Renseignez localement `.env` :

- `CASINO_PROXIMITE_STORE_URL` : URL du magasin choisi sur mescoursesdeproximite.com. Exemple : `https://www.mescoursesdeproximite.com/courses-en-ligne/spar-59114/TL944` ;
- `CASINO_PROXIMITE_STORE_LABEL` : Libellé lisible du magasin. Exemple : `SPAR Steenvoorde` ;
- `CAMOFOX_USER_ID` : identifiant unique pour cette personne et ce compte ;
- `CAMOFOX_URL` : normalement http://127.0.0.1:9377 ;
- `CAMOFOX_AUTH_MODE` : obligatoire ;
- `CAMOFOX_API_KEY` : la même clé forte que le service Camoufox (32 caractères minimum) ;

## Première connexion

```bash
npm run build
node dist/cli.js connect
```

Camoufox ouvre Casino proximité dans son profil persistant. Saisissez vous-même vos identifiants et éventuels codes dans la fenêtre du navigateur, puis vérifiez :

```bash
node dist/cli.js status
node dist/cli.js search "tofu" --limit 5
node dist/cli.js cart
```

Une mutation CLI est toujours prévisualisée. Après vérification du delta, relancez exactement la même commande avec `--confirm` :

```bash
node dist/cli.js add '<product_url retourné par search>' --quantity 1
node dist/cli.js add '<même product_url>' --quantity 1 --confirm
node dist/cli.js remove '<product_id retourné par cart>' --quantity 1
node dist/cli.js remove '<même product_id>' --quantity 1 --confirm
```

Dans MCP, le premier appel à `add_to_cart` ou `remove_from_cart` retourne un jeton expirant après cinq minutes. Le second appel doit reprendre exactement les mêmes paramètres et ce jeton. Toute modification intermédiaire du panier invalide la confirmation.

## Configuration MCP

Exemple recommandé pour un client MCP utilisant directement la release publique `v0.1.0` en `stdio` :

```json
{
  "mcpServers": {
    "casino-proximite": {
      "command": "npx",
      "args": [
        "-y",
        "--package=github:ncleton/casino-proximite-mcp#v0.1.0",
        "casino-proximite-mcp"
      ],
      "env": {
        "CASINO_PROXIMITE_STORE_URL": "https://www.mescoursesdeproximite.com/courses-en-ligne/spar-59114/TL944",
        "CASINO_PROXIMITE_STORE_LABEL": "SPAR Steenvoorde",
        "CAMOFOX_USER_ID": "casino-proximite-personal",
        "CAMOFOX_URL": "http://127.0.0.1:9377",
        "CAMOFOX_AUTH_MODE": "required",
        "CAMOFOX_API_KEY": "référence-vers-votre-secret-local"
      }
    }
  }
}
```

Préférez le gestionnaire de secrets du client MCP à une clé écrite en clair dans sa configuration.

## Contrat observé

- Site à rendu serveur : la recherche lit `/recherche/<code>?produit_recherche=`, les fiches viennent du JSON-LD `Product` de la page produit, et le panier est lu dans les lignes du panier affichées par chaque page du magasin.
- L’ajout, la quantité et le retrait appellent `POST /commande/ajouter-panier` avec la quantité cible absolue (0 retire la ligne) ; le panier réel est relu avant et après chaque écriture.
- L’identifiant produit est l’identifiant de ligne du magasin (`data-produit`). Un produit sans bouton d’ajout dans la vignette est signalé en rupture dans ce magasin.
- Un panier invité vit dans la session Camoufox (cookie de session).

## Limites et erreurs explicites

Camoufox limite par défaut `evaluate-extended` à 20 appels par profil et par minute. Le client sérialise les lectures. Si la limite est atteinte, il renvoie `rate_limited` et le délai de reprise fourni par Camoufox ; il ne bascule jamais vers un autre compte, un autre périmètre ou des données en cache.

Une page de connexion, un CAPTCHA ou une protection anti-robot produit `authentication_required` avec l’action manuelle attendue. Une évolution du contrat du site produit `contract_changed` au lieu d’inventer une réponse.

## Développement et validation

```bash
npm run verify
```

Cette commande exécute le typage, les tests, un échange avec le SDK MCP officiel, l’audit de confidentialité et l’inspection du paquet npm. `npm run live:smoke` ajoute puis retire un produit réel du panier de la session configurée et vérifie le retour exact à l’état initial.

## Statut juridique

Projet non officiel, sans affiliation ni approbation de Casino proximité. L’utilisateur reste responsable de respecter les conditions du service et de n’utiliser que son propre compte et ses propres sessions.
