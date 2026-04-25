export interface TranslationSchema {
  game: {
    title: string
    subtitle: string
  }
  menu: {
    continue: string
    newCharacter: string
    loadCharacter: string
    ladder: string
    options: string
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
  }
}

export const en: TranslationSchema = {
  game: {
    title: 'Path of Praxis',
    subtitle: 'Forge your path',
  },
  menu: {
    continue: 'Continue',
    newCharacter: 'New Character',
    loadCharacter: 'Load Character',
    ladder: 'Ladder',
    options: 'Options',
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
  },
}
