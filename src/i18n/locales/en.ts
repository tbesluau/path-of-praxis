export interface TranslationSchema {
  game: {
    title: string
    subtitle: string
    deathTitle: string
    deathRebirth: string
    actionSelectTitle: string
    weaponsTab: string
    spellsTab: string
  }
  menu: {
    continue: string
    newCharacter: string
    loadCharacter: string
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
  }
  guide: {
    title: string
    comingSoon: string
  }
}

export const en: TranslationSchema = {
  game: {
    title: 'Path of Praxis',
    subtitle: 'Forge your path',
    deathTitle: 'You have died',
    deathRebirth: 'Rebirth',
    actionSelectTitle: 'Actions',
    weaponsTab: 'Weapons',
    spellsTab: 'Spells',
  },
  menu: {
    continue: 'Continue',
    newCharacter: 'New Character',
    loadCharacter: 'Load Character',
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
  },
  guide: {
    title: 'Guide',
    comingSoon: 'Coming soon…',
  },
}
