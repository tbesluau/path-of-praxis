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
  awayBonus: {
    title: string
    body: string      // contains "{away}" and "{earned}" placeholders
    close: string
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
  awayBonus: {
    title: 'Welcome back!',
    body: 'You were away for {away} and earned {earned} of ×2 speed time.',
    close: 'Close',
  },
}
