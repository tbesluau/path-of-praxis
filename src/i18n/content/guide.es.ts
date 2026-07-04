// Spanish translations for src/config/guide.md.
// See guide.fr.ts for the schema; missing entries fall back to English.
import type { ContentBlock } from './index'

export const guideEs: Record<string, ContentBlock> = {
  'Actions, Action Levels, and Runes': {
    title: 'Acciones, niveles de acción y runas',
    body: `Esta es la principal fuente de daño del juego. Tu personaje y tus enemigos realizan acciones durante el combate para hacerse daño. A medida que sigues usando una acción, gana experiencia en función del daño que ha infligido y sube de nivel. Una acción de nivel superior inflige daño adicional a un ritmo ligeramente más rápido. El nivel más alto alcanzado por una acción también aumenta el ritmo de experiencia de acción que obtienes en un 10 % aditivo por nivel. Subir de nivel las acciones también desbloquea ranuras de runa donde puedes asignar runas para obtener bonos de acción. Cada acción tiene seis ranuras de runa, cada una desbloqueándose a un nivel específico:

- **Nv. 5** — 1ª ranura menor
- **Nv. 10** — 1ª ranura mayor
- **Nv. 15** — 2ª ranura menor
- **Nv. 22** — 3ª ranura menor
- **Nv. 30** — 2ª ranura mayor
- **Nv. 40** — ranura clave`,
  },

  'Enemy level': {
    title: 'Nivel de enemigo',
    body: `El widget de nivel de enemigo en la parte superior es la progresión principal del juego: cuanto mayor sea el nivel, más experiencia obtienes. Puedes elegir el nivel de enemigo a mano o dejar que suba automáticamente (subirá 1 nivel por oleada hasta el máximo). Ten en cuenta que sólo puedes ganar experiencia hacia el siguiente nivel de enemigo jugando al nivel máximo actual. Algunas funciones nuevas también se desbloquean a niveles de enemigo más altos.
Los enemigos se vuelven exponencialmente más fuertes con su nivel, así que tendrás que aprovechar las distintas capas de prestigio para ganar suficiente poder para progresar.`,
  },

  'Death & Rebirth': {
    title: 'Muerte y Renacer',
    body: `Cuando tu vida llega a cero, tu partida termina y Renaces. Pero no empiezas completamente de cero: toda la experiencia obtenida durante la partida — acciones, vida, maná, etc. — hace tu próxima partida más fuerte. Ahora ganas experiencia más rápido para acciones, vida y maná en función del nivel más alto alcanzado, y ganas experiencia de Maestría.

Si sientes que te estás estancando y no puedes subir el nivel de enemigo de forma constante, puede ser el momento de activar un Renacer y convertir esa experiencia en grandes mejoras de poder gracias a las Maestrías.`,
  },

  'Masteries': {
    title: 'Maestrías',
    body: `Las maestrías son mejoras pasivas a largo plazo que persisten a través de los Renaceres. Cada maestría tiene su propia barra de experiencia que se llena con acciones y actividades relacionadas.

Cuando una maestría sube de nivel ganas un punto de maestría. Abre el árbol de habilidades de una maestría para gastar puntos en bonos pasivos permanentes. Ctrl+clic (o Cmd+clic) compra automáticamente cada maestría asequible hacia el nodo objetivo.

Una vez que los árboles de una maestría están completamente comprados, los puntos sobrantes pueden **convertirse** en un bono permanente (1 % más por punto para la mayoría de las maestrías, 0,5 % para algunas). Usa el botón Convertir en el panel del árbol de maestría; Ctrl+clic (o Cmd+clic) convierte todos los puntos disponibles a la vez.`,
  },

  'Action Tags': {
    title: 'Etiquetas de acción',
    body: `Cada acción lleva una **etiqueta de tipo de daño**: Área, Proyectil o Golpe, y una **etiqueta de fuente de daño**: Fuego, Rayo o Físico.

Las etiquetas controlan qué bonos de maestría se aplican y cómo se comporta la acción — el área golpea un radio, los proyectiles siguen un único objetivo, los golpes operan a corta distancia. La etiqueta elemental controla qué aflicciones puede aplicar la acción y de qué bonos de maestría elementales se beneficia.`,
  },

  'Afflictions': {
    title: 'Aflicciones',
    body: `Las aflicciones son subproductos de las fuentes de daño (p. ej. físico, fuego, rayo). Se aplican a los enemigos con los golpes con una pequeña probabilidad base, modificada por los nodos de maestría.

Aflicciones actuales: **Quemadura** (fuego), **Sangrado** (físico), **Electrocución** (debuff de rayo). Los ticks de aflicción no son golpes — no activan el robo de vida, el daño doble ni los procs de estado salvo que se indique explícitamente.`,
  },

  'Multi-Action': {
    title: 'Multi-acción',
    body: `Las multi-acciones son lanzamientos de seguimiento activados por una acción primaria o por otra multi-acción. Cada una se dispara a una fracción del retardo de ciclo normal y puede llevar una penalización de daño.

Cada multi-acción es un nuevo lanzamiento real: puede activar aflicciones, proc de estados y tirar para otras multi-acciones — pero nunca vuelve a activar la misma multi-acción que la produjo a menos que se indique explícitamente. Un multiplicador de profundidad de ×0,9 se acumula con cada generación.`,
  },

  'Speed Stockpile': {
    title: 'Reserva de velocidad',
    body: `La **velocidad ×2** funciona con una reserva ganada mientras estás ausente. Por cada 10 segundos reales que el juego no está en marcha (pestaña inactiva, ventana cerrada o juego en pausa), ganas 1 segundo de tiempo a ×2, hasta un máximo de 1 hora. Las recompensas inferiores a 10 segundos se descartan.

Cuando vuelves, una notificación muestra lo que has ganado. Mientras corres a ×2 la reserva se vacía en tiempo real; al llegar a cero el juego vuelve a ×1 y ×2 queda bloqueado hasta que se gane más.`,
  },

  'Ascent': {
    title: 'Ascensión',
    body: `La Ascensión es un desafío único y progresivo desbloqueado después de varios Renaceres. Presenta una serie de encuentros de enemigos cada vez más difíciles. Completar una etapa de Ascensión recompensa con un bono permanente que persiste a través de todos los Renaceres futuros — más fuerte que cualquier cosa disponible mediante la progresión normal de maestría.

El progreso de Ascensión es independiente de tu partida. Puedes intentarlo en cualquier momento desde el menú; fallar una etapa de Ascensión no cuesta nada.`,
  },

  'Transcendence': {
    title: 'Trascendencia',
    body: `La Trascendencia es la capa de prestigio por encima de la Ascensión. Matar a un jefe de **nivel de enemigo 100 o superior** activa el botón dorado **Trascender** en la parte inferior del panel de nivel de enemigo — sin barra que llenar, pero cada Trascendencia debe ganarse de nuevo con otro jefe de nivel 100+.

Trascender reinicia **todo** lo que reinicia una Ascensión, **más** tu contador de ascensiones, tus puntos de universo y todos los artefactos no equipados. Tus **artefactos equipados** y tus **reliquias** sobreviven — y una vez que has trascendido, ambas ranuras de artefacto permanecen desbloqueadas para siempre.

Antes de trascender eliges una **Reliquia** — una bendición permanente que sobrevive a todos los reinicios. Cada una de las cuatro reliquias solo puede poseerse una vez:

- **Eco de renacimiento** — una vez por renacimiento, obtén tu progreso de maestría pendiente sin morir (el botón dice solo «Renacer» mientras está disponible).
- **Rompecadenas** — Ascender puede otorgar varias ascensiones a la vez, hasta tu nivel máximo de enemigo −5 (el botón dice «Ascender (+x)»).
- **Tercera mano** — una ranura de disparador de acción adicional permanente.
- **Embestida** — 30% más enemigos, 10% más XP, 10% más daño.

Cada Trascendencia también otorga un nivel de poder permanente: **+10% XP, +10% daño y +10% vida máxima** (aditivos entre sí, multiplicativos con lo demás). Tu poder de trascendencia y tus reliquias se muestran en la parte inferior del panel de personaje.

Tu primera Trascendencia también desbloquea el **Bloqueo**: un 5% de probabilidad base de bloquear el 20% del daño de un golpe recibido (una vez por segundo), con su propia maestría de Bloqueo en la sección Vida y Maná.`,
  },

  'Action Triggers': {
    title: 'Disparadores de acción',
    body: `Los disparadores de acción ejecutan una acción automáticamente cuando se cumple una condición. La primera ranura siempre es el **Ataque automático** — se dispara con un temporizador continuo. Otras ranuras de disparador se desbloquean al Ascender.

- La **ranura 2** se desbloquea en la Ascensión 3. Tipos de disparador: **Tiempo** (temporizador periódico), **Maná** (se dispara cada 100 de maná gastado por tus acciones), **Golpe crítico** (se dispara tras un crítico — desbloqueo: matar a un jefe con un crítico), **Aflicción** (se dispara tras acumular cargas de aflicción — desbloqueo: matar a un jefe con un golpe de aflicción).
- La **ranura 3** se desbloquea en la Ascensión 6 con las mismas opciones de disparador.

Cada ranura adicional aplica una penalización global de daño: ×0,75 para la ranura 2, ×0,50 para la ranura 3. A pesar de esto, una segunda acción bien combinada puede aumentar significativamente la producción total de daño.

Abre el panel de configuración de combate (en la barra superior) para cambiar tu acción o configurar las ranuras de disparador.`,
  },

  'Artifacts': {
    title: 'Artefactos',
    body: `Los artefactos son objetos raros que dejan caer los jefes una vez que has alcanzado la Ascensión 5. Cada artefacto lleva un modificador positivo asociado a uno negativo — un equilibrio riesgo/recompensa que tú decides aceptar o rechazar.

Cuando se derrota a un jefe, una carta de botín vuela hacia el centro de la pantalla. Puedes **Guardarla** (conservarla para más tarde), **Equiparla** inmediatamente, o **Descartarla** definitivamente.

Tu inventario puede contener hasta 20 artefactos. Una vez lleno, los jefes dejan de soltar nuevos artefactos hasta que hagas sitio.

Las **ranuras de equipamiento** se desbloquean con la Ascensión:
- **Ascensión 5** — se desbloquea 1 ranura
- **Ascensión 10** — se desbloquea una 2ª ranura

Solo los artefactos equipados aplican sus modificadores. Los modificadores de todos los artefactos equipados se acumulan.

La **rareza** está determinada por el número de pares de modificadores: un Artefacto Ligero tiene un par, un Artefacto Medio tiene dos, y un Artefacto Pesado tiene tres. Los artefactos más raros solo empiezan a caer a niveles de jefe más altos:
- **Nivel de jefe 30+** — los Artefactos Medios (2 líneas) pueden caer
- **Nivel de jefe 50+** — los Artefactos Pesados (3 líneas) pueden caer

Para gestionar tu colección, abre el panel de Artefactos desde el menú de Ascensión (disponible a partir de la Ascensión 5). Desde allí puedes equipar, desequipar o eliminar permanentemente artefactos.`,
  },
}
