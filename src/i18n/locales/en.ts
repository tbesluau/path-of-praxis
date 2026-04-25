export interface TranslationSchema {
  game: {
    title: string
    subtitle: string
    dummy: string
    die: string
  }
  menu: {
    play: string
    ladder: string
    options: string
    nav: string
  }
}

export const en: TranslationSchema = {
  game: {
    title: 'Path of Praxis',
    subtitle: 'Forge your path',
    dummy: 'TRAINING DUMMY',
    die: 'Die',
  },
  menu: {
    play: 'Play',
    ladder: 'Ladder',
    options: 'Options',
    nav: 'Main menu',
  },
}
