// Chinese translations for src/config/notes.md.
//
// Keys are note IDs (slugified from the English ## heading — same algorithm as
// in src/ui/notes.ts parseNotes()). Each entry may provide `title` and/or
// `body`; missing fields fall back to English. Translations are filled in
// incrementally — untranslated notes simply show the English source.
import type { ContentBlock } from './index'

export const notesZh: Record<string, ContentBlock> = {
  block: {
    title: '格挡',
    body: `**格挡**是由**第一次超越**解锁的防御机制（实时判定——拥有一次或多次超越的存档都具备）。当你受到一次**击打**时，你有 **5% 的基础几率**格挡该次击打 **20%** 的伤害。触发格挡后，格挡需要**恢复 1 秒**才能再次触发（基础：每秒一次格挡）。

规则：

- 格挡只作用于**击打**——异常状态的持续伤害（燃烧、流血、中毒）永远无法被格挡。
- 被格挡的击打仍然提供**全额生命经验**——格挡绝不会减少生命经验。
- 被格挡的击打仍然可以施加异常状态，其伤害基于**格挡前的总击打伤害**。格挡效率的主要节点可以完全阻止被格挡的击打施加异常状态。
- **格挡恢复速度**加成按整数增加每秒格挡次数：+100% = 每秒 2 次格挡。完整的格挡精通（8 个恢复节点）可达**每秒 9 次格挡**。

格挡会根据所避免的伤害量提供**格挡精通**经验，其需求和倍率与生命精通相同（起步较慢——格挡几率低意味着初期避免的伤害很少）。`,
  },
}
