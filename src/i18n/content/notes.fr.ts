// French translations for src/config/notes.md.
//
// Keys are note IDs (slugified from the English ## heading — same algorithm as
// in src/ui/notes.ts parseNotes()). Each entry may provide `title` and/or
// `body`; missing fields fall back to English. Body strings are the markdown
// content between sections (the same `---`-delimited body that the English
// parser emits), and may contain inline note-term references — those are
// linkified against NOTE_TERMS for the active locale.
import type { ContentBlock } from './index'

export const notesFr: Record<string, ContentBlock> = {
  frenzy: {
    title: 'Frénésie',
    body: `Un **Statut** (buff) obtenu par les coups taggés frappe lorsque la **maîtrise de Frappe — arbre Frénésie** accorde une chance de frénésie. Dure **3 secondes** ; regagner la frénésie pendant qu'elle est active rafraîchit sa durée à la valeur maximale.

**Charges :** la Frénésie s'empile jusqu'à **10 charges** (porté à **20** avec le nœud final de l'arbre Frénésie). Chaque coup de frappe éligible qui passe le test de chance de frénésie ajoute une charge, jusqu'au maximum. Les charges sont suivies séparément de la durée et reviennent à 0 lorsque la frénésie expire.

**Tant que la Frénésie est active, toutes les actions (pas seulement les frappes) gagnent :**
- Dégâts augmentés — bonus plat + bonus par charge (nœuds de maîtrise Frénésie)
- Vitesse d'action augmentée — bonus plat + bonus par charge (nœuds de maîtrise Frénésie)
- Chance bonus de déclencher des afflictions par charge (nœud 5 de Frénésie)

Note : la frénésie ne peut être **gagnée** que par les frappes, mais ses bonus s'appliquent à **chaque action** pendant que le buff est actif.`,
  },

  'feeding-frenzy': {
    title: 'Frénésie alimentaire',
    body: `Un **Statut** (buff) déclenché par le nœud majeur de **Vol de vie** (chance de Frénésie alimentaire, nœud 5). Dure **5 secondes** ; un nouveau déclenchement rafraîchit la durée.

**Tant qu'elle est active :**
- Le vol de vie gagne **+20 % de vie volée augmentée** (additif avec les nœuds de maîtrise ; le plafond par coup s'applique toujours)
- La régénération de vie gagne **+20 % augmentée** (additif avec les nœuds de maîtrise de régénération ; sans plafond)
- La régénération de mana gagne **+20 % augmentée** (additif avec les nœuds de maîtrise de régénération ; sans plafond)

Les bonus sont appliqués à chaque tick de soin ou de régénération — ils ne modifient pas les valeurs de DPS stockées ni le calcul du plafond lui-même.`,
  },

  trance: {
    title: 'Transe',
    body: `Un **Statut** (buff) déclenché par la **maîtrise d'Action — arbre Transe** (les nœuds 0, 3 et 5 accordent chacun une chance de déclenchement). Dure **3 secondes** ; un nouveau déclenchement rafraîchit la durée.

**Tant que la Transe est active, les actions gagnent :**
- Une chance de frapper une **Cible supplémentaire** (chance multi-cible de Transe ; chaque coup est indépendant)
- Des dégâts augmentés (bonus de dégâts de Transe ; additif)
- Une vitesse d'action augmentée (bonus de vitesse d'action de Transe ; additif ; compresse le cycle d'attaque)

Tous les pourcentages sont additifs au sein de leur catégorie à travers tous les nœuds de l'arbre Transe. Tant que la Transe reste active, n'importe quelle action (y compris les actions **Multi-action**) est éligible au tirage de Cible supplémentaire.`,
  },

  burn: {
    title: 'Brûlure',
    body: `Une **Affliction** (Effet de dégâts dans le temps) appliquée par les actions taggées feu aux ennemis. Plusieurs charges indépendantes peuvent coexister sur le même ennemi.

**Application :**
- Chance de base d'application par coup : **5 %**
- Les nœuds de chance d'application de brûlure de la maîtrise du Feu s'y ajoutent directement (additif)
- Pendant que l'**Immolation** est active sur le joueur, la chance d'application gagne un bonus supplémentaire des nœuds de maîtrise Immolation
- Quand un ennemi t'applique une brûlure avec une attaque taggée feu, la chance d'application et la durée résultante sont divisées par deux (pas de bonus de maîtrise côté ennemi)

**Par charge :**
- DPS de Brûlure = dégâts au coup × **40 %** (modifié par les multiplicateurs de brûlure augmentée et supplémentaire de la maîtrise du Feu ; les dégâts du coup déclencheur sont utilisés)
- Durée : **5 secondes** de base (prolongée par les nœuds de durée de brûlure de la maîtrise du Feu)
- Chaque charge suit sa propre durée restante et son DPS de façon indépendante

**Interactions :**
- Les ennemis en train de brûler subissent des dégâts augmentés de toutes les sources quand le nœud 8 de l'arbre Brûlure (robuste) est assigné
- Le nœud 11 de l'arbre Brûlure fait éclabousser à chaque charge de brûlure une fraction de son DPS sur les ennemis proches non brûlants
- Les ennemis en train de brûler voient leur résistance au feu réduite (plafonnée à 0) quand le nœud final de l'arbre Dégâts de Feu (nœud 11) est assigné
- L'**Immolation** est une auto-brûlure distincte sur le joueur — ce n'est pas une charge de brûlure et elle n'apparaît pas dans la mécanique de brûlure des ennemis`,
  },

  'burning-ground': {
    title: 'Sol enflammé',
    body: `Une source de dégâts de feu **basée sur les cases** créée quand une action taggée feu touche un ennemi et que le tirage d'application de l'arbre Sol enflammé réussit. La case entière de la grille où le coup déclencheur a eu lieu devient un sol enflammé pour une durée de base fixe.

**Application :**
- Chance de base : **0 %** — accordée par les nœuds d'application de l'arbre Sol enflammé (chacun ajoute +5 %)
- Déclenché par n'importe quel coup taggé feu du joueur sur un ennemi
- Une case déjà couverte de sol enflammé est **immunisée** — le tirage est gaspillé ; la case doit se libérer (sa durée doit expirer) avant qu'un nouveau sol enflammé puisse y être appliqué

**Dégâts :**
- DPS de Sol enflammé = dégâts du coup déclencheur × **20 %** × (1 + sol enflammé augmenté) × (1 + sol enflammé supplémentaire)
- Les dégâts s'appliquent à chaque tick à **tous les ennemis dont les coordonnées de case correspondent** à la case de sol enflammé
- Les chiffres de dégâts s'affichent en orange (même couleur que la DoT de brûlure)

**Durée :**
- Base **4 secondes**, prolongée uniquement par le nœud robuste de l'arbre Sol enflammé (nœud 2 : +30 % de durée augmentée). Les nœuds génériques de durée de brûlure n'étendent **pas** le sol enflammé.

**Arbre Sol enflammé (court, 6 nœuds) :**
- Nœuds 0 et 3 (petits) : +5 % de chance pour les actions de feu de causer un sol enflammé chacun — total +10 % de base
- Nœuds 1 et 4 (petits) : +15 % de dégâts de sol enflammé augmentés chacun
- Nœud 2 (robuste) : +30 % de dégâts de sol enflammé augmentés · +30 % de durée de sol enflammé augmentée
- Nœud 5 (majeur) : Le sol enflammé ralentit la vitesse de déplacement et la vitesse d'action de l'ennemi de **20 %** lorsqu'il se tient dessus · +10 % de dégâts de sol enflammé supplémentaires

Le ralentissement se cumule de façon multiplicative avec les autres modificateurs de vitesse et s'applique à la fois à la vitesse de déplacement et à la vitesse d'attaque. Les dégâts du sol enflammé ne sont pas un coup et ne déclenchent pas le vol de vie, les dégâts doubles ni les procs de statut.`,
  },

  bleed: {
    title: 'Saignement',
    body: `Une **Affliction** (Effet de dégâts dans le temps) appliquée par les actions taggées physique aux ennemis. Plusieurs charges indépendantes peuvent coexister sur le même ennemi.

**Application :**
- Chance de base d'application par coup : **5 %**
- Les nœuds de chance d'application de saignement de la maîtrise Physique s'y ajoutent directement (additif)
- Quand un ennemi t'applique un saignement avec une attaque taggée physique, la chance d'application et la durée résultante sont divisées par deux (pas de bonus de maîtrise côté ennemi)

**Par charge :**
- DPS de Saignement = dégâts au coup × **50 %** (modifié par les multiplicateurs de saignement augmenté et supplémentaire de la maîtrise Physique ; les dégâts du coup déclencheur sont utilisés)
- Durée : **2 secondes** de base (prolongée par les nœuds de durée de saignement de la maîtrise Physique)
- Chaque charge suit sa propre durée restante et son DPS de façon indépendante ; seule la charge au plus haut DPS produit un tick à un moment donné`,
  },

  effect: {
    title: 'Effet',
    body: `Terme générique désignant les modificateurs en jeu déclenchés par les coups, les casts, les morts et d'autres événements. Les Effets sont organisés en plusieurs catégories distinctes — chaque catégorie a ses propres règles de déclenchement, de durée, d'empilement et d'interaction avec les autres modificateurs.

**Catégories :**
- **Statut** — buff, debuff ou conditions mixtes sur le joueur ; affiché dans la barre d'effets en haut de l'écran. Exemples : **Transe**, **Frénésie alimentaire**, **Immolation**.
- **Affliction** — effets de dégâts dans le temps appliqués aux ennemis, avec des charges indépendantes par ennemi. Exemple : **Brûlure**.
- **Multi-action** — actions supplémentaires d'une action du joueur déclenchées par une action primaire ou par une autre Multi-action. Exemples : **Double action**, **Cible supplémentaire**, **Projectile supplémentaire**, **Seconde action**.
- **Proc** — tirage par événement qui modifie un seul coup. Exemple : **Dégâts doubles**.
- **Vol de vie / Vol de mana** — soin ou récupération de ressource par coup. Voir **Vol de vie**.

Quand une description mentionne une « chance d'effet » générique sans catégorie, consulte la note spécifique correspondante pour les règles qui s'appliquent.`,
  },

  'life-steal': {
    title: 'Vol de vie',
    body: `Mécanique de soin : une fraction des dégâts infligés aux ennemis est restaurée en vie du joueur, appliquée par coup direct.

**Formule :**
- Volé = dégâts au coup × % de vol × (1 + % volé augmenté)
- Plafonné à : vie max × **1 %** par instance (plafond strict ; augmenté par le nœud de maîtrise 2)

**Arbre Vol de vie (court, 6 nœuds) :**
- Nœuds 0 et 3 (petits) : +0,5 % de vol chacun — total +1 % de base
- Nœuds 1 et 4 (petits) : +5 % de vie volée augmentée chacun — total +10 % d'augmentation
- Nœud 2 (robuste) : +10 % de plafond strict augmenté — le plafond devient 1,1 % de la vie max
- Nœud 5 (majeur) : +1 % de chance par instance de vol de déclencher la **Frénésie alimentaire**

La **Frénésie alimentaire** accorde +20 % de vie volée augmentée additionnelle de façon additive ; le plafond s'applique toujours.

Le vol de vie est appliqué une fois par coup direct. Les ticks de brûlure, l'auto-brûlure d'Immolation et les autres sources de dégâts dans le temps ne déclenchent pas le vol de vie — à moins que le nœud clé « Tu peux voler à partir des dégâts d'affliction » de l'arbre Vol de vie ne soit alloué, ce qui étend le vol de vie et de mana aux dégâts de tick de **Brûlure** et de **Saignement** issus de charges appliquées par le joueur.`,
  },

  increased: {
    title: 'Augmenté',
    body: `Les modificateurs **Augmenté** sont additifs. Toutes les valeurs « +X % augmenté » de la même catégorie de stat sont sommées en un seul pool, et le total est appliqué comme \`(1 + total / 100)\`.

**Exemple :** +15 % de dégâts augmentés et +5 % de dégâts augmentés se combinent en +20 % de dégâts augmentés — un multiplicateur ×1,20.

Augmenté et **Supplémentaire** sont des couches de multiplicateurs séparées qui s'empilent de façon multiplicative l'une avec l'autre.`,
  },

  more: {
    title: 'Supplémentaire',
    body: `Les modificateurs **Supplémentaire** sont multiplicatifs. Chaque valeur « X % supplémentaire » s'applique comme son propre multiplicateur indépendant : \`× (1 + X / 100)\`.

**Exemple :** ×1,10 de dégâts supplémentaires et ×1,05 de dégâts supplémentaires se combinent en ×1,155 — pas ×1,15.

Les multiplicateurs Supplémentaire sont appliqués après que tous les modificateurs **Augmenté** ont été sommés. Le résultat est que « supplémentaire » est strictement plus puissant que la même valeur « augmenté » dès qu'un autre bonus de la même catégorie existe déjà.`,
  },

  'double-damage': {
    title: 'Dégâts doubles',
    body: `Une chance par cast que le coup inflige exactement **2× ses dégâts effectifs normaux**. Le tirage a lieu après que tous les autres modificateurs de dégâts (y compris **Augmenté** et **Supplémentaire**) ont été appliqués, donc il double le nombre final.

Provient de la maîtrise d'Action — arbre Dégâts (nœuds de chance de dégâts doubles). Plusieurs nœuds s'ajoutent à une seule chance cumulée. Le tirage est indépendant à chaque action — il peut proc sur les actions primaires, les actions de **Double action** et les actions à cibles supplémentaires.`,
  },

  'double-action': {
    title: 'Double action',
    body: `Une **Multi-action** provenant de la maîtrise d'Action — arbre Vitesse d'action (nœuds de chance de double action). Chaque tirage réussi met en file une action de suivi de la même action à **1/5 du délai de cycle normal** après l'action primaire. L'action de suivi cible le même ennemi (ou le plus proche à portée si la cible primaire est morte) et paie le coût en mana complet.

La Double action elle-même n'a **aucun modificateur de dégâts** — l'action de suivi inflige des dégâts complets. Selon les règles standard de Multi-action, elle peut tirer pour des **Dégâts doubles**, déclencher des Statuts, Afflictions et autres Multi-actions ; elle ne peut pas déclencher une autre Double action.`,
  },

  immolation: {
    title: 'Immolation',
    body: `Un **Statut** (Effet mixte) déclenché sur le joueur quand une action taggée feu touche et passe le tirage de chance d'immolation (nécessite des nœuds de maîtrise du Feu).

**Tant que l'Immolation est active :**
- Les dégâts des actions de feu gagnent un bonus (additif ; se cumule avec les autres modificateurs de dégâts augmentés)
- La chance d'application de brûlure gagne un bonus (additif ; se cumule avec les autres modificateurs de chance de brûlure)
- Le joueur subit des dégâts d'auto-brûlure : DPS = dégâts du dernier coup déclencheur × 20 %, modifiés par les nœuds de DPS d'Immolation de la maîtrise du Feu

Chaque coup déclencheur qui passe le tirage rafraîchit la durée de l'Immolation (**5 secondes** de base) et met à jour le DPS d'auto-brûlure à la valeur du nouveau coup. Une seule instance d'Immolation peut être active à la fois.

L'Immolation est une auto-brûlure sur le joueur — elle est distincte des charges de **Brûlure** sur les ennemis et n'interagit pas avec la mécanique de brûlure des ennemis.`,
  },

  strong: {
    title: 'Robuste',
    body: `Une variante d'ennemi. Les ennemis Robustes ont **1,0–1,8× de vie**, **1,0–1,8× de dégâts** et **+20 % de vitesse d'attaque** par rapport à un ennemi normal de même niveau. Ils accordent **×2 XP d'action** à la mort. Identifiés par un **diamant bleu** au-dessus de la barre de vie.

La chance d'apparition de base est de **10 %** par ennemi dans une vague. Les nœuds de maîtrise Ennemi peuvent augmenter cette chance.

Les ennemis **Élites** sont un sous-ensemble des Robustes — ils ont des bonus supplémentaires par-dessus.`,
  },

  elite: {
    title: 'Élite',
    body: `Une variante d'ennemi qui est une version plus forte des **Robustes**. Les ennemis Élites ont **1,5–2,5× de vie**, **1,5–2,5× de dégâts**, **+20 % de vitesse d'attaque** et **+20 % de vitesse de déplacement** par rapport à un ennemi normal de même niveau. Ils accordent **×3 XP d'action** à la mort. Identifiés par un **diamant violet** au-dessus de la barre de vie.

Les ennemis Élites ne peuvent pas apparaître sans des nœuds de maîtrise Ennemi qui accordent une chance d'élite. Chaque ennemi Robuste subit un tirage séparé pour être promu Élite en fonction de cette chance.`,
  },

  status: {
    title: 'Statut',
    body: `Une catégorie d'**Effet** qui s'applique au joueur. Les Statuts sont affichés sous forme d'icônes dans la barre d'effets en haut de l'écran et modifient le comportement ou les stats du joueur tant qu'ils sont actifs.

**Types :**
- **Buff** (icône bleue) : une condition bénéfique
- **Debuff** (icône rouge) : une condition néfaste
- **Mixte** (icône divisée) : à la fois bénéfique et néfaste

**Durée et nouveau déclenchement :** chaque Statut a une durée restante qui s'écoule en temps de jeu réel. Déclencher un Statut déjà actif rafraîchit sa durée à la valeur maximale plutôt que d'empiler une seconde instance.

**Statuts actuels :**
- **Transe** — buff ; renforce toutes les actions du joueur (chance de Cible supplémentaire, dégâts augmentés, vitesse d'action augmentée)
- **Frénésie alimentaire** — buff ; amplifie le vol de vie et la régénération
- **Immolation** — mixte ; accorde des dégâts de feu et des bonus de chance de brûlure tout en infligeant une DoT d'auto-brûlure au joueur
- **Soif de sang** — buff ; vitesse d'action/dégâts physiques et chance bonus d'application de saignement tant qu'elle est active
- **Électrifié** — buff ; bonus global de vitesse d'action et réduction des dégâts entrants tant qu'il est actif`,
  },

  affliction: {
    title: 'Affliction',
    body: `Une catégorie d'**Effet** qui applique un debuff ou des dégâts dans le temps à un ennemi. Les Afflictions sont typiquement appliquées par les coups avec une faible chance de base (modifiée par les nœuds de maîtrise). Chacune est spécifique à un tag de dégâts.

**Afflictions actuelles :**
- **Brûlure** — dégâts de feu dans le temps, appliquée par les actions taggées feu
- **Électrocution** — debuff de dégâts subis, appliqué par les actions taggées foudre

**Afflictions prévues :** Saignement (physique), Poison (toxine), Gel (froid).`,
  },

  'multi-action': {
    title: 'Multi-action',
    body: `Une catégorie d'**Effet** dans laquelle un cast supplémentaire d'une action du joueur est déclenché par un cast primaire ou par une autre Multi-action. Chaque Multi-action se déclenche avec un délai spécifique par rapport au cooldown primaire et peut avoir son propre modificateur de dégâts.

**Multi-actions actuelles :**
- **Double action** — suivi à 1/5 du cycle, dégâts complets (maîtrise d'Action)
- **Cible supplémentaire** — suivi contre un ennemi différent à 1/5 du cycle, dégâts complets (maîtrise d'Action, pendant que la **Transe** est active)
- **Projectile supplémentaire** — suivi à 1/5 du cycle, ×0,5 dégâts (maîtrise Projectile)
- **Seconde action** — suivi à 1/5 du cycle, ×0,5 dégâts (rune **Action divisée** ; se déclenche uniquement sur l'action primaire)
- **Saut** — suivi à 1/5 du cycle, ×0,6 dégâts (maîtrise Foudre) ; cible un ennemi proche depuis la position de la cible précédente

**Comportement standardisé (s'applique à toutes les Multi-actions) :**

1. **Vraie nouvelle action.** Chaque cast de Multi-action est un vrai cast. Il peut tirer pour des **Dégâts doubles**, appliquer des **Afflictions**, déclencher des Statuts et tirer pour n'importe quelle autre Multi-action — mais il ne peut jamais re-déclencher la même Multi-action qui l'a produit.
2. **Héritage.** Si une Multi-action porte une réduction de dégâts spécifique à ce mécanisme, toute nouvelle Multi-action qu'elle déclenche hérite de ce modificateur. Les modificateurs se composent à travers les chaînes : par ex. un Projectile supplémentaire (×0,5) qui déclenche un Second Cast (×0,5) donne un suivi à ×0,25 de dégâts.
3. **Multiplicateur de profondeur.** Chaque niveau de Multi-action porte un multiplicateur supplémentaire de ×0,9. Une Multi-action directement déclenchée par un cast primaire commence à ×0,9 (avant son propre modificateur de type). Chaque niveau suivant se compose : la profondeur 2 est ×0,81, la profondeur 3 est ×0,729, et ainsi de suite. Cela s'empile de façon multiplicative avec le modificateur spécifique au type de la règle 2.
4. **Ordre de déclenchement.** Quand plusieurs Multi-actions sont éligibles au tirage sur la même action, elles sont évaluées de la **source la plus générique à la plus spécifique** : d'abord les Multi-actions de niveau action (Double action, Cible supplémentaire), puis de niveau projectile (Projectile supplémentaire), puis spécifiques à une rune (Seconde action), puis spécifiques à la foudre (Saut). Cet ordre détermine aussi quelle action en file se déclenche en premier lorsque plusieurs sont en attente.`,
  },

  'additional-target': {
    title: 'Cible supplémentaire',
    body: `Une **Multi-action** qui met en file un cast de suivi à **1/5 du cycle normal** contre un ennemi différent à portée, sans payer de mana. Le suivi inflige des dégâts complets sans modificateur spécifique à la Multi-action.

**Sources (les chances sont sommées en un seul tirage par action) :**
- Maîtrise d'Action — arbre Transe (nœuds de chance multi-cible), uniquement pendant que la **Transe** est active
- Maîtrise de Frappe — arbre Cible supplémentaire, sur toute action taggée **frappe** ; chance totale = chance de cible supplémentaire de frappe × (1 + cible supplémentaire de frappe supplémentaire / 100)

Selon les règles standard de Multi-action, le suivi est une vraie nouvelle action — il peut tirer pour des **Dégâts doubles**, **Double action**, **Projectile supplémentaire**, **Seconde action** et déclencher des Statuts ou Afflictions. Il ne peut pas tirer pour une autre Cible supplémentaire.`,
  },

  'additional-projectile': {
    title: 'Projectile supplémentaire',
    body: `Une **Multi-action** déclenchée par la maîtrise Projectile (nœuds de chance de projectile supplémentaire). Chaque tirage réussi met en file un projectile de suivi à **1/5 du cycle normal**, infligeant **×0,5 dégâts** (augmenté de façon additive par les nœuds de dégâts supplémentaires de la maîtrise Projectile), préférant un ennemi différent à portée quand c'est possible.

Selon les règles standard de Multi-action, le suivi est une vraie nouvelle action — il peut tirer pour des **Dégâts doubles**, **Double action**, **Cible supplémentaire**, **Seconde action** et déclencher des Statuts ou Afflictions. Il ne peut pas tirer pour un autre Projectile supplémentaire.

**Exception — nœud clé de maîtrise Projectile :** quand ce nœud est pris, le premier Projectile supplémentaire effectue un tirage de plus pour un second Projectile supplémentaire. Les deux sont de vraies nouvelles actions ; le second ne peut pas tirer pour un troisième.

Par la règle d'**héritage**, toute Multi-action déclenchée à partir d'un Projectile supplémentaire emporte le modificateur ×0,5 de dégâts — composé avec tout modificateur de Multi-action supplémentaire par-dessus.`,
  },

  'second-action': {
    title: 'Seconde action',
    body: `Une **Multi-action** déclenchée par la rune clé **Action divisée**. Chaque **action primaire** met en file un suivi à **1/5 du cycle normal**, infligeant **×0,5 dégâts**. Les Multi-actions (Double action, Projectile supplémentaire, etc.) qui se déclenchent en conséquence de la primaire ne déclenchent pas chacune leur propre Seconde action.

Selon les règles standard de Multi-action, le suivi est une vraie nouvelle action — il peut tirer pour des **Dégâts doubles**, **Double action**, **Cible supplémentaire**, **Projectile supplémentaire** et déclencher des Statuts ou Afflictions. Il ne peut pas déclencher une autre Seconde action.

Par la règle d'**héritage**, toute Multi-action déclenchée à partir d'une Seconde action emporte le modificateur ×0,5 de dégâts — composé avec tout modificateur de Multi-action supplémentaire par-dessus.`,
  },

  hit: {
    title: 'Coup',
    body: `Un événement de dégâts direct produit par un seul cast atterrissant sur une cible. Les coups sont distincts des sources de dégâts dans le temps telles que les charges de **Brûlure** et l'auto-brûlure d'**Immolation**, qui infligent des dégâts en continu sans être des coups.

Seuls les coups déclenchent les mécaniques qui réagissent à des événements de dégâts individuels :
- **Vol de vie** — soigne le joueur d'une fraction des dégâts au coup
- **Dégâts doubles** — tirage par cast qui double le coup
- Les procs de statut tels que les déclenchements de **Transe** et d'**Immolation**

Les ticks d'affliction (Brûlure) et l'auto-brûlure d'Immolation ne sont pas des coups et ne déclenchent rien de ce qui précède.`,
  },

  mitigation: {
    title: 'Mitigation',
    body: `La mitigation des dégâts est une source de réduction de dégâts appliquée aux coups entrants. Plusieurs sources de mitigation indépendantes peuvent s'empiler ; les détails dépendent de la source spécifique.

**Sources actuelles :**
- **Résistance** — réduit les dégâts entrants d'une famille correspondante (Physique, Pourriture ou Élémentaire)

D'autres types de mitigation sont prévus. Certains nœuds de maîtrise d'Action permettent aux actions de contourner toute la mitigation des dégâts ennemis sur un tirage par action.`,
  },

  resistance: {
    title: 'Résistance',
    body: `Stat du joueur et des ennemis qui réduit les dégâts entrants d'une famille de dégâts spécifique. Deux familles existent :
- **Physique & Pourriture** — combinées en une seule stat de résistance
- **Élémentaire** — couvre le feu, la foudre et le froid

Le joueur et les ennemis ont tous deux ces valeurs de résistance. Les dégâts entrants d'une famille correspondante sont réduits du pourcentage de résistance avant d'être appliqués. L'arbre Vie — Résistances de la maîtrise augmente les deux résistances du joueur ; les ennemis tirent des valeurs initiales dans des plages spécifiques à leur tier à l'apparition.

La Résistance est une source de **Mitigation**. Les effets de **Réduction de résistance** (par ex. Brise-résistance physique, Ennemis en train de brûler vs Feu) abaissent la résistance effective d'un ennemi en dessous de sa valeur tirée, bornée à 0 %.`,
  },

  'action-speed': {
    title: 'Vitesse d\'action',
    body: `À quelle vitesse une action du joueur se déclenche. Une vitesse d'action plus élevée raccourcit le temps entre les actions (le cycle d'attaque), te permettant de placer plus de coups par seconde.

**Sources de vitesse d'action augmentée :**
- Statut **Transe** — accorde un bonus de vitesse d'action temporaire tant qu'il est actif (maîtrise d'Action)
- Nœuds de vitesse d'action de la maîtrise d'Action — augmentations additives permanentes

Les bonus de vitesse d'action sont additifs au sein de leur catégorie. Le multiplicateur résultant raccourcit le cycle proportionnellement — doubler la vitesse d'action divise par deux le temps entre les actions.`,
  },

  electrocution: {
    title: 'Électrocution',
    body: `Une **Affliction** appliquée par les coups taggés foudre. Tant qu'elle est active (durée de base 3 s, rafraîchie à la réapplication), la cible subit des dégâts supplémentaires de **toutes les sources** — c'est un multiplicateur indépendant, séparé des autres modificateurs de dégâts subis ou infligés.

Quand un ennemi t'électrocute avec une attaque taggée foudre, la chance d'application et la durée sont divisées par deux, et seul le multiplicateur de base de 10 % de dégâts subis s'applique (pas de bonus de maîtrise côté ennemi).

**Formule de dégâts subis :** base 10 % + tous les nœuds « dégâts subis augmentés par électrocution » (additif). Exemple : avec +3 +5 +3 +8 +3 = +22 %, le total est de 32 % ; tous les dégâts entrants sur cet ennemi sont ×1,32.

**Ralentissement (nœud 11 de la maîtrise Foudre) :** quand ce nœud est actif, les ennemis Électrocutés voient leur vitesse de déplacement et leur vitesse d'action chacune réduites de la valeur complète de dégâts subis par électrocution (base + augmentations de maîtrise). Une valeur de 32 % signifie que l'ennemi se déplace et attaque à 68 % de sa vitesse normale.`,
  },

  jump: {
    title: 'Saut',
    body: `Une **Multi-action** déclenchée par la maîtrise Foudre (arbre Saut). Après un coup taggé foudre du joueur, un tirage réussi met en file un coup de suivi à **1/5 du cycle normal**, infligeant ×0,6 dégâts de base (réduits par les nœuds de maîtrise). Le suivi cible un ennemi proche mesuré depuis la **position de la cible précédente**, pas celle du joueur.

**Sélection de cible :** préfère l'ennemi le plus proche qui n'a pas encore été touché dans la chaîne de saut en cours. Si tous les ennemis à portée ont déjà été sautés, il peut re-cibler n'importe lequel d'entre eux sauf celui qui a déclenché ce saut.

**Portée du saut** correspond à la portée d'attaque normale de l'action, augmentée éventuellement par le nœud majeur (+30 %). La portée est mesurée depuis la cible qui vient d'être touchée.

**Enchaînement (nœud majeur 5) :** quand il est actif, chaque saut réussi effectue un nouveau tirage pour un autre saut sans limite. La chaîne continue tant que les tirages réussissent et que des cibles valides existent.

**Héritage :** chaque saut dans une chaîne emporte le multiplicateur de profondeur ×0,9 du système de Multi-action en plus du modificateur ×0,6 spécifique au saut. Un premier saut (profondeur 1) inflige ×0,9 × 0,6 = ×0,54 de dégâts ; un second saut (profondeur 2) ajoute un autre ×0,9, donnant ×0,486, et ainsi de suite.`,
  },

  'resistance-breaking': {
    title: 'Brise-résistance',
    body: `Une mécanique de la **maîtrise Physique — Brise-résistance**. Chaque coup taggé physique du joueur sur un ennemi tire la chance de brise-résistance ; en cas de succès, la **résistance physique et pourriture combinée** de l'ennemi est réduite de façon permanente d'**1 point de pourcentage** (bornée à 0 % — jamais négative). La réduction est par ennemi et persiste durant la durée de vie de cet ennemi ; les nouveaux ennemis tirent des valeurs de résistance fraîches.

**Arbre Brise-résistance (court, 6 nœuds) :**
- Nœuds 0 et 3 (petits) : +5 % de chance de réduire de façon permanente la résistance phys-pourriture de l'ennemi de 1 % chacun — total +10 % de base
- Nœuds 1 et 4 (petits) : +5 % de dégâts physiques augmentés chacun
- Nœud 2 (robuste) : +7 % de chance de réduire de façon permanente la résistance phys-pourriture de l'ennemi · +3 % de vitesse d'action physique augmentée
- Nœud 5 (majeur) : Les ennemis à 0 % de résistance physique et pourriture voient leur vitesse de déplacement et leur vitesse d'action réduites de **20 %**

Le ralentissement à 0 % s'applique de façon multiplicative aux côtés des autres modificateurs de vitesse et à la fois à la vitesse de déplacement et à la vitesse d'attaque (reproduit le comportement du ralentissement du Sol enflammé).`,
  },

  bloodlust: {
    title: 'Soif de sang',
    body: `Un **Statut** (buff) sur le joueur, provenant de la **maîtrise Physique — arbre Soif de sang**. Chaque application réussie de **Saignement** tire la chance de déclenchement de la Soif de sang ; en cas de succès, le buff est appliqué pour **4 secondes** (prolongé par le nœud majeur). Un nouveau déclenchement rafraîchit sa durée à la valeur maximale. Le buff lui-même ne fait rien d'intrinsèque — ses bonus sont entièrement définis par les nœuds de l'arbre Soif de sang.

**Arbre Soif de sang (court, 6 nœuds) :**
- Nœuds 0 et 3 (petits) : +5 % de chance de déclencher la Soif de sang à l'application de saignement chacun — total +10 % de base
- Nœuds 1 et 4 (petits) : La Soif de sang accorde +5 % de vitesse d'action physique augmentée chacun
- Nœud 2 (robuste) : La Soif de sang accorde +5 % de vitesse d'action physique augmentée et +12 % de dégâts physiques augmentés · Les actions physiques durant la Soif de sang ont +10 % de chance augmentée d'appliquer un saignement
- Nœud 5 (majeur) : La Soif de sang accorde +5 % de vitesse d'action physique augmentée et +12 % de dégâts physiques augmentés · +25 % de durée augmentée de la Soif de sang

Tant que la Soif de sang est active, les bonus de vitesse d'action et de dégâts ne s'appliquent qu'aux **actions taggées physique**. La chance bonus d'application de saignement du nœud 2 ne s'applique également que tant que la Soif de sang est en cours. Les bonus sont sommés de façon additive dans les pools physiques existants à l'exécution.`,
  },

  electrified: {
    title: 'Électrifié',
    body: `Un **Statut** (buff) sur le joueur, provenant de la **maîtrise Foudre — arbre Électrifiant**. Chaque coup taggé foudre du joueur tire la chance de déclenchement d'Électrifier ; en cas de succès, le buff est appliqué pour **4 secondes** (prolongé par le nœud robuste). Un nouveau déclenchement rafraîchit sa durée. Le buff lui-même ne fait rien d'intrinsèque — ses bonus sont entièrement définis par les nœuds de l'arbre Électrifiant.

**Arbre Électrifiant (court, 6 nœuds) :**
- Nœuds 0 et 3 (petits) : +5 % de chance pour les actions de foudre de t'Électrifier chacun — total +10 % de base
- Nœuds 1 et 4 (petits) : +5 % de vitesse d'action augmentée tant qu'Électrifié chacun (s'applique à **toutes** les actions, pas seulement à la foudre)
- Nœud 2 (robuste) : +25 % de durée d'Électrifié augmentée · +5 % de vitesse d'action augmentée tant qu'Électrifié
- Nœud 5 (majeur) : -5 % de dégâts subis de toutes les sources tant qu'Électrifié

Le bonus de vitesse d'action est **global** — il s'applique à chaque action du joueur quel que soit le tag. La réduction des dégâts entrants est appliquée après les résistances et tout autre multiplicateur dans le pipeline de dégâts du joueur.`,
  },

  area: {
    title: 'Zone',
    body: `Un **type de dégâts** aux côtés de \`projectile\` et \`frappe\`. Chaque action porte au plus un de ces trois tags. Une action taggée zone a une zone de frappe circulaire définie par son champ \`area\` (en unités de rayon-joueur) : tout ennemi dans cette zone autour de la source de l'aire subit les dégâts complets du cast à l'impact.

Deux modes de ciblage :
- **Ciblé sur l'ennemi** : l'action a une \`range\` comme toute autre ; dès que l'ennemi ciblé entre dans cette portée, le cast se déclenche et la zone est centrée **sur la cible**.
- **Auto-ciblé** (\`selfTargeted: true\`) : l'action n'a pas de portée. Son rayon de zone sert aussi de portée de déclenchement — le cast se déclenche dès qu'un ennemi entre dans la zone, et la zone est centrée **sur le lanceur**.

Chaque ennemi dans la zone reçoit un coup en attente indépendant, donc tous les déclencheurs par coup (brûlure, électrocution, saignement, frénésie, vol de vie/mana, XP d'action, etc.) se déclenchent une fois par ennemi touché. Les déclencheurs par action (transe, immolation, doubleAction, paiement du mana) se déclenchent une fois par action comme d'habitude.`,
  },

  knockback: {
    title: 'Repoussement',
    body: `Une impulsion physique appliquée à un ennemi lors d'un tirage de coup réussi. L'ennemi est poussé directement à l'opposé de l'attaquant sur une brève fenêtre (200 ms).

**Portée de repoussement de base** (distance parcourue par l'ennemi) :
- **Actions de zone** : 1 unité de rayon-joueur
- **Actions de projectile** : 0,5 unité de rayon-joueur

Les nœuds de maîtrise Repoussement augmentent la chance de repousser et peuvent ajouter deux debuffs temporels à l'ennemi repoussé (indépendants l'un de l'autre) :
- **Ralentissement de vitesse de déplacement** — la vitesse de déplacement de l'ennemi est réduite pendant 2 secondes
- **Réduction des dégâts** — l'ennemi repoussé inflige moins de dégâts au joueur pendant 2 secondes

Le nœud « portée de repoussement supplémentaire » multiplie la portée de base pour ce type d'action. Si une action porte à la fois les tags zone et projectile, les deux pools de repoussement sont vérifiés indépendamment et les deux peuvent se déclencher.`,
  },

  tremor: {
    title: 'Secousse',
    body: `Une **multi-action** provenant de la **maîtrise de Zone — arbre Secousse**. Après qu'un cast de zone se résout, chaque victime non primaire tire indépendamment la chance de Secousse ; en cas de succès, une secousse est mise en file ciblant cet ennemi.

Chaque secousse re-déclenche la même action de zone centrée sur son ennemi déclencheur (peu importe si l'original était auto-ciblé ou ciblé sur l'ennemi), avec un multiplicateur de base de **0,5× dégâts et 0,5× rayon de zone**. L'arbre Secousse ajoute des bonus de dégâts de secousse augmentés et de rayon de secousse augmenté par-dessus la base 0,5×.

Les Secousses sont des **casts de continuation gratuits** (pas de mana supplémentaire) et **arrêtent toutes les multi-actions ultérieures, y compris d'autres secousses**. Elles peuvent toucher des ennemis qui avaient déjà été touchés par le cast original ou par une autre secousse — il n'y a pas de déduplication entre les vagues.`,
  },

  dash: {
    title: 'Charge',
    body: `Une Charge consomme une charge pour couvrir 1 seconde de mouvement en 0,1 seconde (compression de vitesse ×10). Par défaut, le joueur peut accumuler jusqu'à 1 charge à la fois ; de futurs nœuds clés peuvent augmenter le plafond.

Les charges sont gagnées via un tirage par seconde : une fois par seconde, le jeu vérifie si une nouvelle charge est accordée en fonction de la chance totale de charge de Charge issue des nœuds de maîtrise Charge investis. Sans aucun nœud Charge alloué, la chance est de 0 % et aucune charge n'est jamais accordée.

Par défaut, la Charge réduit la distance vers l'ennemi le plus proche. Le nœud majeur Kite permet à la Charge de se déclencher également en direction de kite (à l'opposé des ennemis).

Une Charge en cours est annulée immédiatement quand la phase d'animation d'action du joueur commence.`,
  },

  kite: {
    title: 'Kite',
    body: `Le kite éloigne le joueur de l'ennemi le plus proche quand cet ennemi est dans la moitié de la portée d'action du joueur. La vitesse de kite est égale à la vitesse de déplacement effective du joueur multipliée par la fraction totale de vitesse de kite des nœuds de maîtrise Kite (0,25 par petit nœud, plafonnée à 1,0 à quatre nœuds).

Le joueur ne se déplace jamais pendant la phase d'animation d'action (le premier tiers du cycle d'action). Pendant la phase d'attente (les deux tiers restants), le kite prend la priorité sur la réduction de distance vers le prochain ennemi chaque fois que la condition de kite est remplie.

Allouer le nœud robuste de Kite accorde un bonus plat à toutes les résistances qui s'applique tant que la condition de kite est active.`,
  },

  'mana-shield': {
    title: 'Bouclier de mana',
    body: `Une mécanique défensive issue de la **maîtrise Mana** qui intercepte une portion des dégâts entrants et la paie avec du mana plutôt qu'avec de la vie.

Quand un coup atterrit, le Bouclier de mana absorbe un pourcentage des dégâts (la fraction d'absorption, augmentée par les nœuds de l'arbre Bouclier de mana). La portion absorbée est convertie en coût de mana à **200 %** — absorber 100 dégâts coûte 200 mana. Si tu as un mana insuffisant, le bouclier absorbe autant que ton mana le permet et le reste touche normalement la vie.

**Modificateurs de l'arbre Bouclier de mana :**
- Les nœuds d'absorption augmentent la fraction absorbée (base 0 % ; actif uniquement avec au moins un nœud)
- Les nœuds de réduction de coût abaissent le taux de conversion à 200 %
- Nœud 5 : le bouclier intercepte toutes les sources de dégâts, pas seulement les coups directs
- Nœud 11 : tes résistances s'appliquent au coût en mana (même réduction qu'elles fournissent aux dégâts de vie)`,
  },

  'mana-steal': {
    title: 'Vol de mana',
    body: `Une mécanique de récupération de ressource qui reflète le **Vol de vie** : une fraction des dégâts au coup est récupérée en mana plutôt qu'en vie.

**Formule :**
- Volé = dégâts au coup × % de vol × (1 + % volé augmenté)
- Plafonné à : mana max × **1 %** par instance (augmenté par le nœud d'augmentation du plafond)

**Arbre Vol de mana (court, 6 nœuds) :**
- Nœuds 0 et 3 (petits) : +0,5 % de vol chacun
- Nœuds 1 et 4 (petits) : +5 % de mana volé augmenté chacun
- Nœud 2 (robuste) : +10 % de plafond de vol de mana augmenté
- Nœud 5 (majeur) : 1 % de chance par instance de vol de déclencher la **Frénésie alimentaire**

Le vol de mana est appliqué une fois par coup direct. Les sources de dégâts dans le temps (ticks de brûlure, immolation) ne déclenchent pas le vol de mana.`,
  },

  champion: {
    title: 'Champion',
    body: `Une variante d'ennemi au-dessus de l'**Élite**. Les Champions ont **2,0–4,0× de vie**, **2,0–4,0× de dégâts**, **+30 % de vitesse d'attaque** et **+20 % de vitesse de déplacement** par rapport à un ennemi normal de même niveau. Ils accordent **×5 XP d'action** à la mort. Identifiés par un **diamant doré** au-dessus de la barre de vie.

Les Champions ne peuvent pas apparaître sans des nœuds de maîtrise Ennemi qui accordent une chance de champion. Chaque ennemi Élite subit un tirage séparé pour être promu Champion en fonction de cette chance.`,
  },

  boss: {
    title: 'Boss',
    body: `Le tier d'ennemi le plus rare et le plus fort, au-dessus du **Champion**. Les Boss ont **4,0–8,0× de vie**, **4,0–8,0× de dégâts**, **+40 % de vitesse d'attaque** et **+30 % de vitesse de déplacement** par rapport à un ennemi normal de même niveau. Ils accordent **×10 XP d'action** à la mort. Identifiés par un **diamant rouge** au-dessus de la barre de vie.

Les Boss ne peuvent pas apparaître sans des nœuds de maîtrise Ennemi qui accordent une chance de boss. Chaque ennemi Champion subit un tirage séparé pour être promu Boss.`,
  },

  'critical-hit': {
    title: 'Coup critique',
    body: `Un tirage par action qui multiplie les dégâts au coup. Toutes les actions ont leur propre chance de crit de base après la première ascension.

**Formule de dégâts :**
- Multiplicateur de crit = **2×** de base (+100 % de bonus) plus tous les nœuds « dégâts de coup critique augmentés » (additifs sur la portion bonus)
- Les nœuds « dégâts de coup critique supplémentaires » multiplient la portion bonus après augmenté

**Exemple :** +20 % de dégâts de crit augmentés → bonus = 100 % × 1,20 = 120 %, donc le crit inflige ×2,20 au total.

**Chance de crit :**
- Chaque action a une chance de crit de base, certaines maîtrises peuvent l'augmenter.
- « Chance de crit augmentée » et « chance de crit supplémentaire » mettent à l'échelle la chance de base de façon multiplicative
- Les crits se déclenchent sur un tirage par action avant que le coup se résolve ; toutes les mécaniques par coup (**Afflictions**, **Vol de vie**, etc.) s'appliquent normalement à un coup critique sauf indication explicite

**Exemple :** 3 % de chance de base avec +2 % de base et 50 % de chance augmentée donne 7,5 % au total.`,
  },

  'ignore-mitigation': {
    title: 'Ignorer la mitigation',
    body: `Un tirage par action qui fait qu'un coup contourne toute la **Mitigation** des dégâts de la cible (résistances et toute autre réduction). Quand le tirage réussit, le coup inflige ses dégâts calculés complets quelles que soient les valeurs de résistance de l'ennemi.

Sources de chance d'ignorer la mitigation :
- Maîtrise d'Action — nœud majeur final de l'arbre Dégâts : +20 % de chance sur tout coup d'action
- Maîtrise du **Coup critique** — nœud 5 de l'arbre Dégâts : +20 % de chance sur les coups critiques
- Maîtrise du **Coup critique** — nœud 13 de l'arbre Chance : +10 % de chance pour les crits d'ignorer la mitigation

Les chances de plusieurs sources sont sommées en un seul tirage par coup. Un coup d'Ignorer la mitigation ne dépouille pas la résistance de l'ennemi — il saute la réduction pour ce seul coup uniquement.`,
  },

  frost: {
    title: 'Givre',
    body: `Une **Affliction** appliquée par les coups taggés froid. La chance d'application de base est de **5 %** par coup de froid, la durée de base de **1 seconde**. Tant qu'il est givré, l'ennemi voit sa vitesse de déplacement et sa vitesse d'action réduites chacune de **20 %** (base), augmentées par les nœuds de maîtrise Givre.

**Immunisé tant qu'actif :** contrairement aux autres **Afflictions**, le Givre ne se rafraîchit **pas**. Une fois un ennemi givré, les coups de froid suivants ne peuvent ni le ré-appliquer ni le prolonger jusqu'à ce que le Givre en cours expire.

**Arbre Dégâts de froid, nœud 11 — vulnérabilité au givre :** les ennemis givrés subissent +20 % de dégâts augmentés des sources **non-froid**. Le **Fracas**, étant des dégâts de froid, est exclu.

**Arbre Givre (complet) :**
- Chance d'application du Givre : +5 % chacun (nœuds 0, 3, 6, 9) et +15 % (nœud 8) — augmente la chance qu'un coup de froid givre la cible
- Ralentissement du Givre : +3 % chacun (nœuds 1, 4, 7, 10), plus +5 % (nœud 2) et +8 % (nœud 5) — ajouté au ralentissement de déplacement et d'action
- Durée du Givre : +10 % (nœud 2), +20 % (nœud 5) — prolonge la durée du Givre
- Nœud 5 (premier majeur) : +8 % de ralentissement par givre augmenté · +20 % de durée de givre augmentée
- Nœud 11 (second majeur) : **15 % d'effet de ralentissement du givre en plus** — un multiplicateur sur le ralentissement total

**Nœuds clés :**
- Nœud 12 : +5 % de ralentissement par givre augmenté · 10 % de durée de givre en moins
- Nœud 13 : 20 % de durée de givre en plus
- Nœud 14 : les ennemis givrés infligent **10 % de dégâts en moins**
- Nœud 15 : +5 % de ralentissement par givre augmenté

Le ralentissement augmenté est additif ; l'effet de ralentissement « en plus » (nœud 11) multiplie le total cumulé. Le ralentissement et la réduction des dégâts infligés s'appliquent multiplicativement aux côtés des autres modificateurs de vitesse et de dégâts.`,
  },

  shatter: {
    title: 'Fracas',
    body: `Une mécanique de la **maîtrise du Froid — Fracas**. Les ennemis tués alors qu'ils sont **givrés** ont une **chance de se fracasser** : une explosion de froid centrée sur l'ennemi fracassé, d'une portée de **3 unités** (rayon-joueur). Par défaut, elle inflige **5 % de la vie maximale de l'ennemi fracassé** en dégâts de froid dans cette zone.

Le Fracas n'est **pas une action** — il ne bénéficie **pas** des bonus de dégâts de froid ni de dégâts de **Zone**. Son seul facteur d'échelle est la vie maximale de l'ennemi fracassé et l'arbre Fracas lui-même. Les dégâts sont de type froid et sont réduits par la **Résistance** élémentaire de la cible. Le Fracas n'applique **pas** de **Givre** et n'accorde aucun déclenchement d'**Affliction** — mais il peut tuer, et un ennemi givré tué par un Fracas peut à son tour tenter de se fracasser, permettant des réactions en chaîne à travers un groupe givré.

**La chance de fracas est de 0 % par défaut** — elle est entièrement accordée par l'arbre Fracas.

**Arbre Fracas (court, 6 nœuds) :**
- Nœud 0 : les ennemis tués givrés ont +5 % de chance de se fracasser
- Nœud 1 : dégâts de Fracas augmentés de 2 % de la vie maximale de l'ennemi fracassé
- Nœud 2 (robuste) : +8 % de chance de se fracasser · +20 % de zone d'effet de Fracas augmentée
- Nœud 3 : les ennemis tués givrés ont +5 % de chance de se fracasser
- Nœud 4 : dégâts de Fracas augmentés de 2 % de la vie maximale de l'ennemi fracassé
- Nœud 5 (majeur) : +10 % de chance de se fracasser · dégâts de Fracas augmentés de 3 % de la vie maximale de l'ennemi fracassé

Avec l'arbre complet : +28 % de chance de se fracasser, et dégâts = **12 % de la vie maximale** (5 % de base + 2 % + 2 % + 3 %).`,
  },

  'frozen-armor': {
    title: 'Armure de glace',
    body: `Un **Statut** (buff) sur le joueur, accumulé en givrant les ennemis — toujours disponible dès que tu appliques du **Givre**. Chaque tranche de **100 givres** accorde **1 charge d'Armure de glace**, jusqu'à un maximum de **10 charges**. Les charges se dissipent une à une toutes les **2 secondes**. Le nombre de charges actuel est affiché dans la barre de buffs (icône de flocon).

En soi, l'Armure de glace ne fait **rien** — les charges s'accumulent et s'affichent mais n'accordent aucun bénéfice tant que tu n'investis pas dans l'arbre Armure de glace. Une fois au moins un nœud de réduction de dégâts pris, chaque charge réduit les dégâts subis par les **coups** (plafonné à **80 %** de réduction totale).

**Arbre Armure de glace (court, 6 nœuds) :**
- Nœuds 0 et 3 : l'Armure de glace nécessite 20 givres de moins par charge chacun (−40 au total → une charge tous les 60 givres)
- Nœuds 1 et 4 : 1 % de dégâts subis réduits par charge d'Armure de glace chacun (2 % par charge au total)
- Nœud 2 (robuste) : 30 % de chance de gagner 2 charges au lieu d'1 · 20 % de dissipation des charges plus lente
- Nœud 5 (majeur) : l'Armure de glace peut avoir 5 charges maximum de plus

La réduction de dégâts est appliquée après les résistances dans le pipeline de dégâts du joueur.`,
  },

  block: {
    title: 'Blocage',
    body: `Le **Blocage** est une mécanique défensive débloquée par la **première Transcendance** (vérification en continu — toute sauvegarde avec une Transcendance ou plus en dispose). Lorsque tu subis un **coup**, tu as **5 % de chance de base** de bloquer **20 %** des dégâts de ce coup. Après un blocage, le blocage **récupère pendant 1 seconde** avant de pouvoir se déclencher à nouveau (base : un blocage par seconde).

Règles :

- Le blocage ne s'applique qu'aux **coups** — les ticks d'affliction (brûlure, saignement, poison) ne peuvent jamais être bloqués.
- Un coup bloqué accorde toujours son **expérience de vie complète** — bloquer ne réduit jamais l'expérience de vie.
- Un coup bloqué peut toujours infliger des afflictions, et leurs dégâts sont basés sur les **dégâts totaux du coup avant blocage**. Le nœud majeur d'Efficacité de blocage peut supprimer entièrement les afflictions des coups bloqués.
- Les bonus de **vitesse de récupération de blocage** ajoutent des blocages entiers par seconde : +100 % = 2 blocages par seconde. La maîtrise de Blocage complète (8 nœuds de récupération) atteint **9 blocages par seconde**.

Bloquer accorde de l'expérience de **maîtrise de Blocage** basée sur la quantité de dégâts évités, avec les mêmes exigences et multiplicateurs que la maîtrise de Vie (le démarrage est lent — une faible chance de blocage signifie peu de dégâts évités au début).`,
  },
}
