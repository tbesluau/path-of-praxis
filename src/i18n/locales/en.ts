export interface TranslationSchema {
  game: {
    title: string
    subtitle: string
    deathTitle: string
    deathRebirth: string
    actionSelectTitle: string
    triggersTitle: string
    triggerAutoAction: string
    actionPickerTitle: string
    legendDamageBase: string
    legendDamage: string
    legendSpeed: string
    legendRange: string
    legendArea: string
    targetingTitle: string
  }
  menu: {
    continue: string
    characters: string
    ladder: string
    nav: string
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
    zoomLabel: string
  }
  guide: {
    title: string
    comingSoon: string
  }
}

export const en: TranslationSchema = {
  game: {
    title: 'Path of Praxis',
    subtitle: 'Theorycraft your Incremental auto-battler',
    deathTitle: 'You have died',
    deathRebirth: 'Rebirth',
    actionSelectTitle: 'Actions',
    triggersTitle: 'Action Triggers',
    triggerAutoAction: 'Auto-action',
    actionPickerTitle: 'Choose action',
    legendDamageBase: 'Dmg base',
    legendDamage: 'Damage',
    legendSpeed: 'Speed',
    legendRange: 'Range',
    legendArea: 'Area',
    targetingTitle: 'Targeting',
  },
  menu: {
    continue: 'Continue',
    characters: 'Characters',
    ladder: 'Ladder',
    nav: 'Main menu',
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
    zoomLabel: 'Zoom',
  },
  guide: {
    title: 'Guide',
    comingSoon: 'Coming soon…',
  },
}
