// Spanish translations for src/config/notes.md.
// See notes.fr.ts for the schema; missing entries fall back to English.
import type { ContentBlock } from './index'

export const notesEs: Record<string, ContentBlock> = {
  frenzy: {
    title: 'Frenesí',
    body: `Un **Estado** (buff) obtenido de los golpes con etiqueta de golpe cuando el **árbol de maestría de Golpe — Frenesí** otorga probabilidad de frenesí. Dura **3 segundos**; volver a obtener frenesí mientras está activo refresca su duración al valor completo.

**Cargas:** El frenesí acumula hasta **10 cargas** (elevadas a **20** con el nodo final del árbol de Frenesí). Cada golpe con etiqueta de golpe que pase la tirada de probabilidad de frenesí añade una carga, hasta el máximo. Las cargas se registran independientemente de la duración y se reinician a 0 cuando el frenesí expira.

**Mientras el Frenesí está activo, todas las acciones (no solo los golpes) ganan:**
- Daño aumentado — bono plano + bono por carga (de los nodos de maestría de Frenesí)
- Velocidad de acción aumentada — bono plano + bono por carga (de los nodos de maestría de Frenesí)
- Probabilidad adicional de activar aflicciones por carga (del nodo 5 del Frenesí)

Nota: el frenesí solo se puede **obtener** de los golpes, pero sus bonos se aplican a **cada acción** mientras el buff está activo.`,
  },

  'feeding-frenzy': {
    title: 'Frenesí alimentario',
    body: `Un **Estado** (buff) activado por el nodo mayor de **Robo de vida** (probabilidad de Frenesí alimentario, nodo 5). Dura **5 segundos**; volver a activarlo refresca la duración.

**Mientras está activo:**
- El robo de vida gana **+20 % aumentado de vida robada** (aditivo con los nodos de maestría; sigue aplicándose el tope por golpe)
- La regeneración de vida gana **+20 % aumentada** (aditivo con los nodos de maestría de aumento de regeneración; sin tope)
- La regeneración de maná gana **+20 % aumentada** (aditivo con los nodos de maestría de aumento de regeneración; sin tope)

Los bonos se aplican a cada tick de curación o regeneración — no cambian los valores de DPS almacenados ni el cálculo del tope en sí.`,
  },

  trance: {
    title: 'Trance',
    body: `Un **Estado** (buff) activado por el **árbol de maestría de Acción — Trance** (los nodos 0, 3 y 5 otorgan probabilidad de activación). Dura **3 segundos**; volver a activarlo refresca la duración.

**Mientras el Trance está activo, las acciones ganan:**
- Probabilidad de golpear a un **Objetivo adicional** (probabilidad multi-objetivo del Trance; cada golpe es independiente)
- Daño aumentado (bono de daño del Trance; aditivo)
- Velocidad de acción aumentada (bono de velocidad de acción del Trance; aditivo; comprime el ciclo de ataque)

Todos los porcentajes son aditivos dentro de su categoría a través de todos los nodos del árbol del Trance. Mientras el Trance permanezca activo, cualquier acción (incluidas las acciones de **Multi-acción**) es elegible para tirar por Objetivo adicional.`,
  },

  burn: {
    title: 'Quemadura',
    body: `Una **Aflicción** (Efecto de daño por tiempo) aplicada por acciones con etiqueta de fuego a los enemigos. Pueden existir múltiples cargas independientes simultáneamente sobre el mismo enemigo.

**Aplicación:**
- Probabilidad base de aplicar por golpe: **5 %**
- Los nodos de probabilidad de aplicar Quemadura de la maestría de Fuego se suman directamente (aditivo)
- Mientras la **Inmolación** está activa en el jugador, la probabilidad de aplicar gana un bono adicional de los nodos de maestría de Inmolación
- Cuando un enemigo te aplica Quemadura con un ataque con etiqueta de fuego, tanto la probabilidad de aplicar como la duración resultante se reducen a la mitad (sin bonos de maestría del lado enemigo)

**Por carga:**
- DPS de Quemadura = daño por golpe × **40 %** (modificado por los multiplicadores aumentado y más de Quemadura de la maestría de Fuego; se usa el daño del golpe que la activó)
- Duración: **5 segundos** base (extendida por los nodos de duración de Quemadura de la maestría de Fuego)
- Cada carga registra su propia duración restante y DPS de forma independiente

**Interacciones:**
- Los enemigos en llamas reciben daño aumentado de todas las fuentes cuando se asigna el nodo 8 (fuerte) del árbol Quemando
- El nodo 11 del árbol Quemando hace que cada carga de Quemadura salpique una fracción de su DPS a los enemigos cercanos que no estén ardiendo
- Los enemigos en llamas ven reducida su resistencia al fuego (con tope en 0) cuando se asigna el nodo final del árbol de Daño de Fuego (nodo 11)
- La **Inmolación** es una autoquema separada en el jugador — no es una carga de Quemadura y no aparece en las mecánicas de Quemadura enemiga`,
  },

  'burning-ground': {
    title: 'Suelo ardiente',
    body: `Una fuente de daño de fuego **basada en casillas** creada cuando una acción con etiqueta de fuego impacta a un enemigo y la tirada de aplicar del árbol de Suelo ardiente tiene éxito. La casilla completa de la cuadrícula donde ocurrió el golpe activador se convierte en suelo ardiente durante una duración base fija.

**Aplicación:**
- Probabilidad base: **0 %** — otorgada por los nodos de aplicar del árbol de Suelo ardiente (cada uno añade +5 %)
- Activado por cualquier golpe del jugador con etiqueta de fuego sobre un enemigo
- Una casilla ya cubierta de suelo ardiente es **inmune** — la tirada se desperdicia; la casilla debe despejarse (su duración debe expirar) antes de que se pueda aplicar un nuevo suelo ardiente sobre ella

**Daño:**
- DPS del Suelo ardiente = daño del golpe activador × **20 %** × (1 + aumentado de suelo ardiente) × (1 + más de suelo ardiente)
- El daño se aplica cada tick a **todos los enemigos cuyas coordenadas de casilla coincidan** con la casilla del suelo ardiente
- Los números de daño se muestran en naranja (mismo color que el DoT de Quemadura)

**Duración:**
- Base **4 segundos**, extendida solo por el nodo fuerte del árbol de Suelo ardiente (nodo 2: +30 % de duración aumentada). Los nodos genéricos de duración de Quemadura **no** extienden el suelo ardiente.

**Árbol de Suelo ardiente (corto, 6 nodos):**
- Nodos 0 y 3 (pequeños): +5 % de probabilidad de que las acciones de fuego causen suelo ardiente cada uno — total +10 % base
- Nodos 1 y 4 (pequeños): +15 % de daño aumentado de suelo ardiente cada uno
- Nodo 2 (fuerte): +30 % de daño aumentado de suelo ardiente · +30 % de duración aumentada de suelo ardiente
- Nodo 5 (mayor): El suelo ardiente ralentiza el movimiento y la velocidad de acción del enemigo en un **20 %** mientras está sobre él · +10 % de daño más de suelo ardiente

La ralentización se acumula multiplicativamente con otros modificadores de velocidad y se aplica tanto a la velocidad de movimiento como a la de ataque. El daño del suelo ardiente no es un golpe y no activa el robo de vida, el daño doble ni los procs de estado.`,
  },

  bleed: {
    title: 'Sangrado',
    body: `Una **Aflicción** (Efecto de daño por tiempo) aplicada por acciones con etiqueta física a los enemigos. Pueden existir múltiples cargas independientes simultáneamente sobre el mismo enemigo.

**Aplicación:**
- Probabilidad base de aplicar por golpe: **5 %**
- Los nodos de probabilidad de aplicar Sangrado de la maestría Física se suman directamente (aditivo)
- Cuando un enemigo te aplica Sangrado con un ataque de etiqueta física, tanto la probabilidad de aplicar como la duración resultante se reducen a la mitad (sin bonos de maestría del lado enemigo)

**Por carga:**
- DPS de Sangrado = daño por golpe × **50 %** (modificado por los multiplicadores aumentado y más de Sangrado de la maestría Física; se usa el daño del golpe que lo activó)
- Duración: **2 segundos** base (extendida por los nodos de duración de Sangrado de la maestría Física)
- Cada carga registra su propia duración restante y DPS de forma independiente; solo la carga con mayor DPS hace tick en cada momento`,
  },

  effect: {
    title: 'Efecto',
    body: `Término general para los modificadores en el juego activados por golpes, lanzamientos, muertes y otros eventos. Los Efectos están organizados en varias categorías distintas — cada categoría tiene sus propias reglas para activación, duración, acumulación e interacción con otros modificadores.

**Categorías:**
- **Estado** — condiciones de buff, debuff o mixtas sobre el jugador; mostradas en la barra de efectos en la parte superior de la pantalla. Ejemplos: **Trance**, **Frenesí alimentario**, **Inmolación**.
- **Aflicción** — efectos de daño por tiempo aplicados a los enemigos, con cargas independientes por enemigo. Ejemplo: **Quemadura**.
- **Multi-acción** — acciones adicionales de una acción del jugador activadas por una acción primaria o por otra Multi-acción. Ejemplos: **Acción doble**, **Objetivo adicional**, **Proyectil adicional**, **Segunda acción**.
- **Proc** — tirada por evento que modifica un único golpe. Ejemplo: **Daño doble**.
- **Robo de vida / Robo de maná** — curación o recuperación de recurso por golpe. Ver **Robo de vida**.

Cuando una descripción menciona una "probabilidad de efecto" genérica sin categoría, consulta la nota específica correspondiente para las reglas que aplican.`,
  },

  'life-steal': {
    title: 'Robo de vida',
    body: `Mecánica de curación: una fracción del daño infligido a los enemigos se restaura como vida del jugador, aplicada por golpe directo.

**Fórmula:**
- Robado = daño por golpe × % de robo × (1 + % aumentado de robado)
- Tope: vida máx × **1 %** por instancia (tope duro; aumentado por el nodo 2 de maestría)

**Árbol de Robo de vida (corto, 6 nodos):**
- Nodos 0 y 3 (pequeños): +0,5 % de robo cada uno — total +1 % base
- Nodos 1 y 4 (pequeños): +5 % aumentado de vida robada cada uno — total +10 % aumentado
- Nodo 2 (fuerte): +10 % aumentado del tope duro — el tope pasa a 1,1 % de la vida máx
- Nodo 5 (mayor): +1 % de probabilidad por instancia de robo de activar **Frenesí alimentario**

El **Frenesí alimentario** otorga un +20 % adicional aumentado de vida robada de forma aditiva; el tope sigue aplicándose.

El robo de vida se aplica una vez por golpe directo. Los ticks de Quemadura, la autoquema de Inmolación y otras fuentes de daño por tiempo no activan el robo de vida — a menos que se asigne el nodo clave del árbol de Robo de vida "Puedes robar del daño de aflicción", que extiende el robo de vida y maná al daño de tick de **Quemadura** y **Sangrado** de las cargas aplicadas por el jugador.`,
  },

  increased: {
    title: 'Aumentado',
    body: `Los modificadores **Aumentado** son aditivos. Todos los valores "+X % aumentado" en la misma categoría de estadística se suman en un único pool, y el total se aplica como \`(1 + total / 100)\`.

**Ejemplo:** +15 % de daño aumentado y +5 % de daño aumentado se combinan en +20 % de daño aumentado — un multiplicador ×1,20.

Aumentado y **Más** son capas de multiplicador separadas que se acumulan multiplicativamente entre sí.`,
  },

  more: {
    title: 'Más',
    body: `Los modificadores **Más** son multiplicativos. Cada valor "X % más" se aplica como su propio multiplicador independiente: \`× (1 + X / 100)\`.

**Ejemplo:** ×1,10 más daño y ×1,05 más daño se combinan en ×1,155 — no ×1,15.

Los multiplicadores Más se aplican después de que todos los modificadores **Aumentado** se hayan sumado. El resultado es que "más" es estrictamente más fuerte que el mismo valor de "aumentado" siempre que ya exista cualquier otro bono en la misma categoría.`,
  },

  'double-damage': {
    title: 'Daño doble',
    body: `Una probabilidad por lanzamiento de que el golpe inflija exactamente **2× su daño efectivo normal**. La tirada ocurre después de que se hayan aplicado todos los demás modificadores de daño (incluidos **Aumentado** y **Más**), por lo que duplica el número final.

Proviene del árbol de maestría de Acción — Daño (nodos de probabilidad de daño doble). Múltiples nodos se suman en una sola probabilidad acumulativa. La tirada es independiente en cada acción — puede activarse en acciones primarias, acciones de **Acción doble** y acciones de objetivo adicional.`,
  },

  'double-action': {
    title: 'Acción doble',
    body: `Una **Multi-acción** proveniente del árbol de maestría de Acción — Velocidad de acción (nodos de probabilidad de acción doble). Cada tirada con éxito encola una acción de seguimiento de la misma acción a **1/5 del retardo de ciclo normal** después de la acción primaria. La acción de seguimiento apunta al mismo enemigo (o al más cercano en rango si el objetivo primario ha muerto) y paga el coste de maná completo.

La Acción doble en sí **no tiene modificador de daño** — la acción de seguimiento inflige daño completo. Según las reglas estándar de Multi-acción, puede tirar por **Daño doble**, activar Estados, Aflicciones y otras Multi-acciones; no puede activar otra Acción doble.`,
  },

  immolation: {
    title: 'Inmolación',
    body: `Un **Estado** (Efecto mixto) activado en el jugador cuando una acción con etiqueta de fuego golpea y pasa la tirada de probabilidad de inmolación (requiere nodos de maestría de Fuego).

**Mientras la Inmolación está activa:**
- El daño de las acciones de fuego gana un bono (aditivo; se acumula con otros modificadores de daño aumentado)
- La probabilidad de aplicar Quemadura gana un bono (aditivo; se acumula con otros modificadores de probabilidad de Quemadura)
- El jugador recibe daño de autoquema: DPS = daño del último golpe activador × 20 %, modificado por los nodos de DPS de Inmolación de la maestría de Fuego

Cada golpe activador que pase la tirada refresca la duración de Inmolación (**5 segundos** base) y actualiza el DPS de autoquema al valor del nuevo golpe. Solo puede haber una instancia de Inmolación activa a la vez.

La Inmolación es una autoquema sobre el jugador — es distinta de las cargas de **Quemadura** sobre los enemigos y no interactúa con las mecánicas de Quemadura enemiga.`,
  },

  strong: {
    title: 'Fuerte',
    body: `Un nivel de variante de enemigo. Los enemigos Fuertes tienen **1,0–1,8× vida**, **1,0–1,8× daño** y **+20 % de velocidad de ataque** comparados con un enemigo normal del mismo nivel. Otorgan **×2 XP de acción** al ser eliminados. Identificados por un **diamante azul** sobre la barra de vida.

La probabilidad base de aparición es **10 %** por enemigo en una oleada. Los nodos de maestría de Enemigo pueden aumentar esta probabilidad.

Los enemigos **Élite** son un subconjunto de Fuertes — tienen bonos adicionales encima.`,
  },

  elite: {
    title: 'Élite',
    body: `Un nivel de variante de enemigo que es una versión más fuerte de **Fuerte**. Los enemigos Élite tienen **1,5–2,5× vida**, **1,5–2,5× daño**, **+20 % de velocidad de ataque** y **+20 % de velocidad de movimiento** comparados con un enemigo normal del mismo nivel. Otorgan **×3 XP de acción** al ser eliminados. Identificados por un **diamante morado** sobre la barra de vida.

Los enemigos Élite no pueden aparecer sin nodos de maestría de Enemigo que otorguen probabilidad de élite. Cada enemigo Fuerte tiene una tirada separada para ser ascendido a Élite basada en esta probabilidad.`,
  },

  status: {
    title: 'Estado',
    body: `Una categoría de **Efecto** que se aplica al jugador. Los Estados se muestran como íconos en la barra de efectos en la parte superior de la pantalla y modifican el comportamiento o las estadísticas del jugador mientras están activos.

**Tipos:**
- **Buff** (ícono azul): una condición beneficiosa
- **Debuff** (ícono rojo): una condición perjudicial
- **Mixto** (ícono dividido): simultáneamente beneficioso y perjudicial

**Duración y reactivación:** cada Estado tiene una duración restante que cuenta atrás en tiempo real del juego. Activar un Estado que ya está activo refresca su duración al valor completo en lugar de acumular una segunda instancia.

**Estados actuales:**
- **Trance** — buff; potencia todas las acciones del jugador (probabilidad de Objetivo adicional, daño aumentado, velocidad de acción aumentada)
- **Frenesí alimentario** — buff; amplifica el robo de vida y la regeneración
- **Inmolación** — mixto; otorga daño de fuego y bonos de probabilidad de Quemadura a la vez que inflige DoT de autoquema al jugador
- **Sed de sangre** — buff; velocidad de acción/daño físico y probabilidad adicional de aplicar Sangrado mientras está activo
- **Electrificado** — buff; bono global de velocidad de acción y reducción de daño entrante mientras está activo`,
  },

  affliction: {
    title: 'Aflicción',
    body: `Una categoría de **Efecto** que aplica un debuff o daño por tiempo a un enemigo. Las Aflicciones normalmente se aplican con los golpes con una pequeña probabilidad base (modificada por los nodos de maestría). Cada una es específica de una etiqueta de daño.

**Aflicciones actuales:**
- **Quemadura** — daño por tiempo de fuego, aplicada por acciones con etiqueta de fuego
- **Electrocución** — debuff de daño recibido, aplicada por acciones con etiqueta de rayo

**Aflicciones planeadas:** Sangrado (físico), Veneno (toxina), Congelado (frío).`,
  },

  'multi-action': {
    title: 'Multi-acción',
    body: `Una categoría de **Efecto** en la que un lanzamiento adicional de una acción del jugador se activa por un lanzamiento primario o por otra Multi-acción. Cada Multi-acción se dispara con un retardo específico relativo al enfriamiento primario y puede tener su propio modificador de daño.

**Multi-acciones actuales:**
- **Acción doble** — seguimiento a 1/5 de ciclo, daño completo (maestría de Acción)
- **Objetivo adicional** — seguimiento contra un enemigo distinto a 1/5 de ciclo, daño completo (maestría de Acción, mientras **Trance** está activo)
- **Proyectil adicional** — seguimiento a 1/5 de ciclo, ×0,5 de daño (maestría de Proyectil)
- **Segunda acción** — seguimiento a 1/5 de ciclo, ×0,5 de daño (runa **Acción dividida**; se activa solo en la acción primaria)
- **Salto** — seguimiento a 1/5 de ciclo, ×0,6 de daño (maestría de Rayo); apunta a un enemigo cercano desde la posición del objetivo anterior

**Comportamiento estandarizado (se aplica a todas las Multi-acciones):**

1. **Acción nueva real.** Cada lanzamiento de Multi-acción es un lanzamiento real. Puede tirar por **Daño doble**, aplicar **Aflicciones**, activar Estados y tirar por cualquier otra Multi-acción — pero nunca puede volver a activar la misma Multi-acción que la produjo.
2. **Herencia.** Si una Multi-acción lleva una reducción de daño específica de esa mecánica, cualquier nueva Multi-acción que active hereda ese modificador. Los modificadores se combinan a lo largo de las cadenas: p. ej. un Proyectil adicional (×0,5) que activa una Segunda acción (×0,5) resulta en un seguimiento a ×0,25 de daño.
3. **Multiplicador de profundidad.** Cada nivel de Multi-acción lleva un multiplicador adicional de ×0,9. Una Multi-acción activada directamente por un lanzamiento primario empieza en ×0,9 (antes de su propio modificador de tipo). Cada nivel subsiguiente se combina: la profundidad 2 es ×0,81, la profundidad 3 es ×0,729, y así sucesivamente. Esto se acumula multiplicativamente con el modificador específico de tipo de la regla 2.
4. **Orden de activación.** Cuando varias Multi-acciones son elegibles para tirar en la misma acción, se evalúan desde la **fuente más genérica a la más específica**: primero las Multi-acciones de nivel de acción (Acción doble, Objetivo adicional), luego las de nivel de proyectil (Proyectil adicional), luego las específicas de runa (Segunda acción) y luego las específicas de rayo (Salto). Este orden también determina qué acción encolada se dispara primero cuando hay varias pendientes.`,
  },

  'additional-target': {
    title: 'Objetivo adicional',
    body: `Una **Multi-acción** que encola un lanzamiento de seguimiento a **1/5 del ciclo normal** contra un enemigo distinto dentro de rango, sin pagar maná. El seguimiento inflige daño completo sin modificador específico de Multi-acción.

**Fuentes (las probabilidades se suman en una única tirada por acción):**
- Maestría de Acción — árbol de Trance (nodos de probabilidad multi-objetivo), solo mientras **Trance** está activo
- Maestría de Golpe — árbol de Objetivo adicional, en cualquier acción con etiqueta de **golpe**; probabilidad total = probabilidad de objetivo adicional de golpe × (1 + más de objetivo adicional de golpe / 100)

Según las reglas estándar de Multi-acción, el seguimiento es una acción nueva real — puede tirar por **Daño doble**, **Acción doble**, **Proyectil adicional**, **Segunda acción** y activar Estados o Aflicciones. No puede tirar por otro Objetivo adicional.`,
  },

  'additional-projectile': {
    title: 'Proyectil adicional',
    body: `Una **Multi-acción** activada por la maestría de Proyectil (nodos de probabilidad de proyectil adicional). Cada tirada con éxito encola un proyectil de seguimiento a **1/5 del ciclo normal**, infligiendo **×0,5 de daño** (potenciado aditivamente por los nodos de daño adicional de la maestría de Proyectil), prefiriendo un enemigo distinto dentro de rango cuando sea posible.

Según las reglas estándar de Multi-acción, el seguimiento es una acción nueva real — puede tirar por **Daño doble**, **Acción doble**, **Objetivo adicional**, **Segunda acción** y activar Estados o Aflicciones. No puede tirar por otro Proyectil adicional.

**Excepción — nodo clave de maestría de Proyectil:** cuando se asigna este nodo, el primer Proyectil adicional tira una vez más para un segundo Proyectil adicional. Ambos son acciones nuevas reales; el segundo no puede tirar por un tercero.

Por la regla de **herencia**, cualquier Multi-acción activada desde un Proyectil adicional lleva el modificador de ×0,5 de daño hacia adelante — combinado con cualquier otro modificador de Multi-acción encima.`,
  },

  'second-action': {
    title: 'Segunda acción',
    body: `Una **Multi-acción** activada por la runa clave **Acción dividida**. Cada **acción primaria** encola un seguimiento a **1/5 del ciclo normal**, infligiendo **×0,5 de daño**. Las Multi-acciones (Acción doble, Proyectil adicional, etc.) que se disparan como resultado de la primaria no activan cada una su propia Segunda acción.

Según las reglas estándar de Multi-acción, el seguimiento es una acción nueva real — puede tirar por **Daño doble**, **Acción doble**, **Objetivo adicional**, **Proyectil adicional** y activar Estados o Aflicciones. No puede activar otra Segunda acción.

Por la regla de **herencia**, cualquier Multi-acción activada desde una Segunda acción lleva el modificador de ×0,5 de daño hacia adelante — combinado con cualquier otro modificador de Multi-acción encima.`,
  },

  hit: {
    title: 'Golpe',
    body: `Un evento de daño directo producido por un único lanzamiento que impacta en un objetivo. Los golpes son distintos de las fuentes de daño por tiempo como las cargas de **Quemadura** y la autoquema de **Inmolación**, que infligen daño continuamente sin ser golpes.

Solo los golpes activan mecánicas que reaccionan a eventos de daño individuales:
- **Robo de vida** — cura al jugador una fracción del daño por golpe
- **Daño doble** — tirada por lanzamiento que duplica el golpe
- Procs de Estado como los activadores de **Trance** e **Inmolación**

Los ticks de Aflicción (Quemadura) y la autoquema de Inmolación no son golpes y no activan ninguno de los anteriores.`,
  },

  mitigation: {
    title: 'Mitigación',
    body: `La mitigación de daño es una fuente de reducción de daño aplicada a los golpes entrantes. Varias fuentes de mitigación independientes pueden acumularse; los detalles dependen de la fuente específica.

**Fuentes actuales:**
- **Resistencia** — reduce el daño entrante de una familia coincidente (Físico, Putrefacción o Elemental)

Más tipos de mitigación están planeados. Algunos nodos de maestría de Acción permiten que las acciones eludan toda la mitigación de daño enemiga con una tirada por acción.`,
  },

  resistance: {
    title: 'Resistencia',
    body: `Estadística del jugador y del enemigo que reduce el daño entrante de una familia de daño específica. Existen dos familias:
- **Físico y Putrefacción** — combinadas en una única estadística de resistencia
- **Elemental** — cubre fuego, rayo y frío

Tanto el jugador como los enemigos tienen estos valores de resistencia. El daño entrante de una familia coincidente se reduce por el porcentaje de resistencia antes de aplicarse. El árbol de maestría de Vida — Resistencias eleva ambas resistencias del jugador; los enemigos tiran valores iniciales dentro de rangos específicos por nivel al aparecer.

La Resistencia es una fuente de **Mitigación**. Los efectos de **reducción de resistencia** (p. ej. Quiebra de resistencia física, enemigos en llamas vs Fuego) bajan la resistencia efectiva del enemigo por debajo de su valor tirado, con tope al 0 %.`,
  },

  'action-speed': {
    title: 'Velocidad de acción',
    body: `Qué tan rápido se dispara una acción del jugador. Una mayor velocidad de acción acorta el tiempo entre acciones (el ciclo de ataque), permitiéndote infligir más golpes por segundo.

**Fuentes de velocidad de acción aumentada:**
- Estado **Trance** — otorga un bono temporal de velocidad de acción mientras está activo (maestría de Acción)
- Nodos de velocidad de acción de la maestría de Acción — aumentos aditivos permanentes

Los bonos de velocidad de acción son aditivos dentro de su categoría. El multiplicador resultante acorta el ciclo proporcionalmente — duplicar la velocidad de acción reduce a la mitad el tiempo entre acciones.`,
  },

  electrocution: {
    title: 'Electrocución',
    body: `Una **Aflicción** aplicada por golpes con etiqueta de rayo. Mientras está activa (duración base 3 s, refrescada al reaplicar), el objetivo recibe daño adicional de **todas las fuentes** — este es un multiplicador independiente, separado de otros modificadores de daño recibido o daño infligido.

Cuando un enemigo te electrocuta con un ataque con etiqueta de rayo, la probabilidad de aplicar y la duración se reducen ambas a la mitad, y solo se aplica el multiplicador base del 10 % de daño recibido (sin bonos de maestría del lado enemigo).

**Fórmula de daño recibido:** base 10 % + todos los nodos de "daño recibido aumentado por electrocución" (aditivo). Ejemplo: con +3 +5 +3 +8 +3 = +22 %, el total es 32 %; todo el daño entrante a ese enemigo es ×1,32.

**Ralentización (nodo 11 de la maestría de Rayo):** Cuando este nodo está activo, los enemigos electrocutados ven reducida su velocidad de movimiento y su velocidad de acción por el valor completo de daño recibido por electrocución (base + aumentos de maestría). Un valor del 32 % significa que el enemigo se mueve y ataca al 68 % de la velocidad normal.`,
  },

  jump: {
    title: 'Salto',
    body: `Una **Multi-acción** activada por la maestría de Rayo (árbol de Salto). Tras un golpe del jugador con etiqueta de rayo, una tirada con éxito encola un golpe de seguimiento a **1/5 del ciclo normal**, infligiendo ×0,6 de daño base (reducido por los nodos de maestría). El seguimiento apunta a un enemigo cercano medido desde la **posición del objetivo anterior**, no la del jugador.

**Selección de objetivo:** prefiere al enemigo más cercano que aún no haya sido golpeado en la cadena de salto actual. Si todos los enemigos en rango ya han sido saltados, puede volver a apuntar a cualquiera de ellos excepto al que activó este salto.

**Rango de salto** es el rango de ataque normal de la acción, opcionalmente aumentado por el nodo mayor (+30 %). El rango se mide desde el objetivo que acaba de ser golpeado.

**Encadenamiento (nodo mayor 5):** cuando está activo, cada salto exitoso vuelve a tirar por otro salto sin límite. La cadena continúa mientras las tiradas tengan éxito y existan objetivos válidos.

**Herencia:** cada salto en una cadena lleva el multiplicador de profundidad ×0,9 del sistema de Multi-acción encima del modificador específico de salto ×0,6. Un primer salto (profundidad 1) inflige ×0,9 × 0,6 = ×0,54 de daño; un segundo salto (profundidad 2) añade otro ×0,9, dando ×0,486, y así sucesivamente.`,
  },

  'resistance-breaking': {
    title: 'Quiebra de resistencia',
    body: `Una mecánica de **maestría Física — Quiebra de resistencia**. Cada golpe del jugador con etiqueta física sobre un enemigo tira la probabilidad de quiebra de resistencia; con éxito, la **resistencia física y a la putrefacción** combinada del enemigo se reduce permanentemente en **1 punto porcentual** (con tope al 0 % — nunca negativa). La reducción es por enemigo y persiste durante la vida útil de ese enemigo; los nuevos enemigos tiran valores de resistencia frescos.

**Árbol de Quiebra de resistencia (corto, 6 nodos):**
- Nodos 0 y 3 (pequeños): +5 % de probabilidad de reducir permanentemente la resistencia físico-putrefacción enemiga en 1 % cada uno — total +10 % base
- Nodos 1 y 4 (pequeños): +5 % de daño físico aumentado cada uno
- Nodo 2 (fuerte): +7 % de probabilidad de reducir permanentemente la resistencia físico-putrefacción enemiga · +3 % de velocidad de acción física aumentada
- Nodo 5 (mayor): Los enemigos al 0 % de resistencia física y a la putrefacción ven reducida su velocidad de movimiento y velocidad de acción en un **20 %**

La ralentización al 0 % se aplica multiplicativamente junto a otros modificadores de velocidad y tanto a la velocidad de movimiento como a la de ataque (refleja el comportamiento de la ralentización del Suelo ardiente).`,
  },

  bloodlust: {
    title: 'Sed de sangre',
    body: `Un **Estado** (buff) sobre el jugador, proveniente del **árbol de maestría Física — Sed de sangre**. Cada aplicación exitosa de **Sangrado** tira la probabilidad de activación de Sed de sangre; con éxito, el buff se aplica durante **4 segundos** (extendido por el nodo mayor). Volver a activarlo refresca su duración al valor completo. El buff en sí no hace nada intrínseco — sus bonos están enteramente definidos por los nodos del árbol de Sed de sangre.

**Árbol de Sed de sangre (corto, 6 nodos):**
- Nodos 0 y 3 (pequeños): +5 % de probabilidad de activar Sed de sangre al aplicar Sangrado cada uno — total +10 % base
- Nodos 1 y 4 (pequeños): Sed de sangre otorga +5 % de velocidad de acción física aumentada cada uno
- Nodo 2 (fuerte): Sed de sangre otorga +5 % de velocidad de acción física aumentada y +12 % de daño físico aumentado · Las acciones físicas durante Sed de sangre tienen +10 % de probabilidad aumentada de aplicar Sangrado
- Nodo 5 (mayor): Sed de sangre otorga +5 % de velocidad de acción física aumentada y +12 % de daño físico aumentado · +25 % de duración aumentada de Sed de sangre

Mientras Sed de sangre está activa, los bonos de velocidad de acción y daño se aplican solo a **acciones con etiqueta física**. La probabilidad adicional de aplicar Sangrado del nodo 2 también se aplica solo mientras Sed de sangre está activa. Los bonos se suman aditivamente en los pools físicos existentes en tiempo de ejecución.`,
  },

  electrified: {
    title: 'Electrificado',
    body: `Un **Estado** (buff) sobre el jugador, proveniente del **árbol de maestría de Rayo — Electrificante**. Cada golpe del jugador con etiqueta de rayo tira la probabilidad de activación de Electrificado; con éxito, el buff se aplica durante **4 segundos** (extendido por el nodo fuerte). Volver a activarlo refresca su duración. El buff en sí no hace nada intrínseco — sus bonos están enteramente definidos por los nodos del árbol Electrificante.

**Árbol Electrificante (corto, 6 nodos):**
- Nodos 0 y 3 (pequeños): +5 % de probabilidad de que las acciones de rayo te Electrifiquen cada uno — total +10 % base
- Nodos 1 y 4 (pequeños): +5 % de velocidad de acción aumentada mientras estás Electrificado cada uno (se aplica a **todas** las acciones, no solo a las de rayo)
- Nodo 2 (fuerte): +25 % de duración aumentada de Electrificado · +5 % de velocidad de acción aumentada mientras estás Electrificado
- Nodo 5 (mayor): -5 % de daño recibido de todas las fuentes mientras estás Electrificado

El bono de velocidad de acción es **global** — se aplica a cada acción del jugador independientemente de la etiqueta. La reducción de daño entrante se aplica después de las resistencias y cualquier otro multiplicador en la cadena de daño del jugador.`,
  },

  area: {
    title: 'Área',
    body: `Un **tipo de daño** junto con \`proyectil\` y \`golpe\`. Cada acción lleva como máximo una de estas tres etiquetas. Una acción con etiqueta de Área tiene una zona de impacto circular definida por su campo \`area\` (en unidades de radio del jugador): cada enemigo dentro de esa zona desde la fuente del área recibe el daño completo del lanzamiento al impactar.

Dos modos de apuntado:
- **Apuntada al enemigo**: la acción tiene un \`range\` como cualquier otra; una vez que el enemigo apuntado entra en ese rango el lanzamiento se dispara, y el área se centra **en el objetivo**.
- **Auto-apuntada** (\`selfTargeted: true\`): la acción no tiene rango. Su radio de área hace las veces de rango de activación — el lanzamiento se dispara en el momento en que cualquier enemigo entra en el área, y el área se centra **en el lanzador**.

Cada enemigo en el área recibe un golpe pendiente independiente, por lo que todos los activadores por golpe (quemadura, electrocución, sangrado, frenesí, robo de vida/maná, XP de acción, etc.) se disparan una vez por enemigo golpeado. Los activadores por acción (trance, inmolación, doubleAction, pago de maná) se disparan una vez por acción como de costumbre.`,
  },

  knockback: {
    title: 'Retroceso',
    body: `Un impulso físico aplicado a un enemigo en una tirada de golpe exitosa. El enemigo es empujado directamente lejos del atacante durante una breve ventana (200 ms).

**Rango base de Retroceso** (distancia que el enemigo recorre):
- **Acciones de área**: 1 unidad de radio del jugador
- **Acciones de proyectil**: 0,5 unidades de radio del jugador

Los nodos de maestría de Retroceso aumentan la probabilidad de retroceder y pueden añadir dos debuffs temporizados al enemigo retrocedido (independientes entre sí):
- **Ralentización de velocidad de movimiento** — la velocidad de movimiento del enemigo se reduce durante 2 segundos
- **Reducción de daño** — el enemigo retrocedido inflige menos daño al jugador durante 2 segundos

El nodo "más rango de retroceso" multiplica el rango base para ese tipo de acción. Si una acción lleva ambas etiquetas de área y proyectil, ambos pools de retroceso se comprueban independientemente y ambos pueden activarse.`,
  },

  tremor: {
    title: 'Temblor',
    body: `Una **multi-acción** proveniente del **árbol de maestría de Área — Temblor**. Después de que se resuelva un lanzamiento de área, cada víctima no primaria tira independientemente la probabilidad de Temblor; con éxito, se encola un temblor apuntando a ese enemigo.

Cada temblor vuelve a disparar la misma acción de área centrada en su enemigo activador (independientemente de si el original era auto-apuntado o apuntado al enemigo), con un multiplicador base de **0,5× de daño y 0,5× de radio de área**. El árbol de Temblor añade bonos de daño aumentado de temblor y radio aumentado de temblor encima de la base 0,5×.

Los temblores son **lanzamientos de continuación gratuitos** (sin maná extra) y **detienen todas las multi-acciones posteriores, incluidos más temblores**. Pueden golpear a enemigos que ya fueron golpeados por el lanzamiento original o por otro temblor — no hay deduplicación entre oleadas.`,
  },

  dash: {
    title: 'Embestida',
    body: `Una Embestida consume una carga para cubrir 1 segundo de movimiento en 0,1 segundos (compresión de velocidad ×10). Por defecto el jugador puede almacenar hasta 1 carga a la vez; futuros nodos clave pueden elevar el tope.

Las cargas se obtienen mediante una tirada por segundo: una vez por segundo el juego comprueba si se otorga una nueva carga basada en la probabilidad total de carga de Embestida de los nodos de maestría de Embestida invertidos. Sin nodos de Embestida asignados, la probabilidad es 0 % y nunca se otorgan cargas.

Por defecto, la Embestida cierra distancia hacia el enemigo más cercano. El nodo mayor Kite permite que la Embestida también se dispare en dirección de kite (lejos de los enemigos).

Una Embestida en curso se cancela inmediatamente cuando comienza la fase de animación de acción del jugador.`,
  },

  kite: {
    title: 'Kite',
    body: `Kitear aleja al jugador del enemigo más cercano cuando ese enemigo está dentro de la mitad del rango de acción del jugador. La velocidad de kite equivale a la velocidad de movimiento efectiva del jugador multiplicada por la fracción total de velocidad de kite de los nodos de maestría de Kite (0,25 por nodo pequeño, con tope en 1,0 a los cuatro nodos).

El jugador nunca se mueve durante la fase de animación de acción (el primer tercio del ciclo de acción). Durante la fase de espera (los dos tercios restantes), kitear tiene prioridad sobre cerrar distancia hacia el siguiente enemigo siempre que se cumpla la condición de kite.

Asignar el nodo fuerte de Kite otorga un bono plano de toda-resistencia que se aplica mientras la condición de kiteo está activa.`,
  },

  'mana-shield': {
    title: 'Escudo de maná',
    body: `Una mecánica defensiva de la **maestría de Maná** que intercepta una porción del daño entrante y la paga con maná en lugar de vida.

Cuando un golpe impacta, el Escudo de maná absorbe un porcentaje del daño (la fracción de absorción, elevada por los nodos del árbol de Escudo de maná). La porción absorbida se convierte en un coste de maná al **200 %** — absorber 100 de daño cuesta 200 de maná. Si tienes maná insuficiente, el escudo absorbe tanto como permita tu maná y el resto golpea la vida normalmente.

**Modificadores del árbol de Escudo de maná:**
- Los nodos de absorción elevan la fracción absorbida (base 0 %; solo activo con al menos un nodo)
- Los nodos de reducción de coste bajan la tasa de conversión del 200 %
- Nodo 5: el escudo intercepta todas las fuentes de daño, no solo los golpes directos
- Nodo 11: tus resistencias se aplican al coste de maná (la misma reducción que proporcionan al daño de vida)`,
  },

  'mana-steal': {
    title: 'Robo de maná',
    body: `Una mecánica de recuperación de recurso que refleja el **Robo de vida**: una fracción del daño por golpe se recupera como maná en lugar de vida.

**Fórmula:**
- Robado = daño por golpe × % de robo × (1 + % aumentado de robado)
- Tope: maná máx × **1 %** por instancia (elevado por el nodo de aumento de tope)

**Árbol de Robo de maná (corto, 6 nodos):**
- Nodos 0 y 3 (pequeños): +0,5 % de robo cada uno
- Nodos 1 y 4 (pequeños): +5 % aumentado de maná robado cada uno
- Nodo 2 (fuerte): +10 % aumentado del tope de robo de maná
- Nodo 5 (mayor): 1 % de probabilidad por instancia de robo de activar **Frenesí alimentario**

El robo de maná se aplica una vez por golpe directo. Las fuentes de daño por tiempo (ticks de Quemadura, Inmolación) no activan el robo de maná.`,
  },

  champion: {
    title: 'Campeón',
    body: `Un nivel de variante de enemigo por encima de **Élite**. Los Campeones tienen **2,0–4,0× vida**, **2,0–4,0× daño**, **+30 % de velocidad de ataque** y **+20 % de velocidad de movimiento** comparados con un enemigo normal del mismo nivel. Otorgan **×5 XP de acción** al ser eliminados. Identificados por un **diamante dorado** sobre la barra de vida.

Los Campeones no pueden aparecer sin nodos de maestría de Enemigo que otorguen probabilidad de campeón. Cada enemigo Élite tiene una tirada separada para ser ascendido a Campeón basada en esta probabilidad.`,
  },

  boss: {
    title: 'Jefe',
    body: `El nivel de enemigo más raro y fuerte, por encima de **Campeón**. Los Jefes tienen **4,0–8,0× vida**, **4,0–8,0× daño**, **+40 % de velocidad de ataque** y **+30 % de velocidad de movimiento** comparados con un enemigo normal del mismo nivel. Otorgan **×10 XP de acción** al ser eliminados. Identificados por un **diamante rojo** sobre la barra de vida.

Los Jefes no pueden aparecer sin nodos de maestría de Enemigo que otorguen probabilidad de jefe. Cada enemigo Campeón tiene una tirada separada para ser ascendido a Jefe.`,
  },

  'critical-hit': {
    title: 'Golpe crítico',
    body: `Una tirada por acción que multiplica el daño por golpe. Todas las acciones tienen su propia probabilidad de crítico base después de la primera ascensión.

**Fórmula de daño:**
- Multiplicador de crítico = **2×** base (+100 % de bono) más todos los nodos de "daño de Golpe crítico aumentado" (aditivos sobre la porción de bono)
- Los nodos de "más daño de Golpe crítico" multiplican la porción de bono después de aumentado

**Ejemplo:** +20 % de daño crítico aumentado → bono = 100 % × 1,20 = 120 %, así que el crítico inflige ×2,20 en total.

**Probabilidad de crítico:**
- Cada acción tiene una probabilidad base de crítico, algunas maestrías pueden aumentarla.
- "Probabilidad de crítico aumentada" y "más probabilidad de crítico" escalan la probabilidad base multiplicativamente
- Los críticos se activan con una tirada por acción antes de que se resuelva el golpe; todas las mecánicas por golpe (**Aflicciones**, **Robo de vida**, etc.) se aplican normalmente a un golpe crítico salvo que se indique explícitamente

**Ejemplo:** 3 % de probabilidad base con +2 % de base y 50 % de probabilidad aumentada es 7,5 % en total.`,
  },

  'ignore-mitigation': {
    title: 'Ignorar mitigación',
    body: `Una tirada por acción que hace que un golpe eluda toda la **Mitigación** de daño del objetivo (resistencias y cualquier otra reducción). Cuando la tirada tiene éxito, el golpe inflige su daño calculado completo independientemente de los valores de resistencia del enemigo.

Fuentes de probabilidad de ignorar mitigación:
- Maestría de Acción — nodo mayor final del árbol de Daño: +20 % de probabilidad en cualquier golpe de acción
- Maestría de **Golpe crítico** — nodo 5 del árbol de Daño: +20 % de probabilidad en golpes críticos
- Maestría de **Golpe crítico** — nodo 13 del árbol de Probabilidad: +10 % de probabilidad de que los críticos ignoren la mitigación

Las probabilidades de múltiples fuentes se suman en una única tirada por golpe. Un golpe que ignora mitigación no despoja al enemigo de su resistencia — solo omite la reducción para ese único golpe.`,
  },

  frost: {
    title: 'Escarcha',
    body: `Una **Aflicción** aplicada por golpes con etiqueta de frío. La probabilidad de aplicación base es del **5 %** por golpe de frío, con una duración base de **1 segundo**. Mientras está escarchado, el enemigo ve reducidas su velocidad de movimiento y su velocidad de acción en un **20 %** (base) cada una, aumentado por los nodos de maestría de Escarcha.

**Inmune mientras está activa:** a diferencia de otras **Aflicciones**, la Escarcha **no** se refresca. Una vez que un enemigo está escarchado, los golpes de frío posteriores no pueden volver a aplicarla ni prolongarla hasta que la Escarcha actual expire.

**Árbol de Daño de frío, nodo 11 — vulnerabilidad a la escarcha:** los enemigos escarchados reciben +20 % de daño aumentado de fuentes **no de frío**. La **Fractura**, al ser daño de frío, queda excluida.

**Árbol de Escarcha (completo):**
- Probabilidad de aplicar Escarcha: +5 % cada uno (nodos 0, 3, 6, 9) y +15 % (nodo 8) — aumenta la probabilidad de que un golpe de frío escarche al objetivo
- Ralentización de Escarcha: +3 % cada uno (nodos 1, 4, 7, 10), más +5 % (nodo 2) y +8 % (nodo 5) — añadido tanto a la ralentización de movimiento como de acción
- Duración de Escarcha: +10 % (nodo 2), +20 % (nodo 5) — prolonga la duración de la Escarcha
- Nodo 5 (primer mayor): +8 % de ralentización de escarcha aumentada · +20 % de duración de escarcha aumentada
- Nodo 11 (segundo mayor): **15 % más** de efecto de ralentización de escarcha — un multiplicador sobre la ralentización total

**Nodos clave:**
- Nodo 12: +5 % de ralentización de escarcha aumentada · 10 % menos de duración de escarcha
- Nodo 13: 20 % más de duración de escarcha
- Nodo 14: los enemigos escarchados infligen **10 % menos** de daño
- Nodo 15: +5 % de ralentización de escarcha aumentada

La ralentización aumentada es aditiva; el efecto de ralentización "más" (nodo 11) multiplica el total acumulado. La ralentización y la reducción de daño infligido se aplican multiplicativamente junto con otros modificadores de velocidad y daño.`,
  },

  shatter: {
    title: 'Fractura',
    body: `Una mecánica de la **maestría de Frío — Fractura**. Los enemigos abatidos mientras están **escarchados** tienen una **probabilidad de fracturarse**: una explosión de frío centrada en el enemigo fracturado, con un alcance de **3 unidades** (radio-jugador). Por defecto inflige el **5 % de la vida máxima del enemigo fracturado** como daño de frío en esa área.

La Fractura **no es una acción** — **no** se beneficia del daño de frío ni del daño de **Área**. Su único factor de escala es la vida máxima del enemigo fracturado y el propio árbol de Fractura. El daño es de tipo frío y se reduce por la **Resistencia** elemental del objetivo. La Fractura **no** aplica **Escarcha** y no otorga ningún proc de **Aflicción** — pero puede matar, y un enemigo escarchado abatido por una Fractura puede a su vez intentar fracturarse, permitiendo reacciones en cadena a través de un grupo escarchado.

**La probabilidad de fractura es del 0 % por defecto** — la otorga enteramente el árbol de Fractura.

**Árbol de Fractura (corto, 6 nodos):**
- Nodo 0: los enemigos abatidos escarchados tienen +5 % de probabilidad de fracturarse
- Nodo 1: daño de Fractura aumentado en un 2 % de la vida máxima del enemigo fracturado
- Nodo 2 (fuerte): +8 % de probabilidad de fracturarse · +20 % de área de efecto de Fractura aumentada
- Nodo 3: los enemigos abatidos escarchados tienen +5 % de probabilidad de fracturarse
- Nodo 4: daño de Fractura aumentado en un 2 % de la vida máxima del enemigo fracturado
- Nodo 5 (mayor): +10 % de probabilidad de fracturarse · daño de Fractura aumentado en un 3 % de la vida máxima del enemigo fracturado

Con el árbol completo: +28 % de probabilidad de fracturarse, y daño = **12 % de la vida máxima** (5 % base + 2 % + 2 % + 3 %).`,
  },

  'frozen-armor': {
    title: 'Armadura helada',
    body: `Un **Estado** (buff) sobre el jugador, acumulado al escarchar enemigos — siempre disponible cuando aplicas **Escarcha**. Cada **100 escarchas** otorga **1 carga de Armadura helada**, hasta un máximo de **10 cargas**. Las cargas se agotan de una en una cada **2 segundos**. El número de cargas actual se muestra en la barra de buffs (icono de copo de nieve).

Por sí sola, la Armadura helada no hace **nada** — las cargas se acumulan y se muestran pero no otorgan beneficio alguno hasta que inviertas en el árbol de Armadura helada. Una vez tomado al menos un nodo de reducción de daño, cada carga reduce el daño recibido por **golpes** (limitado a un **80 %** de reducción total).

**Árbol de Armadura helada (corto, 6 nodos):**
- Nodos 0 y 3: la Armadura helada requiere 20 escarchas menos por carga cada uno (−40 en total → una carga cada 60 escarchas)
- Nodos 1 y 4: 1 % de daño recibido reducido por carga de Armadura helada cada uno (2 % por carga en total)
- Nodo 2 (fuerte): 30 % de probabilidad de ganar 2 cargas en lugar de 1 · 20 % de agotamiento de cargas más lento
- Nodo 5 (mayor): la Armadura helada puede tener 5 cargas máximas más

La reducción de daño se aplica después de las resistencias en el pipeline de daño del jugador.`,
  },

  block: {
    title: 'Bloqueo',
    body: `El **Bloqueo** es una mecánica defensiva desbloqueada por la **primera Trascendencia** (comprobación en vivo — cualquier partida con una o más Trascendencias la tiene). Cuando recibes un **golpe**, tienes un **5 % de probabilidad base** de bloquear el **20 %** del daño de ese golpe. Tras un bloqueo, el bloqueo **se recupera durante 1 segundo** antes de poder activarse de nuevo (base: un bloqueo por segundo).

Reglas:

- El bloqueo solo se aplica a **golpes** — los ticks de aflicción (quemadura, sangrado, veneno) nunca pueden bloquearse.
- Un golpe bloqueado sigue otorgando su **experiencia de vida completa** — bloquear nunca reduce la experiencia de vida.
- Un golpe bloqueado aún puede infligir aflicciones, y su daño se basa en el **daño total del golpe antes del bloqueo**. El nodo mayor de Eficiencia de bloqueo puede suprimir por completo las aflicciones de los golpes bloqueados.
- Los bonos de **velocidad de recuperación de bloqueo** añaden bloqueos enteros por segundo: +100 % = 2 bloqueos por segundo. La maestría de Bloqueo completa (8 nodos de recuperación) alcanza **9 bloqueos por segundo**.

Bloquear otorga experiencia de **maestría de Bloqueo** según la cantidad de daño evitado, con los mismos requisitos y multiplicadores que la maestría de Vida (empieza lento — poca probabilidad de bloqueo significa poco daño evitado al principio).`,
  },
}
