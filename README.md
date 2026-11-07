# ATLAS — Terminal macroéconomique

Terminal public en français, Next.js 16 / React 19 / TypeScript. Sans authentification, base de données ni clé API.

## Développement

Node.js 20.9+ (22 ou 24 conseillé).

```sh
npm ci
npm run dev
```

Ouvrir http://localhost:3000. `npm run build` prépare la production ; `npm start` la sert. `npm run typecheck` et `npm test` vérifient les types et la normalisation des sources.

## Vercel

Importer ce dépôt, sélectionner **Next.js**, conserver la racine du dépôt et les commandes par défaut (`npm run build`). Aucune variable d’environnement n’est requise. Les routes `/api/terminal?section=news|calendar|fx|macro` fonctionnent côté serveur sur Vercel. Aucun déploiement ou push automatique n’a été effectué.

## Sources et fraîcheur

- **Actualités** : RSS BBC Business, BCE, Federal Reserve. Consultation du navigateur toutes les 2 minutes, cache source 120 secondes. Les dépêches restent dans leur langue originale ; liens vers les éditeurs. Les sources valides sont conservées si une autre échoue.
- **Calendrier** : Forex Factory via `nfs.faireconomy.media/ff_calendar_thisweek.json`, semaine en cours, consultation toutes les 5 minutes. Source non officielle, soumise à disponibilité et limites. Le flux ne fournit généralement pas les résultats effectifs : ils restent « — ». Les jours hors de cette semaine ne sont pas couverts. Horaires Europe/Paris, heure d’été automatique.
- **Devises** : `api.frankfurter.dev/v1`, cours de référence quotidiens des banques centrales. Historique 100 jours, cache 1 h. Variation entre les deux dernières observations disponibles (pas intrajournalière). Taux croisés calculés via USD. Week-ends et jours fériés : dernier cours publié.
- **Pays** : `api.worldbank.org/v2`, World Development Indicators. PIB, croissance, inflation, chômage, compte courant et population. Dernière observation non nulle de chaque série dans une fenêtre de 5 ans ; année affichée par indicateur. Cache 24 h. PIB en milliers de milliards USD courants (T$). Le chômage correspond à l’estimation modélisée OIT.

Les fréquences de consultation ne garantissent pas la fréquence de publication ni un délai de diffusion. Aucune donnée manquante n’est fabriquée. Les erreurs sont signalées par source. Un **mode démonstration explicite** permet d’explorer l’interface avec des données fictives ; ces données ne sont jamais utilisées comme fallback automatique.

## Fonctions

Vue d’ensemble, graphiques FX 1S/1M/3M, matrice de taux croisés, convertisseur, fil d’actualités filtrable, calendrier filtrable par jour/devise/impact, 12 fiches économiques, recherche globale (⌘/Ctrl K), favoris persistés dans localStorage, interface responsive, modales de méthodologie et préférences. Aucun suivi utilisateur.

## Accès réseau

Autoriser les connexions HTTPS sortantes vers `feeds.bbci.co.uk`, `www.ecb.europa.eu`, `www.federalreserve.gov`, `nfs.faireconomy.media`, `api.frankfurter.dev`, `api.worldbank.org` et les éventuels domaines de redirection. Police web optionnelle : `fonts.googleapis.com`, `fonts.gstatic.com` ; polices système en secours. L’environnement cloud de construction peut bloquer ces domaines même si Vercel y accède. Le build ne dépend d’aucun de ces flux : ils sont chargés à l’exécution, avec timeout.

Le terminal n’est pas un flux de cotations professionnel contractuel. Pour un calendrier sous licence avec consensus et résultats quasi immédiats ou des prix intrajournaliers garantis, intégrer ultérieurement un fournisseur dédié.
