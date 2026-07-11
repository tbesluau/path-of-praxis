import type { MasteryId } from './masteries'
import { nodeType } from './masteries'
import { t, getLocale } from '../i18n'
import type { TranslationSchema } from '../i18n/locales/en'
import { getNodeDescTranslation } from '../i18n/content'

// ── Point-dump table ───────────────────────────────────────────────────────
// "1% more <X> per dumped point" / "0.5% more <X> per dumped point". Applied
// by the compute*Bonuses fns by adding (rate × dumpedPoints) to the relevant
// existing 'more' field. The label is shown in the dump UI.
export interface MasteryDumpInfo {
  rate: number       // percentage points per dumped point
  label: string      // suffix after "+N% more ", used as `+{rate*pts}% more {label}`
}
export const MASTERY_DUMP: Record<MasteryId, MasteryDumpInfo> = {
  action:      { rate: 1,   label: 'action damage' },
  criticalHit: { rate: 1,   label: 'critical hit damage' },
  physical:    { rate: 1,   label: 'physical damage' },
  fire:        { rate: 1,   label: 'fire damage' },
  lightning:   { rate: 1,   label: 'lightning damage' },
  cold:        { rate: 1,   label: 'cold damage' },
  rot:         { rate: 1,   label: 'rot damage' },
  area:        { rate: 1,   label: 'area action radius' },
  projectile:  { rate: 1,   label: 'projectile range' },
  strike:      { rate: 0.5, label: 'strike action speed' },
  life:        { rate: 0.5, label: 'maximum life' },
  mana:        { rate: 0.5, label: 'maximum mana' },
  block:       { rate: 0.5, label: 'block chance' },
  enemy:       { rate: 1,   label: 'enemies spawned' },
  movement:    { rate: 0.5, label: 'movement speed' },
}

// ── Node effect types ──────────────────────────────────────────────────────

export interface NodeEffect {
  actionDamageIncrease?: number      // additive %; stacks before the 'more' multiplier
  actionDoubleDamageChance?: number  // additive %; chance to deal 2× damage on cast
  actionSpeedIncrease?: number       // additive %; stacks before the 'more' multiplier
  actionMoreDamage?: number          // 'more' %; applied as × (1 + sum/100) after increased
  actionMoreSpeed?: number           // 'more' %; applied as × (1 + sum/100) after increased
  actionDoubleActionChance?: number  // additive %; chance for a second action at 1/5 interval
  actionLessSpeed?: number           // additive %; reduces action speed × (1 - sum/100)
  actionLessDamage?: number          // additive %; reduces action damage × (1 - sum/100)
  actionMoreManaCost?: number        // additive %; increases action mana cost × (1 + sum/100)
  actionDoubleActionReroll?: boolean // when true, primary cast rolls once more for double action
  actionConvertDoubleToDoubleDamage?: boolean // when true, doubleActionChance is converted to doubleDamageChance and never rolls

  // Trance effects (tree 2)
  actionTranceTriggerChance?: number      // additive %; chance per action to trigger trance buff
  actionTranceMultiTargetChance?: number  // additive %; chance to hit an extra enemy when in trance
  actionTranceDamageIncrease?: number     // additive %; damage bonus on actions while in trance
  actionTranceSpeedIncrease?: number      // additive %; action speed bonus on actions while in trance

  // Mana cost effects (tree 3)
  actionManaCostReduction?: number          // additive %; reduces effective mana cost
  actionNoManaCostChance?: number           // additive %; chance for action to cost 0 mana (gate still applies)
  actionManaCostRandomReductionMax?: number // additive % cap; per-action random reduction in [0, cap]
  actionRepeatNoMana?: boolean              // when true, repeated actions (e.g. double action) skip the mana gate
  actionLessManaCost?: number               // additive %; reduces action mana cost × (1 - sum/100), separate multiplier from manaCostReduction
  actionInvertManaCostReductions?: boolean  // Mana-tree key 12: reductions become increases, no-mana chance becomes double-mana chance
  actionGuaranteedAfflictions?: boolean     // when true, second-action hits always apply afflictions
  actionTranceCanStack?: boolean            // Trance-tree key 12: trance can stack to 2; duration halved

  // Life mastery effects (Maximum Life tree)
  lifeMaxIncrease?: number          // additive %; stacks before the 'more' multiplier
  lifeMoreMax?: number              // 'more' %; applied as × (1 + sum/100) after increased
  lifePhysRotResistance?: number    // additive %; reduces damage from physical- and rot-tagged hits (combined)
  lifeElementalResistance?: number  // additive %; reduces damage from fire/lightning/cold hits
  lifeResistAbsorbLifePercent?: number    // % of damage absorbed by resistances that is recovered as life
  lifeResistReductionEffectiveness?: number // future: resistance reduction effects on player lose X% effectiveness

  // Life mastery effects (Life Regeneration tree)
  lifeRegenIncrease?: number       // additive %; mastery layer — independent of level-scaling layer
  lifeRegenFractionBonus?: number  // additional fraction of max life regenerated per second

  // Life mastery effects (Life Steal tree)
  lifeStealPercent?: number          // additive %; fraction of action hit damage stolen as life
  lifeStealIncrease?: number         // additive %; increases life stolen
  lifeStealCapIncrease?: number      // additive %; increases the per-hit hard cap (base 1% of max life)
  lifeFeedingFrenzyChance?: number   // additive %; chance per life-steal instance to trigger Feeding Frenzy

  // Block mastery effects (unlocked by the first Transcendence)
  blockChanceIncrease?: number       // additive %; increased chance to block hits (base 5% × (1 + sum/100))
  blockAmountIncrease?: number       // additive %; increased amount of damage blocked (base 20% × (1 + sum/100))
  blockRecoveryIncrease?: number     // additive %; increased block recovery speed (blocks/sec × (1 + sum/100))
  blockNoAfflictions?: boolean       // blocked hits cannot trigger afflictions on you
  blockHealPct?: number              // blocked hits heal you for this % of the damage blocked

  // Life mastery key node effects
  lifeRegenAlsoAppliesToMax?: boolean  // Max Life key 12: increased/more regen bonuses also boost max life
  lifeCannotSteal?: boolean            // Max Life key 12, Resistances key 15: disables life steal
  lifeMaxPerLifeLevel?: boolean        // Max Life key 14: +1% increased max life per life stat level
  lifeLessMax?: number                 // additive %; × (1 - sum/100) on max life
  lifeRegenDouble?: boolean            // Regen keys 12, 13: regen output doubled
  lifeLessStealCap?: number            // additive %; × (1 - sum/100) on per-hit life steal cap
  lifeStealCapMore?: number            // additive %; × (1 + sum/100) on per-hit life steal cap
  lifeCannotRegen?: boolean            // Steal key 12: disables life regen
  lifeStealMore?: number               // additive %; × (1 + sum/100) on life stolen amount
  lifeStealFromAfflictions?: boolean   // Steal key 13: affliction tick damage from player actions also feeds life steal
  lifeLessActionDamage?: number        // additive %; × (1 - sum/100) on player action damage from Life trees

  // Mana mastery effects
  manaMaxIncrease?: number      // additive %; increases maximum mana before 'more' multiplier
  manaMoreMax?: number          // 'more' %; applied as × (1 + sum/100) after increased
  manaRegenIncrease?: number    // additive %; increases mana regen rate
  manaReplenishChance?: number  // additive %; chance for a spell cast to add mana instead of spending it

  // Mana mastery effects (Mana Steal tree)
  manaStealPercent?: number          // additive %; fraction of action hit damage stolen as mana
  manaStealIncrease?: number         // additive %; increases mana stolen
  manaStealCapIncrease?: number      // additive %; increases the per-hit hard cap (base 1% of max mana)
  manaFeedingFrenzyChance?: number   // additive %; chance per mana-steal instance to trigger Feeding Frenzy

  // Fire mastery effects (Burning tree)
  fireBurnApplyChance?: number          // additive %; added to base apply chance for fire-tagged hits
  fireBurnDamageIncrease?: number       // additive %; stacks before the 'more' multiplier
  fireBurnDurationIncrease?: number     // additive %; extends burn duration
  fireBurnMoreDamage?: number           // 'more' %; multiplies burn dps after increased
  fireBurningTakeIncreased?: number     // additive %; burning enemies take more damage from all sources
  fireBurnSplashFraction?: number       // additive %; non-burning neighbors take this share of burn dps
  fireBurnEnemyResistReduction?: number // flat %; burning enemies have their fire resistance reduced (capped at 0)

  // Burning tree key node effects (12–15)
  fireBurnDurationMult?: number         // multiplicative duration; product of all such mult fields
  fireBurnLessDamage?: number           // additive %; × (1 - sum/100) on burn dps
  fireBurnDamageMult?: number           // multiplicative; product of all such mult fields (e.g. 2 for "double burn damage")
  fireSuppressHitDamage?: boolean       // fire-tagged player hits deal no direct damage; afflictions still apply

  // Fire mastery effects (Burning Ground tree)
  fireBurnGroundChance?: number             // additive %; chance for fire actions to cause burning ground on hit tile
  fireBurnGroundDamageIncrease?: number     // additive %; stacks before the 'more' multiplier
  fireBurnGroundDurationIncrease?: number   // additive %; extends burning ground duration
  fireBurnGroundMoreDamage?: number         // additive %; final multiplier as × (1 + sum/100)
  fireBurnGroundSlowAmount?: number         // additive %; movement and action speed slow for enemies standing on burning ground

  // Fire mastery effects (Immolation tree)
  fireImmolateChance?: number          // additive %; chance to trigger immolation on fire-tagged hit
  fireImmolateDamageBonus?: number     // additive %; fire action damage bonus while immolation is active
  fireImmolateBurnChance?: number      // additive %; burn apply chance bonus while immolation is active
  fireImmolateDamageMult?: number      // multiplicative; each node multiplies self-burn dps (e.g. 0.5 = halved)

  // Enemy mastery effects
  enemyExtraOneChance?: number         // additive percentage points to base "+1 enemy" wave roll
  enemyExtraTwoChance?: number         // additive percentage points to base "+2 enemies" wave roll
  enemyGuaranteedExtra?: number        // additive flat extra enemies per wave
  enemyStrongChance?: number           // additive percentage points to per-enemy "strong" roll
  enemyEliteChance?: number            // additive percentage points to "strong → elite" upgrade roll
  enemyMinStrongCount?: number         // additive flat: at least this many enemies in a wave are strong-or-better
  enemyMinEliteCount?: number          // additive flat: at least this many enemies in a wave are elite
  enemyEliteToChampionChance?: number  // additive percentage points to "elite → champion" upgrade roll
  enemyChampionToBossChance?: number   // additive percentage points to "champion → boss" upgrade roll
  enemyProliferateChance?: number      // additive percentage points; per-kill chance to spawn an additional enemy next wave
  enemyMoreSpawned?: number            // additive 'more' percentage points; multiplies total wave count (normal + tree additional)

  // Lightning mastery effects (Electrocution tree)
  lightningElectrocuteApplyChance?: number          // additive %; bonus chance to electrocute on lightning hits
  lightningElectrocuteDamageTakenIncrease?: number  // additive %; increases damage taken by electrocuted enemies
  lightningElectrocuteDurationIncrease?: number     // additive %; extends electrocution duration
  lightningElectrocuteSlowOnDamageTaken?: boolean   // when true, speed reduced by damageTaken value
  lightningElectrocuteDurationMult?: number         // multiplicative; product of all such mult fields (e.g. 0.9 for "10% less duration")

  // Lightning mastery effects (Jump tree)
  lightningJumpChance?: number              // additive %; chance to jump to another enemy
  lightningJumpDamagePenaltyReduce?: number // additive %; reduces jump damage penalty
  lightningJumpRangeIncrease?: number       // additive %; increases jump range (from hit target)
  lightningJumpFromElectrocutedChance?: number // additive %; bonus jump chance when the hit target is electrocuted
  lightningJumpReroll?: boolean             // when true, successful jumps re-roll for another jump

  // Projectile mastery effects
  projRangeIncrease?: number      // additive %; increases range for projectile-tagged actions
  projDamageIncrease?: number     // additive %; increases damage for projectile-tagged actions
  projMoreDamage?: number         // 'more' %; applied as × (1 + sum/100) after increased
  projActionSpeedIncrease?: number // additive %; increases action speed for projectile-tagged actions
  projAdditionalTargetChance?: number // additive %; chance to hit an additional enemy per projectile cast
  projDoubleDamageChance?: number // additive %; chance to deal 2× damage on projectile hit
  projDamagePerRange?: number     // % per range unit; increased projectile damage per 1 unit of total range
  projExtraChance?: number        // additive %; chance to fire an extra projectile at reduced damage
  projExtraDamage?: number        // additive %; increases the damage of extra projectiles (base 50%)
  projExtraDoubleRoll?: boolean   // when extra projectile fires, roll once more for a second extra

  // Strike mastery effects (Strike Damage tree)
  strikeDamageIncrease?: number        // additive %; stacks before the 'more' multiplier
  strikeDoubleDamageChance?: number    // additive %; chance to deal 2× damage on strike
  strikeMoreDamage?: number            // 'more' %; applied as × (1 + sum/100) after increased
  strikeActionSpeedIncrease?: number   // additive %; stacks before the 'more' multiplier
  strikeAfflictionChanceIncrease?: number // additive %; bonus chance to apply afflictions on strike hits

  // Strike mastery effects (Frenzy tree)
  strikeFrenzyChance?: number              // additive %; chance per strike hit to add a Frenzy charge
  frenzyDamagePerCharge?: number           // additive %; increased damage per Frenzy charge
  frenzySpeedPerCharge?: number            // additive %; increased action speed per Frenzy charge
  frenzyFlatDamage?: number                // additive %; flat increased damage while Frenzy is active
  frenzyFlatSpeed?: number                 // additive %; flat increased action speed while Frenzy is active
  frenzyAfflictionChancePerCharge?: number // additive %; bonus affliction chance per Frenzy charge
  frenzyDurationIncrease?: number          // additive %; extends Frenzy duration
  frenzyMaxChargesBonus?: number           // flat: additional maximum Frenzy charges

  // Strike mastery effects (Strike Range tree)
  strikeRangeIncrease?: number       // additive %; increases strike action range
  strikeMoreRange?: number           // 'more' %; multiplies strike range after increased
  strikeMoreActionSpeed?: number     // 'more' %; multiplies strike action speed after increased

  // Strike mastery effects (Additional Target tree)
  strikeAdditionalTargetChance?: number  // additive %; chance for strike to target an additional enemy
  strikeAdditionalTargetMore?: number    // 'more' %; multiplies the total chance after increased

  // Lightning mastery effects (Lightning Damage tree)
  lightningDamageIncrease?: number       // additive %; for lightning-tagged actions
  lightningMoreDamage?: number           // 'more' %; for lightning-tagged actions
  lightningActionSpeedIncrease?: number  // additive %; for lightning-tagged actions
  lightningMoreActionSpeed?: number      // 'more' %; multiplies lightning action speed after increased

  // Fire mastery effects (Fire Damage tree)
  fireDamageIncrease?: number       // additive %; for fire-tagged actions
  fireMoreDamage?: number           // 'more' %; for fire-tagged actions
  fireActionSpeedIncrease?: number  // additive %; for fire-tagged actions

  // Physical mastery effects (Physical Damage tree)
  physicalDamageIncrease?: number       // additive %; for physical-tagged actions
  physicalMoreDamage?: number           // 'more' %; for physical-tagged actions
  physicalActionSpeedIncrease?: number  // additive %; for physical-tagged actions
  physicalBleedApplyChance?: number     // additive %; chance to apply bleed on physical hits

  // Physical mastery effects (Bleed tree)
  physicalBleedDamageIncrease?: number  // additive %; stacks before the 'more' multiplier
  physicalBleedDurationIncrease?: number // additive %; extends bleed duration
  physicalBleedMoreDamage?: number      // 'more' %; multiplies bleed dps after increased
  physicalBleedIgnoreResistance?: boolean // when true, bleeding ignores enemy physical resistance (no-op for now)

  // Bleed tree key node effects (12–15)
  physicalBleedDurationMult?: number    // multiplicative duration; product of all such mult fields
  physicalBleedLessDamage?: number      // additive %; × (1 - sum/100) on bleed dps
  physicalBleedDamageMult?: number      // multiplicative; product of all such mult fields (e.g. 2 for "double bleed damage")
  physicalSuppressHitDamage?: boolean   // physical-tagged player hits deal no direct damage; afflictions still apply
  physicalBleedingTakeMore?: number     // 'more' %; multiplier on physical damage to bleeding enemies

  // Physical mastery effects (Resistance Breaking tree)
  physicalResistBreakChance?: number    // additive %; chance per physical hit to permanently reduce enemy physRot resistance by 1%
  physicalResistBreakSlowAtZero?: number // additive %; slow applied to enemies at 0% physRot resistance (movement and action speed)

  // Physical mastery effects (Bloodlust tree)
  physicalBloodlustChance?: number          // additive %; chance to trigger bloodlust on each successful bleed application
  physicalBloodlustActionSpeed?: number     // additive %; physical action speed bonus while bloodlust is active
  physicalBloodlustDamage?: number          // additive %; physical damage bonus while bloodlust is active
  physicalBloodlustBleedChance?: number     // additive %; bonus bleed apply chance for physical actions while bloodlust is active
  physicalBloodlustDurationIncrease?: number // additive %; extends bloodlust duration

  // Lightning mastery effects (Electrifying tree)
  lightningElectrifyChance?: number          // additive %; chance per player lightning hit to apply electrified to the player
  lightningElectrifyActionSpeed?: number     // additive %; global action speed bonus while electrified
  lightningElectrifyDurationIncrease?: number // additive %; extends electrified duration
  lightningElectrifyDamageReduction?: number  // additive %; less damage taken from all sources while electrified

  // Area mastery effects
  areaDamageIncrease?: number        // additive %; stacks before the 'more' multiplier
  areaMoreDamage?: number            // 'more' %; applied as × (1 + sum/100) after increased
  areaDoubleDamageChance?: number    // additive %; chance for area hit to deal 2× damage
  areaSizeIncrease?: number          // additive %; increases area radius
  areaMoreSize?: number              // 'more' %; multiplies area radius after increased
  areaLessActionSpeed?: number       // additive %; reduces area action speed (× (1 - sum/100))
  areaTremorChance?: number          // additive %; chance per non-primary area victim to queue a tremor
  areaTremorDamage?: number          // additive %; tremor damage bonus on top of the 0.5× base
  areaTremorSize?: number            // additive %; tremor area radius bonus on top of the 0.5× base

  // Area mastery effects (Knockback tree)
  areaKnockbackChance?: number          // additive %; chance to knock back on area hit
  areaKnockbackMoveSlowAmount?: number  // additive %; enemy move speed reduction for 2s after knockback
  areaKnockbackMoreRange?: number       // 'more' %; multiplies base knockback range (base 1 player-radius)
  areaKnockbackDamageReduction?: number // additive %; knocked-back enemies deal less damage for 2s

  // Projectile mastery effects (Knockback tree)
  projKnockbackChance?: number          // additive %; chance to knock back on projectile hit
  projKnockbackMoveSlowAmount?: number  // additive %; enemy move speed reduction for 2s after knockback
  projKnockbackMoreRange?: number       // 'more' %; multiplies base knockback range (base 0.5 player-radius)
  projKnockbackDamageReduction?: number // additive %; knocked-back enemies deal less damage for 2s

  // Mana mastery effects (Maximum Mana tree second half)
  manaActionSpeedIncrease?: number   // additive %; global action speed bonus from mana mastery

  // Mana mastery effects (Maximum Mana node 11)
  manaMoreLife?: number              // 'more' %; increases maximum life

  // Mana mastery effects (Mana Shield tree)
  manaShieldAbsorbIncrease?: number      // additive %; fraction of hit damage absorbed by the mana shield
  manaShieldDamageTakenReduce?: number   // additive %; reduces the 200% base mana cost on absorbed damage
  manaShieldAllSources?: boolean         // when true, shield intercepts DoT sources too (node 5)
  manaShieldResistancesApply?: boolean   // when true, player resistances reduce the mana cost (node 11)

  // Movement mastery effects (Movement Speed tree)
  moveSpeedIncrease?: number              // additive %; stacks before the 'more' multiplier
  moveMoreSpeed?: number                  // 'more' %; applied as × (1 + sum/100) after increased
  moveDebuffEfficiencyReduce?: number     // additive %; movement debuffs on player have reduced efficiency (data only; no active player debuffs yet)

  // Movement mastery effects (Dash tree)
  dashChargeChance?: number               // additive percentage-point chance per second to gain a dash charge
  dashDistanceIncrease?: number           // additive %; increases dash distance (1s-equivalent distance at 0%)

  // Movement mastery effects (Kite tree)
  kiteSpeedFraction?: number              // additive fraction of effective moveSpeed used to kite (0.25 per small node)
  kiteResistance?: number                 // flat all-resistance bonus while kiting
  kiteAllowDash?: true                    // when true, dash can be used to kite (move away from enemies)

  // Movement mastery key node effects
  moveFirstActionMoreDamage?: number      // % more damage on the first action after moving
  moveStationaryMoreDamagePerAction?: number // % more damage per consecutive action without moving (up to 10 stacks)
  moveImmuneToSlowing?: boolean           // immune to movement speed reduction effects
  dashExtraCharge?: boolean               // +1 maximum Dash charge
  dashLessDistance?: number              // additive %; less dash distance (penalty for extra charge)
  dashCloseGapToTarget?: boolean          // Dash closes gap to target regardless of action range
  kiteFullRange?: true                    // Kite key A: kite whenever the target is in range, back to 90% of range
  kiteMoreActionSpeed?: number            // additive %; action speed bonus while kiting

  // Action mastery — ignore enemy damage mitigation (tree 0 final major)
  actionIgnoreMitigationChance?: number   // additive %; chance for any action hit to ignore enemy resistance

  // Rot mastery effects (Rot Damage tree)
  rotDamageIncrease?: number         // additive %; for rot-tagged actions
  rotMoreDamage?: number             // 'more' %; for rot-tagged actions
  rotActionSpeedIncrease?: number    // additive %; for rot-tagged actions
  rotPoisonApplyChance?: number      // additive %; bonus chance to apply poison on rot hits
  rotPoisonedTakeMore?: number       // 'more' %; rot damage multiplier vs poisoned enemies
  // Rot mastery effects (Poison tree)
  rotPoisonDamageIncrease?: number   // additive %; stacks before 'more' multiplier
  rotPoisonDurationIncrease?: number // additive %; extends poison duration
  rotPoisonMoreDamage?: number       // 'more' %; multiplies poison dps after increased
  rotPoisonDurationMult?: number     // multiplicative duration; product of all such mult fields
  rotPoisonLessDamage?: number       // additive %; × (1 - sum/100) on poison dps
  rotPoisonDamageMult?: number       // multiplicative; product of all such mult fields
  rotSuppressHitDamage?: boolean     // rot-tagged player hits deal no direct damage; afflictions still apply
  // Rot mastery effects (Weakening tree)
  rotWeakeningRotDamageTaken?: number   // 'more' %; rot damage multiplier vs poisoned enemies (Weakening tree contribution)
  rotWeakeningDealLess?: number         // additive %; poisoned enemies deal less damage
  rotWeakeningSpeedReduction?: number   // additive %; poisoned enemy move+action speed reduction
  rotWeakeningResistPerStack?: number   // flat %; physRotResist reduction per poison stack on enemy
  // Rot mastery effects (Green Veins tree)
  rotGreenVeinsChanceOnPoison?: number  // additive %; bonus chance to gain extra Green Vein stack on trigger
  rotGreenVeinsDamagePerStack?: number  // additive %; rot damage increase per Green Vein stack
  rotGreenVeinsDurationIncrease?: number // additive %; extends Green Veins buff duration
  rotGreenVeinsTriggerReduction?: number // additive %; reduces poison-application trigger threshold
  rotGreenVeinsMaxStacksBonus?: number   // flat additional maximum Green Vein stacks

  // Cold mastery effects (Cold Damage tree)
  coldDamageIncrease?: number        // additive %; for cold-tagged actions
  coldMoreDamage?: number            // 'more' %; for cold-tagged actions
  coldActionSpeedIncrease?: number   // additive %; for cold-tagged actions
  coldFrostApplyChance?: number      // additive %; bonus frost apply chance
  coldFrostedVulnerable?: number     // additive %; non-cold damage dealt to frosted enemies

  // Cold mastery effects (Frost tree)
  coldFrostSlowIncrease?: number     // additive %; bonus to both move+action slow amount
  coldFrostSlowMore?: number         // 'more' %; multiplies the total frost slow amount
  coldFrostDurationIncrease?: number // additive %; extends frost duration
  coldFrostDurationMult?: number     // multiplicative duration; product of all such mult fields
  coldFrostedDealLess?: number       // additive %; frosted enemies deal less damage

  // Cold mastery effects (Shatter tree)
  coldShatterChance?: number         // additive %; chance for a frosted enemy to shatter on death
  coldShatterDamagePctLife?: number  // additive %; adds % of shattered enemy max life to shatter damage
  coldShatterRangeIncrease?: number  // additive %; shatter explosion radius (area of effect)

  // Cold mastery effects (Frozen Armor tree)
  frozenArmorDmgReductionPerStack?: number // % reduced damage taken from hits per Frozen Armor stack
  frozenArmorMaxStacksBonus?: number       // flat additional maximum Frozen Armor stacks
  frozenArmorFrostsReduction?: number      // flat reduction to frostsPerStack threshold
  frozenArmorDoubleStackChance?: number    // additive %; chance to gain 2 stacks instead of 1
  frozenArmorSlowerDepletion?: number      // additive %; slows the stack-decay interval

  // Critical Hit mastery effects
  critChanceBaseAdd?: number              // additive percentage points; added to the action's base crit chance
  critChanceIncrease?: number             // additive %; stacks before the 'more' multiplier
  critChanceMore?: number                 // 'more' %; multiplicative after increased
  critDamageIncrease?: number             // additive %; adds on top of the +100% baseline (e.g. 100 → ×3)
  critDamageMore?: number                 // 'more' %; multiplicative after increased
  critIgnoreMitigationChance?: number     // additive %; chance for crits specifically to ignore enemy resistance
  critGuaranteedAffliction?: boolean      // Chance key 14: crits guarantee an affliction on the standard roll
  critNoDamageBonus?: boolean             // Chance key 14: crits deal no extra damage (multiplier stays at 1×)
  critMoreChanceVsAfflicted?: number      // Chance key 15: 'more' % crit chance vs targets with any affliction
  critDamageToAfflictions?: boolean       // Damage key 14: tree-0 crit damage bonus applies to affliction damage instead
  critTripleDamageOnDouble?: boolean      // Damage key 15: when crit + double damage both roll, ×2 becomes ×3
}

export interface ActionBonuses {
  damageIncrease: number      // total additive %
  moreDamage: number          // total 'more' %
  actionSpeedIncrease: number // total additive %
  moreActionSpeed: number     // total 'more' %
  lessActionSpeed: number     // total additive %; × (1 - sum/100)
  lessActionDamage: number    // total additive %; × (1 - sum/100)
  moreManaCost: number        // total additive %; × (1 + sum/100)
  doubleDamageChance: number  // total additive %
  doubleActionChance: number  // total additive %
  doubleActionReroll: boolean // primary cast rerolls double action once
  convertDoubleToDoubleDamage: boolean // doubleActionChance → doubleDamageChance, no double actions fire

  tranceTriggerChance: number
  tranceMultiTargetChance: number
  tranceDamageIncrease: number
  tranceActionSpeedIncrease: number

  manaCostReduction: number
  noManaCostChance: number
  manaCostRandomReductionMax: number
  lessManaCost: number             // total additive %; × (1 - sum/100)
  invertManaCostReductions: boolean // Mana key 12: reductions become increases; no-mana chance becomes double-mana chance
  repeatNoMana: boolean
  guaranteedAfflictions: boolean
  tranceCanStack: boolean          // Trance key 12: trance can stack to 2 (halved duration)
  ignoreMitigationChance: number  // total additive %; chance for any action hit to ignore enemy resistance
}

export interface LifeBonuses {
  maxLifeIncrease: number        // total additive %
  moreMaxLife: number            // total 'more' %
  lessMaxLife: number            // total additive %; × (1 - sum/100) on max life
  physRotResistance: number      // total additive %; physical and rot resistance (combined)
  elementalResistance: number    // total additive %
  resistAbsorbLifePercent: number      // % of damage absorbed by resistances recovered as life
  resistReductionEffectiveness: number // resistance reduction effects on player lose this % effectiveness
  regenIncrease: number          // mastery-layer additive % regen multiplier
  regenFractionBonus: number     // additional fraction of max life regenerated per second
  regenDouble: boolean           // Regen tree key: regen output doubled
  regenAlsoAppliesToMax: boolean // Max Life key 12: regen increase/double also adds to max life increase
  maxPerLifeLevel: boolean       // Max Life key 14: +1% increased max life per life stat level
  cannotRegen: boolean           // Steal key 12: disables life regen
  lifeStealPercent: number       // total additive %; fraction of action hit damage stolen as life
  lifeStealIncrease: number      // total additive %; increases life stolen
  lifeStealCapIncrease: number   // total additive %; increases per-hit hard cap (base 1% of max life)
  stealMore: number              // total additive %; × (1 + sum/100) on life stolen amount
  stealFromAfflictions: boolean  // when true, affliction tick damage from player actions also feeds life steal
  stealCapMore: number           // total additive %; × (1 + sum/100) on per-hit life steal cap
  lessStealCap: number           // total additive %; × (1 - sum/100) on per-hit life steal cap
  cannotSteal: boolean           // Max Life key 12, Resistances key 15: disables life steal
  feedingFrenzyChance: number    // total additive %; chance to trigger Feeding Frenzy on life steal
  lessActionDamage: number       // total additive %; × (1 - sum/100) on action damage from Life trees
}

export interface ManaBonuses {
  maxManaIncrease: number  // total additive %
  moreMaxMana: number      // total 'more' %
  regenIncrease: number    // total additive %
  replenishChance: number  // total additive %
  manaStealPercent: number      // total additive %; fraction of action hit damage stolen as mana
  manaStealIncrease: number     // total additive %; increases mana stolen
  manaStealCapIncrease: number  // total additive %; increases per-hit hard cap (base 1% of max mana)
  feedingFrenzyChance: number   // total additive %; chance to trigger Feeding Frenzy on mana steal
  actionSpeedIncrease: number   // total additive %; global action speed bonus from Mana tree
  moreMaxLife: number           // total 'more' %; increases maximum life (Maximum Mana node 11)
  manaShieldAbsorb: number        // total absorption % (sum of manaShieldAbsorbIncrease)
  manaShieldDamageTaken: number   // effective damage taken % on mana side (base 200, reduced by nodes)
  manaShieldAllSources: boolean   // true when node 5 is allocated — shields DoT/affliction sources too
  manaShieldResistancesApply: boolean // true when node 11 is allocated — resistances reduce mana cost
}

export interface ProjectileBonuses {
  rangeIncrease: number             // total additive %
  rangeMore: number                 // total 'more' %
  damageIncrease: number            // total additive %
  moreDamage: number                // total 'more' %
  actionSpeedIncrease: number       // total additive %
  additionalTargetChance: number    // total additive %; chance to hit a different enemy per cast
  doubleDamageChance: number        // total additive %; chance to deal 2× damage
  damagePerRange: number            // % per range unit added to damage at attack time
  extraChance: number               // total additive %
  extraDamage: number               // total additive % (stacks on 50% base)
  extraDoubleRoll: boolean
  knockbackChance: number           // total additive %; chance to knock back on projectile hit
  knockbackMoveSlowAmount: number   // total additive %; enemy move speed reduction for 2s after knockback
  knockbackMoreRange: number        // total 'more' %; multiplies base knockback range
  knockbackDamageReduction: number  // total additive %; knocked-back enemies deal less damage for 2s
}

export interface LightningBonuses {
  electrocuteApplyChance: number          // total additive %
  electrocuteDamageTakenIncrease: number  // total additive %
  electrocuteDurationIncrease: number     // total additive %
  electrocuteSlowOnDamageTaken: boolean
  electrocuteDurationMult: number          // total multiplicative duration factor (1.0 = no change)
  jumpChance: number              // total additive %
  jumpDamagePenaltyReduce: number // total additive %
  jumpRangeIncrease: number       // total additive %
  jumpReroll: boolean
  jumpFromElectrocutedChance: number // total additive %; added to jump chance when source target is electrocuted
  damageIncrease: number          // total additive %; lightning-tagged actions
  moreDamage: number              // total 'more' %; lightning-tagged actions
  actionSpeedIncrease: number     // total additive %; lightning-tagged actions
  moreActionSpeed: number         // total 'more' %; lightning action speed
  electrifyChance: number              // total additive %; chance per player lightning hit to apply electrified
  electrifyActionSpeed: number         // total additive %; global action speed bonus while electrified
  electrifyDurationIncrease: number    // total additive %; extends electrified duration
  electrifyDamageReduction: number     // total additive %; less damage taken from all sources while electrified
}

export interface ColdBonuses {
  damageIncrease: number                 // total additive %; cold-tagged actions
  moreDamage: number                     // total 'more' %; cold-tagged actions
  actionSpeedIncrease: number            // total additive %; cold-tagged actions
  frostApplyChance: number               // total additive %; bonus frost apply chance
  frostedVulnerable: number              // total additive %; non-cold damage dealt to frosted enemies
  frostSlowIncrease: number              // total additive %; bonus to both move+action slow
  frostSlowMore: number                  // total 'more' %; multiplies the total frost slow
  frostDurationIncrease: number          // total additive %; extends frost duration
  frostDurationMult: number              // total multiplicative duration factor (1.0 = no change)
  frostedDealLess: number                // total additive %; frosted enemies deal less damage
  shatterChance: number                  // total additive %; chance for a frosted enemy to shatter on death
  shatterDamagePctLife: number           // total additive %; % of shattered enemy max life added to shatter damage
  shatterRangeIncrease: number           // total additive %; shatter explosion radius (area of effect)
  frozenArmorDmgReductionPerStack: number // % reduced damage taken from hits per Frozen Armor stack
  frozenArmorMaxStacksBonus: number       // flat additional maximum Frozen Armor stacks
  frozenArmorFrostsReduction: number      // flat reduction to frostsPerStack threshold
  frozenArmorDoubleStackChance: number    // total additive %; chance to gain 2 stacks instead of 1
  frozenArmorSlowerDepletion: number      // total additive %; slows the stack-decay interval
}

export interface RotBonuses {
  damageIncrease: number         // total additive %; rot-tagged actions
  moreDamage: number             // total 'more' %; rot-tagged actions
  actionSpeedIncrease: number    // total additive %; rot-tagged actions
  poisonApplyChance: number      // total additive %; bonus poison apply chance
  poisonedTakeMore: number       // total 'more' %; rot damage vs poisoned enemies (Rot Damage tree)
  poisonDamageIncrease: number   // total additive %
  poisonDurationIncrease: number // total additive %
  poisonMoreDamage: number       // total 'more' %
  poisonDurationMult: number     // total multiplicative duration factor (1.0 = no change)
  poisonLessDamage: number       // total additive %; × (1 - sum/100) on poison dps
  poisonDamageMult: number       // total multiplicative dps factor (1.0 = no change)
  suppressRotHitDamage: boolean  // when true, rot-tagged player hits deal no direct damage
  weakeningRotDamageTaken: number   // total 'more' %; rot damage vs poisoned enemies (Weakening tree)
  weakeningDealLess: number         // total additive %; poisoned enemies deal less damage
  weakeningSpeedReduction: number   // total additive %; poisoned enemy move+action speed reduction
  weakeningResistPerStack: number   // flat %; physRotResist reduction per poison stack on enemy
  greenVeinsChanceOnPoison: number  // total additive %; extra stack chance on trigger
  greenVeinsDamagePerStack: number  // additive %; rot damage increase per Green Vein stack
  greenVeinsDurationIncrease: number // total additive %; extends Green Veins buff duration
  greenVeinsTriggerReduction: number // total additive %; reduces poison-application trigger threshold
  greenVeinsMaxStacksBonus: number   // flat additional maximum Green Vein stacks
}

export interface StrikeBonuses {
  damageIncrease: number           // total additive %
  moreDamage: number               // total 'more' %
  doubleDamageChance: number       // total additive %
  actionSpeedIncrease: number      // total additive %
  afflictionChanceIncrease: number // total additive %
  frenzyChance: number             // total additive %
  frenzyDamagePerCharge: number    // total additive %
  frenzySpeedPerCharge: number     // total additive %
  frenzyFlatDamage: number         // total additive %
  frenzyFlatSpeed: number          // total additive %
  frenzyAfflictionChancePerCharge: number // total additive %
  frenzyDurationIncrease: number   // total additive %
  frenzyMaxChargesBonus: number    // total flat
  rangeIncrease: number            // total additive %; strike action range
  moreRange: number                // total 'more' %; strike action range
  moreActionSpeed: number          // total 'more' %; strike action speed
  additionalTargetChance: number   // total additive %; chance for strikes to target an additional enemy
  additionalTargetMore: number     // total 'more' %; multiplies additional-target chance after increased
}

export interface AreaBonuses {
  damageIncrease: number       // total additive %; area-tagged actions
  moreDamage: number           // total 'more' %; area-tagged actions
  doubleDamageChance: number   // total additive %; chance for area hit to deal 2× damage
  sizeIncrease: number         // total additive %; area radius
  moreSize: number             // total 'more' %; area radius
  lessActionSpeed: number      // total additive %; less area action speed (× (1 - sum/100))
  tremorChance: number         // total additive %; chance per non-primary area victim to queue a tremor
  tremorDamage: number         // total additive %; tremor damage bonus on top of the 0.5× base
  tremorSize: number           // total additive %; tremor area radius bonus on top of the 0.5× base
  knockbackChance: number          // total additive %; chance to knock back on area hit
  knockbackMoveSlowAmount: number  // total additive %; enemy move speed reduction for 2s after knockback
  knockbackMoreRange: number       // total 'more' %; multiplies base knockback range
  knockbackDamageReduction: number // total additive %; knocked-back enemies deal less damage for 2s
}

export interface PhysicalBonuses {
  damageIncrease: number        // total additive %
  moreDamage: number            // total 'more' %
  actionSpeedIncrease: number   // total additive %
  bleedApplyChance: number      // total additive %
  bleedDamageIncrease: number   // total additive %
  bleedDurationIncrease: number // total additive %
  bleedMoreDamage: number       // total 'more' %
  bleedIgnoreResistance: boolean // when true, bleeding ignores enemy physical resistance (no-op for now)
  bleedDurationMult: number     // total multiplicative duration factor (1.0 = no change)
  bleedLessDamage: number       // total additive %; × (1 - sum/100) on bleed dps
  bleedDamageMult: number       // total multiplicative dps factor (1.0 = no change)
  suppressPhysicalHitDamage: boolean // when true, physical-tagged player hits deal no direct damage
  bleedingTakeMore: number      // total 'more' %; physical damage multiplier vs bleeding enemies
  resistBreakChance: number     // total additive %; chance per physical hit to permanently reduce enemy phys-rot resistance
  resistBreakSlowAtZero: number // total additive %; slow applied to enemies at 0% phys-rot resistance
  bloodlustChance: number             // total additive %; chance to trigger bloodlust on bleed application
  bloodlustActionSpeed: number        // total additive %; physical action speed while bloodlust active
  bloodlustDamage: number             // total additive %; physical damage while bloodlust active
  bloodlustBleedChance: number        // total additive %; bonus bleed apply chance while bloodlust active
  bloodlustDurationIncrease: number   // total additive %; extends bloodlust duration
}

export interface EnemyBonuses {
  extraOneChance: number    // total additive percentage points
  extraTwoChance: number    // total additive percentage points
  guaranteedExtra: number   // total flat
  strongChance: number      // total additive percentage points
  eliteChance: number       // total additive percentage points
  minStrongCount: number    // total flat (counts strong-or-elite)
  minEliteCount: number     // total flat
  championChance: number    // total additive percentage points (elite → champion; tree 2, requires 2 ascensions)
  bossChance: number        // total additive percentage points (champion → boss; tree 2, requires 2 ascensions)
  proliferateChance: number // total additive percentage points; per-kill roll to spawn an additional enemy next wave
  moreSpawned: number       // total additive 'more' %; multiplies wave count (normal + tree additional)
}

export interface MovementBonuses {
  moveSpeedIncrease: number              // total additive %
  moveMoreSpeed: number                  // total 'more' %
  moveDebuffEfficiencyReduce: number     // total %
  dashChargeChance: number               // total percentage-point chance per second
  dashDistanceIncrease: number           // total additive %
  kiteSpeedFraction: number              // total fraction (0–1, clamped)
  kiteResistance: number                 // total flat bonus resistance while kiting
  kiteAllowDash: boolean
  firstActionMoreDamage: number          // % more damage on first action after moving
  stationaryMoreDamagePerAction: number  // % more damage per consecutive stationary action (stacks up to 10)
  immuneToSlowing: boolean               // immune to movement speed reduction effects
  dashExtraCharge: boolean               // +1 maximum Dash charge
  dashLessDistance: number               // additive %; less dash distance
  dashCloseGapToTarget: boolean          // Dash closes gap to target regardless of action range
  kiteFullRange: boolean                 // kite whenever the target is in range, back to 90% of range
  kiteMoreActionSpeed: number            // additive %; action speed bonus while kiting
}

export interface FireBonuses {
  burnApplyChance: number       // total additive %
  burnDamageIncrease: number    // total additive %
  burnDurationIncrease: number  // total additive %
  burnMoreDamage: number        // total 'more' %
  burningTakeIncreased: number  // total additive %; damage taken by burning enemies from any source
  burnSplashFraction: number    // total additive %; share of burn dps that splashes to non-burning neighbors
  burnEnemyResistReduction: number // total flat %; reduced fire resistance on burning enemies (capped at 0)
  burnDurationMult: number      // total multiplicative duration factor (1.0 = no change)
  burnLessDamage: number        // total additive %; × (1 - sum/100) on burn dps
  burnDamageMult: number        // total multiplicative dps factor (1.0 = no change)
  suppressFireHitDamage: boolean // when true, fire-tagged player hits deal no direct damage
  immolateChance: number        // total additive %; chance to trigger immolation on fire hit
  immolateDamageBonus: number   // total additive %; fire damage bonus while immolation is active
  immolateBurnChance: number    // total additive %; burn apply chance bonus while immolation is active
  immolateDamageMult: number      // total multiplicative; product of all self-burn dps modifiers (1.0 = no change)
  damageIncrease: number        // total additive %; fire-tagged actions
  moreDamage: number            // total 'more' %; fire-tagged actions
  actionSpeedIncrease: number   // total additive %; fire-tagged actions
  burnGroundChance: number          // total additive %; chance to cause burning ground on hit tile
  burnGroundDamageIncrease: number  // total additive %
  burnGroundDurationIncrease: number // total additive %
  burnGroundMoreDamage: number      // total additive %; final multiplier as × (1 + sum/100)
  burnGroundSlowAmount: number      // total additive %; slow applied to enemies on burning ground tiles
}

// ── Action mastery node effects ────────────────────────────────────────────
// Tree 0: Action Damage  Tree 1: Action Speed  Tree 2: Trance  Tree 3: Mana Cost  Tree 4: Action Range

type TreeEffects = Partial<Record<number, NodeEffect>>

const ACTION_EFFECTS: Partial<Record<number, TreeEffects>> = {
  0: {  // Action Damage
    0:  { actionDamageIncrease: 5 },
    1:  { actionDoubleDamageChance: 5 },
    2:  { actionDamageIncrease: 12 },
    3:  { actionDamageIncrease: 5 },
    4:  { actionDoubleDamageChance: 5 },
    5:  { actionMoreDamage: 20 },
    6:  { actionDamageIncrease: 5 },
    7:  { actionDoubleDamageChance: 5 },
    8:  { actionDoubleDamageChance: 5, actionDamageIncrease: 5, actionSpeedIncrease: 5 },
    9:  { actionDamageIncrease: 5 },
    10: { actionDoubleDamageChance: 5 },
    11: { actionIgnoreMitigationChance: 20 },
    // 12-13: keys flanking the first major (node 5)
    12: { actionMoreDamage: 10, actionLessSpeed: 6 },
    13: { actionMoreDamage: 10, actionMoreManaCost: 20 },
    // 14-15: keys flanking the second major (node 11)
    14: { actionDoubleDamageChance: 15 },
    15: { actionMoreDamage: 10 },
  },
  1: {  // Action Speed
    0:  { actionSpeedIncrease: 4 },
    1:  { actionDoubleActionChance: 3 },
    2:  { actionSpeedIncrease: 10 },
    3:  { actionSpeedIncrease: 4 },
    4:  { actionDoubleActionChance: 3 },
    5:  { actionMoreSpeed: 20 },
    6:  { actionSpeedIncrease: 4 },
    7:  { actionDoubleActionChance: 3 },
    8:  { actionSpeedIncrease: 4, actionDoubleActionChance: 3, actionDamageIncrease: 5 },
    9:  { actionSpeedIncrease: 4 },
    10: { actionDoubleActionChance: 3 },
    11: { actionGuaranteedAfflictions: true },
    // 12-13: keys flanking the first major (node 5)
    12: { actionMoreSpeed: 10, actionLessDamage: 10 },
    13: { actionDoubleActionChance: 5 },
    // 14-15: keys flanking the second major (node 11)
    14: { actionDoubleActionReroll: true },
    15: { actionConvertDoubleToDoubleDamage: true },
  },
  2: {  // Trance (short tree — line nodes 0-5, key nodes 12-13)
    0: { actionTranceTriggerChance: 2 },
    1: { actionTranceMultiTargetChance: 5, actionTranceDamageIncrease: 5, actionTranceSpeedIncrease: 5 },
    2: { actionTranceTriggerChance: 5 },
    3: { actionTranceTriggerChance: 2 },
    4: { actionTranceMultiTargetChance: 5, actionTranceDamageIncrease: 5, actionTranceSpeedIncrease: 5 },
    5: { actionTranceTriggerChance: 3, actionTranceMultiTargetChance: 8, actionTranceDamageIncrease: 8, actionTranceSpeedIncrease: 8 },
    12: { actionTranceCanStack: true },
    13: { actionTranceTriggerChance: 5 },
  },
  3: {  // Mana Cost (short tree — line nodes 0-5, key nodes 12-13)
    0: { actionManaCostReduction: 10 },
    1: { actionNoManaCostChance: 10 },
    2: { actionManaCostRandomReductionMax: 33 },
    3: { actionManaCostReduction: 10 },
    4: { actionNoManaCostChance: 10 },
    5: { actionManaCostReduction: 10, actionNoManaCostChance: 10, actionRepeatNoMana: true },
    12: { actionInvertManaCostReductions: true },
    13: { actionLessManaCost: 30 },
  },
}

export function getActionNodeEffect(treeIdx: number, nodeIdx: number): NodeEffect {
  return ACTION_EFFECTS[treeIdx]?.[nodeIdx] ?? {}
}

export function computeActionBonuses(nodes: number[][], dumpedPoints = 0): ActionBonuses {
  const b: ActionBonuses = {
    damageIncrease: 0, moreDamage: dumpedPoints * MASTERY_DUMP.action.rate,
    actionSpeedIncrease: 0, moreActionSpeed: 0,
    lessActionSpeed: 0, lessActionDamage: 0, moreManaCost: 0,
    doubleDamageChance: 0, doubleActionChance: 0,
    doubleActionReroll: false,
    convertDoubleToDoubleDamage: false,
    tranceTriggerChance: 0,
    tranceMultiTargetChance: 0,
    tranceDamageIncrease: 0,
    tranceActionSpeedIncrease: 0,
    manaCostReduction: 0,
    noManaCostChance: 0,
    manaCostRandomReductionMax: 0,
    lessManaCost: 0,
    invertManaCostReductions: false,
    repeatNoMana: false,
    guaranteedAfflictions: false,
    tranceCanStack: false,
    ignoreMitigationChance: 0,
  }
  for (let treeIdx = 0; treeIdx < nodes.length; treeIdx++) {
    for (const nodeIdx of nodes[treeIdx]) {
      const eff = getActionNodeEffect(treeIdx, nodeIdx)
      b.damageIncrease              += eff.actionDamageIncrease ?? 0
      b.moreDamage                  += eff.actionMoreDamage ?? 0
      b.actionSpeedIncrease         += eff.actionSpeedIncrease ?? 0
      b.moreActionSpeed             += eff.actionMoreSpeed ?? 0
      b.lessActionSpeed             += eff.actionLessSpeed ?? 0
      b.lessActionDamage            += eff.actionLessDamage ?? 0
      b.moreManaCost                += eff.actionMoreManaCost ?? 0
      b.doubleDamageChance          += eff.actionDoubleDamageChance ?? 0
      b.doubleActionChance          += eff.actionDoubleActionChance ?? 0
      b.tranceTriggerChance         += eff.actionTranceTriggerChance ?? 0
      b.tranceMultiTargetChance     += eff.actionTranceMultiTargetChance ?? 0
      b.tranceDamageIncrease        += eff.actionTranceDamageIncrease ?? 0
      b.tranceActionSpeedIncrease   += eff.actionTranceSpeedIncrease ?? 0
      b.manaCostReduction           += eff.actionManaCostReduction ?? 0
      b.noManaCostChance            += eff.actionNoManaCostChance ?? 0
      b.manaCostRandomReductionMax  += eff.actionManaCostRandomReductionMax ?? 0
      b.lessManaCost                += eff.actionLessManaCost ?? 0
      b.ignoreMitigationChance      += eff.actionIgnoreMitigationChance ?? 0
      if (eff.actionRepeatNoMana)          b.repeatNoMana = true
      if (eff.actionGuaranteedAfflictions) b.guaranteedAfflictions = true
      if (eff.actionDoubleActionReroll)    b.doubleActionReroll = true
      if (eff.actionConvertDoubleToDoubleDamage) b.convertDoubleToDoubleDamage = true
      if (eff.actionInvertManaCostReductions) b.invertManaCostReductions = true
      if (eff.actionTranceCanStack)         b.tranceCanStack = true
    }
  }
  // Speed-tree key 15: convert accumulated doubleActionChance into doubleDamageChance.
  if (b.convertDoubleToDoubleDamage) {
    b.doubleDamageChance += b.doubleActionChance
    b.doubleActionChance = 0
    b.doubleActionReroll = false
  }
  return b
}

// ── Critical Hit mastery node effects ─────────────────────────────────────
// Tree 0: Critical Damage  Tree 1: Critical Chance

const CRIT_EFFECTS: Partial<Record<number, TreeEffects>> = {
  0: {  // Critical Damage
    0:  { critDamageIncrease: 10 },
    1:  { critDamageIncrease: 10 },
    2:  { critDamageIncrease: 20, critChanceIncrease: 10 },
    3:  { critDamageIncrease: 10 },
    4:  { critDamageIncrease: 10 },
    5:  { critIgnoreMitigationChance: 20 },
    6:  { critDamageIncrease: 10 },
    7:  { critDamageIncrease: 10 },
    8:  { critDamageIncrease: 20, critChanceIncrease: 10 },
    9:  { critDamageIncrease: 10 },
    10: { critDamageIncrease: 10 },
    11: { critDamageMore: 20 },
    // 12-15: keys flanking the first major (node 5) and second major (node 11)
    12: { critDamageMore: 10 },
    13: { critIgnoreMitigationChance: 10 },
    14: { critDamageToAfflictions: true },
    15: { critTripleDamageOnDouble: true },
  },
  1: {  // Critical Chance
    0:  { critChanceIncrease: 10 },
    1:  { critChanceIncrease: 10 },
    2:  { critChanceIncrease: 20, critDamageIncrease: 10 },
    3:  { critChanceIncrease: 10 },
    4:  { critChanceIncrease: 10 },
    5:  { critChanceBaseAdd: 3 },
    6:  { critChanceIncrease: 10 },
    7:  { critChanceIncrease: 10 },
    8:  { critChanceIncrease: 20, critDamageIncrease: 10 },
    9:  { critChanceIncrease: 10 },
    10: { critChanceIncrease: 10 },
    11: { critChanceMore: 20 },
    // 12-15: keys flanking the first major (node 5) and second major (node 11)
    12: { critChanceBaseAdd: 2 },
    13: { critChanceMore: 10 },
    14: { critGuaranteedAffliction: true, critNoDamageBonus: true },
    15: { critMoreChanceVsAfflicted: 20 },
  },
}

export function getCriticalHitNodeEffect(treeIdx: number, nodeIdx: number): NodeEffect {
  return CRIT_EFFECTS[treeIdx]?.[nodeIdx] ?? {}
}

export interface CriticalHitBonuses {
  chanceBaseAdd: number     // percentage points added to the action's base crit chance
  chanceIncrease: number    // total additive %
  chanceMore: number        // total 'more' %
  damageIncrease: number    // total additive %; adds to the +100% baseline
  damageMore: number        // total 'more' %
  ignoreMitigationChance: number  // total additive %; crits-only chance to ignore enemy resistance
  guaranteedAffliction: boolean   // Chance key 14: crits guarantee an affliction on the standard roll
  noDamageBonus: boolean          // Chance key 14: crits deal no extra damage
  moreChanceVsAfflicted: number   // Chance key 15: 'more' % crit chance vs targets with any affliction
  damageToAfflictions: boolean    // Damage key 14: tree-0 damage bonus applies to affliction damage instead
  tripleDamageOnDouble: boolean   // Damage key 15: crit + double damage → ×3 instead of ×2
  damageIncreaseTree0: number     // tree-0 portion of damageIncrease (used when damageToAfflictions)
  damageMoreTree0: number         // tree-0 portion of damageMore (used when damageToAfflictions)
}

export function computeCriticalHitBonuses(nodes: number[][], dumpedPoints = 0): CriticalHitBonuses {
  const b: CriticalHitBonuses = {
    chanceBaseAdd: 0, chanceIncrease: 0, chanceMore: 0,
    damageIncrease: 0, damageMore: dumpedPoints * MASTERY_DUMP.criticalHit.rate,
    ignoreMitigationChance: 0,
    guaranteedAffliction: false, noDamageBonus: false,
    moreChanceVsAfflicted: 0,
    damageToAfflictions: false, tripleDamageOnDouble: false,
    damageIncreaseTree0: 0, damageMoreTree0: 0,
  }
  for (let treeIdx = 0; treeIdx < nodes.length; treeIdx++) {
    for (const nodeIdx of nodes[treeIdx]) {
      const eff = getCriticalHitNodeEffect(treeIdx, nodeIdx)
      b.chanceBaseAdd          += eff.critChanceBaseAdd ?? 0
      b.chanceIncrease         += eff.critChanceIncrease ?? 0
      b.chanceMore             += eff.critChanceMore ?? 0
      b.damageIncrease         += eff.critDamageIncrease ?? 0
      b.damageMore             += eff.critDamageMore ?? 0
      b.ignoreMitigationChance += eff.critIgnoreMitigationChance ?? 0
      b.moreChanceVsAfflicted  += eff.critMoreChanceVsAfflicted ?? 0
      if (treeIdx === 0) {
        b.damageIncreaseTree0  += eff.critDamageIncrease ?? 0
        b.damageMoreTree0      += eff.critDamageMore ?? 0
      }
      if (eff.critGuaranteedAffliction) b.guaranteedAffliction = true
      if (eff.critNoDamageBonus)        b.noDamageBonus = true
      if (eff.critDamageToAfflictions)  b.damageToAfflictions = true
      if (eff.critTripleDamageOnDouble) b.tripleDamageOnDouble = true
    }
  }
  return b
}

// ── Life mastery node effects ──────────────────────────────────────────────
// Tree 0: Maximum Life  Tree 1: Life Regeneration (short)  Tree 2-4: not yet implemented

const LIFE_EFFECTS: Partial<Record<number, TreeEffects>> = {
  0: {  // Maximum Life (full)
    0:  { lifeMaxIncrease: 5 },
    1:  { lifePhysRotResistance: 5 },
    2:  { lifeMaxIncrease: 12 },
    3:  { lifeMaxIncrease: 5 },
    4:  { lifeElementalResistance: 5 },
    5:  { lifeMoreMax: 30 },
    6:  { lifeMaxIncrease: 5 },
    7:  { lifePhysRotResistance: 5 },
    8:  { lifePhysRotResistance: 7, lifeElementalResistance: 7 },
    9:  { lifeMaxIncrease: 5 },
    10: { lifeElementalResistance: 5 },
    11: { lifeMoreMax: 30 },
    // 12-15: keys flanking the first major (node 5) and second major (node 11)
    12: { lifeRegenAlsoAppliesToMax: true, lifeCannotSteal: true },
    13: { lifeMoreMax: 20, lifeLessActionDamage: 10 },
    14: { lifeMaxPerLifeLevel: true },
    15: { lifeMoreMax: 10 },
  },
  1: {  // Resistances (full tree — line nodes 0-11, key nodes 12-15)
    0:  { lifePhysRotResistance: 5 },
    1:  { lifeElementalResistance: 5 },
    2:  { lifePhysRotResistance: 7, lifeElementalResistance: 7 },
    3:  { lifePhysRotResistance: 5 },
    4:  { lifeElementalResistance: 5 },
    5:  { lifeResistAbsorbLifePercent: 5 },
    6:  { lifePhysRotResistance: 5 },
    7:  { lifeElementalResistance: 5 },
    8:  { lifePhysRotResistance: 7, lifeElementalResistance: 7 },
    9:  { lifePhysRotResistance: 5 },
    10: { lifeElementalResistance: 5 },
    11: { lifeResistReductionEffectiveness: 50 },
    // 12-15: keys flanking the first major (node 5) and second major (node 11)
    12: { lifePhysRotResistance: 7, lifeElementalResistance: -7 },
    13: { lifeElementalResistance: 7, lifePhysRotResistance: -7 },
    14: { lifePhysRotResistance: 7, lifeElementalResistance: 7, lifeLessMax: 10 },
    15: { lifePhysRotResistance: 15, lifeElementalResistance: 15, lifeCannotSteal: true },
  },
  2: {  // Life Regeneration (short tree — line nodes 0-5, key nodes 12-13)
    0: { lifeRegenIncrease: 5 },
    1: { lifeRegenIncrease: 5 },
    2: { lifeRegenIncrease: 12 },
    3: { lifeRegenIncrease: 5 },
    4: { lifeRegenIncrease: 5 },
    5: { lifeRegenFractionBonus: 0.003 },
    12: { lifeRegenDouble: true, lifeLessStealCap: 30 },
    13: { lifeRegenDouble: true, lifePhysRotResistance: -5, lifeElementalResistance: -5 },
  },
  3: {  // Life Steal (short tree — line nodes 0-5, key nodes 12-13)
    0: { lifeStealPercent: 0.5 },
    1: { lifeStealIncrease: 5 },
    2: { lifeStealCapIncrease: 10 },
    3: { lifeStealPercent: 0.5 },
    4: { lifeStealIncrease: 5 },
    5: { lifeFeedingFrenzyChance: 1 },
    12: { lifeStealCapMore: 30, lifeCannotRegen: true },
    13: { lifeStealFromAfflictions: true },
  },
}

export function getLifeNodeEffect(treeIdx: number, nodeIdx: number): NodeEffect {
  return LIFE_EFFECTS[treeIdx]?.[nodeIdx] ?? {}
}

export function computeLifeBonuses(nodes: number[][], dumpedPoints = 0): LifeBonuses {
  const b: LifeBonuses = {
    maxLifeIncrease: 0,
    moreMaxLife: dumpedPoints * MASTERY_DUMP.life.rate,
    lessMaxLife: 0,
    physRotResistance: 0,
    elementalResistance: 0,
    resistAbsorbLifePercent: 0,
    resistReductionEffectiveness: 0,
    regenIncrease: 0,
    regenFractionBonus: 0,
    regenDouble: false,
    regenAlsoAppliesToMax: false,
    maxPerLifeLevel: false,
    cannotRegen: false,
    lifeStealPercent: 0,
    lifeStealIncrease: 0,
    lifeStealCapIncrease: 0,
    stealMore: 0,
    stealCapMore: 0,
    lessStealCap: 0,
    cannotSteal: false,
    stealFromAfflictions: false,
    feedingFrenzyChance: 0,
    lessActionDamage: 0,
  }
  for (let treeIdx = 0; treeIdx < nodes.length; treeIdx++) {
    for (const nodeIdx of nodes[treeIdx]) {
      const eff = getLifeNodeEffect(treeIdx, nodeIdx)
      b.maxLifeIncrease += eff.lifeMaxIncrease ?? 0
      b.moreMaxLife += eff.lifeMoreMax ?? 0
      b.lessMaxLife += eff.lifeLessMax ?? 0
      b.physRotResistance += eff.lifePhysRotResistance ?? 0
      b.elementalResistance += eff.lifeElementalResistance ?? 0
      b.resistAbsorbLifePercent += eff.lifeResistAbsorbLifePercent ?? 0
      b.resistReductionEffectiveness += eff.lifeResistReductionEffectiveness ?? 0
      b.regenIncrease += eff.lifeRegenIncrease ?? 0
      b.regenFractionBonus += eff.lifeRegenFractionBonus ?? 0
      b.lifeStealPercent += eff.lifeStealPercent ?? 0
      b.lifeStealIncrease += eff.lifeStealIncrease ?? 0
      b.lifeStealCapIncrease += eff.lifeStealCapIncrease ?? 0
      b.stealMore += eff.lifeStealMore ?? 0
      b.stealCapMore += eff.lifeStealCapMore ?? 0
      b.lessStealCap += eff.lifeLessStealCap ?? 0
      b.feedingFrenzyChance += eff.lifeFeedingFrenzyChance ?? 0
      b.lessActionDamage += eff.lifeLessActionDamage ?? 0
      if (eff.lifeRegenDouble)           b.regenDouble = true
      if (eff.lifeRegenAlsoAppliesToMax) b.regenAlsoAppliesToMax = true
      if (eff.lifeMaxPerLifeLevel)       b.maxPerLifeLevel = true
      if (eff.lifeCannotRegen)           b.cannotRegen = true
      if (eff.lifeCannotSteal)           b.cannotSteal = true
      if (eff.lifeStealFromAfflictions)  b.stealFromAfflictions = true
    }
  }
  return b
}

// ── Block mastery node effects ─────────────────────────────────────────────
// Unlocked by the first Transcendence. Two full trees (line nodes 0-11 only,
// no key nodes — the tree UI hides keys with no effects automatically).

const BLOCK_EFFECTS: Partial<Record<number, TreeEffects>> = {
  0: {  // Block Chance
    0:  { blockChanceIncrease: 4 },
    1:  { blockRecoveryIncrease: 100 },
    2:  { blockChanceIncrease: 6, blockAmountIncrease: 5 },
    3:  { blockChanceIncrease: 4 },
    4:  { blockRecoveryIncrease: 100 },
    5:  { blockChanceIncrease: 10 },
    6:  { blockChanceIncrease: 4 },
    7:  { blockRecoveryIncrease: 100 },
    8:  { blockChanceIncrease: 6, blockAmountIncrease: 5 },
    9:  { blockChanceIncrease: 4 },
    10: { blockRecoveryIncrease: 100 },
    11: { blockChanceIncrease: 10 },
  },
  1: {  // Block Efficiency
    0:  { blockAmountIncrease: 6 },
    1:  { blockRecoveryIncrease: 100 },
    2:  { blockAmountIncrease: 12 },
    3:  { blockAmountIncrease: 6 },
    4:  { blockRecoveryIncrease: 100 },
    5:  { blockNoAfflictions: true },
    6:  { blockAmountIncrease: 6 },
    7:  { blockRecoveryIncrease: 100 },
    8:  { blockAmountIncrease: 12 },
    9:  { blockAmountIncrease: 6 },
    10: { blockRecoveryIncrease: 100 },
    11: { blockHealPct: 20 },
  },
}

export function getBlockNodeEffect(treeIdx: number, nodeIdx: number): NodeEffect {
  return BLOCK_EFFECTS[treeIdx]?.[nodeIdx] ?? {}
}

export interface BlockBonuses {
  chanceIncrease: number    // total additive %; block chance × (1 + sum/100)
  moreChance: number        // 'more' % from dumped points; × (1 + sum/100)
  amountIncrease: number    // total additive %; blocked amount × (1 + sum/100)
  recoveryIncrease: number  // total additive %; blocks per second × (1 + sum/100)
  noAfflictions: boolean    // blocked hits cannot trigger afflictions on you
  healOnBlockPct: number    // % of damage blocked recovered as life
}

export function computeBlockBonuses(nodes: number[][], dumpedPoints = 0): BlockBonuses {
  const b: BlockBonuses = {
    chanceIncrease: 0,
    moreChance: dumpedPoints * MASTERY_DUMP.block.rate,
    amountIncrease: 0,
    recoveryIncrease: 0,
    noAfflictions: false,
    healOnBlockPct: 0,
  }
  for (let treeIdx = 0; treeIdx < nodes.length; treeIdx++) {
    for (const nodeIdx of nodes[treeIdx]) {
      const eff = getBlockNodeEffect(treeIdx, nodeIdx)
      b.chanceIncrease += eff.blockChanceIncrease ?? 0
      b.amountIncrease += eff.blockAmountIncrease ?? 0
      b.recoveryIncrease += eff.blockRecoveryIncrease ?? 0
      b.healOnBlockPct += eff.blockHealPct ?? 0
      if (eff.blockNoAfflictions) b.noAfflictions = true
    }
  }
  return b
}

// ── Mana mastery node effects ──────────────────────────────────────────────
// Tree 0: Mana Regeneration (short)  Tree 1: Maximum Mana (short)  Tree 2-4: not yet implemented

const MANA_EFFECTS: Partial<Record<number, TreeEffects>> = {
  0: {  // Maximum Mana (full tree — line nodes 0-11, key nodes 12-15)
    0: { manaMaxIncrease: 5 },
    1: { manaMaxIncrease: 2, manaRegenIncrease: 2 },
    2: { manaMaxIncrease: 12 },
    3: { manaMaxIncrease: 5 },
    4: { manaMaxIncrease: 2, manaRegenIncrease: 2 },
    5: { manaMoreMax: 20 },
    6: { manaMaxIncrease: 5 },
    7: { manaMaxIncrease: 2, manaRegenIncrease: 2 },
    8: { manaMaxIncrease: 15, manaRegenIncrease: 5, manaActionSpeedIncrease: 5 },
    9: { manaMaxIncrease: 5 },
    10: { manaMaxIncrease: 2, manaRegenIncrease: 2 },
    11: { manaMoreMax: 20, manaMoreLife: 3 },
    // 12-15: key nodes — not yet defined
  },
  1: {  // Mana Shield (full tree — line nodes 0-11, key nodes 12-15)
    0:  { manaShieldAbsorbIncrease: 5 },
    1:  { manaShieldDamageTakenReduce: 5 },
    2:  { manaShieldAbsorbIncrease: 10 },
    3:  { manaShieldAbsorbIncrease: 5 },
    4:  { manaShieldDamageTakenReduce: 5 },
    5:  { manaShieldAllSources: true },
    6:  { manaShieldAbsorbIncrease: 5 },
    7:  { manaShieldDamageTakenReduce: 5 },
    8:  { manaShieldAbsorbIncrease: 10 },
    9:  { manaShieldAbsorbIncrease: 5 },
    10: { manaShieldDamageTakenReduce: 5 },
    11: { manaShieldResistancesApply: true },
    // 12-15: key nodes — not yet defined
  },
  2: {  // Mana Regeneration (short tree — line nodes 0-5, key nodes 12-13)
    0: { manaRegenIncrease: 5 },
    1: { manaRegenIncrease: 5 },
    2: { manaRegenIncrease: 12 },
    3: { manaRegenIncrease: 5 },
    4: { manaRegenIncrease: 5 },
    5: { manaReplenishChance: 10 },
    // 12-13: key nodes — not yet defined
  },
  3: {  // Mana Steal (short tree — line nodes 0-5, key nodes 12-13)
    0: { manaStealPercent: 0.5 },
    1: { manaStealIncrease: 5 },
    2: { manaStealCapIncrease: 10 },
    3: { manaStealPercent: 0.5 },
    4: { manaStealIncrease: 5 },
    5: { manaFeedingFrenzyChance: 1 },
    // 12-13: key nodes — not yet defined
  },
}

export function getManaNodeEffect(treeIdx: number, nodeIdx: number): NodeEffect {
  return MANA_EFFECTS[treeIdx]?.[nodeIdx] ?? {}
}

export function computeManaBonuses(nodes: number[][], dumpedPoints = 0): ManaBonuses {
  const b: ManaBonuses = {
    maxManaIncrease: 0, moreMaxMana: dumpedPoints * MASTERY_DUMP.mana.rate, regenIncrease: 0, replenishChance: 0,
    manaStealPercent: 0, manaStealIncrease: 0, manaStealCapIncrease: 0, feedingFrenzyChance: 0,
    actionSpeedIncrease: 0, moreMaxLife: 0,
    manaShieldAbsorb: 0, manaShieldDamageTaken: 200,
    manaShieldAllSources: false, manaShieldResistancesApply: false,
  }
  for (let treeIdx = 0; treeIdx < nodes.length; treeIdx++) {
    for (const nodeIdx of nodes[treeIdx]) {
      const eff = getManaNodeEffect(treeIdx, nodeIdx)
      b.maxManaIncrease            += eff.manaMaxIncrease ?? 0
      b.moreMaxMana                += eff.manaMoreMax ?? 0
      b.regenIncrease              += eff.manaRegenIncrease ?? 0
      b.replenishChance            += eff.manaReplenishChance ?? 0
      b.manaStealPercent           += eff.manaStealPercent ?? 0
      b.manaStealIncrease          += eff.manaStealIncrease ?? 0
      b.manaStealCapIncrease       += eff.manaStealCapIncrease ?? 0
      b.feedingFrenzyChance        += eff.manaFeedingFrenzyChance ?? 0
      b.actionSpeedIncrease        += eff.manaActionSpeedIncrease ?? 0
      b.moreMaxLife                += eff.manaMoreLife ?? 0
      b.manaShieldAbsorb           += eff.manaShieldAbsorbIncrease ?? 0
      b.manaShieldDamageTaken      -= eff.manaShieldDamageTakenReduce ?? 0
      if (eff.manaShieldAllSources) b.manaShieldAllSources = true
      if (eff.manaShieldResistancesApply) b.manaShieldResistancesApply = true
    }
  }
  b.manaShieldDamageTaken = Math.max(0, b.manaShieldDamageTaken)
  return b
}

// ── Fire mastery node effects ──────────────────────────────────────────────
// Tree 0: Burning (full)  Tree 1: Immolation (short)  Tree 2: Fire Damage (full)  Tree 3: Burning Ground (short)  Tree 4: not implemented

const FIRE_EFFECTS: Partial<Record<number, TreeEffects>> = {
  0: {  // Fire Damage (full)
    0:  { fireDamageIncrease: 5 },
    1:  { fireActionSpeedIncrease: 3 },
    2:  { fireDamageIncrease: 5, fireBurnApplyChance: 5 },
    3:  { fireDamageIncrease: 5 },
    4:  { fireActionSpeedIncrease: 3 },
    5:  { fireMoreDamage: 10 },
    6:  { fireDamageIncrease: 5 },
    7:  { fireActionSpeedIncrease: 3 },
    8:  { fireDamageIncrease: 12 },
    9:  { fireDamageIncrease: 5 },
    10: { fireActionSpeedIncrease: 3 },
    11: { fireBurnEnemyResistReduction: 20 },
    // 12-15: key nodes — not yet defined
  },
  1: {  // Burning (full)
    0:  { fireBurnApplyChance: 5 },
    1:  { fireBurnDamageIncrease: 15 },
    2:  { fireBurnDamageIncrease: 30, fireBurnDurationIncrease: 10 },
    3:  { fireBurnApplyChance: 5 },
    4:  { fireBurnDamageIncrease: 15 },
    5:  { fireBurnMoreDamage: 30 },
    6:  { fireBurnApplyChance: 5 },
    7:  { fireBurnDamageIncrease: 15 },
    8:  { fireBurningTakeIncreased: 30 },
    9:  { fireBurnApplyChance: 5 },
    10: { fireBurnDamageIncrease: 15 },
    11: { fireBurnSplashFraction: 50 },
    12: { fireBurnMoreDamage: 30, fireBurnDurationMult: 0.5 },
    13: { fireBurnDurationMult: 2, fireBurnLessDamage: 30 },
    14: { fireBurnDamageMult: 2, fireSuppressHitDamage: true },
    15: { fireBurnMoreDamage: 10 },
  },
  2: {  // Burning Ground (short tree — line nodes 0-5, key nodes 12-13)
    0: { fireBurnGroundChance: 5 },
    1: { fireBurnGroundDamageIncrease: 45 },
    2: { fireBurnGroundDamageIncrease: 90, fireBurnGroundDurationIncrease: 30 },
    3: { fireBurnGroundChance: 5 },
    4: { fireBurnGroundDamageIncrease: 45 },
    5: { fireBurnGroundSlowAmount: 20, fireBurnGroundMoreDamage: 30 },
    // 12-13: key nodes — not yet defined
  },
  3: {  // Immolation (short tree — line nodes 0-5, key nodes 12-13)
    0: { fireImmolateChance: 2 },
    1: { fireImmolateDamageBonus: 5, fireImmolateBurnChance: 5 },
    2: { fireImmolateDamageMult: 0.5 },
    3: { fireImmolateChance: 2 },
    4: { fireImmolateDamageBonus: 5, fireImmolateBurnChance: 5 },
    5: { fireImmolateChance: 5, fireImmolateDamageBonus: 10, fireImmolateBurnChance: 10, fireImmolateDamageMult: 0.5 },
    // 12-13: key nodes — not yet defined
  },
}

export function getFireNodeEffect(treeIdx: number, nodeIdx: number): NodeEffect {
  return FIRE_EFFECTS[treeIdx]?.[nodeIdx] ?? {}
}

export function computeFireBonuses(nodes: number[][], dumpedPoints = 0): FireBonuses {
  const b: FireBonuses = {
    burnApplyChance: 0,
    burnDamageIncrease: 0,
    burnDurationIncrease: 0,
    burnMoreDamage: 0,
    burningTakeIncreased: 0,
    burnSplashFraction: 0,
    burnEnemyResistReduction: 0,
    immolateChance: 0,
    immolateDamageBonus: 0,
    immolateBurnChance: 0,
    immolateDamageMult: 1,
    damageIncrease: 0,
    moreDamage: dumpedPoints * MASTERY_DUMP.fire.rate,
    actionSpeedIncrease: 0,
    burnGroundChance: 0,
    burnGroundDamageIncrease: 0,
    burnGroundDurationIncrease: 0,
    burnGroundMoreDamage: 0,
    burnGroundSlowAmount: 0,
    burnDurationMult: 1,
    burnLessDamage: 0,
    burnDamageMult: 1,
    suppressFireHitDamage: false,
  }
  for (let treeIdx = 0; treeIdx < nodes.length; treeIdx++) {
    for (const nodeIdx of nodes[treeIdx]) {
      const eff = getFireNodeEffect(treeIdx, nodeIdx)
      b.burnApplyChance += eff.fireBurnApplyChance ?? 0
      b.burnDamageIncrease += eff.fireBurnDamageIncrease ?? 0
      b.burnDurationIncrease += eff.fireBurnDurationIncrease ?? 0
      b.burnMoreDamage += eff.fireBurnMoreDamage ?? 0
      b.burningTakeIncreased += eff.fireBurningTakeIncreased ?? 0
      b.burnSplashFraction += eff.fireBurnSplashFraction ?? 0
      b.burnEnemyResistReduction += eff.fireBurnEnemyResistReduction ?? 0
      b.immolateChance += eff.fireImmolateChance ?? 0
      b.immolateDamageBonus += eff.fireImmolateDamageBonus ?? 0
      b.immolateBurnChance += eff.fireImmolateBurnChance ?? 0
      if (eff.fireImmolateDamageMult !== undefined) b.immolateDamageMult *= eff.fireImmolateDamageMult
      b.damageIncrease += eff.fireDamageIncrease ?? 0
      b.moreDamage += eff.fireMoreDamage ?? 0
      b.actionSpeedIncrease += eff.fireActionSpeedIncrease ?? 0
      b.burnGroundChance += eff.fireBurnGroundChance ?? 0
      b.burnGroundDamageIncrease += eff.fireBurnGroundDamageIncrease ?? 0
      b.burnGroundDurationIncrease += eff.fireBurnGroundDurationIncrease ?? 0
      b.burnGroundMoreDamage += eff.fireBurnGroundMoreDamage ?? 0
      b.burnGroundSlowAmount += eff.fireBurnGroundSlowAmount ?? 0
      if (eff.fireBurnDurationMult !== undefined) b.burnDurationMult *= eff.fireBurnDurationMult
      b.burnLessDamage += eff.fireBurnLessDamage ?? 0
      if (eff.fireBurnDamageMult !== undefined) b.burnDamageMult *= eff.fireBurnDamageMult
      if (eff.fireSuppressHitDamage) b.suppressFireHitDamage = true
    }
  }
  return b
}

// ── Enemy mastery node effects ─────────────────────────────────────────────
// Tree 0: Enemy Quantity  Tree 1: Enemy Quality  Tree 2: Champions and Bosses (short)
// Tree 3: Enemy Proliferation (short)

const ENEMY_EFFECTS: Partial<Record<number, TreeEffects>> = {
  0: {  // Enemy Quantity (full tree — line nodes 0-11, key nodes 12-15)
    0:  { enemyExtraOneChance: 50 },
    1:  { enemyExtraTwoChance: 25 },
    2:  { enemyGuaranteedExtra: 1 },
    3:  { enemyExtraOneChance: 50 },
    4:  { enemyExtraTwoChance: 25 },
    5:  { enemyGuaranteedExtra: 2, enemyMinStrongCount: 1 },
    6:  { enemyExtraOneChance: 50 },
    7:  { enemyExtraTwoChance: 25 },
    8:  { enemyGuaranteedExtra: 1 },
    9:  { enemyExtraOneChance: 50 },
    10: { enemyExtraTwoChance: 25 },
    11: { enemyGuaranteedExtra: 2, enemyMinEliteCount: 1 },
    // 12-15: key nodes — not yet defined
  },
  1: {  // Enemy Quality (full tree — line nodes 0-11, key nodes 12-15)
    0:  { enemyStrongChance: 5 },
    1:  { enemyEliteChance: 10 },
    2:  { enemyStrongChance: 12 },
    3:  { enemyStrongChance: 5 },
    4:  { enemyEliteChance: 10 },
    5:  { enemyMinStrongCount: 2, enemyMinEliteCount: 1 },
    6:  { enemyStrongChance: 5 },
    7:  { enemyEliteChance: 10 },
    8:  { enemyStrongChance: 12 },
    9:  { enemyStrongChance: 5 },
    10: { enemyEliteChance: 10 },
    11: { enemyStrongChance: 20, enemyEliteChance: 20, enemyGuaranteedExtra: 1 },
    // 12-15: key nodes — not yet defined
  },
  2: {  // Champions and Bosses (short tree — line nodes 0-5, key nodes 12-13; requires 2 ascensions)
    0: { enemyEliteToChampionChance: 5 },
    1: { enemyStrongChance: 5, enemyEliteChance: 5 },
    2: { enemyStrongChance: 5, enemyEliteChance: 5, enemyEliteToChampionChance: 5 },
    3: { enemyEliteToChampionChance: 5 },
    4: { enemyStrongChance: 5, enemyEliteChance: 5 },
    5: { enemyChampionToBossChance: 1 },
    // 12-13: key nodes — not yet defined
  },
  3: {  // Enemy Proliferation (short tree — line nodes 0-5, key nodes 12-13)
    0: { enemyProliferateChance: 10 },
    1: { enemyProliferateChance: 10 },
    2: { enemyMoreSpawned: 15 },
    3: { enemyProliferateChance: 10 },
    4: { enemyProliferateChance: 10 },
    5: { enemyMoreSpawned: 20 },
    // 12-13: key nodes — not yet defined
  },
}

export function getEnemyNodeEffect(treeIdx: number, nodeIdx: number): NodeEffect {
  return ENEMY_EFFECTS[treeIdx]?.[nodeIdx] ?? {}
}

export function computeEnemyBonuses(nodes: number[][], dumpedPoints = 0): EnemyBonuses {
  const b: EnemyBonuses = {
    extraOneChance: 0,
    extraTwoChance: 0,
    guaranteedExtra: 0,
    strongChance: 0,
    eliteChance: 0,
    minStrongCount: 0,
    minEliteCount: 0,
    championChance: 0,
    bossChance: 0,
    proliferateChance: 0,
    moreSpawned: dumpedPoints * MASTERY_DUMP.enemy.rate,
  }
  for (let treeIdx = 0; treeIdx < nodes.length; treeIdx++) {
    for (const nodeIdx of nodes[treeIdx]) {
      const eff = getEnemyNodeEffect(treeIdx, nodeIdx)
      b.extraOneChance              += eff.enemyExtraOneChance ?? 0
      b.extraTwoChance              += eff.enemyExtraTwoChance ?? 0
      b.guaranteedExtra             += eff.enemyGuaranteedExtra ?? 0
      b.strongChance                += eff.enemyStrongChance ?? 0
      b.eliteChance                 += eff.enemyEliteChance ?? 0
      b.minStrongCount              += eff.enemyMinStrongCount ?? 0
      b.minEliteCount               += eff.enemyMinEliteCount ?? 0
      b.championChance              += eff.enemyEliteToChampionChance ?? 0
      b.bossChance                  += eff.enemyChampionToBossChance ?? 0
      b.proliferateChance           += eff.enemyProliferateChance ?? 0
      b.moreSpawned                 += eff.enemyMoreSpawned ?? 0
    }
  }
  return b
}

// ── Projectile mastery node effects ───────────────────────────────────────
// Tree 0: Projectile Damage (full)  Tree 1: Multiple Projectiles (full)  Tree 2: Projectile Range (short)  Tree 3: Knockback (short)

const PROJ_EFFECTS: Partial<Record<number, TreeEffects>> = {
  0: {  // Projectile Damage (full tree — line nodes 0-11, key nodes 12-15)
    0:  { projDamageIncrease: 5 },
    1:  { projAdditionalTargetChance: 5 },
    2:  { projDamageIncrease: 12 },
    3:  { projDamageIncrease: 5 },
    4:  { projAdditionalTargetChance: 5 },
    5:  { projMoreDamage: 20 },
    6:  { projDamageIncrease: 5 },
    7:  { projAdditionalTargetChance: 5 },
    8:  { projAdditionalTargetChance: 5, projDamageIncrease: 5, projActionSpeedIncrease: 5 },
    9:  { projDamageIncrease: 5 },
    10: { projAdditionalTargetChance: 5 },
    11: { projDoubleDamageChance: 20, projRangeIncrease: 10 },
    // 12-15: key nodes — not yet defined
  },
  1: {  // Multiple Projectiles (full tree — line nodes 0-11, key nodes 12-15)
    0:  { projExtraChance: 5 },
    1:  { projExtraDamage: 5 },
    2:  { projExtraChance: 7, projExtraDamage: 7 },
    3:  { projExtraChance: 5 },
    4:  { projExtraDamage: 5 },
    5:  { projExtraChance: 15 },
    6:  { projExtraChance: 5 },
    7:  { projExtraDamage: 5 },
    8:  { projExtraChance: 7, projExtraDamage: 7 },
    9:  { projExtraChance: 5 },
    10: { projExtraDamage: 5 },
    11: { projExtraDoubleRoll: true },
    // 12-15: key nodes — not yet defined
  },
  2: {  // Projectile Range (short tree — line nodes 0-5, key nodes 12-13)
    0: { projRangeIncrease: 5 },
    1: { projDamageIncrease: 5 },
    2: { projRangeIncrease: 12 },
    3: { projRangeIncrease: 5 },
    4: { projDamageIncrease: 5 },
    5: { projDamagePerRange: 3 },
    // 12-13: key nodes — not yet defined
  },
  3: {  // Knockback (short tree — line nodes 0-5, key nodes 12-13)
    0: { projKnockbackChance: 10 },
    1: { projKnockbackMoveSlowAmount: 10 },
    2: { projKnockbackChance: 15, projDamageIncrease: 15 },
    3: { projKnockbackChance: 10 },
    4: { projKnockbackMoveSlowAmount: 10 },
    5: { projKnockbackMoreRange: 30, projKnockbackDamageReduction: 10 },
    // 12-13: key nodes — not yet defined
  },
}

export function getProjectileNodeEffect(treeIdx: number, nodeIdx: number): NodeEffect {
  return PROJ_EFFECTS[treeIdx]?.[nodeIdx] ?? {}
}

export function computeProjectileBonuses(nodes: number[][], dumpedPoints = 0): ProjectileBonuses {
  const b: ProjectileBonuses = {
    rangeIncrease: 0,
    rangeMore: dumpedPoints * MASTERY_DUMP.projectile.rate,
    damageIncrease: 0,
    moreDamage: 0,
    actionSpeedIncrease: 0,
    additionalTargetChance: 0,
    doubleDamageChance: 0,
    damagePerRange: 0,
    extraChance: 0,
    extraDamage: 0,
    extraDoubleRoll: false,
    knockbackChance: 0,
    knockbackMoveSlowAmount: 0,
    knockbackMoreRange: 0,
    knockbackDamageReduction: 0,
  }
  for (let treeIdx = 0; treeIdx < nodes.length; treeIdx++) {
    for (const nodeIdx of nodes[treeIdx]) {
      const eff = getProjectileNodeEffect(treeIdx, nodeIdx)
      b.rangeIncrease              += eff.projRangeIncrease ?? 0
      b.damageIncrease             += eff.projDamageIncrease ?? 0
      b.moreDamage                 += eff.projMoreDamage ?? 0
      b.actionSpeedIncrease        += eff.projActionSpeedIncrease ?? 0
      b.additionalTargetChance     += eff.projAdditionalTargetChance ?? 0
      b.doubleDamageChance         += eff.projDoubleDamageChance ?? 0
      b.damagePerRange             += eff.projDamagePerRange ?? 0
      b.extraChance                += eff.projExtraChance ?? 0
      b.extraDamage                += eff.projExtraDamage ?? 0
      if (eff.projExtraDoubleRoll) b.extraDoubleRoll = true
      b.knockbackChance            += eff.projKnockbackChance ?? 0
      b.knockbackMoveSlowAmount    += eff.projKnockbackMoveSlowAmount ?? 0
      b.knockbackMoreRange         += eff.projKnockbackMoreRange ?? 0
      b.knockbackDamageReduction   += eff.projKnockbackDamageReduction ?? 0
    }
  }
  return b
}

// ── Lightning mastery node effects ────────────────────────────────────────
// Tree 0: Electrocution (full)  Tree 1: Jump (short)  Tree 2-4: not yet implemented

const LIGHTNING_EFFECTS: Partial<Record<number, TreeEffects>> = {
  0: {  // Lightning Damage (full tree — line nodes 0-11, key nodes 12-15)
    0:  { lightningDamageIncrease: 5 },
    1:  { lightningActionSpeedIncrease: 3 },
    2:  { lightningDamageIncrease: 5, lightningElectrocuteApplyChance: 5 },
    3:  { lightningDamageIncrease: 5 },
    4:  { lightningActionSpeedIncrease: 3 },
    5:  { lightningMoreDamage: 10 },
    6:  { lightningDamageIncrease: 5 },
    7:  { lightningActionSpeedIncrease: 3 },
    8:  { lightningDamageIncrease: 12 },
    9:  { lightningDamageIncrease: 5 },
    10: { lightningActionSpeedIncrease: 3 },
    11: { lightningMoreDamage: 10, lightningMoreActionSpeed: 5 },
    // 12-15: key nodes — not yet defined
  },
  1: {  // Electrocution (full)
    0:  { lightningElectrocuteApplyChance: 5 },
    1:  { lightningElectrocuteDamageTakenIncrease: 3 },
    2:  { lightningElectrocuteDamageTakenIncrease: 5, lightningElectrocuteDurationIncrease: 10 },
    3:  { lightningElectrocuteApplyChance: 5 },
    4:  { lightningElectrocuteDamageTakenIncrease: 3 },
    5:  { lightningElectrocuteDamageTakenIncrease: 8, lightningElectrocuteDurationIncrease: 20 },
    6:  { lightningElectrocuteApplyChance: 5 },
    7:  { lightningElectrocuteDamageTakenIncrease: 3 },
    8:  { lightningElectrocuteApplyChance: 15 },
    9:  { lightningElectrocuteApplyChance: 5 },
    10: { lightningElectrocuteDamageTakenIncrease: 3 },
    11: { lightningElectrocuteSlowOnDamageTaken: true },
    12: { lightningElectrocuteDamageTakenIncrease: 5, lightningElectrocuteDurationMult: 0.9 },
    13: { lightningElectrocuteDurationMult: 1.2 },
    14: { lightningJumpFromElectrocutedChance: 5 },
    15: { lightningElectrocuteDamageTakenIncrease: 5 },
  },
  2: {  // Jump (short tree — line nodes 0-5, key nodes 12-13)
    0: { lightningJumpChance: 20 },
    1: { lightningJumpDamagePenaltyReduce: 10 },
    2: { lightningJumpChance: 30, lightningJumpDamagePenaltyReduce: 15 },
    3: { lightningJumpChance: 20 },
    4: { lightningJumpDamagePenaltyReduce: 10 },
    5: { lightningJumpReroll: true, lightningJumpRangeIncrease: 30 },
    // 12-13: key nodes — not yet defined
  },
  3: {  // Electrifying (short tree — line nodes 0-5, key nodes 12-13)
    0: { lightningElectrifyChance: 5 },
    1: { lightningElectrifyActionSpeed: 5 },
    2: { lightningElectrifyDurationIncrease: 25, lightningElectrifyActionSpeed: 5 },
    3: { lightningElectrifyChance: 5 },
    4: { lightningElectrifyActionSpeed: 5 },
    5: { lightningElectrifyDamageReduction: 5 },
    // 12-13: key nodes — not yet defined
  },
}

export function getLightningNodeEffect(treeIdx: number, nodeIdx: number): NodeEffect {
  return LIGHTNING_EFFECTS[treeIdx]?.[nodeIdx] ?? {}
}

export function computeLightningBonuses(nodes: number[][], dumpedPoints = 0): LightningBonuses {
  const b: LightningBonuses = {
    electrocuteApplyChance: 0,
    electrocuteDamageTakenIncrease: 0,
    electrocuteDurationIncrease: 0,
    electrocuteSlowOnDamageTaken: false,
    electrocuteDurationMult: 1,
    jumpChance: 0,
    jumpDamagePenaltyReduce: 0,
    jumpRangeIncrease: 0,
    jumpReroll: false,
    jumpFromElectrocutedChance: 0,
    damageIncrease: 0,
    moreDamage: dumpedPoints * MASTERY_DUMP.lightning.rate,
    actionSpeedIncrease: 0,
    moreActionSpeed: 0,
    electrifyChance: 0,
    electrifyActionSpeed: 0,
    electrifyDurationIncrease: 0,
    electrifyDamageReduction: 0,
  }
  for (let treeIdx = 0; treeIdx < nodes.length; treeIdx++) {
    for (const nodeIdx of nodes[treeIdx]) {
      const eff = getLightningNodeEffect(treeIdx, nodeIdx)
      b.electrocuteApplyChance += eff.lightningElectrocuteApplyChance ?? 0
      b.electrocuteDamageTakenIncrease += eff.lightningElectrocuteDamageTakenIncrease ?? 0
      b.electrocuteDurationIncrease += eff.lightningElectrocuteDurationIncrease ?? 0
      if (eff.lightningElectrocuteSlowOnDamageTaken) b.electrocuteSlowOnDamageTaken = true
      if (eff.lightningElectrocuteDurationMult !== undefined) b.electrocuteDurationMult *= eff.lightningElectrocuteDurationMult
      b.jumpChance += eff.lightningJumpChance ?? 0
      b.jumpDamagePenaltyReduce += eff.lightningJumpDamagePenaltyReduce ?? 0
      b.jumpRangeIncrease += eff.lightningJumpRangeIncrease ?? 0
      if (eff.lightningJumpReroll) b.jumpReroll = true
      b.jumpFromElectrocutedChance += eff.lightningJumpFromElectrocutedChance ?? 0
      b.damageIncrease   += eff.lightningDamageIncrease ?? 0
      b.moreDamage       += eff.lightningMoreDamage ?? 0
      b.moreActionSpeed  += eff.lightningMoreActionSpeed ?? 0
      b.electrifyChance            += eff.lightningElectrifyChance ?? 0
      b.electrifyActionSpeed       += eff.lightningElectrifyActionSpeed ?? 0
      b.electrifyDurationIncrease  += eff.lightningElectrifyDurationIncrease ?? 0
      b.electrifyDamageReduction   += eff.lightningElectrifyDamageReduction ?? 0
      b.actionSpeedIncrease += eff.lightningActionSpeedIncrease ?? 0
    }
  }
  return b
}

// ── Cold mastery node effects ─────────────────────────────────────────────
// Tree 0: Cold Damage (full)  Tree 1: Frost (full)  Tree 2: Shatter (short)  Tree 3: Frozen Armor (short)

const COLD_EFFECTS: Partial<Record<number, TreeEffects>> = {
  0: {  // Cold Damage (full — mirrors fire damage tree 0)
    0:  { coldDamageIncrease: 5 },
    1:  { coldActionSpeedIncrease: 3 },
    2:  { coldDamageIncrease: 5, coldFrostApplyChance: 5 },
    3:  { coldDamageIncrease: 5 },
    4:  { coldActionSpeedIncrease: 3 },
    5:  { coldMoreDamage: 10 },
    6:  { coldDamageIncrease: 5 },
    7:  { coldActionSpeedIncrease: 3 },
    8:  { coldDamageIncrease: 12 },
    9:  { coldDamageIncrease: 5 },
    10: { coldActionSpeedIncrease: 3 },
    11: { coldFrostedVulnerable: 20 },
    // 12-15: key nodes — not yet defined
  },
  1: {  // Frost (full — mirrors electrocution tree with slow instead of damage-taken)
    0:  { coldFrostApplyChance: 5 },
    1:  { coldFrostSlowIncrease: 3 },
    2:  { coldFrostSlowIncrease: 5, coldFrostDurationIncrease: 10 },
    3:  { coldFrostApplyChance: 5 },
    4:  { coldFrostSlowIncrease: 3 },
    5:  { coldFrostSlowIncrease: 8, coldFrostDurationIncrease: 20 },
    6:  { coldFrostApplyChance: 5 },
    7:  { coldFrostSlowIncrease: 3 },
    8:  { coldFrostApplyChance: 15 },
    9:  { coldFrostApplyChance: 5 },
    10: { coldFrostSlowIncrease: 3 },
    11: { coldFrostSlowMore: 15 },
    // Key nodes (mirror electrocution tree with slow instead of damage-taken).
    // 12-13 flank the first major (node 5); 14-15 flank the second major (node 11).
    12: { coldFrostSlowIncrease: 5, coldFrostDurationMult: 0.9 },
    13: { coldFrostDurationMult: 1.2 },
    14: { coldFrostedDealLess: 10 },
    15: { coldFrostSlowIncrease: 5 },
  },
  2: {  // Shatter (short tree — line nodes 0-5, key nodes 12-13)
    0: { coldShatterChance: 5 },
    1: { coldShatterDamagePctLife: 2 },
    2: { coldShatterChance: 8, coldShatterRangeIncrease: 20 },
    3: { coldShatterChance: 5 },
    4: { coldShatterDamagePctLife: 2 },
    5: { coldShatterChance: 10, coldShatterDamagePctLife: 3 },
    // 12-13: key nodes — not yet defined
  },
  3: {  // Frozen Armor (short tree — line nodes 0-5, key nodes 12-13)
    0: { frozenArmorFrostsReduction: 20 },
    1: { frozenArmorDmgReductionPerStack: 1 },
    2: { frozenArmorDoubleStackChance: 30, frozenArmorSlowerDepletion: 20 },
    3: { frozenArmorFrostsReduction: 20 },
    4: { frozenArmorDmgReductionPerStack: 1 },
    5: { frozenArmorMaxStacksBonus: 5 },
    // 12-13: key nodes — not yet defined
  },
}

export function getColdNodeEffect(treeIdx: number, nodeIdx: number): NodeEffect {
  return COLD_EFFECTS[treeIdx]?.[nodeIdx] ?? {}
}

export function computeColdBonuses(nodes: number[][], dumpedPoints = 0): ColdBonuses {
  const b: ColdBonuses = {
    damageIncrease: 0,
    moreDamage: dumpedPoints * MASTERY_DUMP.cold.rate,
    actionSpeedIncrease: 0,
    frostApplyChance: 0,
    frostedVulnerable: 0,
    frostSlowIncrease: 0,
    frostSlowMore: 0,
    frostDurationIncrease: 0,
    frostDurationMult: 1,
    frostedDealLess: 0,
    shatterChance: 0,
    shatterDamagePctLife: 0,
    shatterRangeIncrease: 0,
    frozenArmorDmgReductionPerStack: 0,
    frozenArmorMaxStacksBonus: 0,
    frozenArmorFrostsReduction: 0,
    frozenArmorDoubleStackChance: 0,
    frozenArmorSlowerDepletion: 0,
  }
  for (let treeIdx = 0; treeIdx < nodes.length; treeIdx++) {
    for (const nodeIdx of nodes[treeIdx]) {
      const eff = getColdNodeEffect(treeIdx, nodeIdx)
      b.damageIncrease             += eff.coldDamageIncrease ?? 0
      b.moreDamage                 += eff.coldMoreDamage ?? 0
      b.actionSpeedIncrease        += eff.coldActionSpeedIncrease ?? 0
      b.frostApplyChance           += eff.coldFrostApplyChance ?? 0
      b.frostedVulnerable          += eff.coldFrostedVulnerable ?? 0
      b.frostSlowIncrease          += eff.coldFrostSlowIncrease ?? 0
      b.frostSlowMore              += eff.coldFrostSlowMore ?? 0
      b.frostDurationIncrease      += eff.coldFrostDurationIncrease ?? 0
      if (eff.coldFrostDurationMult !== undefined) b.frostDurationMult *= eff.coldFrostDurationMult
      b.frostedDealLess            += eff.coldFrostedDealLess ?? 0
      b.shatterChance              += eff.coldShatterChance ?? 0
      b.shatterDamagePctLife       += eff.coldShatterDamagePctLife ?? 0
      b.shatterRangeIncrease       += eff.coldShatterRangeIncrease ?? 0
      b.frozenArmorDmgReductionPerStack += eff.frozenArmorDmgReductionPerStack ?? 0
      b.frozenArmorMaxStacksBonus  += eff.frozenArmorMaxStacksBonus ?? 0
      b.frozenArmorFrostsReduction += eff.frozenArmorFrostsReduction ?? 0
      b.frozenArmorDoubleStackChance += eff.frozenArmorDoubleStackChance ?? 0
      b.frozenArmorSlowerDepletion += eff.frozenArmorSlowerDepletion ?? 0
    }
  }
  return b
}

// ── Strike mastery node effects ───────────────────────────────────────────
// Tree 0: Strike Damage (full)  Tree 1: Frenzy (full)  Tree 2-4: not yet implemented

const STRIKE_EFFECTS: Partial<Record<number, TreeEffects>> = {
  0: {  // Strike Damage
    0:  { strikeDamageIncrease: 5 },
    1:  { strikeDoubleDamageChance: 5 },
    2:  { strikeDamageIncrease: 12 },
    3:  { strikeDamageIncrease: 5 },
    4:  { strikeDoubleDamageChance: 5 },
    5:  { strikeMoreDamage: 20 },
    6:  { strikeDamageIncrease: 5 },
    7:  { strikeDoubleDamageChance: 5 },
    8:  { strikeDoubleDamageChance: 5, strikeDamageIncrease: 5, strikeActionSpeedIncrease: 5 },
    9:  { strikeDamageIncrease: 5 },
    10: { strikeDoubleDamageChance: 5 },
    11: { strikeAfflictionChanceIncrease: 20 },
  },
  1: {  // Frenzy
    0:  { strikeFrenzyChance: 5 },
    1:  { frenzyDamagePerCharge: 1, frenzySpeedPerCharge: 1 },
    2:  { strikeFrenzyChance: 5, frenzyFlatDamage: 10, frenzyFlatSpeed: 10 },
    3:  { strikeFrenzyChance: 5 },
    4:  { frenzyDamagePerCharge: 1, frenzySpeedPerCharge: 1 },
    5:  { frenzyAfflictionChancePerCharge: 1 },
    6:  { strikeFrenzyChance: 5 },
    7:  { frenzyDamagePerCharge: 1, frenzySpeedPerCharge: 1 },
    8:  { strikeFrenzyChance: 5, frenzyDurationIncrease: 20, frenzyDamagePerCharge: 1, frenzySpeedPerCharge: 1 },
    9:  { strikeFrenzyChance: 5 },
    10: { frenzyDamagePerCharge: 1, frenzySpeedPerCharge: 1 },
    11: { frenzyMaxChargesBonus: 10 },
  },
  2: {  // Strike Range (short tree — line nodes 0-5, key nodes 12-13)
    0: { strikeRangeIncrease: 5 },
    1: { strikeActionSpeedIncrease: 3 },
    2: { strikeRangeIncrease: 5, strikeDamageIncrease: 5 },
    3: { strikeRangeIncrease: 5 },
    4: { strikeActionSpeedIncrease: 3 },
    5: { strikeMoreRange: 10, strikeMoreActionSpeed: 5 },
    // 12-13: key nodes — not yet defined
  },
  3: {  // Additional Target (short tree — line nodes 0-5, key nodes 12-13)
    0: { strikeAdditionalTargetChance: 5 },
    1: { strikeActionSpeedIncrease: 3 },
    2: { strikeAdditionalTargetChance: 10 },
    3: { strikeAdditionalTargetChance: 5 },
    4: { strikeActionSpeedIncrease: 3 },
    5: { strikeAdditionalTargetMore: 10 },
    // 12-13: key nodes — not yet defined
  },
}

export function getStrikeNodeEffect(treeIdx: number, nodeIdx: number): NodeEffect {
  return STRIKE_EFFECTS[treeIdx]?.[nodeIdx] ?? {}
}

export function computeStrikeBonuses(nodes: number[][], dumpedPoints = 0): StrikeBonuses {
  const b: StrikeBonuses = {
    damageIncrease: 0, moreDamage: 0, doubleDamageChance: 0,
    actionSpeedIncrease: 0, afflictionChanceIncrease: 0,
    frenzyChance: 0, frenzyDamagePerCharge: 0, frenzySpeedPerCharge: 0,
    frenzyFlatDamage: 0, frenzyFlatSpeed: 0,
    frenzyAfflictionChancePerCharge: 0, frenzyDurationIncrease: 0, frenzyMaxChargesBonus: 0,
    rangeIncrease: 0, moreRange: 0, moreActionSpeed: dumpedPoints * MASTERY_DUMP.strike.rate,
    additionalTargetChance: 0, additionalTargetMore: 0,
  }
  for (let treeIdx = 0; treeIdx < nodes.length; treeIdx++) {
    for (const nodeIdx of nodes[treeIdx]) {
      const eff = getStrikeNodeEffect(treeIdx, nodeIdx)
      b.damageIncrease              += eff.strikeDamageIncrease ?? 0
      b.moreDamage                  += eff.strikeMoreDamage ?? 0
      b.doubleDamageChance          += eff.strikeDoubleDamageChance ?? 0
      b.actionSpeedIncrease         += eff.strikeActionSpeedIncrease ?? 0
      b.afflictionChanceIncrease    += eff.strikeAfflictionChanceIncrease ?? 0
      b.frenzyChance                += eff.strikeFrenzyChance ?? 0
      b.frenzyDamagePerCharge       += eff.frenzyDamagePerCharge ?? 0
      b.frenzySpeedPerCharge        += eff.frenzySpeedPerCharge ?? 0
      b.frenzyFlatDamage            += eff.frenzyFlatDamage ?? 0
      b.frenzyFlatSpeed             += eff.frenzyFlatSpeed ?? 0
      b.frenzyAfflictionChancePerCharge += eff.frenzyAfflictionChancePerCharge ?? 0
      b.frenzyDurationIncrease      += eff.frenzyDurationIncrease ?? 0
      b.frenzyMaxChargesBonus       += eff.frenzyMaxChargesBonus ?? 0
      b.rangeIncrease               += eff.strikeRangeIncrease ?? 0
      b.moreRange                   += eff.strikeMoreRange ?? 0
      b.moreActionSpeed             += eff.strikeMoreActionSpeed ?? 0
      b.additionalTargetChance      += eff.strikeAdditionalTargetChance ?? 0
      b.additionalTargetMore        += eff.strikeAdditionalTargetMore ?? 0
    }
  }
  return b
}

// ── Area mastery node effects ─────────────────────────────────────────────
// Tree 0: Area Damage (full)  Tree 1: Area Size (full)  Tree 2: Tremor (short)

const AREA_EFFECTS: Partial<Record<number, TreeEffects>> = {
  0: {  // Area Damage (full tree — line nodes 0-11, key nodes 12-15)
    0:  { areaDamageIncrease: 5 },
    1:  { areaDoubleDamageChance: 5 },
    2:  { areaDamageIncrease: 12 },
    3:  { areaDamageIncrease: 5 },
    4:  { areaDoubleDamageChance: 5 },
    5:  { areaMoreDamage: 20 },
    6:  { areaDamageIncrease: 5 },
    7:  { areaDoubleDamageChance: 5 },
    8:  { areaDoubleDamageChance: 5, areaDamageIncrease: 5, areaSizeIncrease: 5 },
    9:  { areaDamageIncrease: 5 },
    10: { areaDoubleDamageChance: 5 },
    11: { areaMoreDamage: 30, areaLessActionSpeed: 15 },
    // 12-15: key nodes — not yet defined
  },
  1: {  // Area Size (full tree — line nodes 0-11, key nodes 12-15)
    0:  { areaSizeIncrease: 5 },
    1:  { areaDamageIncrease: 5 },
    2:  { areaSizeIncrease: 12 },
    3:  { areaSizeIncrease: 5 },
    4:  { areaDamageIncrease: 5 },
    5:  { areaMoreSize: 15 },
    6:  { areaSizeIncrease: 5 },
    7:  { areaDamageIncrease: 5 },
    8:  { areaSizeIncrease: 8, areaDamageIncrease: 5 },
    9:  { areaSizeIncrease: 5 },
    10: { areaDamageIncrease: 5 },
    11: { areaMoreSize: 10, areaMoreDamage: 10, areaLessActionSpeed: 10 },
    // 12-15: key nodes — not yet defined
  },
  2: {  // Tremor (short tree — line nodes 0-5, key nodes 12-13)
    0: { areaTremorChance: 5 },
    1: { areaTremorDamage: 5 },
    2: { areaTremorChance: 8, areaTremorSize: 8 },
    3: { areaTremorChance: 5 },
    4: { areaTremorDamage: 5 },
    5: { areaTremorChance: 7, areaTremorSize: 7, areaTremorDamage: 7 },
    // 12-13: key nodes — not yet defined
  },
  3: {  // Knockback (short tree — line nodes 0-5, key nodes 12-13)
    0: { areaKnockbackChance: 10 },
    1: { areaKnockbackMoveSlowAmount: 10 },
    2: { areaKnockbackChance: 15, areaDamageIncrease: 15 },
    3: { areaKnockbackChance: 10 },
    4: { areaKnockbackMoveSlowAmount: 10 },
    5: { areaKnockbackMoreRange: 30, areaKnockbackDamageReduction: 10 },
    // 12-13: key nodes — not yet defined
  },
}

export function getAreaNodeEffect(treeIdx: number, nodeIdx: number): NodeEffect {
  return AREA_EFFECTS[treeIdx]?.[nodeIdx] ?? {}
}

export function computeAreaBonuses(nodes: number[][], dumpedPoints = 0): AreaBonuses {
  const b: AreaBonuses = {
    damageIncrease: 0,
    moreDamage: 0,
    doubleDamageChance: 0,
    sizeIncrease: 0,
    moreSize: dumpedPoints * MASTERY_DUMP.area.rate,
    lessActionSpeed: 0,
    tremorChance: 0,
    tremorDamage: 0,
    tremorSize: 0,
    knockbackChance: 0,
    knockbackMoveSlowAmount: 0,
    knockbackMoreRange: 0,
    knockbackDamageReduction: 0,
  }
  for (let treeIdx = 0; treeIdx < nodes.length; treeIdx++) {
    for (const nodeIdx of nodes[treeIdx]) {
      const eff = getAreaNodeEffect(treeIdx, nodeIdx)
      b.damageIncrease         += eff.areaDamageIncrease ?? 0
      b.moreDamage             += eff.areaMoreDamage ?? 0
      b.doubleDamageChance     += eff.areaDoubleDamageChance ?? 0
      b.sizeIncrease           += eff.areaSizeIncrease ?? 0
      b.moreSize               += eff.areaMoreSize ?? 0
      b.lessActionSpeed        += eff.areaLessActionSpeed ?? 0
      b.tremorChance           += eff.areaTremorChance ?? 0
      b.tremorDamage           += eff.areaTremorDamage ?? 0
      b.tremorSize             += eff.areaTremorSize ?? 0
      b.knockbackChance        += eff.areaKnockbackChance ?? 0
      b.knockbackMoveSlowAmount += eff.areaKnockbackMoveSlowAmount ?? 0
      b.knockbackMoreRange     += eff.areaKnockbackMoreRange ?? 0
      b.knockbackDamageReduction += eff.areaKnockbackDamageReduction ?? 0
    }
  }
  return b
}

// ── Physical mastery node effects ─────────────────────────────────────────
// Tree 0: Physical Damage (short)  Tree 1-4: not yet implemented

const PHYSICAL_EFFECTS: Partial<Record<number, TreeEffects>> = {
  0: {  // Physical Damage (full tree — line nodes 0-11, key nodes 12-15)
    0:  { physicalDamageIncrease: 5 },
    1:  { physicalActionSpeedIncrease: 3 },
    2:  { physicalDamageIncrease: 5, physicalBleedApplyChance: 5 },
    3:  { physicalDamageIncrease: 5 },
    4:  { physicalActionSpeedIncrease: 3 },
    5:  { physicalMoreDamage: 10 },
    6:  { physicalDamageIncrease: 5 },
    7:  { physicalActionSpeedIncrease: 3 },
    8:  { physicalDamageIncrease: 12 },
    9:  { physicalDamageIncrease: 5 },
    10: { physicalActionSpeedIncrease: 3 },
    11: { physicalBleedingTakeMore: 10 },
    // 12-15: key nodes — not yet defined
  },
  1: {  // Bleed (full tree — line nodes 0-11, key nodes 12-15)
    0:  { physicalBleedApplyChance: 5 },
    1:  { physicalBleedDamageIncrease: 15 },
    2:  { physicalBleedDamageIncrease: 30, physicalBleedDurationIncrease: 10 },
    3:  { physicalBleedApplyChance: 5 },
    4:  { physicalBleedDamageIncrease: 15 },
    5:  { physicalBleedMoreDamage: 30 },
    6:  { physicalBleedApplyChance: 5 },
    7:  { physicalBleedDamageIncrease: 15 },
    8:  { physicalBleedDamageIncrease: 60 },
    9:  { physicalBleedApplyChance: 5 },
    10: { physicalBleedDamageIncrease: 15 },
    11: { physicalBleedIgnoreResistance: true },
    12: { physicalBleedMoreDamage: 30, physicalBleedDurationMult: 0.5 },
    13: { physicalBleedDurationMult: 2, physicalBleedLessDamage: 30 },
    14: { physicalBleedDamageMult: 2, physicalSuppressHitDamage: true },
    15: { physicalBleedMoreDamage: 10 },
  },
  2: {  // Resistance Breaking (short tree — line nodes 0-5, key nodes 12-13)
    0: { physicalResistBreakChance: 5 },
    1: { physicalDamageIncrease: 5 },
    2: { physicalResistBreakChance: 7, physicalActionSpeedIncrease: 3 },
    3: { physicalResistBreakChance: 5 },
    4: { physicalDamageIncrease: 5 },
    5: { physicalResistBreakSlowAtZero: 20 },
    // 12-13: key nodes — not yet defined
  },
  3: {  // Bloodlust (short tree — line nodes 0-5, key nodes 12-13)
    0: { physicalBloodlustChance: 5 },
    1: { physicalBloodlustActionSpeed: 5 },
    2: { physicalBloodlustActionSpeed: 5, physicalBloodlustDamage: 12, physicalBloodlustBleedChance: 10 },
    3: { physicalBloodlustChance: 5 },
    4: { physicalBloodlustActionSpeed: 5 },
    5: { physicalBloodlustActionSpeed: 5, physicalBloodlustDamage: 12, physicalBloodlustDurationIncrease: 25 },
    // 12-13: key nodes — not yet defined
  },
}

export function getPhysicalNodeEffect(treeIdx: number, nodeIdx: number): NodeEffect {
  return PHYSICAL_EFFECTS[treeIdx]?.[nodeIdx] ?? {}
}

// ── Rot mastery node effects ───────────────────────────────────────────────
// Tree 0: Rot Damage (full)  Tree 1: Poison (full)
// Tree 2: Weakening (short)  Tree 3: Green Veins (short)

const ROT_EFFECTS: Partial<Record<number, TreeEffects>> = {
  0: {  // Rot Damage (full tree — clone of Physical Damage tree 0)
    0:  { rotDamageIncrease: 5 },
    1:  { rotActionSpeedIncrease: 3 },
    2:  { rotDamageIncrease: 5, rotPoisonApplyChance: 5 },
    3:  { rotDamageIncrease: 5 },
    4:  { rotActionSpeedIncrease: 3 },
    5:  { rotMoreDamage: 10 },
    6:  { rotDamageIncrease: 5 },
    7:  { rotActionSpeedIncrease: 3 },
    8:  { rotDamageIncrease: 12 },
    9:  { rotDamageIncrease: 5 },
    10: { rotActionSpeedIncrease: 3 },
    11: { rotPoisonedTakeMore: 10 },
    // 12-15: key nodes — not yet defined
  },
  1: {  // Poison (full tree — clone of Bleed tree 1; node 11 differs)
    0:  { rotPoisonApplyChance: 5 },
    1:  { rotPoisonDamageIncrease: 15 },
    2:  { rotPoisonDamageIncrease: 30, rotPoisonDurationIncrease: 10 },
    3:  { rotPoisonApplyChance: 5 },
    4:  { rotPoisonDamageIncrease: 15 },
    5:  { rotPoisonMoreDamage: 30 },
    6:  { rotPoisonApplyChance: 5 },
    7:  { rotPoisonDamageIncrease: 15 },
    8:  { rotPoisonDamageIncrease: 60 },
    9:  { rotPoisonApplyChance: 5 },
    10: { rotPoisonDamageIncrease: 15 },
    11: { rotPoisonApplyChance: 15 },  // differs: "+15% chance to apply poison" (not ignore-resistance)
    12: { rotPoisonMoreDamage: 30, rotPoisonDurationMult: 0.5 },
    13: { rotPoisonDurationMult: 2, rotPoisonLessDamage: 30 },
    14: { rotPoisonDamageMult: 2, rotSuppressHitDamage: true },
    15: { rotPoisonMoreDamage: 10 },
  },
  2: {  // Weakening (short tree — line nodes 0-5, key nodes 12-13)
    0: { rotWeakeningRotDamageTaken: 5 },
    1: { rotWeakeningDealLess: 5 },
    2: { rotWeakeningSpeedReduction: 20 },
    3: { rotWeakeningRotDamageTaken: 5 },
    4: { rotWeakeningDealLess: 5 },
    5: { rotWeakeningResistPerStack: 1 },
    // 12-13: key nodes — not yet defined
  },
  3: {  // Green Veins (short tree — line nodes 0-5, key nodes 12-13)
    0: { rotGreenVeinsChanceOnPoison: 20 },
    1: { rotGreenVeinsDamagePerStack: 1 },
    2: { rotGreenVeinsDurationIncrease: 50, rotGreenVeinsTriggerReduction: 50 },
    3: { rotGreenVeinsChanceOnPoison: 20 },
    4: { rotGreenVeinsDamagePerStack: 1 },
    5: { rotGreenVeinsMaxStacksBonus: 25, rotGreenVeinsChanceOnPoison: 30 },
    // 12-13: key nodes — not yet defined
  },
}

export function getRotNodeEffect(treeIdx: number, nodeIdx: number): NodeEffect {
  return ROT_EFFECTS[treeIdx]?.[nodeIdx] ?? {}
}

export function computeRotBonuses(nodes: number[][], dumpedPoints = 0): RotBonuses {
  const b: RotBonuses = {
    damageIncrease: 0, moreDamage: dumpedPoints * MASTERY_DUMP.rot.rate,
    actionSpeedIncrease: 0, poisonApplyChance: 0, poisonedTakeMore: 0,
    poisonDamageIncrease: 0, poisonDurationIncrease: 0, poisonMoreDamage: 0,
    poisonDurationMult: 1, poisonLessDamage: 0, poisonDamageMult: 1,
    suppressRotHitDamage: false,
    weakeningRotDamageTaken: 0, weakeningDealLess: 0, weakeningSpeedReduction: 0,
    weakeningResistPerStack: 0,
    greenVeinsChanceOnPoison: 0, greenVeinsDamagePerStack: 0,
    greenVeinsDurationIncrease: 0, greenVeinsTriggerReduction: 0, greenVeinsMaxStacksBonus: 0,
  }
  for (let treeIdx = 0; treeIdx < nodes.length; treeIdx++) {
    for (const nodeIdx of nodes[treeIdx]) {
      const eff = getRotNodeEffect(treeIdx, nodeIdx)
      b.damageIncrease              += eff.rotDamageIncrease ?? 0
      b.moreDamage                  += eff.rotMoreDamage ?? 0
      b.actionSpeedIncrease         += eff.rotActionSpeedIncrease ?? 0
      b.poisonApplyChance           += eff.rotPoisonApplyChance ?? 0
      b.poisonedTakeMore            += eff.rotPoisonedTakeMore ?? 0
      b.poisonDamageIncrease        += eff.rotPoisonDamageIncrease ?? 0
      b.poisonDurationIncrease      += eff.rotPoisonDurationIncrease ?? 0
      b.poisonMoreDamage            += eff.rotPoisonMoreDamage ?? 0
      if (eff.rotPoisonDurationMult !== undefined) b.poisonDurationMult *= eff.rotPoisonDurationMult
      b.poisonLessDamage            += eff.rotPoisonLessDamage ?? 0
      if (eff.rotPoisonDamageMult !== undefined) b.poisonDamageMult *= eff.rotPoisonDamageMult
      if (eff.rotSuppressHitDamage) b.suppressRotHitDamage = true
      b.weakeningRotDamageTaken     += eff.rotWeakeningRotDamageTaken ?? 0
      b.weakeningDealLess           += eff.rotWeakeningDealLess ?? 0
      b.weakeningSpeedReduction     += eff.rotWeakeningSpeedReduction ?? 0
      b.weakeningResistPerStack     += eff.rotWeakeningResistPerStack ?? 0
      b.greenVeinsChanceOnPoison    += eff.rotGreenVeinsChanceOnPoison ?? 0
      b.greenVeinsDamagePerStack    += eff.rotGreenVeinsDamagePerStack ?? 0
      b.greenVeinsDurationIncrease  += eff.rotGreenVeinsDurationIncrease ?? 0
      b.greenVeinsTriggerReduction  += eff.rotGreenVeinsTriggerReduction ?? 0
      b.greenVeinsMaxStacksBonus    += eff.rotGreenVeinsMaxStacksBonus ?? 0
    }
  }
  return b
}

export function computePhysicalBonuses(nodes: number[][], dumpedPoints = 0): PhysicalBonuses {
  const b: PhysicalBonuses = {
    damageIncrease: 0, moreDamage: dumpedPoints * MASTERY_DUMP.physical.rate,
    actionSpeedIncrease: 0, bleedApplyChance: 0,
    bleedDamageIncrease: 0, bleedDurationIncrease: 0, bleedMoreDamage: 0, bleedIgnoreResistance: false,
    bleedingTakeMore: 0, resistBreakChance: 0, resistBreakSlowAtZero: 0,
    bloodlustChance: 0, bloodlustActionSpeed: 0, bloodlustDamage: 0,
    bloodlustBleedChance: 0, bloodlustDurationIncrease: 0,
    bleedDurationMult: 1, bleedLessDamage: 0, bleedDamageMult: 1,
    suppressPhysicalHitDamage: false,
  }
  for (let treeIdx = 0; treeIdx < nodes.length; treeIdx++) {
    for (const nodeIdx of nodes[treeIdx]) {
      const eff = getPhysicalNodeEffect(treeIdx, nodeIdx)
      b.damageIncrease          += eff.physicalDamageIncrease ?? 0
      b.moreDamage              += eff.physicalMoreDamage ?? 0
      b.actionSpeedIncrease     += eff.physicalActionSpeedIncrease ?? 0
      b.bleedApplyChance        += eff.physicalBleedApplyChance ?? 0
      b.bleedDamageIncrease     += eff.physicalBleedDamageIncrease ?? 0
      b.bleedDurationIncrease   += eff.physicalBleedDurationIncrease ?? 0
      b.bleedMoreDamage         += eff.physicalBleedMoreDamage ?? 0
      if (eff.physicalBleedIgnoreResistance) b.bleedIgnoreResistance = true
      b.bleedingTakeMore        += eff.physicalBleedingTakeMore ?? 0
      b.resistBreakChance       += eff.physicalResistBreakChance ?? 0
      b.resistBreakSlowAtZero   += eff.physicalResistBreakSlowAtZero ?? 0
      b.bloodlustChance         += eff.physicalBloodlustChance ?? 0
      b.bloodlustActionSpeed    += eff.physicalBloodlustActionSpeed ?? 0
      b.bloodlustDamage         += eff.physicalBloodlustDamage ?? 0
      b.bloodlustBleedChance    += eff.physicalBloodlustBleedChance ?? 0
      b.bloodlustDurationIncrease += eff.physicalBloodlustDurationIncrease ?? 0
      if (eff.physicalBleedDurationMult !== undefined) b.bleedDurationMult *= eff.physicalBleedDurationMult
      b.bleedLessDamage += eff.physicalBleedLessDamage ?? 0
      if (eff.physicalBleedDamageMult !== undefined) b.bleedDamageMult *= eff.physicalBleedDamageMult
      if (eff.physicalSuppressHitDamage) b.suppressPhysicalHitDamage = true
    }
  }
  return b
}

// ── Movement mastery node effects ─────────────────────────────────────────
// Tree 0: Movement Speed (large)  Tree 1: Dash (short)  Tree 2: Kite (short)

const MOVEMENT_EFFECTS: Partial<Record<number, TreeEffects>> = {
  0: {  // Movement Speed (full tree — line nodes 0-11, key nodes 12-15)
    0:  { moveSpeedIncrease: 5 },
    1:  { moveSpeedIncrease: 5 },
    2:  { moveSpeedIncrease: 12 },
    3:  { moveSpeedIncrease: 5 },
    4:  { moveSpeedIncrease: 5 },
    5:  { moveMoreSpeed: 15 },
    6:  { moveSpeedIncrease: 5 },
    7:  { moveSpeedIncrease: 5 },
    8:  { moveSpeedIncrease: 12 },
    9:  { moveSpeedIncrease: 5 },
    10: { moveSpeedIncrease: 5 },
    11: { moveDebuffEfficiencyReduce: 50 },
    12: { moveFirstActionMoreDamage: 10 },
    13: { moveStationaryMoreDamagePerAction: 1 },
    14: { moveImmuneToSlowing: true },
    15: { moveMoreSpeed: 15 },
  },
  1: {  // Dash (short tree — line nodes 0-5, key nodes 12-13)
    0: { dashChargeChance: 20 },
    1: { dashDistanceIncrease: 10 },
    2: { dashChargeChance: 30, dashDistanceIncrease: 10 },
    3: { dashChargeChance: 20 },
    4: { dashDistanceIncrease: 10 },
    5: { dashChargeChance: 50 },
    12: { dashExtraCharge: true, dashLessDistance: 20 },
    13: { dashCloseGapToTarget: true },
  },
  2: {  // Kite (short tree — line nodes 0-5, key nodes 12-13)
    0: { kiteSpeedFraction: 0.25 },
    1: { kiteSpeedFraction: 0.25 },
    2: { kiteResistance: 5 },
    3: { kiteSpeedFraction: 0.25 },
    4: { kiteSpeedFraction: 0.25 },
    5: { kiteAllowDash: true },
    12: { kiteFullRange: true },
    13: { kiteMoreActionSpeed: 5 },
  },
}

export function getMovementNodeEffect(treeIdx: number, nodeIdx: number): NodeEffect {
  return MOVEMENT_EFFECTS[treeIdx]?.[nodeIdx] ?? {}
}

export function computeMovementBonuses(nodes: number[][], dumpedPoints = 0): MovementBonuses {
  const b: MovementBonuses = {
    moveSpeedIncrease: 0,
    moveMoreSpeed: dumpedPoints * MASTERY_DUMP.movement.rate,
    moveDebuffEfficiencyReduce: 0,
    dashChargeChance: 0,
    dashDistanceIncrease: 0,
    kiteSpeedFraction: 0,
    kiteResistance: 0,
    kiteAllowDash: false,
    firstActionMoreDamage: 0,
    stationaryMoreDamagePerAction: 0,
    immuneToSlowing: false,
    dashExtraCharge: false,
    dashLessDistance: 0,
    dashCloseGapToTarget: false,
    kiteFullRange: false,
    kiteMoreActionSpeed: 0,
  }
  for (let treeIdx = 0; treeIdx < nodes.length; treeIdx++) {
    for (const nodeIdx of nodes[treeIdx]) {
      const eff = getMovementNodeEffect(treeIdx, nodeIdx)
      b.moveSpeedIncrease              += eff.moveSpeedIncrease ?? 0
      b.moveMoreSpeed                  += eff.moveMoreSpeed ?? 0
      b.moveDebuffEfficiencyReduce     += eff.moveDebuffEfficiencyReduce ?? 0
      b.dashChargeChance               += eff.dashChargeChance ?? 0
      b.dashDistanceIncrease           += eff.dashDistanceIncrease ?? 0
      b.kiteSpeedFraction              += eff.kiteSpeedFraction ?? 0
      b.kiteResistance                 += eff.kiteResistance ?? 0
      b.firstActionMoreDamage          += eff.moveFirstActionMoreDamage ?? 0
      b.stationaryMoreDamagePerAction  += eff.moveStationaryMoreDamagePerAction ?? 0
      b.dashLessDistance               += eff.dashLessDistance ?? 0
      if (eff.kiteFullRange)         b.kiteFullRange = true
      b.kiteMoreActionSpeed            += eff.kiteMoreActionSpeed ?? 0
      if (eff.kiteAllowDash)         b.kiteAllowDash = true
      if (eff.moveImmuneToSlowing)   b.immuneToSlowing = true
      if (eff.dashExtraCharge)       b.dashExtraCharge = true
      if (eff.dashCloseGapToTarget)  b.dashCloseGapToTarget = true
    }
  }
  b.kiteSpeedFraction = Math.min(1, b.kiteSpeedFraction)
  return b
}

// ── Node description text (shown in the node detail modal) ─────────────────

const ACTION_DESCRIPTIONS: Partial<Record<number, Partial<Record<number, string>>>> = {
  0: {
    0:  '+5% increased action damage',
    1:  '+5% chance for action to deal double damage',
    2:  '+12% increased action damage',
    3:  '+5% increased action damage',
    4:  '+5% chance for action to deal double damage',
    5:  '+20% more action damage',
    6:  '+5% increased action damage',
    7:  '+5% chance for action to deal double damage',
    8:  '+5% chance for action to deal double damage · +5% increased action damage · +5% increased action speed',
    9:  '+5% increased action damage',
    10: '+5% chance for action to deal double damage',
    11: 'Action hits have 20% increased chance to ignore all enemy damage mitigation',
    12: '+10% more action damage · 6% less action speed',
    13: '+10% more action damage · +20% more action mana cost',
    14: '+15% increased chance for an action to deal double damage',
    15: '+10% more action damage',
  },
  1: {
    0:  '+4% increased action speed',
    1:  '+3% increased chance for action to double action',
    2:  '+10% increased action speed',
    3:  '+4% increased action speed',
    4:  '+3% increased chance for action to double action',
    5:  '+20% more action speed',
    6:  '+4% increased action speed',
    7:  '+3% increased chance for action to double action',
    8:  '+4% increased action speed · +3% increased chance for action to double action · +5% increased action damage',
    9:  '+4% increased action speed',
    10: '+3% increased chance for action to double action',
    11: 'When double acting, the second action initial hit is guaranteed to trigger afflictions',
    12: '+10% more action speed · 10% less action damage',
    13: '+5% increased chance for action to double action',
    14: 'Double actions reroll for double action once',
    15: 'There are no double actions; double action chance is converted to double damage chance',
  },
  2: {
    0: 'Actions have +2% increased chance to trigger trance',
    1: 'Actions in trance: +5% chance to target an additional enemy · +5% increased damage · +5% increased action speed',
    2: 'Actions have +5% increased chance to trigger trance',
    3: 'Actions have +2% increased chance to trigger trance',
    4: 'Actions in trance: +5% chance to target an additional enemy · +5% increased damage · +5% increased action speed',
    5: 'Actions have +3% increased chance to trigger trance · Actions in trance: +8% chance to target an additional enemy · +8% increased damage · +8% increased action speed',
    12: 'Trance can stack with itself once · Trance duration halved',
    13: 'Actions have +5% increased chance to trigger trance',
  },
  3: {
    0: '+10% reduced action mana cost',
    1: '+10% increased chance for actions to cost no mana',
    2: 'Actions cost 0–33% reduced mana (random per action)',
    3: '+10% reduced action mana cost',
    4: '+10% increased chance for actions to cost no mana',
    5: '+10% reduced action mana cost · +10% increased chance for actions to cost no mana · Repeated actions ignore mana requirement',
    12: 'Mana cost reductions from this tree increase mana cost instead · Chance to cost no mana becomes chance to cost double mana',
    13: '30% less action mana cost',
  },
}

const CRIT_DESCRIPTIONS: Partial<Record<number, Partial<Record<number, string>>>> = {
  0: {  // Critical Damage
    0:  '+10% increased critical hit damage',
    1:  '+10% increased critical hit damage',
    2:  '+20% increased critical hit damage · +10% increased chance to perform a critical hit',
    3:  '+10% increased critical hit damage',
    4:  '+10% increased critical hit damage',
    5:  'Critical hits have +20% increased chance to ignore all enemy damage mitigation',
    6:  '+10% increased critical hit damage',
    7:  '+10% increased critical hit damage',
    8:  '+20% increased critical hit damage · +10% increased chance to perform a critical hit',
    9:  '+10% increased critical hit damage',
    10: '+10% increased critical hit damage',
    11: '+20% more critical hit damage',
    12: '+10% more critical hit damage',
    13: '+10% increased chance for critical hits to ignore all enemy damage mitigation',
    14: 'Critical hit damage bonus from this tree applies to affliction damage from critical hits instead of direct hits',
    15: 'Double damage becomes triple damage when a critical hit also rolls double damage',
  },
  1: {  // Critical Chance
    0:  '+10% increased chance to perform a critical hit',
    1:  '+10% increased chance to perform a critical hit',
    2:  '+20% increased chance to perform a critical hit · +10% increased critical hit damage',
    3:  '+10% increased chance to perform a critical hit',
    4:  '+10% increased chance to perform a critical hit',
    5:  '+3% base action critical hit chance',
    6:  '+10% increased chance to perform a critical hit',
    7:  '+10% increased chance to perform a critical hit',
    8:  '+20% increased chance to perform a critical hit · +10% increased critical hit damage',
    9:  '+10% increased chance to perform a critical hit',
    10: '+10% increased chance to perform a critical hit',
    11: '+20% more chance to perform a critical hit',
    12: '+2% base action critical hit chance',
    13: '+10% more chance to perform a critical hit',
    14: 'Critical hits apply a guaranteed affliction · Critical hits deal no extra damage',
    15: '+20% more chance to perform a critical hit against enemies with any affliction',
  },
}

const LIFE_DESCRIPTIONS: Partial<Record<number, Partial<Record<number, string>>>> = {
  0: {  // Maximum Life
    0:  '+5% increased maximum life',
    1:  '+5% physical and rot resistance',
    2:  '+12% increased maximum life',
    3:  '+5% increased maximum life',
    4:  '+5% elemental resistance',
    5:  '+30% more maximum life',
    6:  '+5% increased maximum life',
    7:  '+5% physical and rot resistance',
    8:  '+7% physical and rot resistance · +7% elemental resistance',
    9:  '+5% increased maximum life',
    10: '+5% elemental resistance',
    11: '+30% more maximum life',
    12: 'Increased and more life regeneration also apply to maximum life · You cannot steal life',
    13: '+20% more maximum life · 10% less action damage',
    14: '+1% increased maximum life per life level',
    15: '+10% more maximum life',
  },
  1: {  // Resistances
    0:  '+5% physical and rot resistance',
    1:  '+5% elemental resistance',
    2:  '+7% physical and rot resistance · +7% elemental resistance',
    3:  '+5% physical and rot resistance',
    4:  '+5% elemental resistance',
    5:  '5% of damage absorbed by your resistances is recovered as life',
    6:  '+5% physical and rot resistance',
    7:  '+5% elemental resistance',
    8:  '+7% physical and rot resistance · +7% elemental resistance',
    9:  '+5% physical and rot resistance',
    10: '+5% elemental resistance',
    11: 'Resistance reduction effects applied to you lose 50% effectiveness',
    12: '+7% physical and rot resistance · -7% elemental resistance',
    13: '+7% elemental resistance · -7% physical and rot resistance',
    14: '+7% to all resistances · 10% less maximum life',
    15: '+15% to all resistances · You cannot steal life',
  },
  2: {  // Life Regeneration
    0: '+5% increased life regeneration',
    1: '+5% increased life regeneration',
    2: '+12% increased life regeneration',
    3: '+5% increased life regeneration',
    4: '+5% increased life regeneration',
    5: '+0.3% of maximum life regenerated per second',
    12: 'Double life regeneration · 30% less maximum life stolen per hit',
    13: 'Double life regeneration · -5% to all resistances',
  },
  3: {  // Life Steal
    0: 'Steal +0.5% of action hit damage as life',
    1: '+5% increased life stolen',
    2: '+10% increased life steal cap',
    3: 'Steal +0.5% of action hit damage as life',
    4: '+5% increased life stolen',
    5: 'Stealing life has a 1% chance to trigger Feeding Frenzy',
    12: '+30% more maximum life stolen per hit · You cannot regenerate life',
    13: 'You can steal from affliction damage',
  },
}

const TYPE_KEY: Record<string, 'nodeSmall' | 'nodeStrong' | 'nodeMajor' | 'nodeKey'> = {
  small: 'nodeSmall', strong: 'nodeStrong', major: 'nodeMajor', key: 'nodeKey',
}

export function getMasteryDumpLabel(id: MasteryId): string {
  return t('masteryDump', id as keyof TranslationSchema['masteryDump'])
}

const BLOCK_DESCRIPTIONS: Partial<Record<number, Partial<Record<number, string>>>> = {
  0: {
    0:  '+4% increased chance to block hits',
    1:  '+100% increased block recovery speed',
    2:  '+6% increased chance to block hits · +5% increased amount of damage blocked',
    3:  '+4% increased chance to block hits',
    4:  '+100% increased block recovery speed',
    5:  '+10% increased chance to block hits',
    6:  '+4% increased chance to block hits',
    7:  '+100% increased block recovery speed',
    8:  '+6% increased chance to block hits · +5% increased amount of damage blocked',
    9:  '+4% increased chance to block hits',
    10: '+100% increased block recovery speed',
    11: '+10% increased chance to block hits',
  },
  1: {
    0:  '+6% increased amount of damage blocked',
    1:  '+100% increased block recovery speed',
    2:  '+12% increased amount of damage blocked',
    3:  '+6% increased amount of damage blocked',
    4:  '+100% increased block recovery speed',
    5:  'Blocked hits cannot trigger afflictions on you',
    6:  '+6% increased amount of damage blocked',
    7:  '+100% increased block recovery speed',
    8:  '+12% increased amount of damage blocked',
    9:  '+6% increased amount of damage blocked',
    10: '+100% increased block recovery speed',
    11: 'Blocked hits heal you for 20% of damage blocked',
  },
}

const MANA_DESCRIPTIONS: Partial<Record<number, Partial<Record<number, string>>>> = {
  0: {  // Maximum Mana
    0:  '+5% increased maximum mana',
    1:  '+2% increased maximum mana · +2% increased mana regeneration',
    2:  '+12% increased maximum mana',
    3:  '+5% increased maximum mana',
    4:  '+2% increased maximum mana · +2% increased mana regeneration',
    5:  '+20% more maximum mana',
    6:  '+5% increased maximum mana',
    7:  '+2% increased maximum mana · +2% increased mana regeneration',
    8:  '+15% increased maximum mana · +5% increased mana regeneration · +5% increased action speed',
    9:  '+5% increased maximum mana',
    10: '+2% increased maximum mana · +2% increased mana regeneration',
    11: '+20% more maximum mana · +3% more maximum life',
  },
  1: {  // Mana Shield
    0:  'Mana Shield absorbs +5% of incoming hit damage',
    1:  '5% reduced Mana Shield conversion cost',
    2:  'Mana Shield absorbs +10% of incoming hit damage',
    3:  'Mana Shield absorbs +5% of incoming hit damage',
    4:  '5% reduced Mana Shield conversion cost',
    5:  'Mana Shield now intercepts all damage sources',
    6:  'Mana Shield absorbs +5% of incoming hit damage',
    7:  '5% reduced Mana Shield conversion cost',
    8:  'Mana Shield absorbs +10% of incoming hit damage',
    9:  'Mana Shield absorbs +5% of incoming hit damage',
    10: '5% reduced Mana Shield conversion cost',
    11: 'Your resistances reduce the Mana Shield conversion cost',
  },
  2: {  // Mana Regeneration
    0: '+5% increased mana regeneration',
    1: '+5% increased mana regeneration',
    2: '+12% increased mana regeneration',
    3: '+5% increased mana regeneration',
    4: '+5% increased mana regeneration',
    5: '+10% chance for an action to replenish mana instead of depleting it',
  },
  3: {  // Mana Steal
    0: 'Steal +0.5% of action hit damage as mana',
    1: '+5% increased mana stolen',
    2: '+10% increased mana steal cap',
    3: 'Steal +0.5% of action hit damage as mana',
    4: '+5% increased mana stolen',
    5: 'Stealing mana has a 1% chance to trigger Feeding Frenzy',
  },
}

const FIRE_DESCRIPTIONS: Partial<Record<number, Partial<Record<number, string>>>> = {
  0: {  // Fire Damage
    0:  '+5% increased fire damage',
    1:  '+3% increased fire action speed',
    2:  '+5% increased fire damage · Fire actions have +5% chance to apply burn',
    3:  '+5% increased fire damage',
    4:  '+3% increased fire action speed',
    5:  '+10% more fire damage',
    6:  '+5% increased fire damage',
    7:  '+3% increased fire action speed',
    8:  '+12% increased fire damage',
    9:  '+5% increased fire damage',
    10: '+3% increased fire action speed',
    11: 'Burning enemies have 20% reduced fire resistance',
  },
  1: {  // Burning
    0:  'Fire actions have +5% chance to apply burn',
    1:  '+15% increased burn damage',
    2:  '+30% increased burn damage · +10% increased burn duration',
    3:  'Fire actions have +5% chance to apply burn',
    4:  '+15% increased burn damage',
    5:  '+30% more burn damage',
    6:  'Fire actions have +5% chance to apply burn',
    7:  '+15% increased burn damage',
    8:  'Burning enemies take +30% increased damage from all sources',
    9:  'Fire actions have +5% chance to apply burn',
    10: '+15% increased burn damage',
    11: 'Burning enemies splash 50% of their burn damage to nearby non-burning enemies',
    12: '+30% more burn damage · Half burn duration',
    13: 'Double burn duration · 30% less burn damage',
    14: 'Double burn damage · You deal no damage with hits',
    15: '+10% more burn damage',
  },
  2: {  // Burning Ground
    0: 'Fire actions have +5% chance to cause burning ground',
    1: '+45% increased burning ground damage',
    2: '+90% increased burning ground damage · +30% increased burning ground duration',
    3: 'Fire actions have +5% chance to cause burning ground',
    4: '+45% increased burning ground damage',
    5: 'Burning ground slows enemy movement and action speed by 20% · +30% more burning ground damage',
  },
  3: {  // Immolation
    0: 'Fire actions have +2% chance to trigger immolation',
    1: 'While immolating: +5% increased fire damage · +5% increased chance to burn',
    2: 'Immolation self-burn damage is halved (×0.5)',
    3: 'Fire actions have +2% chance to trigger immolation',
    4: 'While immolating: +5% increased fire damage · +5% increased chance to burn',
    5: 'Fire actions have +5% chance to trigger immolation · While immolating: +10% increased fire damage · +10% increased chance to burn · Immolation self-burn damage is halved (×0.5)',
  },
}

const ROT_DESCRIPTIONS: Partial<Record<number, Partial<Record<number, string>>>> = {
  0: {  // Rot Damage
    0:  '+5% increased rot damage',
    1:  '+3% increased rot action speed',
    2:  '+5% increased rot damage · Rot actions have +5% chance to apply poison',
    3:  '+5% increased rot damage',
    4:  '+3% increased rot action speed',
    5:  '+10% more rot damage',
    6:  '+5% increased rot damage',
    7:  '+3% increased rot action speed',
    8:  '+12% increased rot damage',
    9:  '+5% increased rot damage',
    10: '+3% increased rot action speed',
    11: 'Poisoned enemies take +10% more rot damage',
  },
  1: {  // Poison
    0:  'Rot actions have +5% chance to apply poison',
    1:  '+15% increased poison damage',
    2:  '+30% increased poison damage · +10% increased poison duration',
    3:  'Rot actions have +5% chance to apply poison',
    4:  '+15% increased poison damage',
    5:  '+30% more poison damage',
    6:  'Rot actions have +5% chance to apply poison',
    7:  '+15% increased poison damage',
    8:  '+60% increased poison damage',
    9:  'Rot actions have +5% chance to apply poison',
    10: '+15% increased poison damage',
    11: 'Rot actions have +15% chance to apply poison',
    12: '+30% more poison damage · Half poison duration',
    13: 'Double poison duration · 30% less poison damage',
    14: 'Double poison damage · You deal no damage with hits',
    15: '+10% more poison damage',
  },
  2: {  // Weakening
    0: 'Poisoned enemies take 5% more rot damage',
    1: 'Poisoned enemies deal 5% less damage',
    2: 'Poisoned enemies have 20% reduced movement and action speed',
    3: 'Poisoned enemies take 5% more rot damage',
    4: 'Poisoned enemies deal 5% less damage',
    5: 'Enemy physical and rot resistance is reduced by 1% per poison stack on them',
  },
  3: {  // Green Veins
    0: '+20% chance to gain a Green Vein stack when applying poison',
    1: '+1% increased rot damage per Green Vein stack',
    2: 'Green Veins duration +50% · Green Veins trigger requirement −50%',
    3: '+20% chance to gain a Green Vein stack when applying poison',
    4: '+1% increased rot damage per Green Vein stack',
    5: 'Green Veins can have 25 more maximum stacks · +30% chance to gain a Green Vein stack when applying poison',
  },
}

const PHYSICAL_DESCRIPTIONS: Partial<Record<number, Partial<Record<number, string>>>> = {
  0: {
    0:  '+5% increased physical damage',
    1:  '+3% increased physical action speed',
    2:  '+5% increased physical damage · Physical actions have +5% chance to apply bleed',
    3:  '+5% increased physical damage',
    4:  '+3% increased physical action speed',
    5:  '+10% more physical damage',
    6:  '+5% increased physical damage',
    7:  '+3% increased physical action speed',
    8:  '+12% increased physical damage',
    9:  '+5% increased physical damage',
    10: '+3% increased physical action speed',
    11: 'Bleeding enemies take +10% more physical damage',
  },
  1: {
    0:  'Physical actions have +5% chance to apply bleed',
    1:  '+15% increased bleed damage',
    2:  '+30% increased bleed damage · +10% increased bleed duration',
    3:  'Physical actions have +5% chance to apply bleed',
    4:  '+15% increased bleed damage',
    5:  '+30% more bleed damage',
    6:  'Physical actions have +5% chance to apply bleed',
    7:  '+15% increased bleed damage',
    8:  '+60% increased bleed damage',
    9:  'Physical actions have +5% chance to apply bleed',
    10: '+15% increased bleed damage',
    11: 'Bleeding ignores enemy physical resistance',
    12: '+30% more bleed damage · Half bleed duration',
    13: 'Double bleed duration · 30% less bleed damage',
    14: 'Double bleed damage · You deal no damage with hits',
    15: '+10% more bleed damage',
  },
  2: {  // Resistance Breaking
    0: 'Physical actions have +5% chance to permanently reduce enemy physical and rot resistance by 1%',
    1: '+5% increased physical damage',
    2: 'Physical actions have +7% chance to permanently reduce enemy physical and rot resistance by 1% · +3% increased physical action speed',
    3: 'Physical actions have +5% chance to permanently reduce enemy physical and rot resistance by 1%',
    4: '+5% increased physical damage',
    5: 'Enemies at 0% physical and rot resistance have their action and movement speed reduced by 20%',
  },
  3: {  // Bloodlust
    0: '+5% increased chance to trigger Bloodlust when inflicting bleeding',
    1: 'Bloodlust grants +5% increased physical action speed',
    2: 'Bloodlust grants +5% increased physical action speed and +12% increased physical damage · Physical actions during Bloodlust have +10% increased chance to cause bleeding',
    3: '+5% increased chance to trigger Bloodlust when inflicting bleeding',
    4: 'Bloodlust grants +5% increased physical action speed',
    5: 'Bloodlust grants +5% increased physical action speed and +12% increased physical damage · +25% increased Bloodlust duration',
  },
}

const ENEMY_DESCRIPTIONS: Partial<Record<number, Partial<Record<number, string>>>> = {
  0: {
    0:  '+50% increased chance to spawn an additional enemy',
    1:  '+25% increased chance to spawn 2 additional enemies',
    2:  '+1 guaranteed enemy spawn',
    3:  '+50% increased chance to spawn an additional enemy',
    4:  '+25% increased chance to spawn 2 additional enemies',
    5:  '+2 guaranteed enemy spawns · One enemy spawn is at least strong',
    6:  '+50% increased chance to spawn an additional enemy',
    7:  '+25% increased chance to spawn 2 additional enemies',
    8:  '+1 guaranteed enemy spawn',
    9:  '+50% increased chance to spawn an additional enemy',
    10: '+25% increased chance to spawn 2 additional enemies',
    11: '+2 guaranteed enemy spawns · One enemy spawn is at least elite',
  },
  1: {
    0:  '+5% increased chance for an enemy to be strong',
    1:  '+10% increased chance for a strong enemy to be elite',
    2:  '+12% increased chance for an enemy to be strong',
    3:  '+5% increased chance for an enemy to be strong',
    4:  '+10% increased chance for a strong enemy to be elite',
    5:  'One enemy spawn is at least strong · One enemy spawn is at least elite',
    6:  '+5% increased chance for an enemy to be strong',
    7:  '+10% increased chance for a strong enemy to be elite',
    8:  '+12% increased chance for an enemy to be strong',
    9:  '+5% increased chance for an enemy to be strong',
    10: '+10% increased chance for a strong enemy to be elite',
    11: '+20% increased chance for an enemy to be strong · +20% increased chance for a strong enemy to be elite · +1 guaranteed enemy spawn',
  },
  2: {
    0: '+5% chance for an elite enemy to become a champion',
    1: '+5% increased chance for an enemy to be strong · +5% increased chance for a strong enemy to be elite',
    2: '+5% chance for an enemy to be strong · +5% chance for a strong enemy to be elite · +5% chance for an elite to become a champion',
    3: '+5% chance for an elite enemy to become a champion',
    4: '+5% increased chance for an enemy to be strong · +5% increased chance for a strong enemy to be elite',
    5: '+1% chance for a champion enemy to become a boss',
  },
  3: {
    0: '+10% chance on kill to spawn an additional enemy in the next wave',
    1: '+10% chance on kill to spawn an additional enemy in the next wave',
    2: '15% more enemies spawned',
    3: '+10% chance on kill to spawn an additional enemy in the next wave',
    4: '+10% chance on kill to spawn an additional enemy in the next wave',
    5: '20% more enemies spawned',
  },
}

const COLD_DESCRIPTIONS: Partial<Record<number, Partial<Record<number, string>>>> = {
  0: {  // Cold Damage
    0:  '+5% increased cold damage',
    1:  '+3% increased cold action speed',
    2:  '+5% increased cold damage · +5% increased frost apply chance',
    3:  '+5% increased cold damage',
    4:  '+3% increased cold action speed',
    5:  '10% more cold damage',
    6:  '+5% increased cold damage',
    7:  '+3% increased cold action speed',
    8:  '+12% increased cold damage',
    9:  '+5% increased cold damage',
    10: '+3% increased cold action speed',
    11: 'Frosted enemies take 20% increased damage from non-cold sources',
  },
  1: {  // Frost
    0:  '+5% increased frost apply chance',
    1:  '+3% increased frost slow',
    2:  '+5% increased frost slow · +10% increased frost duration',
    3:  '+5% increased frost apply chance',
    4:  '+3% increased frost slow',
    5:  '+8% increased frost slow · +20% increased frost duration',
    6:  '+5% increased frost apply chance',
    7:  '+3% increased frost slow',
    8:  '+15% increased frost apply chance',
    9:  '+5% increased frost apply chance',
    10: '+3% increased frost slow',
    11: '15% more frost slowing effect',
    12: '+5% increased frost slow · 10% less frost duration',
    13: '20% more frost duration',
    14: 'Frosted enemies deal 10% less damage',
    15: '+5% increased frost slow',
  },
  2: {  // Shatter
    0: 'Enemies killed while frosted have +5% chance to shatter',
    1: 'Shatter damage increased by 2% of shattered enemy maximum life',
    2: 'Enemies killed while frosted have +8% chance to shatter · +20% increased shatter area of effect',
    3: 'Enemies killed while frosted have +5% chance to shatter',
    4: 'Shatter damage increased by 2% of shattered enemy maximum life',
    5: 'Enemies killed while frosted have +10% chance to shatter · Shatter damage increased by 3% of shattered enemy maximum life',
  },
  3: {  // Frozen Armor
    0: 'Frozen Armor requires 20 fewer frosts to gain a stack',
    1: '1% reduced damage taken from hits per Frozen Armor stack',
    2: '30% chance to gain 2 Frozen Armor stacks instead of 1 · 20% slower Frozen Armor stack depletion',
    3: 'Frozen Armor requires 20 fewer frosts to gain a stack',
    4: '1% reduced damage taken from hits per Frozen Armor stack',
    5: 'Frozen Armor can have 5 more maximum stacks',
  },
}

function getEnglishNodeDescription(
  masteryId: MasteryId,
  treeIdx: number,
  nodeIdx: number,
  treeLabel: string,
): string {
  const tables: Partial<Record<MasteryId, Partial<Record<number, Partial<Record<number, string>>>>>> = {
    action: ACTION_DESCRIPTIONS,
    criticalHit: CRIT_DESCRIPTIONS,
    life: LIFE_DESCRIPTIONS,
    mana: MANA_DESCRIPTIONS,
    block: BLOCK_DESCRIPTIONS,
    fire: FIRE_DESCRIPTIONS,
    enemy: ENEMY_DESCRIPTIONS,
    projectile: PROJ_DESCRIPTIONS,
    lightning: LIGHTNING_DESCRIPTIONS,
    cold: COLD_DESCRIPTIONS,
    strike: STRIKE_DESCRIPTIONS,
    physical: PHYSICAL_DESCRIPTIONS,
    rot: ROT_DESCRIPTIONS,
    area: AREA_DESCRIPTIONS,
    movement: MOVEMENT_DESCRIPTIONS,
  }
  const desc = tables[masteryId]?.[treeIdx]?.[nodeIdx]
  if (desc !== undefined) return desc
  return `${treeLabel} — ${t('mastery', TYPE_KEY[nodeType(nodeIdx)])}`
}

export function getNodeDescription(
  masteryId: MasteryId,
  treeIdx: number,
  nodeIdx: number,
  treeLabel: string,
): string {
  const locale = getLocale()
  if (locale !== 'en') {
    const key = `${masteryId}_${treeIdx}_${nodeIdx}`
    const translated = getNodeDescTranslation(locale, key)
    if (translated) return translated
  }
  return getEnglishNodeDescription(masteryId, treeIdx, nodeIdx, treeLabel)
}

const PROJ_DESCRIPTIONS: Partial<Record<number, Partial<Record<number, string>>>> = {
  0: {  // Projectile Damage
    0:  '+5% increased projectile damage',
    1:  '+5% chance to hit an additional target',
    2:  '+12% increased projectile damage',
    3:  '+5% increased projectile damage',
    4:  '+5% chance to hit an additional target',
    5:  '+20% more projectile damage',
    6:  '+5% increased projectile damage',
    7:  '+5% chance to hit an additional target',
    8:  '+5% chance to hit an additional target · +5% increased projectile damage · +5% increased action speed',
    9:  '+5% increased projectile damage',
    10: '+5% chance to hit an additional target',
    11: '+20% chance to deal double damage · +10% increased projectile range',
  },
  1: {  // Multiple Projectiles
    0:  '+5% chance to fire an additional projectile at 50% damage',
    1:  '+5% increased additional projectile damage',
    2:  '+7% chance to fire an additional projectile · +7% increased additional projectile damage',
    3:  '+5% chance to fire an additional projectile',
    4:  '+5% increased additional projectile damage',
    5:  '+15% chance to fire an additional projectile',
    6:  '+5% chance to fire an additional projectile',
    7:  '+5% increased additional projectile damage',
    8:  '+7% chance to fire an additional projectile · +7% increased additional projectile damage',
    9:  '+5% chance to fire an additional projectile',
    10: '+5% increased additional projectile damage',
    11: 'When an additional projectile fires, roll once more for a second additional projectile',
  },
  2: {  // Projectile Range
    0: '+5% increased projectile range',
    1: '+5% increased projectile damage',
    2: '+12% increased projectile range',
    3: '+5% increased projectile range',
    4: '+5% increased projectile damage',
    5: '+3% increased projectile damage per 1 range unit (minimum 3% at range 1)',
  },
  3: {  // Knockback
    0: 'Projectile hits have +10% chance to knock back the target',
    1: 'Knocked-back enemies have 10% reduced movement speed for 2 seconds',
    2: 'Projectile hits have +15% chance to knock back the target · +15% increased projectile damage',
    3: 'Projectile hits have +10% chance to knock back the target',
    4: 'Knocked-back enemies have 10% reduced movement speed for 2 seconds',
    5: '+30% more knockback range · Knocked-back enemies deal 10% less damage for 2 seconds',
  },
}

const STRIKE_DESCRIPTIONS: Partial<Record<number, Partial<Record<number, string>>>> = {
  0: {
    0:  '+5% increased strike damage',
    1:  '+5% chance for strike to deal double damage',
    2:  '+12% increased strike damage',
    3:  '+5% increased strike damage',
    4:  '+5% chance for strike to deal double damage',
    5:  '+20% more strike damage',
    6:  '+5% increased strike damage',
    7:  '+5% chance for strike to deal double damage',
    8:  '+5% chance for strike to deal double damage · +5% increased strike damage · +5% increased action speed',
    9:  '+5% increased strike damage',
    10: '+5% chance for strike to deal double damage',
    11: 'Strikes have +20% increased chance to trigger afflictions',
  },
  1: {
    0:  'Strikes have +5% increased chance to trigger frenzy',
    1:  'Frenzy gives +1% increased damage and action speed per charge',
    2:  'Strikes have +5% increased chance to trigger frenzy · Frenzy gives a flat +10% increased damage and action speed',
    3:  'Strikes have +5% increased chance to trigger frenzy',
    4:  'Frenzy gives +1% increased damage and action speed per charge',
    5:  'Frenzy has +1% increased chance to trigger afflictions per charge',
    6:  'Strikes have +5% increased chance to trigger frenzy',
    7:  'Frenzy gives +1% increased damage and action speed per charge',
    8:  'Strikes have +5% increased chance to trigger frenzy · Frenzy has +20% increased duration · Frenzy gives +1% increased damage and action speed per charge',
    9:  'Strikes have +5% increased chance to trigger frenzy',
    10: 'Frenzy gives +1% increased damage and action speed per charge',
    11: 'Frenzy has 10 additional maximum charges',
  },
  2: {  // Strike Range
    0: '+5% increased strike range',
    1: '+3% increased strike action speed',
    2: '+5% increased strike range · +5% increased strike damage',
    3: '+5% increased strike range',
    4: '+3% increased strike action speed',
    5: '+10% more strike range · +5% more strike action speed',
  },
  3: {  // Additional Target
    0: '+5% increased chance for strike actions to target an additional enemy',
    1: '+3% increased strike action speed',
    2: '+10% increased chance for strike actions to target an additional enemy',
    3: '+5% increased chance for strike actions to target an additional enemy',
    4: '+3% increased strike action speed',
    5: '+10% more chance for strike actions to target an additional enemy',
  },
}

const LIGHTNING_DESCRIPTIONS: Partial<Record<number, Partial<Record<number, string>>>> = {
  0: {  // Lightning Damage
    0:  '+5% increased lightning damage',
    1:  '+3% increased lightning action speed',
    2:  '+5% increased lightning damage · Lightning actions have +5% chance to electrocute',
    3:  '+5% increased lightning damage',
    4:  '+3% increased lightning action speed',
    5:  '+10% more lightning damage',
    6:  '+5% increased lightning damage',
    7:  '+3% increased lightning action speed',
    8:  '+12% increased lightning damage',
    9:  '+5% increased lightning damage',
    10: '+3% increased lightning action speed',
    11: '+10% more lightning damage · +5% more lightning action speed',
  },
  1: {  // Electrocution
    0:  'Lightning actions have +5% chance to electrocute',
    1:  '+3% increased damage taken from electrocution',
    2:  '+5% increased damage taken from electrocution · +10% increased electrocution duration',
    3:  'Lightning actions have +5% chance to electrocute',
    4:  '+3% increased damage taken from electrocution',
    5:  '+8% increased damage taken from electrocution · +20% increased electrocution duration',
    6:  'Lightning actions have +5% chance to electrocute',
    7:  '+3% increased damage taken from electrocution',
    8:  'Lightning actions have +15% chance to electrocute',
    9:  'Lightning actions have +5% chance to electrocute',
    10: '+3% increased damage taken from electrocution',
    11: 'Electrocuted enemies have their movement and action speed reduced by the electrocution damage taken value',
    12: '+5% increased damage taken from electrocution · 10% less electrocution duration',
    13: '20% more electrocution duration',
    14: 'Lightning actions have +5% increased chance to jump from an electrocuted enemy',
    15: '+5% increased damage taken from electrocution',
  },
  2: {  // Jump
    0: 'Lightning actions have +20% increased chance to jump to an additional enemy',
    1: '+10% reduced damage penalty of jump',
    2: 'Lightning actions have +30% increased chance to jump to an additional enemy · +15% reduced damage penalty of jump',
    3: 'Lightning actions have +20% increased chance to jump to an additional enemy',
    4: '+10% reduced damage penalty of jump',
    5: 'Successful jumps re-roll for another jump (unlimited chain) · +30% increased jump range',
  },
  3: {  // Electrifying
    0: 'Lightning actions have +5% increased chance to Electrify you',
    1: '+5% increased action speed while Electrified',
    2: '+25% increased Electrified duration · +5% increased action speed while Electrified',
    3: 'Lightning actions have +5% increased chance to Electrify you',
    4: '+5% increased action speed while Electrified',
    5: '5% less damage taken from all sources while Electrified',
  },
}

const AREA_DESCRIPTIONS: Partial<Record<number, Partial<Record<number, string>>>> = {
  0: {  // Area Damage
    0:  '+5% increased area damage',
    1:  '+5% chance for area to deal double damage',
    2:  '+12% increased area damage',
    3:  '+5% increased area damage',
    4:  '+5% chance for area to deal double damage',
    5:  '+20% more area damage',
    6:  '+5% increased area damage',
    7:  '+5% chance for area to deal double damage',
    8:  '+5% chance for area to deal double damage · +5% increased area damage · +5% increased area size',
    9:  '+5% increased area damage',
    10: '+5% chance for area to deal double damage',
    11: '+30% more area damage · 15% less area action speed',
  },
  1: {  // Area Size
    0:  '+5% increased area action radius',
    1:  '+5% increased area damage',
    2:  '+12% increased area action radius',
    3:  '+5% increased area action radius',
    4:  '+5% increased area damage',
    5:  '+15% more area action radius',
    6:  '+5% increased area action radius',
    7:  '+5% increased area damage',
    8:  '+8% increased area action radius · +5% increased area damage',
    9:  '+5% increased area action radius',
    10: '+5% increased area damage',
    11: '+10% more area action radius · +10% more area damage · 10% less area action speed',
  },
  2: {  // Tremor
    0: 'Area actions have +5% increased chance to trigger a tremor',
    1: 'Tremors deal +5% increased damage',
    2: 'Area actions have +8% increased chance to trigger a tremor · Tremors have +8% increased area radius',
    3: 'Area actions have +5% increased chance to trigger a tremor',
    4: 'Tremors deal +5% increased damage',
    5: 'Area actions have +7% increased chance to trigger a tremor · Tremors have +7% increased area radius · Tremors deal +7% increased damage',
  },
  3: {  // Knockback
    0: 'Area hits have +10% chance to knock back the target',
    1: 'Knocked-back enemies have 10% reduced movement speed for 2 seconds',
    2: 'Area hits have +15% chance to knock back the target · +15% increased area damage',
    3: 'Area hits have +10% chance to knock back the target',
    4: 'Knocked-back enemies have 10% reduced movement speed for 2 seconds',
    5: '+30% more knockback range · Knocked-back enemies deal 10% less damage for 2 seconds',
  },
}

const MOVEMENT_DESCRIPTIONS: Partial<Record<number, Partial<Record<number, string>>>> = {
  0: {  // Movement Speed
    0:  '+5% increased movement speed',
    1:  '+5% increased movement speed',
    2:  '+12% increased movement speed',
    3:  '+5% increased movement speed',
    4:  '+5% increased movement speed',
    5:  '+15% more movement speed',
    6:  '+5% increased movement speed',
    7:  '+5% increased movement speed',
    8:  '+12% increased movement speed',
    9:  '+5% increased movement speed',
    10: '+5% increased movement speed',
    11: 'Movement debuffs on you have 50% reduced efficiency',
    12: 'Your first action after moving deals 10% more damage',
    13: '1% more action damage per consecutive action without moving, up to 10%',
    14: 'You are immune to movement slowing effects',
    15: '+15% more movement speed',
  },
  1: {  // Dash
    0: '+20% increased chance to gain a Dash charge each second',
    1: '+10% increased Dash distance',
    2: '+30% increased chance to gain a Dash charge each second · +10% increased Dash distance',
    3: '+20% increased chance to gain a Dash charge each second',
    4: '+10% increased Dash distance',
    5: '+50% increased chance to gain a Dash charge each second',
    12: 'Dash can have one additional charge · 20% less Dash distance',
    13: 'Dash always attempts to close the gap to the nearest enemy, regardless of action range',
  },
  2: {  // Kite
    0: '+25% of your movement speed used to Kite when enemies are within half your action range',
    1: '+25% of your movement speed used to Kite when enemies are within half your action range',
    2: '+5 to all resistances while Kiting',
    3: '+25% of your movement speed used to Kite when enemies are within half your action range',
    4: '+25% of your movement speed used to Kite when enemies are within half your action range',
    5: 'Dash can be used to Kite away from enemies',
    12: 'Always Kite while your target is in range, back to 90% of your action range',
    13: '+5% increased action speed while Kiting',
  },
}

export function nodeHasAnyEffect(masteryId: MasteryId, treeIdx: number, nodeIdx: number): boolean {
  let effect: NodeEffect
  switch (masteryId) {
    case 'action':      effect = getActionNodeEffect(treeIdx, nodeIdx); break
    case 'criticalHit': effect = getCriticalHitNodeEffect(treeIdx, nodeIdx); break
    case 'life':        effect = getLifeNodeEffect(treeIdx, nodeIdx); break
    case 'mana':        effect = getManaNodeEffect(treeIdx, nodeIdx); break
    case 'block':       effect = getBlockNodeEffect(treeIdx, nodeIdx); break
    case 'fire':        effect = getFireNodeEffect(treeIdx, nodeIdx); break
    case 'enemy':       effect = getEnemyNodeEffect(treeIdx, nodeIdx); break
    case 'projectile':  effect = getProjectileNodeEffect(treeIdx, nodeIdx); break
    case 'lightning':   effect = getLightningNodeEffect(treeIdx, nodeIdx); break
    case 'strike':      effect = getStrikeNodeEffect(treeIdx, nodeIdx); break
    case 'physical':    effect = getPhysicalNodeEffect(treeIdx, nodeIdx); break
    case 'cold':        effect = getColdNodeEffect(treeIdx, nodeIdx); break
    case 'rot':         effect = getRotNodeEffect(treeIdx, nodeIdx); break
    case 'area':        effect = getAreaNodeEffect(treeIdx, nodeIdx); break
    case 'movement':    effect = getMovementNodeEffect(treeIdx, nodeIdx); break
    default: return false
  }
  return Object.keys(effect).length > 0
}
