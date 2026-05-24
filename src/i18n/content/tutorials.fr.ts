// French translations for src/config/tutorials.md.
//
// Keys are the dot-notation tutorial step IDs (e.g. "first-game.0") that the
// English parser produces from each ## section heading. Missing entries fall
// back to the English text.
export const tutorialsFr: Record<string, string> = {
  'first-game.0':
    "Ceci est l'arène de combat. Ton personnage est la silhouette spectrale au centre, qui se déplace sur la carte — il cherche automatiquement les ennemis et les attaque.",

  'first-game.1':
    "Voici ta barre de vie. Quand elle se vide, tu meurs. Mais la mort n'est pas la fin…",

  'first-game.2':
    "Voici ta barre de mana. Certaines actions coûtent du mana ; il se régénère régulièrement de lui-même.",

  'first-game.3':
    "Chaque caractéristique a sa propre barre d'expérience et son niveau. Infliger et subir des dégâts ou dépenser du mana remplit ces barres — un niveau plus élevé signifie une vie et un mana plus puissants. Le plus haut niveau atteint donne aussi un bonus au gain d'expérience pour cette barre.",

  'first-game.4':
    "Appuie sur le bouton de configuration de combat pour choisir et changer ton action active.",

  'first-game.5':
    "Voici la configuration de combat. Le premier emplacement est ton auto-attaque — tu peux changer d'action à tout moment, choisis celle qui te convient. Plus tard, tu débloqueras d'autres emplacements de déclencheur te permettant d'utiliser plusieurs actions ensemble pour des synergies dévastatrices.",

  'first-death.0':
    "Tu es mort. L'expérience de maîtrise gagnée pendant cette vie est conservée à travers tes renaissances — après la renaissance tu pourras dépenser les points de maîtrise débloqués pour de gros gains de puissance.",

  'first-rebirth.0':
    "Ouvre le panneau des Maîtrises pour dépenser les points de maîtrise gagnés pendant cette partie.",

  'first-rebirth.1':
    "Les maîtrises sont des arbres passifs permanents qui persistent à travers chaque Renaissance. Ici tu peux aussi voir à quelle distance tu es d'un nouveau point ainsi que l'expérience et le nombre de points que tu obtiendrais si tu renaissais en cours de partie (utilise le bouton crâne en haut à gauche pour mourir). Clique sur une maîtrise pour ouvrir son arbre et dépenser des points sur des bonus permanents.",

  'first-boss.0':
    "Un boss est apparu. Les boss sont bien plus coriaces que les ennemis ordinaires — prépare-toi à un long combat. Tuer des boss peut débloquer du nouveau contenu.",

  'first-ascent.0':
    "Ta première Ascension est terminée ! Chaque action, maîtrise et caractéristique est réinitialisée. Appuie sur le bouton Ascension pour consulter ton Point Univers — un bonus permanent qui se reportera sur chaque future partie.",

  'second-trigger.0':
    "Tu as débloqué un second emplacement de déclencheur d'action ! Ouvre la configuration de combat pour le paramétrer.",

  'second-trigger.1':
    "Appuie sur ton nouvel emplacement pour choisir son mode de déclenchement — Temps, Coup critique ou Affliction. Il applique une pénalité globale de dégâts de ×0,75, mais une seconde action bien choisie compense largement.",

  'first-rune.0':
    "Tu as gagné un emplacement de rune ! Ouvre ta configuration de combat pour assigner des runes qui améliorent ton action.",

  'first-rune.1':
    "Appuie sur le bouton de rune à côté de ton action pour piocher des runes dans ton pool débloqué. Tu peux aussi pré-assigner des runes pour gagner du temps. Elles seront utilisées automatiquement quand elles seront débloquées, dans cette partie et plus tard.",

  'first-enemy-level.0':
    "Tu as débloqué un niveau d'ennemi supérieur ! Appuie sur le bouton de niveau d'ennemi pour ouvrir les contrôles.",

  'first-enemy-level.1':
    "Utilise les flèches pour choisir le niveau d'ennemi, ou active Auto pour qu'il monte automatiquement à mesure que tu débloques de nouveaux niveaux. Des niveaux plus élevés veulent dire des ennemis plus coriaces — et plus d'XP par combat.",

  'ascent-5.0':
    "Félicitations, tu as atteint le contenu de fin actuel. D'autres contenus sont en préparation en ce moment même. N'hésite pas à continuer avec ce personnage ou à expérimenter avec d'autres builds — merci d'avoir joué !",
}
