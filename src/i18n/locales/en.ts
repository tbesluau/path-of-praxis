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
    dieConfirmTitle: string
    dieConfirmBody: string
    dieConfirmYes: string
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
    triggerMana: string
    triggerManaDesc: string
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
    ctrlClickHint: string          // "Ctrl/Cmd + click a node to assign all affordable points"
    savePlan: string               // "Save plan"
    loadPlan: string               // "Load plan"
    assignAll: string              // "Assign all"
    slot: string                   // template: "Slot {n}"
    slotEmpty: string              // "(empty)"
    copyClipboard: string          // "Copy to clipboard"
    importCode: string             // "Import"
    planActive: string             // template: "{code}" — truncated active plan indicator
    planInvalid: string            // "Invalid build code"
    assignAllNone: string          // "No plan loaded"
    saveNoHistory: string          // shown when assignment order is unknown (legacy nodes)
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
    threshold6: string
    artifactsBtn: string
    upSlotA: string
    upSlotB: string
  }
  artifacts: {
    title: string
    countLabel: string       // template: "{n}/20 artifacts"
    equippedLabel: string    // template: "Equipped: {used}/{max}"
    full: string             // warning when at 20/20
    equip: string
    unequip: string
    bag: string
    drop: string
    deleteBtn: string
    deleteConfirmTitle: string
    deleteConfirmBody: string
    deleteConfirmBtn: string
    lockedHint: string
    sourceFire: string
    sourceLightning: string
    sourcePhysical: string
    posSourceMoreDamage: string      // template: "{v}% more {source} damage"
    posSourceActionSpeed: string     // template: "{v}% increased {source} action speed"
    posSourceAffliction: string      // template: "{v}% more {source} affliction effect"
    posGlobalActionSpeed: string     // template: "{v}% more action speed"
    posGlobalMoreDamage: string      // template: "{v}% more damage"
    posDoubleDamageChance: string    // template: "+{v}% double damage chance"
    posDoubleActionChance: string    // template: "+{v}% double action chance"
    posRangeAndArea: string          // template: "+{v}% range and area"
    negDamageTaken: string           // template: "{v}% more damage taken"
    negAllResistances: string        // template: "-{v}% all resistances"
    negLessMoveSpeed: string         // template: "-{v}% move speed"
    negLessActionSpeed: string       // template: "-{v}% action speed"
    negLessRangeAndArea: string      // template: "-{v}% range and area"
    weightLight: string              // 1-line artifact title
    weightMedium: string             // 2-line artifact title
    weightHeavy: string              // 3-line artifact title
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
    privacy: string
    privacyTitle: string
    eula: string
    eulaTitle: string
  }
  terms: {
    title: string
    intro: string
    privacyLabel: string            // template: "I have read and accept the {link}"
    eulaLabel: string               // template: "I have read and accept the {link}"
    privacyLink: string
    eulaLink: string
    privacyTitle: string
    eulaTitle: string
    continue: string
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
    langZh: string
    langRu: string
    close: string
    guide: string
    discord: string
    soundVolume: string
    soundMuted: string
    showDamageNumbers: string
    showDpsMeter: string
    fullMastery: string
    zoomLabel: string
    fullscreen: string
    confirmDeath: string
    resetTutorials: string
    saveData: string
    saveDataDesc: string
    exportSave: string
    exportCopied: string
    importLabel: string
    importPlaceholder: string
    importBtn: string
    importError: string
    importConfirmTitle: string
    importConfirmBody: string
    importConfirmBtn: string
    cancel: string
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
  masteryCategory: {
    action: string
    damageBase: string
    damageType: string
    lifeMana: string
    world: string
  }
  masteryLabel: {
    action: string
    criticalHit: string
    physical: string
    fire: string
    lightning: string
    area: string
    projectile: string
    strike: string
    life: string
    mana: string
    enemy: string
    movement: string
  }
  masteryTree: {
    action_0: string; action_1: string; action_2: string; action_3: string
    criticalHit_0: string; criticalHit_1: string
    physical_0: string; physical_1: string; physical_2: string; physical_3: string
    fire_0: string; fire_1: string; fire_2: string; fire_3: string
    lightning_0: string; lightning_1: string; lightning_2: string; lightning_3: string
    area_0: string; area_1: string; area_2: string; area_3: string
    projectile_0: string; projectile_1: string; projectile_2: string; projectile_3: string
    strike_0: string; strike_1: string; strike_2: string; strike_3: string
    life_0: string; life_1: string; life_2: string; life_3: string
    mana_0: string; mana_1: string; mana_2: string; mana_3: string
    enemy_0: string; enemy_1: string; enemy_2: string; enemy_3: string
    movement_0: string; movement_1: string; movement_2: string
  }
  masteryDump: {
    action: string; criticalHit: string; physical: string; fire: string
    lightning: string; area: string; projectile: string; strike: string
    life: string; mana: string; enemy: string; movement: string
  }
  runeLabel: {
    minorDmg: string; minorSpeed: string; minorMana: string; minorXp: string; minorAll: string
    majorDmg: string; majorSpeed: string; majorMana: string; majorXp: string; majorAll: string
    keySplit: string; keyHeavy: string; keyManaless: string
  }
  runeDesc: {
    minorDmg: string; minorSpeed: string; minorMana: string; minorXp: string; minorAll: string
    majorDmg: string; majorSpeed: string; majorMana: string; majorXp: string; majorAll: string
    keySplit: string; keyHeavy: string; keyManaless: string
  }
  actionLabel: {
    sword: string; bow: string; fireball: string; zap: string; 'fire-nova': string
    grenade: string; 'hammer-slam': string; 'lightning-nova': string; bolt: string
  }
  actionTag: {
    physical: string; fire: string; lightning: string; cold: string; rot: string
    strike: string; projectile: string; area: string
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
    dieConfirmTitle: 'Die and rebirth?',
    dieConfirmBody: 'Your current run will end and your masteries will be applied. Continue?',
    dieConfirmYes: 'Die and rebirth',
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
    triggerMana: 'Mana Trigger',
    triggerManaDesc: 'Triggers every 100 mana spent by your actions. Damage is speed-balanced.',
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
    ctrlClickHint: 'Tip: Ctrl/Cmd + click a node to assign all affordable points at once.',
    savePlan: 'Save plan',
    loadPlan: 'Load plan',
    assignAll: 'Assign all',
    slot: 'Slot {n}',
    slotEmpty: '(empty)',
    copyClipboard: 'Copy to clipboard',
    importCode: 'Import',
    planActive: '{code}',
    planInvalid: 'Invalid build code',
    assignAllNone: 'No plan loaded',
    saveNoHistory: 'The order your current nodes were assigned in was not recorded. Saving plans unlocks after your next Ascent.',
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
    threshold5: 'Artifacts — risk/reward modifiers',
    threshold6: '+1 action trigger slot',
    artifactsBtn: 'Artifacts',
    upSlotA: '10% increased multi-action speed',
    upSlotB: '+1% base action critical hit chance',
  },
  artifacts: {
    title: 'Artifacts',
    countLabel: '{n}/20 artifacts',
    equippedLabel: 'Equipped: {used}/{max}',
    full: 'Inventory full — drop an artifact to receive new ones from bosses',
    equip: 'Equip',
    unequip: 'Unequip',
    bag: 'Bag',
    drop: 'Drop',
    deleteBtn: 'Delete',
    deleteConfirmTitle: 'Delete artifact?',
    deleteConfirmBody: 'This artifact will be permanently lost.',
    deleteConfirmBtn: 'Delete',
    lockedHint: 'Equip slots full — unequip another artifact first',
    sourceFire: 'fire',
    sourceLightning: 'lightning',
    sourcePhysical: 'physical',
    posSourceMoreDamage: '{v}% more {source} damage',
    posSourceActionSpeed: '{v}% increased {source} action speed',
    posSourceAffliction: '{v}% more {source} affliction effect',
    posGlobalActionSpeed: '{v}% more action speed',
    posGlobalMoreDamage: '{v}% more damage',
    posDoubleDamageChance: '+{v}% double damage chance',
    posDoubleActionChance: '+{v}% double action chance',
    posRangeAndArea: '+{v}% range and area',
    negDamageTaken: '{v}% more damage taken',
    negAllResistances: '-{v}% all resistances',
    negLessMoveSpeed: '-{v}% move speed',
    negLessActionSpeed: '-{v}% action speed',
    negLessRangeAndArea: '-{v}% range and area',
    weightLight: 'Light Artifact',
    weightMedium: 'Medium Artifact',
    weightHeavy: 'Heavy Artifact',
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
    privacy: 'Privacy',
    privacyTitle: 'Privacy Policy',
    eula: 'EULA',
    eulaTitle: 'End User License Agreement',
  },
  terms: {
    title: 'Before you play',
    intro: 'Please review and accept both documents to continue.',
    privacyLabel: 'I have read and accept the {link}.',
    eulaLabel: 'I have read and accept the {link}.',
    privacyLink: 'Privacy Policy',
    eulaLink: 'End User License Agreement',
    privacyTitle: 'Privacy Policy',
    eulaTitle: 'End User License Agreement',
    continue: 'Continue',
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
    langZh: 'Simplified Chinese',
    langRu: 'Russian',
    close: 'Close',
    guide: 'Guide',
    discord: 'Discord',
    soundVolume: 'Sound volume',
    soundMuted: 'Mute sound',
    showDamageNumbers: 'Show damage numbers',
    showDpsMeter: 'DPS meter',
    fullMastery: 'Full mastery',
    zoomLabel: 'Zoom',
    fullscreen: 'Fullscreen',
    confirmDeath: 'Confirm before manual death',
    resetTutorials: 'Reset tutorials',
    saveData: 'Save data',
    saveDataDesc: 'Copy your save code to back it up or move it to another device, or paste a code below to restore. Importing replaces all current characters.',
    exportSave: 'Copy save code',
    exportCopied: 'Copied!',
    importLabel: 'Paste a save code',
    importPlaceholder: 'Paste your save code here…',
    importBtn: 'Import',
    importError: 'Invalid save code',
    importConfirmTitle: 'Replace all characters?',
    importConfirmBody: 'Importing will permanently replace ALL of your existing characters with the save data. This cannot be undone.',
    importConfirmBtn: 'Replace',
    cancel: 'Cancel',
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
  masteryCategory: {
    action: 'Action',
    damageBase: 'Damage Base',
    damageType: 'Damage Type',
    lifeMana: 'Life & Mana',
    world: 'World',
  },
  masteryLabel: {
    action: 'Action',
    criticalHit: 'Critical Hit',
    physical: 'Physical',
    fire: 'Fire',
    lightning: 'Lightning',
    area: 'Area',
    projectile: 'Projectile',
    strike: 'Strike',
    life: 'Life',
    mana: 'Mana',
    enemy: 'Enemy',
    movement: 'Movement',
  },
  masteryTree: {
    action_0: 'Action Damage', action_1: 'Action Speed', action_2: 'Trance', action_3: 'Mana Cost',
    criticalHit_0: 'Critical Damage', criticalHit_1: 'Critical Chance',
    physical_0: 'Physical Damage', physical_1: 'Bleed', physical_2: 'Resistance Breaking', physical_3: 'Bloodlust',
    fire_0: 'Fire Damage', fire_1: 'Burning', fire_2: 'Burning Ground', fire_3: 'Immolation',
    lightning_0: 'Lightning Damage', lightning_1: 'Electrocution', lightning_2: 'Jump', lightning_3: 'Electrifying',
    area_0: 'Area Damage', area_1: 'Area Size', area_2: 'Tremor', area_3: 'Knockback',
    projectile_0: 'Projectile Damage', projectile_1: 'Multiple Projectiles', projectile_2: 'Projectile Range', projectile_3: 'Knockback',
    strike_0: 'Strike Damage', strike_1: 'Frenzy', strike_2: 'Strike Range', strike_3: 'Additional Target',
    life_0: 'Maximum Life', life_1: 'Resistances', life_2: 'Life Regeneration', life_3: 'Life Steal',
    mana_0: 'Maximum Mana', mana_1: 'Mana Shield', mana_2: 'Mana Regeneration', mana_3: 'Mana Steal',
    enemy_0: 'Enemy Quantity', enemy_1: 'Enemy Quality', enemy_2: 'Champions and Bosses', enemy_3: 'Enemy Proliferation',
    movement_0: 'Movement Speed', movement_1: 'Dash', movement_2: 'Kite',
  },
  masteryDump: {
    action: 'action damage', criticalHit: 'critical hit damage', physical: 'physical damage',
    fire: 'fire damage', lightning: 'lightning damage', area: 'area action radius',
    projectile: 'projectile range', strike: 'strike action speed', life: 'maximum life',
    mana: 'maximum mana', enemy: 'enemies spawned', movement: 'movement speed',
  },
  runeLabel: {
    minorDmg: 'Damage', minorSpeed: 'Speed', minorMana: 'Mana', minorXp: 'Experience', minorAll: 'Sampler',
    majorDmg: 'Damage', majorSpeed: 'Speed', majorMana: 'Mana', majorXp: 'Experience', majorAll: 'Sampler',
    keySplit: 'Split Action', keyHeavy: 'Slow & Heavy', keyManaless: 'Manaless',
  },
  runeDesc: {
    minorDmg: '+15% increased action damage',
    minorSpeed: '+5% increased action speed',
    minorMana: '−10% action mana cost',
    minorXp: '+20% increased action experience',
    minorAll: '+3.75% damage / +1.25% speed / −2.5% mana cost / +5% experience',
    majorDmg: '10% more action damage',
    majorSpeed: '5% more action speed',
    majorMana: '20% less action mana cost',
    majorXp: '15% more action experience',
    majorAll: '2.5% more damage / 1.25% more speed / 5% less mana / 3.75% more experience',
    keySplit: '×0.5 damage — every action automatically fires a second action',
    keyHeavy: '×2 damage — ×0.5 action speed',
    keyManaless: '×2 mana cost — action fires even when mana is insufficient',
  },
  actionLabel: {
    sword: 'Sword Strike', bow: 'Sniping Arrow', fireball: 'Fireball', zap: 'Zap',
    'fire-nova': 'Fire Nova', grenade: 'Grenade', 'hammer-slam': 'Hammer Slam',
    'lightning-nova': 'Lightning Nova', bolt: 'Bolt',
  },
  actionTag: {
    physical: 'physical', fire: 'fire', lightning: 'lightning', cold: 'cold', rot: 'rot',
    strike: 'strike', projectile: 'projectile', area: 'area',
  },
}
