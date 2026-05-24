export interface TranslationSchema {
  game: {
    title: string
    subtitle: string
    deathTitle: string
    deathSubtitle: string
    deathRebirth: string
    actionSelectTitle: string
    triggersTitle: string
    triggerAutoAction: string
    actionPickerTitle: string
    legendDamage: string
    legendSpeed: string
    legendRange: string
    legendArea: string
    legendMana: string
    targetingTitle: string
    targetNearest: string
    targetWeakest: string
    targetStrongest: string
    targetRandom: string
    targetNearestDesc: string
    targetWeakestDesc: string
    targetStrongestDesc: string
    targetRandomDesc: string
    backToMenu: string
    dieRebirth: string
    battleConfig: string
    masteries: string
    ascentBtnLabel: string
    enemyLevelLabel: string
    pauseLabel: string
    playLabel: string
    x2SpeedRemaining: string
    enemyLevelDown: string
    enemyLevelUp: string
    autoAdvanceTitle: string
    autoLevelAriaLabel: string
    autoLevelText: string
    ascendBtn: string
    masteryGains: string
    actionTriggerTitle: string
    selectActionTrigger: string
    triggerTime: string
    triggerTimeDesc: string
    triggerCrit: string
    triggerCritDesc: string
    triggerCritLock: string
    triggerAffliction: string
    triggerAfflictionDesc: string
    triggerAfflictionLock: string
    dpsDoubleAction: string
    dpsBonusTarget: string
    dpsExtraProjectile: string
    dpsSplitCast: string
    dpsChainJump: string
    dpsTremor: string
    dpsAfflictionBurn: string
    dpsAfflictionBleed: string
    dpsAfflictionGroundFire: string
    selectAnAction: string
    critLabel: string
  }
  mastery: {
    title: string
    resetTitle: string             // template: "Reset {name}?"
    confirmCancel: string
    confirmReset: string
    resetDescLoseLevel: string
    resetDescNoLoseLevel: string
    nodeSmall: string
    nodeStrong: string
    nodeMajor: string
    nodeKey: string
    nodeAssigned: string
    nodeAssignPt: string           // template: "Assign ({cost} pt)"
    nodeAssignPts: string          // template: "Assign ({cost} pts)"
    nodeNeedPt: string             // template: "Need {cost} mastery point (have {available})"
    nodeNeedPts: string            // template: "Need {cost} mastery points (have {available})"
    nodeKeyChosen: string
    nodeNotImpl: string
    nodeNotAvail: string
    resetBtn: string               // "Reset (−1 level)"
    dumpBtn: string
    dumpTooltip: string
    dumpActivePt: string           // template: "Dump: {dumped} pt → +{bonus}% more {label}"
    dumpActivePts: string          // template: "Dump: {dumped} pts → +{bonus}% more {label}"
    dumpLabel: string              // template: "Dump points for +{rate}% more {label} per point"
    pointsPt: string               // template: "You have {total} / {earned} mastery point to assign{free}"
    pointsPts: string              // template: "You have {total} / {earned} mastery points to assign{free}"
    pointsFree: string             // template: " ({n} free)"
  }
  ascent: {
    title: string
    ascentCount: string            // template: "Ascent count: {n}"
    nextAscent: string             // template: "Next ascent: enemy level {n}"
    unlockedAt: string
    universePoints: string
    available: string              // template: "({n} available)"
    removePoint: string
    addPoint: string
    threshold1: string
    threshold2: string
    threshold3: string
    threshold4: string
    threshold5: string
    upSlotA: string
    upSlotB: string
  }
  rune: {
    addToSlot: string              // template: "Add {type} rune to slot {n}"
    clickToChange: string          // template: "{label} — click to change"
    addRune: string
    remove: string                 // template: "Remove \"{label}\""
    runesTitle: string             // template: "{action} Runes"
    runesAriaLabel: string
    slotMinor: string
    slotMajor: string
    slotKey: string
    levelHint: string              // template: "Action Lv. {level} — {unlocked}/6 slots unlocked — +{bonus}% XP"
    selectTitle: string            // template: "{type} Rune — Slot {n}"
  }
  menu: {
    continue: string
    characters: string
    about: string
    nav: string
  }
  about: {
    title: string
    body: string
    creditsTitle: string
    creditsAlpha: string
    creditsKenneyUi: string
    creditsKenneyDungeon: string
    creditsLucide: string
    creditsFonts: string
    creditsClaude: string
    releaseNotes: string
    releaseNotesTitle: string
    todo: string
    todoTitle: string
  }
  character: {
    newTitle: string
    loadTitle: string
    nameLabel: string
    namePlaceholder: string
    create: string
    cancel: string
    current: string
    emptySlot: string
    newSlot: string
    deleteLabel: string
    nameTaken: string
    infoTitle: string
    statMaxLife: string
    statMaxMana: string
  }
  settings: {
    title: string
    language: string
    languageTitle: string
    langEn: string
    langFr: string
    langEs: string
    close: string
    guide: string
    discord: string
    showDamageNumbers: string
    showDpsMeter: string
    fullMastery: string
    zoomLabel: string
    fullscreen: string
    resetTutorials: string
  }
  guide: {
    title: string
    comingSoon: string
  }
  tutorial: {
    dismiss:  string
    next:     string
    done:     string
    moreInfo: string
    dontShow: string
  }
  awayBonus: {
    title:   string
    body:    string      // contains "{away}" and "{earned}" placeholders
    close:   string
    watchAd: string      // doubles the earned ×2 time
  }
  refillAd: {
    title:   string
    body:    string
    watchAd: string
    skip:    string
    refill:  string      // short CTA shown on the ×2 button when empty
  }
}

export const en: TranslationSchema = {
  game: {
    title: 'Path of Praxis',
    subtitle: 'Theorycraft your Incremental auto-battler',
    deathTitle: 'You have died',
    deathSubtitle: 'You earned the following experience and mastery to make your next rebirth stronger:',
    deathRebirth: 'Rebirth',
    actionSelectTitle: 'Actions',
    triggersTitle: 'Action Triggers',
    triggerAutoAction: 'Auto attack',
    actionPickerTitle: 'Choose action',
    legendDamage: 'Damage',
    legendSpeed: 'Speed',
    legendRange: 'Range',
    legendArea: 'Area',
    legendMana: 'Mana',
    targetingTitle: 'Targeting priority',
    targetNearest: 'Nearest',
    targetWeakest: 'Weakest',
    targetStrongest: 'Strongest',
    targetRandom: 'Random',
    targetNearestDesc: 'Attack closest enemy',
    targetWeakestDesc: 'Focus low HP',
    targetStrongestDesc: 'Focus high HP',
    targetRandomDesc: 'Pick random target',
    backToMenu: 'Back to menu',
    dieRebirth: 'Die and rebirth',
    battleConfig: 'Battle configuration',
    masteries: 'Masteries',
    ascentBtnLabel: 'Ascent',
    enemyLevelLabel: 'Enemy level',
    pauseLabel: 'Pause',
    playLabel: 'Play',
    x2SpeedRemaining: '×2 speed time remaining',
    enemyLevelDown: 'Decrease enemy level',
    enemyLevelUp: 'Increase enemy level',
    autoAdvanceTitle: 'Auto-advance enemy level on unlock',
    autoLevelAriaLabel: 'Auto-level enemies',
    autoLevelText: 'Auto',
    ascendBtn: 'Ascend to a new universe',
    masteryGains: 'Mastery gains',
    actionTriggerTitle: 'Action Trigger',
    selectActionTrigger: 'Select action trigger',
    triggerTime: 'Time Trigger',
    triggerTimeDesc: 'Triggers every 2 seconds. Faster actions deal more damage, slower actions deal less.',
    triggerCrit: 'Critical Trigger',
    triggerCritDesc: 'Triggers when the auto-attack lands a critical strike. 10× weaker base damage, speed-balanced.',
    triggerCritLock: 'Kill a boss with a critical hit',
    triggerAffliction: 'Affliction Trigger',
    triggerAfflictionDesc: 'Triggers every 10 applied afflictions. Damage is speed-balanced.',
    triggerAfflictionLock: 'Kill a boss with affliction damage',
    dpsDoubleAction: 'Double action',
    dpsBonusTarget: 'Bonus target',
    dpsExtraProjectile: 'Extra projectile',
    dpsSplitCast: 'Split cast',
    dpsChainJump: 'Chain jump',
    dpsTremor: 'Tremor',
    dpsAfflictionBurn: 'Burn',
    dpsAfflictionBleed: 'Bleed',
    dpsAfflictionGroundFire: 'Ground fire',
    selectAnAction: 'Select an action',
    critLabel: 'Crit',
  },
  mastery: {
    title: 'Masteries',
    resetTitle: 'Reset {name}?',
    confirmCancel: 'Cancel',
    confirmReset: 'Reset',
    resetDescLoseLevel: 'All assigned nodes will be cleared and you will lose 1 level in this mastery. Dumped points are refunded.',
    resetDescNoLoseLevel: 'All assigned nodes will be cleared. Free and dumped mastery points will be returned.',
    nodeSmall: 'Small Node',
    nodeStrong: 'Strong Node',
    nodeMajor: 'Major Node',
    nodeKey: 'Key Node',
    nodeAssigned: 'Assigned',
    nodeAssignPt: 'Assign ({cost} pt)',
    nodeAssignPts: 'Assign ({cost} pts)',
    nodeNeedPt: 'Need {cost} mastery point (have {available})',
    nodeNeedPts: 'Need {cost} mastery points (have {available})',
    nodeKeyChosen: 'Another key node already chosen',
    nodeNotImpl: 'Not yet implemented',
    nodeNotAvail: 'Node not available',
    resetBtn: 'Reset (−1 level)',
    dumpBtn: 'Dump a point',
    dumpTooltip: 'Click: dump 1 point · Ctrl/Cmd-click: dump all',
    dumpActivePt: 'Dump: {dumped} pt → +{bonus}% more {label}',
    dumpActivePts: 'Dump: {dumped} pts → +{bonus}% more {label}',
    dumpLabel: 'Dump points for +{rate}% more {label} per point',
    pointsPt: 'You have {total} / {earned} mastery point to assign{free}',
    pointsPts: 'You have {total} / {earned} mastery points to assign{free}',
    pointsFree: ' ({n} free)',
  },
  ascent: {
    title: 'Ascent',
    ascentCount: 'Ascent count: {n}',
    nextAscent: 'Next ascent: enemy level {n}',
    unlockedAt: 'Unlocked at',
    universePoints: 'Universe points',
    available: '({n} available)',
    removePoint: 'Remove point',
    addPoint: 'Add point',
    threshold1: 'Critical hit and its mastery',
    threshold2: 'Champions and Bosses tree in the enemy mastery',
    threshold3: '+1 action trigger slot',
    threshold4: '+1 free mastery point per ascent for each mastery',
    threshold5: '+1 action trigger slot',
    upSlotA: '10% increased multi-action speed',
    upSlotB: '+1% base action critical hit chance',
  },
  rune: {
    addToSlot: 'Add {type} rune to slot {n}',
    clickToChange: '{label} — click to change',
    addRune: '+ Add rune',
    remove: 'Remove "{label}"',
    runesTitle: '{action} Runes',
    runesAriaLabel: 'Runes',
    slotMinor: 'Minor',
    slotMajor: 'Major',
    slotKey: 'Key',
    levelHint: 'Action Lv. {level} — {unlocked}/6 slots unlocked — +{bonus}% XP',
    selectTitle: '{type} Rune — Slot {n}',
  },
  menu: {
    continue: 'Continue',
    characters: 'Characters',
    about: 'About',
    nav: 'Main menu',
  },
  about: {
    title: 'About Path of Praxis',
    body: 'An incremental auto-battler by Aractis, inspired by action RPGs, multi-layered prestige incremental games, and usage-based reward systems. This early-stage (beta) game aims to deliver a rich theorycrafting experience with the mechanics of a semi-idle game. Please provide any report, feedback, or request in the Discord linked in the options. Make sure to check out the TODO below!',
    creditsTitle: 'Credits',
    creditsAlpha: 'Thank you N4pkin for the motivation and alpha testing.',
    creditsKenneyUi: 'UI panels and buttons: **Kenney RPG UI Pack Extension** (CC0).',
    creditsKenneyDungeon: 'Map tiles and obstacles: **Kenney Tiny Dungeon** (CC0).',
    creditsLucide: 'Icons: **Lucide** (ISC license).',
    creditsFonts: 'Typefaces: **Cinzel** and **Crimson Pro** via Google Fonts (SIL OFL).',
    creditsClaude: 'Vibe coded with **Claude** (Anthropic).',
    releaseNotes: 'Release notes',
    releaseNotesTitle: 'Release notes',
    todo: 'TODO',
    todoTitle: 'TODO',
  },
  character: {
    newTitle: 'New Character',
    loadTitle: 'Load Character',
    nameLabel: 'Name',
    namePlaceholder: 'Enter a name…',
    create: 'Create',
    cancel: 'Cancel',
    current: 'Current',
    emptySlot: '— Empty —',
    newSlot: 'New',
    deleteLabel: 'Delete',
    nameTaken: 'That name is already taken.',
    infoTitle: 'Character',
    statMaxLife: 'Max Life',
    statMaxMana: 'Max Mana',
  },
  settings: {
    title: 'Settings',
    language: 'Language',
    languageTitle: 'Language',
    langEn: 'English',
    langFr: 'French',
    langEs: 'Spanish',
    close: 'Close',
    guide: 'Guide',
    discord: 'Discord',
    showDamageNumbers: 'Show damage numbers',
    showDpsMeter: 'DPS meter',
    fullMastery: 'Full mastery',
    zoomLabel: 'Zoom',
    fullscreen: 'Fullscreen',
    resetTutorials: 'Reset tutorials',
  },
  guide: {
    title: 'Guide',
    comingSoon: 'Coming soon…',
  },
  tutorial: {
    dismiss:  'Dismiss',
    next:     'Next',
    done:     'Done',
    moreInfo: 'More info →',
    dontShow: "Don't show tutorials",
  },
  awayBonus: {
    title:   'Welcome back!',
    body:    'You were away for {away} and earned {earned} of ×2 speed time.',
    close:   'Close',
    watchAd: 'Watch ad — double reward',
  },
  refillAd: {
    title:   'Stockpile empty',
    body:    'Your ×2 speed stockpile just ran out. Watch a short ad to bank 30 minutes.',
    watchAd: 'Watch ad — earn 30 min',
    skip:    'No thanks',
    refill:  'refill',
  },
}
