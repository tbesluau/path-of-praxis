// French translations for src/config/guide.md.
//
// Keys are the English section titles (used as stable IDs — same string
// passed by tutorials' guideSection option). Each entry may provide `title`
// and/or `body`; missing fields fall back to the English markdown.
import type { ContentBlock } from './index'

export const guideFr: Record<string, ContentBlock> = {
  'Actions, Action Levels, and Runes': {
    title: 'Actions, niveaux d\'action et runes',
    body: `C'est la source principale de dégâts dans le jeu. Ton personnage et tes ennemis effectuent des actions pendant le combat pour s'infliger des dégâts. Plus tu utilises une action donnée, plus elle gagne d'expérience en fonction des dégâts qu'elle a infligés et plus elle monte de niveau. Une action de plus haut niveau inflige des dégâts supplémentaires à un rythme légèrement plus rapide. Le plus haut niveau jamais atteint par une action augmente aussi le taux d'expérience d'action obtenu de 10 % additivement par niveau. Monter en niveau les actions débloque également des emplacements de rune où tu peux assigner des runes pour des bonus d'action. Chaque action a six emplacements de rune, chacun se débloquant à un niveau spécifique :

- **Nv. 5** — 1er emplacement mineur
- **Nv. 10** — 1er emplacement majeur
- **Nv. 15** — 2e emplacement mineur
- **Nv. 22** — 3e emplacement mineur
- **Nv. 30** — 2e emplacement majeur
- **Nv. 40** — emplacement clé`,
  },

  'Enemy level': {
    title: 'Niveau d\'ennemi',
    body: `Le widget de niveau d'ennemi en haut est la progression principale du jeu : plus le niveau est élevé, plus tu gagnes d'expérience. Tu peux choisir le niveau d'ennemi à la main ou le laisser monter automatiquement (il augmentera de 1 niveau par vague jusqu'au maximum). Note que tu ne peux gagner de l'expérience vers le prochain niveau d'ennemi qu'en jouant au niveau maximum actuel. Certaines nouvelles fonctionnalités se débloquent aussi à des niveaux d'ennemi plus élevés.
Les ennemis deviennent exponentiellement plus forts avec leur niveau, tu devras donc tirer parti des différentes couches de prestige pour gagner suffisamment de puissance pour progresser.`,
  },

  'Death & Rebirth': {
    title: 'Mort & Renaissance',
    body: `Quand ta vie tombe à zéro, ta partie se termine et tu Renais. Mais tu ne repars pas entièrement de zéro : toute l'expérience gagnée pendant la partie — actions, vie, mana, etc. — rend ta prochaine partie plus forte. Tu gagnes désormais de l'expérience plus vite pour les actions, la vie et le mana en fonction du plus haut niveau jamais atteint, et tu gagnes de l'expérience de Maîtrise.

Si tu as l'impression de stagner et de ne pas pouvoir augmenter le niveau d'ennemi de façon régulière, c'est peut-être le moment de déclencher une Renaissance et de convertir cette expérience en gros bonus de puissance grâce aux Maîtrises.`,
  },

  'Masteries': {
    title: 'Maîtrises',
    body: `Les maîtrises sont des améliorations passives à long terme qui persistent à travers les Renaissances. Chaque maîtrise possède sa propre piste d'expérience qui se remplit grâce aux actions et activités associées.

Quand une maîtrise monte de niveau, tu gagnes un point de maîtrise. Ouvre l'arbre de compétences d'une maîtrise pour dépenser des points sur des bonus passifs permanents. Ctrl+clic (ou Cmd+clic) achète automatiquement chaque maîtrise abordable jusqu'au nœud ciblé.

Une fois les arbres d'une maîtrise entièrement achetés, les points en excès peuvent être **convertis** en bonus permanent (1 % supplémentaire par point pour la plupart des maîtrises, 0,5 % pour certaines). Utilise le bouton Convertir dans le panneau d'arbre de maîtrise ; Ctrl+clic (ou Cmd+clic) convertit tous les points disponibles d'un seul coup.`,
  },

  'Action Tags': {
    title: 'Tags d\'action',
    body: `Chaque action porte un **tag de type de dégâts** : Zone, Projectile ou Frappe, et un **tag de source de dégâts** : Feu, Foudre ou Physique.

Les tags contrôlent quels bonus de maîtrise s'appliquent et comment l'action se comporte — la zone touche dans un rayon, les projectiles suivent une seule cible, les frappes opèrent à courte portée. Le tag élémentaire contrôle quelles afflictions l'action peut appliquer et de quels bonus de maîtrise élémentaire elle bénéficie.`,
  },

  'Afflictions': {
    title: 'Afflictions',
    body: `Les afflictions sont des sous-produits des sources de dégâts (par ex. physique, feu, foudre). Elles sont appliquées aux ennemis par les coups avec une faible chance de base, modifiée par les nœuds de maîtrise.

Afflictions actuelles : **Brûlure** (feu), **Saignement** (physique), **Électrocution** (debuff foudre). Les ticks d'affliction ne sont pas des coups — ils ne déclenchent pas le vol de vie, les dégâts doubles ou les procs de statut sauf indication explicite.`,
  },

  'Multi-Action': {
    title: 'Multi-action',
    body: `Les multi-actions sont des cast de suivi déclenchés par une action primaire ou par une autre multi-action. Chacune se déclenche à une fraction du délai de cycle normal et peut porter une pénalité de dégâts.

Chaque multi-action est un nouveau cast à part entière : elle peut déclencher des afflictions, proc des statuts et tirer pour d'autres multi-actions — mais ne déclenche jamais la même multi-action qui l'a produite sauf indication explicite. Un multiplicateur de profondeur de ×0,9 s'accumule à chaque génération.`,
  },

  'Speed Stockpile': {
    title: 'Stock de vitesse',
    body: `La **vitesse ×2** s'appuie sur un stock gagné pendant ton absence. Pour 10 secondes réelles pendant lesquelles le jeu ne tourne pas (onglet inactif, fenêtre fermée ou jeu en pause), tu gagnes 1 seconde de temps ×2, jusqu'à un maximum d'1 heure. Les gains inférieurs à 10 secondes sont écartés.

À ton retour, une notification indique ce que tu as gagné. Pendant la vitesse ×2 le stock se vide en temps réel ; à zéro, le jeu revient en ×1 et la vitesse ×2 est verrouillée jusqu'à ce que tu en gagnes davantage.`,
  },

  'Ascent': {
    title: 'Ascension',
    body: `L'Ascension est un défi unique progressif débloqué après plusieurs Renaissances. Elle présente une série de rencontres d'ennemis de plus en plus difficiles. Compléter une étape d'Ascension récompense d'un bonus permanent qui se conserve à travers toutes les futures Renaissances — plus puissant que tout ce qui est disponible via la progression de maîtrise normale.

La progression de l'Ascension est séparée de ta partie. Tu peux la tenter à tout moment depuis le menu ; échouer à une étape d'Ascension ne coûte rien.`,
  },

  'Transcendence': {
    title: 'Transcendance',
    body: `La Transcendance est la couche de prestige au-dessus de l'Ascension — la réinitialisation la plus profonde du jeu, et les récompenses les plus fortes. Vaincs un boss au niveau ennemi 100 ou plus et le bouton doré **Transcender** apparaît en bas du panneau de niveau ennemi. Il n'y a pas de barre à remplir, mais chaque Transcendance doit être regagnée avec un nouveau boss de haut niveau.

Transcender réinitialise tout ce qu'une Ascension réinitialise, plus la couche d'Ascension elle-même : ton compteur d'ascensions, tes points d'univers et les artéfacts restés dans le sac. Tes **artéfacts équipés** et tes **reliques** survivent — et une fois que tu as transcendé, tes emplacements d'artéfact restent débloqués pour de bon.

Avant de transcender, tu choisis une **Relique** — un atout permanent qui survit à toutes les réinitialisations futures. Chaque relique ne peut être possédée qu'une seule fois : chaque Transcendance agrandit donc ta collection jusqu'à ce qu'elles soient toutes à toi.

En plus de la relique, chaque Transcendance te renforce durablement : ton gain d'expérience, tes dégâts et ta vie maximale grandissent à chaque fois. Ta puissance de transcendance et tes reliques s'affichent en bas du panneau de personnage.

Ta première Transcendance débloque aussi le **Blocage** : ton personnage lève un bouclier et gagne une chance d'amortir les coups reçus, avec une maîtrise Blocage dédiée dans la section Vie & Mana — et un choix de boucliers dans l'écran de personnalisation du personnage.`,
  },

  'Action Triggers': {
    title: 'Déclencheurs d\'action',
    body: `Les déclencheurs d'action déclenchent une action automatiquement quand une condition est remplie. Le premier emplacement est toujours l'**Auto-attaque** — il se déclenche sur une minuterie continue. D'autres emplacements de déclencheur se débloquent en Ascendant.

- L'**emplacement 2** se débloque à l'Ascension 3. Types de déclencheur : **Temps** (minuterie périodique), **Mana** (se déclenche tous les 100 points de mana dépensés par tes actions), **Coup critique** (se déclenche après un crit — déblocage : tuer un boss avec un crit), **Affliction** (se déclenche après avoir accumulé des stacks d'affliction — déblocage : tuer un boss avec un coup d'affliction).
- L'**emplacement 3** se débloque à l'Ascension 6 avec les mêmes options de déclencheur.

Chaque emplacement supplémentaire applique une pénalité globale de dégâts : ×0,75 pour l'emplacement 2, ×0,50 pour l'emplacement 3. Malgré cela, une seconde action bien adaptée peut augmenter significativement la sortie de dégâts totale.

Ouvre le panneau de configuration de combat (dans la barre du haut) pour changer ton action ou configurer les emplacements de déclencheur.`,
  },

  'Artifacts': {
    title: 'Artefacts',
    body: `Les artefacts sont des objets rares lâchés par les boss une fois que tu as atteint l'Ascension 5. Chaque artefact porte un modificateur positif associé à un modificateur négatif — un compromis risque/récompense que tu choisis d'accepter ou de refuser.

Quand un boss est vaincu, une carte de butin vole vers le centre de l'écran. Tu peux la **Mettre en sac** (la garder pour plus tard), **Équiper** l'artefact immédiatement, ou le **Jeter** définitivement.

Ton inventaire peut contenir jusqu'à 20 artefacts. Une fois plein, les boss ne lâchent plus de nouveaux artefacts tant que tu ne libères pas de place.

Les **emplacements d'équipement** se débloquent avec l'Ascension :
- **Ascension 5** — 1 emplacement se débloque
- **Ascension 10** — un 2e emplacement se débloque

Seuls les artefacts équipés appliquent leurs modificateurs. Les modificateurs de tous les artefacts équipés s'accumulent.

La **rareté** est déterminée par le nombre de paires de modificateurs : un Artefact Léger en a une, un Artefact Moyen en a deux, et un Artefact Lourd en a trois. Les artefacts plus rares ne commencent à tomber qu'à des niveaux de boss plus élevés :
- **Niveau de boss 30+** — les Artefacts Moyens (2 lignes) peuvent tomber
- **Niveau de boss 50+** — les Artefacts Lourds (3 lignes) peuvent tomber

Pour gérer ta collection, ouvre le panneau Artefacts depuis le menu d'Ascension (disponible à partir de l'Ascension 5). Tu peux y équiper, déséquiper ou supprimer définitivement des artefacts.`,
  },
}
