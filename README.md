# Macro — Terminal macroéconomique

Terminal public en français, Next.js 16 / React 19 / TypeScript. Sans authentification, base de données ni clé API.

## Développement

Node.js 20.9+ (22 ou 24 conseillé).

```sh
npm ci
npm run dev
```

Ouvrir http://localhost:3000. `npm run build` prépare la production ; `npm start` la sert. `npm run typecheck` et `npm test` vérifient les types et la normalisation des sources.

## Vercel

Importer ce dépôt, sélectionner **Next.js**, conserver la racine du dépôt et les commandes par défaut (`npm run build`). Aucune variable d’environnement n’est requise. Les routes `/api/terminal?section=news|calendar|fx|macro|rates|recent|catalog` fonctionnent côté serveur sur Vercel.

## Sources et fraîcheur

- **Actualités** : RSS BBC Business, BCE, Federal Reserve. Consultation du navigateur chaque minute, cache source 60 secondes. Les dépêches restent dans leur langue originale ; liens vers les éditeurs. Les sources valides sont conservées si une autre échoue.
- **Calendrier** : Forex Factory via `nfs.faireconomy.media/ff_calendar_thisweek.json`, semaine en cours, consultation chaque minute. Source non officielle, soumise à disponibilité et limites. Le flux ne fournit généralement pas les résultats effectifs : ils restent « — ». Les jours hors de cette semaine ne sont pas couverts. Horaires Europe/Paris, heure d’été automatique.
- **Devises** : `api.frankfurter.dev/v1`, cours de référence quotidiens des banques centrales. Historique 100 jours, contrôle et cache 15 min. Variation entre les deux dernières observations disponibles (pas intrajournalière). Taux croisés calculés via USD. Week-ends et jours fériés : dernier cours publié.
- **Pays** : `api.worldbank.org/v2`, World Development Indicators. PIB, croissance, inflation, chômage, compte courant et population. Dernière observation non nulle de chaque série dans une fenêtre de 20 ans ; année affichée par indicateur. Contrôle et cache 1 h. PIB en milliers de milliards USD courants (T$). Le chômage correspond à l’estimation modélisée OIT.

Les fréquences de consultation ne garantissent pas la fréquence de publication ni un délai de diffusion. Aucune donnée manquante n’est fabriquée. Les erreurs sont signalées par source. Un **mode démonstration explicite** permet d’explorer l’interface avec des données fictives ; ces données ne sont jamais utilisées comme fallback automatique.

## Fonctions

Vue d’ensemble, graphiques FX 1S/1M/3M, matrice de taux croisés, convertisseur, fil d’actualités filtrable, calendrier filtrable par jour/devise/impact, 12 fiches économiques, recherche globale (⌘/Ctrl K), favoris persistés dans localStorage, interface responsive, modales de méthodologie et préférences. Aucun suivi utilisateur.

## Accès réseau

Autoriser les connexions HTTPS sortantes vers `feeds.bbci.co.uk`, `www.ecb.europa.eu`, `www.federalreserve.gov`, `nfs.faireconomy.media`, `api.frankfurter.dev`, `api.worldbank.org`, `stats.bis.org`, `fred.stlouisfed.org`, `ec.europa.eu` et les éventuels domaines de redirection. Les polices DM Sans et IBM Plex Mono sont servies localement avec le site. L’environnement cloud de construction peut bloquer ces domaines même si Vercel y accède. Le build ne dépend d’aucun de ces flux : ils sont chargés à l’exécution, avec timeout.

Le terminal n’est pas un flux de cotations professionnel contractuel. Pour un calendrier sous licence avec consensus et résultats quasi immédiats ou des prix intrajournaliers garantis, intégrer ultérieurement un fournisseur dédié.

## Espace de recherche Macro

L’accueil compare les économies derrière les devises sur la croissance, l’inflation et le chômage. Chaque graphique permet de choisir parmi 22 indicateurs, sélectionner les économies, choisir 5/10/20 ans, zoomer, déplacer la fenêtre, masquer des séries et exporter les observations en CSV. Les valeurs sont accessibles au pointeur, au toucher et aux flèches du clavier lorsque le graphique a le focus. Les années manquantes ne sont pas interpolées.

Les routes `/devises/USD`, `/devises/EUR`, etc. présentent sept onglets : synthèse, croissance et PIB, prix et emploi, commerce et capitaux, finances publiques, structure économique et devise. Elles disposent de tableaux historiques et de comparaisons personnalisables, de performances de change, d’un agenda par devise et de liens vers les publications officielles.

Les 22 séries de la Banque mondiale sont demandées séparément, avec huit requêtes simultanées au maximum et vingt ans d’historique. Une erreur est isolée à sa série. Les séries non publiées restent absentes. En cas de panne, les dernières observations reçues restent visibles et sont signalées comme données en cache. La dette concerne l’administration centrale et le taux réel concerne un taux débiteur ajusté du déflateur du PIB, pas le taux directeur. Les valeurs annuelles des différents pays peuvent porter sur des années différentes.

## Contrôle des données et tests de régression

`/donnees` détaille la couverture des 22 séries pour les 12 économies, les années reçues, le nombre d’observations, les erreurs par série et la validation des codes dans le catalogue WDI officiel. La validation du catalogue confirme l’identifiant, pas l’existence d’une observation pour chaque pays. Une réponse valide sans observation est distinguée d’un échec HTTP ou d’une réponse incohérente.

`npm run build && npm run test:e2e` lance les tests navigateur sur le port 3100 (Chromium du système s’il est disponible, sinon installer Chromium avec Playwright). Ces tests utilisent des réponses sources simulées, explicitement distinctes d’un audit des chiffres publiés. Ils contrôlent chaque point rendu à quatre largeurs, le survol après zoom et transformation CSS, les 22 sélecteurs, les 12 pages, la synchronisation avec l’historique, le retour navigateur, les filtres, l’export et la conservation des données après erreur réseau.

`npm run audit:data -- --site=https://terminal-ten-lemon.vercel.app` compare les valeurs et années du site aux observations officielles pour les 22 séries × 12 économies, valide les codes dans le catalogue officiel, puis écrit `/tmp/macro-data-audit.json`. Ce contrôle nécessite l’accès réseau réel aux domaines de Vercel et de la Banque mondiale ; un test avec des données simulées ne le remplace pas. Pour Node.js 24 dans un environnement à proxy, utiliser le réglage pris en charge `NODE_USE_ENV_PROXY=1` avec la configuration TLS de l’environnement. Le processus échoue si des codes ne peuvent pas être confirmés ou si une série renvoie une erreur.

Les graphiques utilisent le même repère SVG pour tracer les points et convertir la position du pointeur. Les dates conservent leur espacement temporel. L’indexation base 100 utilise une année commune positive. L’export porte sur les séries et la période visibles.

## Périodes natives et observations récentes

L’accueil privilégie le mensuel pour inflation/chômage et le trimestriel pour la croissance réelle en glissement annuel. Le sélecteur permet le mois, le trimestre, le semestre calculé ou l’année selon la série. L’année reste la fréquence native des 22 indicateurs structurels WDI. Les valeurs WDI ne sont jamais distribuées artificiellement sur des mois. Les semestres sont des moyennes calculées de périodes complètes, pas une publication officielle du PIB semestriel. Les comparaisons IPC national/IPCH ou chômage national/harmonisé peuvent avoir des différences méthodologiques, indiquées dans les fiches.

`/taux` présente les taux directeurs BRI (référence nationale publiée), avec priorité à la fourchette cible Fed obtenue via FRED pour les États-Unis. Le graphique Fed trace la borne supérieure et les cartes affichent les deux bornes. Les taux réels annuels de WDI demeurent un indicateur distinct et ne remplacent jamais les taux directeurs.

Sources conjoncturelles : CSV FRED pour BLS/BEA/Trésor/OCDE et API JSON-stat Eurostat pour la zone euro. Les codes demandés sont strictement vérifiés dans les réponses. Des codes OCDE peuvent être absents ou interrompus selon le pays : ces erreurs et anciennes observations sont affichées, jamais considérées comme des données actuelles. La couverture EA21 est essayée en priorité, EA20 en repli ; la couverture réellement renvoyée est conservée dans la définition.

Les séries américaines incluent inflation IPC, chômage U-3, croissance réelle du PIB, emplois non agricoles, ventes au détail, production industrielle et rendements du Trésor 2/10 ans. Les trois principales séries conjoncturelles sont aussi demandées pour les autres économies selon les séries FRED/OCDE disponibles. L’emploi mensuel harmonisé n’est pas configuré pour Chine/Inde/Brésil/Afrique du Sud ; le panneau de couverture l’indique. PMI, consensus et surprises ne sont pas couverts.

Les intervalles effectifs sont centralisés dans `lib/cadence.ts` :

| Flux            | Contrôle navigateur | Cache de récupération | Publication réelle                  |
| --------------- | ------------------- | --------------------- | ----------------------------------- |
| Actualités      | 1 min               | 1 min                 | Selon l’éditeur                     |
| Calendrier      | 1 min               | 5 min                 | Selon le diffuseur                  |
| Taux directeurs | 1 min               | 5 min                 | Selon décision / diffuseur          |
| Conjoncture     | 5 min               | 15 min                | Mois / trimestre / jour selon série |
| Changes         | 15 min              | 15 min                | Références quotidiennes             |
| Structure WDI   | 1 h                 | 1 h                   | Année                               |

Le CDN de la route API peut conserver la réponse 30 secondes supplémentaires. Le cache Next peut servir la dernière réponse pendant une revalidation ; ces cadences ne constituent pas une garantie de délai. Les contrôles s’arrêtent sur onglet masqué/hors ligne et reprennent au retour, à la reconnexion et au focus. Sans onglet ouvert, aucune tâche serveur permanente ne tourne : les données sont demandées lors des visites, en respectant les caches.

`/donnees` distingue les périodes observées, les contrôles de récupération, les séries anciennes et les défauts de couverture. « Réponse reçue » ne signifie pas « chiffre d’aujourd’hui ». Une date de période n’est pas une date de publication. Aucun flux n’est présenté comme une cotation ou une statistique en temps réel garantie.
