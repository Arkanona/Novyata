# Audit de sécurisation des appels IA

État du backend après centralisation des appels OpenAI. Les quotas Free/Pro sont
ceux de `src/config/plans.js` et ne sont pas modifiés par les garde-fous.

## Périmètre et plafonds

Toutes les fonctionnalités utilisent `src/services/openAiClient.js`, le modèle
`OPENAI_MODEL` (défaut `gpt-6-luna`), `reasoning.effort=low`, Structured Outputs,
un timeout et un plafond explicite `max_output_tokens`. Les tailles sont
contrôlées avant dispatch sur le texte utile et sur le corps JSON UTF-8 complet.

| Fonction | Routes | Quota Free / Pro | Input max caractères / octets | Output max tokens |
|---|---|---:|---:|---:|
| Analyse d’offre | `POST /api/v1/job-analysis` | 5 / 50 | 24 000 / 80 000 | 1 650 par défaut; `OPENAI_MAX_OUTPUT_TOKENS` configurable dans la borne 800–1 650 |
| Génération de lettre | `POST /api/v1/cover-letter-generation` | 3 / 30 | 40 000 / 100 000 | 1 400 |
| Adaptation CV | `POST /api/v1/cv-adaptation/proposals` | 0 / 30 | 60 000 / 120 000 | 1 650 par défaut; configuration partagée avec analyse |
| Relance / remerciement | routes IA sous `/api/v1/applications` | 3 / 30 partagés | 8 000 / 16 000 | 700 |
| Préparation entretien | route IA sous `/api/v1/applications` | 3 / 30 | 18 000 / 60 000 | 1 300 |
| Simulation entretien | routes IA sous `/api/v1/applications` | 5 / 60 appels | 20 000 / 65 000 | 650 Free / 900 Pro |
| Résumé de CV | routes `/api/v1/resumes/ai/*` | 3 / 20 partagés avec réécriture | 8 000 / 24 000 | 500 |
| Réécriture expérience | routes `/api/v1/resumes/ai/*` | 3 / 20 partagés avec résumé | 8 000 / 24 000 | 500 |

Ces quotas mensuels n’ont pas été changés. Les limites de sortie sont des
plafonds, pas des objectifs de génération. Structured Outputs impose la forme
des objets; le backend valide encore les valeurs métier et leur provenance.

## Politique d’appel et consommation du quota

1. Authentification, limiteur, déduplication, drapeau IA et contrôles de taille
   s’exécutent avant l’appel fournisseur.
2. Le quota est réservé par une requête SQL atomique avant tout appel réseau.
   Les demandes concurrentes ne peuvent donc pas dépasser la dernière unité.
3. Une erreur connue avant le dispatch libère la réservation.
4. Dès que l’appel fournisseur est parti, le quota reste consommé même si le
   fournisseur échoue, expire, renvoie du JSON invalide ou si la sauvegarde
   locale échoue ensuite. Le fournisseur peut avoir facturé la demande; cette
   règle empêche de relancer indéfiniment des demandes potentiellement payantes.
5. Aucun retry automatique n’est effectué. Une action utilisateur explicite
   constitue une nouvelle tentative et consomme une unité lorsqu’elle est
   envoyée au fournisseur.
6. Les demandes strictement identiques en cours sont rejetées avec HTTP 409 par
   instance. Le verrou de déduplication est volontairement local au processus;
   le quota atomique SQL reste partagé entre instances.

## Limites de requête et arrêt d’urgence

- `AI_ENABLED=false` coupe globalement la génération IA (HTTP 503).
- `AI_DISABLED_FEATURES=feature_a,feature_b` coupe sélectivement les fonctions
  énumérées (HTTP 503). Les clés sont les identifiants de `AI_FEATURES`.
- `OPENAI_TIMEOUT_MS` doit être positif; valeur absente/invalide: 60 secondes.
- Un seul appel `POST /v1/responses` est effectué par action. Pas de retry.
- La limite IA partagée par défaut est de 20 requêtes / 15 minutes / IP,
  configurable par `AI_RATE_LIMIT_MAX`; la fenêtre utilise
  `RATE_LIMIT_WINDOW_MS`. Les routes IA sous applications utilisent le même
  limiteur que les autres routes IA.

## Logs et confidentialité

En développement, le client journalise le nom de la fonction, le modèle, les
tokens d’entrée/sortie/raisonnement, le total, la durée, le plafond de sortie,
le succès et une estimation de coût si le tarif est connu. Il ne journalise ni
la clé API, ni le prompt, ni le CV, ni l’offre, ni la réponse. En production,
les logs de métriques d’usage sont désactivés par ce client.

La clé OpenAI est lue exclusivement par le backend via `OPENAI_API_KEY`.
Les contrôles de taille et validations des services ont lieu côté serveur; le
frontend ne décide jamais de l’authenticité d’un quota.

## Validation exécutée

Les tests Vitest couvrent la construction centralisée de requêtes, plafonds,
taille des entrées, drapeaux, logs sans contenu sensible, réservation atomique,
refund avant dispatch, conservation après dispatch, limites de fréquence,
déduplication, authentification des routes et les tests existants des
contrôleurs. Validation locale: 335 tests backend et 124 tests frontend passés;
build Vite de production réussi. Les 23 scénarios E2E ont affiché `ok`, y
compris les parcours de profil et simulation, mais Playwright reste actif après
les résultats et a dû être interrompu pendant son teardown sous Windows. Les
scripts `estimate:free-ai-cost` et `estimate:pro-ai-cost` n’effectuent aucun
appel OpenAI; le profil quota-max reprend les tailles d’entrée et plafonds de
sortie de `AI_SETTINGS`.
