/**
 * Lightweight i18n for the main game shell (no build step).
 * Locales live in MESSAGES; add keys to `en` first, then mirror in other locales.
 */
import { TILE_TYPES } from './tile-types.js';

const STORAGE_KEY = 'triplet_tiles_locale';

/** @type {readonly string[]} */
export const SUPPORTED_LOCALES = Object.freeze(['en', 'es', 'de', 'ru', 'he', 'ar']);

const RTL_LANG_PREFIXES = new Set(['ar', 'he', 'fa', 'ur', 'yi']);

/** Template shape tokens from levelgen (`levels.generated.js` names like "DIAMOND 12"). */
const GENERATED_SHAPE_KEYS = new Set([
  'CIRCLE',
  'CROSS',
  'DIAMOND',
  'HEART',
  'HEXAGON',
  'RING',
  'T',
  'TRIANGLE',
  'U'
]);

/** @type {Record<string, Record<string, string>>} */
const MESSAGES = {
  en: {
    'app.docTitle': 'Triplet Tiles',
    'app.gameTitle': 'Triplet Tiles',
    'level.line': 'Level {id}: {name}',
    'level.shape.other': 'Other',
    'level.name.tutorial1': 'First Steps',
    'level.name.tutorial2': 'Getting the Hang of It',
    'level.name.fallbackGrove': 'Gentle Grove (Fallback)',
    'level.numberedName': '{shape} {num}',
    'level.shape.CIRCLE': 'Circle',
    'level.shape.CROSS': 'Cross',
    'level.shape.DIAMOND': 'Diamond',
    'level.shape.HEART': 'Heart',
    'level.shape.HEXAGON': 'Hexagon',
    'level.shape.RING': 'Ring',
    'level.shape.T': 'T',
    'level.shape.TRIANGLE': 'Triangle',
    'level.shape.U': 'U',
    'score.label': 'Score',
    'chrome.chooseLevel': 'Choose level',
    'chrome.restartLevel': 'Restart level',
    'toolbar.display': 'Display',
    'toolbar.fullScreen': 'Full screen',
    'toolbar.fullScreenDetail': 'Fill the screen (hides browser UI where supported)',
    'toolbar.exitFullScreen': 'Exit full screen',
    'toolbar.leaveFullScreen': 'Leave full screen',
    'toolbar.installApp': 'Install app',
    'toolbar.installDetail': 'Install as an app for a fuller screen without the address bar',
    'audio.musicGroup': 'Background music',
    'audio.musicOn': 'Music on',
    'audio.musicOff': 'Music off',
    'audio.musicDetail': 'Turn background music on or off',
    'audio.musicVolumeLabel': 'Music volume',
    'audio.musicVolumeAria': 'Music volume',
    'audio.sfxGroup': 'Sound effects',
    'audio.sfxOn': 'Sound effects on',
    'audio.sfxOff': 'Sound effects off',
    'audio.sfxDetail': 'Turn sound effects on or off',
    'audio.sfxVolumeLabel': 'Sound effects volume',
    'audio.sfxVolumeAria': 'Sound effects volume',
    'audio.hapticsGroup': 'Vibration',
    'audio.hapticsOn': 'Vibration on',
    'audio.hapticsOff': 'Vibration off',
    'audio.hapticsTurnOff': 'Turn vibration off',
    'audio.hapticsTurnOn': 'Turn vibration on',
    'audio.vibrationWord': 'Vibration',
    'audio.hapticsUnsupportedAria': 'Vibration not supported in this browser',
    'audio.hapticsUnsupportedTitle':
      'Vibration is not available in this browser. On Android, Chrome and Samsung Internet support it; Firefox for Android does not.',
    'powerups.group': 'Power-ups',
    'powerups.undoTitle': 'Undo last move',
    'powerups.undoAria': 'Undo last move',
    'powerups.shuffleTitle': 'Shuffle tile types on the board (positions stay the same)',
    'powerups.shuffleAria': 'Shuffle tile types',
    'powerups.removeTypeTitle': 'Remove all of one tile type',
    'powerups.removeTypeAria': 'Remove one tile type',
    'board.playfieldAria':
      'Board playfield (scroll to see the whole grid on large levels)',
    'board.gridAria':
      'Game board, match exposed tiles. Focus moves here when a level starts; arrow keys move in four directions and wrap to the far edge (e.g. left from the first column jumps to the rightmost column); Enter or Space to collect.',
    'tray.sectionLabel': 'Tray',
    'tray.groupAria': 'Tray',
    'overlay.winTitle': 'Level Complete',
    'overlay.winBody': 'You cleared {name} with a score of {score}.',
    'overlay.nextLevel': 'Next level',
    'overlay.restartFrom1': 'Restart from level 1',
    'overlay.lossTitle': 'Level Failed',
    'overlay.lossDefault': 'The tray overflowed.',
    'overlay.tryAgain': 'Try again',
    'overlay.nextAria': 'Next level',
    'overlay.retryLevelAria': 'Retry this level',
    'levelSelect.heading': 'Choose Level',
    'levelSelect.close': 'Close',
    'levelSelect.groupByLabel': 'Group by',
    'levelSelect.groupAria': 'Group levels by',
    'levelSelect.groupDifficulty': 'Difficulty (thirds)',
    'levelSelect.groupShape': 'Board shape',
    'levelSelect.shapeLabel': 'Shape',
    'levelSelect.filterShapeAria': 'Filter by board template shape',
    'levelSelect.allShapes': 'All shapes',
    'levelSelect.all': 'All',
    'levelSelect.easy': 'Easy',
    'levelSelect.medium': 'Medium',
    'levelSelect.hard': 'Hard',
    'levelSelect.hint': 'Click a level to play',
    'levelSelect.hintEmpty': 'No levels match this filter.',
    'levelSelect.cardAriaShape': 'Level {id}: {name}, shape {shape}',
    'levelSelect.cardAriaDiff': 'Level {id}: {name}, {difficulty} difficulty',
    'difficulty.easy': 'easy',
    'difficulty.medium': 'medium',
    'difficulty.hard': 'hard',
    'tray.removeTypeTrayAria':
      'Choose a tile type to remove from the board and tray. Arrow keys to move, Enter or Space to confirm, Escape to cancel.',
    'tray.removeTypeTileAria': '{type} in tray — remove this type from board and tray',
    'board.exposedTileAria': '{type}, exposed tile',
    'tile.unknown': 'tile',
    'tile.evergreen-tree': 'evergreen tree',
    'tile.flower': 'flower',
    'tile.grapes': 'grapes',
    'tile.star': 'star',
    'tile.acorn': 'acorn',
    'tile.mushroom': 'mushroom',
    'tile.cherry': 'cherry',
    'tile.butterfly': 'butterfly',
    'tile.sunflower': 'sunflower',
    'tile.apple': 'apple',
    'tile.carrot': 'carrot',
    'tile.lady-beetle': 'lady beetle',
    'loss.trayFull':
      'The tray is full. Try managing your tiles more carefully next time.',
    'loss.trayOverflow': 'The tray overflowed.',
    'locale.selectLabel': 'Language',
    'credits.full':
      'Tile icons: <a href="https://openmoji.org/" target="_blank" rel="noopener noreferrer">OpenMoji</a> (CC&nbsp;BY-SA&nbsp;4.0) · UI icons: <a href="https://phosphoricons.com/" target="_blank" rel="noopener noreferrer">Phosphor</a> (MIT)'
  },
  es: {
    'app.docTitle': 'Tríadas',
    'app.gameTitle': 'Tríadas',
    'level.line': 'Nivel {id}: {name}',
    'level.shape.other': 'Otro',
    'level.name.tutorial1': 'Primeros pasos',
    'level.name.tutorial2': 'Cogiendo el ritmo',
    'level.name.fallbackGrove': 'Claro apacible (reserva)',
    'level.numberedName': '{shape} {num}',
    'level.shape.CIRCLE': 'Círculo',
    'level.shape.CROSS': 'Cruz',
    'level.shape.DIAMOND': 'Diamante',
    'level.shape.HEART': 'Corazón',
    'level.shape.HEXAGON': 'Hexágono',
    'level.shape.RING': 'Anillo',
    'level.shape.T': 'T',
    'level.shape.TRIANGLE': 'Triángulo',
    'level.shape.U': 'U',
    'score.label': 'Puntuación',
    'chrome.chooseLevel': 'Elegir nivel',
    'chrome.restartLevel': 'Reiniciar nivel',
    'toolbar.display': 'Pantalla',
    'toolbar.fullScreen': 'Pantalla completa',
    'toolbar.fullScreenDetail': 'Usar toda la pantalla (oculta la interfaz del navegador si está disponible)',
    'toolbar.exitFullScreen': 'Salir de pantalla completa',
    'toolbar.leaveFullScreen': 'Salir de pantalla completa',
    'toolbar.installApp': 'Instalar aplicación',
    'toolbar.installDetail': 'Instalar como app para una pantalla más amplia sin la barra de direcciones',
    'audio.musicGroup': 'Música de fondo',
    'audio.musicOn': 'Música activada',
    'audio.musicOff': 'Música desactivada',
    'audio.musicDetail': 'Activar o desactivar la música de fondo',
    'audio.musicVolumeLabel': 'Volumen de música',
    'audio.musicVolumeAria': 'Volumen de música',
    'audio.sfxGroup': 'Efectos de sonido',
    'audio.sfxOn': 'Efectos de sonido activados',
    'audio.sfxOff': 'Efectos de sonido desactivados',
    'audio.sfxDetail': 'Activar o desactivar efectos de sonido',
    'audio.sfxVolumeLabel': 'Volumen de efectos',
    'audio.sfxVolumeAria': 'Volumen de efectos de sonido',
    'audio.hapticsGroup': 'Vibración',
    'audio.hapticsOn': 'Vibración activada',
    'audio.hapticsOff': 'Vibración desactivada',
    'audio.hapticsTurnOff': 'Desactivar vibración',
    'audio.hapticsTurnOn': 'Activar vibración',
    'audio.vibrationWord': 'Vibración',
    'audio.hapticsUnsupportedAria': 'Vibración no disponible en este navegador',
    'audio.hapticsUnsupportedTitle':
      'La vibración no está disponible en este navegador. En Android, Chrome y Samsung Internet la admiten; Firefox para Android no.',
    'powerups.group': 'Potenciadores',
    'powerups.undoTitle': 'Deshacer última jugada',
    'powerups.undoAria': 'Deshacer última jugada',
    'powerups.shuffleTitle': 'Barajar tipos de ficha en el tablero (las posiciones no cambian)',
    'powerups.shuffleAria': 'Barajar tipos de fichas',
    'powerups.removeTypeTitle': 'Quitar todas las fichas de un tipo',
    'powerups.removeTypeAria': 'Quitar un tipo de ficha',
    'board.playfieldAria':
      'Campo de juego (desplázate para ver toda la cuadrícula en niveles grandes)',
    'board.gridAria':
      'Tablero: empareja fichas visibles. El foco va aquí al empezar un nivel; las flechas se mueven en cuatro direcciones y saltan al borde opuesto (por ejemplo, desde la primera columna a la derecha); Intro o Espacio para coger.',
    'tray.sectionLabel': 'Bandeja',
    'tray.groupAria': 'Bandeja',
    'overlay.winTitle': 'Nivel completado',
    'overlay.winBody': 'Has completado {name} con {score} puntos.',
    'overlay.nextLevel': 'Siguiente nivel',
    'overlay.restartFrom1': 'Volver al nivel 1',
    'overlay.lossTitle': 'Nivel fallido',
    'overlay.lossDefault': 'La bandeja se ha desbordado.',
    'overlay.tryAgain': 'Reintentar',
    'overlay.nextAria': 'Siguiente nivel',
    'overlay.retryLevelAria': 'Reintentar este nivel',
    'levelSelect.heading': 'Elegir nivel',
    'levelSelect.close': 'Cerrar',
    'levelSelect.groupByLabel': 'Agrupar por',
    'levelSelect.groupAria': 'Agrupar niveles por',
    'levelSelect.groupDifficulty': 'Dificultad (tercios)',
    'levelSelect.groupShape': 'Forma del tablero',
    'levelSelect.shapeLabel': 'Forma',
    'levelSelect.filterShapeAria': 'Filtrar por plantilla de forma',
    'levelSelect.allShapes': 'Todas las formas',
    'levelSelect.all': 'Todos',
    'levelSelect.easy': 'Fácil',
    'levelSelect.medium': 'Medio',
    'levelSelect.hard': 'Difícil',
    'levelSelect.hint': 'Pulsa un nivel para jugar',
    'levelSelect.hintEmpty': 'Ningún nivel coincide con este filtro.',
    'levelSelect.cardAriaShape': 'Nivel {id}: {name}, forma {shape}',
    'levelSelect.cardAriaDiff': 'Nivel {id}: {name}, dificultad {difficulty}',
    'difficulty.easy': 'fácil',
    'difficulty.medium': 'media',
    'difficulty.hard': 'difícil',
    'tray.removeTypeTrayAria':
      'Elige un tipo de ficha para quitar del tablero y la bandeja. Flechas para mover, Intro o Espacio para confirmar, Escape para cancelar.',
    'tray.removeTypeTileAria': '{type} en la bandeja — quitar este tipo del tablero y la bandeja',
    'board.exposedTileAria': '{type}, ficha visible',
    'tile.unknown': 'ficha',
    'tile.evergreen-tree': 'abeto',
    'tile.flower': 'flor',
    'tile.grapes': 'uvas',
    'tile.star': 'estrella',
    'tile.acorn': 'bellota',
    'tile.mushroom': 'seta',
    'tile.cherry': 'cereza',
    'tile.butterfly': 'mariposa',
    'tile.sunflower': 'girasol',
    'tile.apple': 'manzana',
    'tile.carrot': 'zanahoria',
    'tile.lady-beetle': 'mariquita',
    'loss.trayFull':
      'La bandeja está llena. Intenta gestionar mejor tus fichas la próxima vez.',
    'loss.trayOverflow': 'La bandeja se ha desbordado.',
    'locale.selectLabel': 'Idioma',
    'credits.full':
      'Iconos de fichas: <a href="https://openmoji.org/" target="_blank" rel="noopener noreferrer">OpenMoji</a> (CC&nbsp;BY-SA&nbsp;4.0) · Iconos de interfaz: <a href="https://phosphoricons.com/" target="_blank" rel="noopener noreferrer">Phosphor</a> (MIT)'
  },
  de: {
    'app.docTitle': 'Triplet-Kacheln',
    'app.gameTitle': 'Triplet-Kacheln',
    'level.line': 'Level {id}: {name}',
    'level.shape.other': 'Sonstiges',
    'level.name.tutorial1': 'Erste Schritte',
    'level.name.tutorial2': 'Erste Übung',
    'level.name.fallbackGrove': 'Sanfte Lichtung (Ersatz)',
    'level.numberedName': '{shape} {num}',
    'level.shape.CIRCLE': 'Kreis',
    'level.shape.CROSS': 'Kreuz',
    'level.shape.DIAMOND': 'Diamant',
    'level.shape.HEART': 'Herz',
    'level.shape.HEXAGON': 'Sechseck',
    'level.shape.RING': 'Ring',
    'level.shape.T': 'T',
    'level.shape.TRIANGLE': 'Dreieck',
    'level.shape.U': 'U',
    'score.label': 'Punkte',
    'chrome.chooseLevel': 'Level wählen',
    'chrome.restartLevel': 'Level neu starten',
    'toolbar.display': 'Anzeige',
    'toolbar.fullScreen': 'Vollbild',
    'toolbar.fullScreenDetail':
      'Bildschirm füllen (blendet die Browser-Oberfläche aus, sofern unterstützt)',
    'toolbar.exitFullScreen': 'Vollbild beenden',
    'toolbar.leaveFullScreen': 'Vollbild verlassen',
    'toolbar.installApp': 'App installieren',
    'toolbar.installDetail':
      'Als App installieren für mehr Bildfläche ohne Adressleiste',
    'audio.musicGroup': 'Hintergrundmusik',
    'audio.musicOn': 'Musik an',
    'audio.musicOff': 'Musik aus',
    'audio.musicDetail': 'Hintergrundmusik ein- oder ausschalten',
    'audio.musicVolumeLabel': 'Musiklautstärke',
    'audio.musicVolumeAria': 'Musiklautstärke',
    'audio.sfxGroup': 'Soundeffekte',
    'audio.sfxOn': 'Soundeffekte an',
    'audio.sfxOff': 'Soundeffekte aus',
    'audio.sfxDetail': 'Soundeffekte ein- oder ausschalten',
    'audio.sfxVolumeLabel': 'Soundeffektlautstärke',
    'audio.sfxVolumeAria': 'Soundeffektlautstärke',
    'audio.hapticsGroup': 'Vibration',
    'audio.hapticsOn': 'Vibration an',
    'audio.hapticsOff': 'Vibration aus',
    'audio.hapticsTurnOff': 'Vibration ausschalten',
    'audio.hapticsTurnOn': 'Vibration einschalten',
    'audio.vibrationWord': 'Vibration',
    'audio.hapticsUnsupportedAria': 'Vibration in diesem Browser nicht unterstützt',
    'audio.hapticsUnsupportedTitle':
      'Vibration ist in diesem Browser nicht verfügbar. Unter Android unterstützen Chrome und Samsung Internet sie; Firefox für Android nicht.',
    'powerups.group': 'Power-ups',
    'powerups.undoTitle': 'Letzten Zug rückgängig',
    'powerups.undoAria': 'Letzten Zug rückgängig',
    'powerups.shuffleTitle':
      'Kacheltypen auf dem Brett mischen (Positionen bleiben gleich)',
    'powerups.shuffleAria': 'Kacheltypen mischen',
    'powerups.removeTypeTitle': 'Alle Kacheln eines Typs entfernen',
    'powerups.removeTypeAria': 'Einen Kacheltyp entfernen',
    'board.playfieldAria':
      'Spielfeld (scrollen, um das ganze Raster bei großen Levels zu sehen)',
    'board.gridAria':
      'Spielbrett: gleiche freiliegende Kacheln. Fokus hier beim Levelstart; Pfeiltasten in vier Richtungen, am Rand zur gegenüberliegenden Seite springen; Enter oder Leertaste zum Aufnehmen.',
    'tray.sectionLabel': 'Ablage',
    'tray.groupAria': 'Ablage',
    'overlay.winTitle': 'Level geschafft',
    'overlay.winBody': 'Du hast {name} mit {score} Punkten geschafft.',
    'overlay.nextLevel': 'Nächstes Level',
    'overlay.restartFrom1': 'Ab Level 1 neu starten',
    'overlay.lossTitle': 'Level nicht geschafft',
    'overlay.lossDefault': 'Die Ablage ist überlaufen.',
    'overlay.tryAgain': 'Erneut versuchen',
    'overlay.nextAria': 'Nächstes Level',
    'overlay.retryLevelAria': 'Dieses Level erneut versuchen',
    'levelSelect.heading': 'Level wählen',
    'levelSelect.close': 'Schließen',
    'levelSelect.groupByLabel': 'Gruppieren nach',
    'levelSelect.groupAria': 'Level gruppieren nach',
    'levelSelect.groupDifficulty': 'Schwierigkeit (Drittel)',
    'levelSelect.groupShape': 'Brettform',
    'levelSelect.shapeLabel': 'Form',
    'levelSelect.filterShapeAria': 'Nach Vorlagenform filtern',
    'levelSelect.allShapes': 'Alle Formen',
    'levelSelect.all': 'Alle',
    'levelSelect.easy': 'Leicht',
    'levelSelect.medium': 'Mittel',
    'levelSelect.hard': 'Schwer',
    'levelSelect.hint': 'Klicke ein Level zum Spielen',
    'levelSelect.hintEmpty': 'Kein Level passt zu diesem Filter.',
    'levelSelect.cardAriaShape': 'Level {id}: {name}, Form {shape}',
    'levelSelect.cardAriaDiff': 'Level {id}: {name}, Schwierigkeit {difficulty}',
    'difficulty.easy': 'leicht',
    'difficulty.medium': 'mittel',
    'difficulty.hard': 'schwer',
    'tray.removeTypeTrayAria':
      'Wähle einen Kacheltyp zum Entfernen vom Brett und aus der Ablage. Pfeiltasten bewegen, Enter oder Leertaste bestätigen, Escape abbrechen.',
    'tray.removeTypeTileAria':
      '{type} in der Ablage — diesen Typ vom Brett und aus der Ablage entfernen',
    'board.exposedTileAria': '{type}, freiliegende Kachel',
    'tile.unknown': 'Kachel',
    'tile.evergreen-tree': 'Tanne',
    'tile.flower': 'Blume',
    'tile.grapes': 'Trauben',
    'tile.star': 'Stern',
    'tile.acorn': 'Eichel',
    'tile.mushroom': 'Pilz',
    'tile.cherry': 'Kirsche',
    'tile.butterfly': 'Schmetterling',
    'tile.sunflower': 'Sonnenblume',
    'tile.apple': 'Apfel',
    'tile.carrot': 'Karotte',
    'tile.lady-beetle': 'Marienkäfer',
    'loss.trayFull':
      'Die Ablage ist voll. Versuche beim nächsten Mal, deine Kacheln besser zu managen.',
    'loss.trayOverflow': 'Die Ablage ist überlaufen.',
    'locale.selectLabel': 'Sprache',
    'credits.full':
      'Kachel-Symbole: <a href="https://openmoji.org/" target="_blank" rel="noopener noreferrer">OpenMoji</a> (CC&nbsp;BY-SA&nbsp;4.0) · UI-Symbole: <a href="https://phosphoricons.com/" target="_blank" rel="noopener noreferrer">Phosphor</a> (MIT)'
  },
  ru: {
    'app.docTitle': 'Тройки',
    'app.gameTitle': 'Тройки',
    'level.line': 'Уровень {id}: {name}',
    'level.shape.other': 'Другое',
    'level.name.tutorial1': 'Первые шаги',
    'level.name.tutorial2': 'Продолжаем тренироваться',
    'level.name.fallbackGrove': 'Тихая полянка (запасной)',
    'level.numberedName': '{shape} {num}',
    'level.shape.CIRCLE': 'Круг',
    'level.shape.CROSS': 'Крест',
    'level.shape.DIAMOND': 'Ромб',
    'level.shape.HEART': 'Сердце',
    'level.shape.HEXAGON': 'Шестиугольник',
    'level.shape.RING': 'Кольцо',
    'level.shape.T': 'Т',
    'level.shape.TRIANGLE': 'Треугольник',
    'level.shape.U': 'U',
    'score.label': 'Счёт',
    'chrome.chooseLevel': 'Выбрать уровень',
    'chrome.restartLevel': 'Перезапустить уровень',
    'toolbar.display': 'Экран',
    'toolbar.fullScreen': 'Полный экран',
    'toolbar.fullScreenDetail':
      'На весь экран (скрывает интерфейс браузера, если поддерживается)',
    'toolbar.exitFullScreen': 'Выйти из полноэкранного режима',
    'toolbar.leaveFullScreen': 'Покинуть полный экран',
    'toolbar.installApp': 'Установить приложение',
    'toolbar.installDetail':
      'Установить как приложение — больше места на экране без адресной строки',
    'audio.musicGroup': 'Фоновая музыка',
    'audio.musicOn': 'Музыка включена',
    'audio.musicOff': 'Музыка выключена',
    'audio.musicDetail': 'Включить или выключить фоновую музыку',
    'audio.musicVolumeLabel': 'Громкость музыки',
    'audio.musicVolumeAria': 'Громкость музыки',
    'audio.sfxGroup': 'Звуковые эффекты',
    'audio.sfxOn': 'Звуки включены',
    'audio.sfxOff': 'Звуки выключены',
    'audio.sfxDetail': 'Включить или выключить звуковые эффекты',
    'audio.sfxVolumeLabel': 'Громкость эффектов',
    'audio.sfxVolumeAria': 'Громкость звуковых эффектов',
    'audio.hapticsGroup': 'Вибрация',
    'audio.hapticsOn': 'Вибрация включена',
    'audio.hapticsOff': 'Вибрация выключена',
    'audio.hapticsTurnOff': 'Выключить вибрацию',
    'audio.hapticsTurnOn': 'Включить вибрацию',
    'audio.vibrationWord': 'Вибрация',
    'audio.hapticsUnsupportedAria': 'Вибрация не поддерживается в этом браузере',
    'audio.hapticsUnsupportedTitle':
      'Вибрация недоступна в этом браузере. На Android её поддерживают Chrome и Samsung Internet; Firefox для Android — нет.',
    'powerups.group': 'Усиления',
    'powerups.undoTitle': 'Отменить ход',
    'powerups.undoAria': 'Отменить ход',
    'powerups.shuffleTitle':
      'Перемешать типы плиток на поле (позиции не меняются)',
    'powerups.shuffleAria': 'Перемешать типы плиток',
    'powerups.removeTypeTitle': 'Убрать все плитки одного типа',
    'powerups.removeTypeAria': 'Убрать один тип плиток',
    'board.playfieldAria':
      'Игровое поле (прокрутите, чтобы увидеть всю сетку на больших уровнях)',
    'board.gridAria':
      'Игровое поле: собирайте открытые плитки. Фокус здесь в начале уровня; стрелки двигают в четырёх направлениях и переходят на противоположный край; Enter или Пробел — взять.',
    'tray.sectionLabel': 'Лоток',
    'tray.groupAria': 'Лоток',
    'overlay.winTitle': 'Уровень пройден',
    'overlay.winBody': 'Вы прошли «{name}» со счётом {score}.',
    'overlay.nextLevel': 'Следующий уровень',
    'overlay.restartFrom1': 'С начала с уровня 1',
    'overlay.lossTitle': 'Уровень провален',
    'overlay.lossDefault': 'Лоток переполнен.',
    'overlay.tryAgain': 'Повторить',
    'overlay.nextAria': 'Следующий уровень',
    'overlay.retryLevelAria': 'Повторить этот уровень',
    'levelSelect.heading': 'Выбор уровня',
    'levelSelect.close': 'Закрыть',
    'levelSelect.groupByLabel': 'Группировать по',
    'levelSelect.groupAria': 'Группировать уровни по',
    'levelSelect.groupDifficulty': 'Сложность (трети)',
    'levelSelect.groupShape': 'Форма поля',
    'levelSelect.shapeLabel': 'Форма',
    'levelSelect.filterShapeAria': 'Фильтр по форме шаблона',
    'levelSelect.allShapes': 'Все формы',
    'levelSelect.all': 'Все',
    'levelSelect.easy': 'Легко',
    'levelSelect.medium': 'Средне',
    'levelSelect.hard': 'Сложно',
    'levelSelect.hint': 'Нажмите уровень, чтобы играть',
    'levelSelect.hintEmpty': 'Нет уровней по этому фильтру.',
    'levelSelect.cardAriaShape': 'Уровень {id}: {name}, форма {shape}',
    'levelSelect.cardAriaDiff': 'Уровень {id}: {name}, сложность {difficulty}',
    'difficulty.easy': 'лёгкая',
    'difficulty.medium': 'средняя',
    'difficulty.hard': 'высокая',
    'tray.removeTypeTrayAria':
      'Выберите тип плитки для удаления с поля и из лотка. Стрелки — перемещение, Enter или Пробел — подтвердить, Escape — отмена.',
    'tray.removeTypeTileAria':
      '{type} в лотке — убрать этот тип с поля и из лотка',
    'board.exposedTileAria': '{type}, открытая плитка',
    'tile.unknown': 'плитка',
    'tile.evergreen-tree': 'ёлка',
    'tile.flower': 'цветок',
    'tile.grapes': 'виноград',
    'tile.star': 'звезда',
    'tile.acorn': 'жёлудь',
    'tile.mushroom': 'гриб',
    'tile.cherry': 'вишня',
    'tile.butterfly': 'бабочка',
    'tile.sunflower': 'подсолнух',
    'tile.apple': 'яблоко',
    'tile.carrot': 'морковь',
    'tile.lady-beetle': 'божья коровка',
    'loss.trayFull':
      'Лоток заполнен. В следующий раз постарайтесь управлять плитками аккуратнее.',
    'loss.trayOverflow': 'Лоток переполнен.',
    'locale.selectLabel': 'Язык',
    'credits.full':
      'Значки плиток: <a href="https://openmoji.org/" target="_blank" rel="noopener noreferrer">OpenMoji</a> (CC&nbsp;BY-SA&nbsp;4.0) · Значки интерфейса: <a href="https://phosphoricons.com/" target="_blank" rel="noopener noreferrer">Phosphor</a> (MIT)'
  },
  /* Hebrew product title: מילוי נכון «שלשות» (לא «שלושות»).
   * חלופות שם אפשריות — החלף ב־app.docTitle / app.gameTitle לפי רצון:
   *   «שלשות» — קצר (Tab).
   *   «אריחי שלשות» — מודגש אריחים + שלשות (כרגע בכותרת המסך).
   *   «משחק השלשות» — כותרת מסבירה.
   *   «שלש באריחים» — משחקי יותר, דגש על שלש.
   *   «תלת־אריח» / «תלת האריחים» — לשון פורמלית-טכנית (פחות שגורה).
   */
  he: {
    'app.docTitle': 'שלשות',
    'app.gameTitle': 'אריחי שלשות',
    'level.line': 'שלב {id}: {name}',
    'level.shape.other': 'אחר',
    'level.name.tutorial1': 'צעדים ראשונים',
    'level.name.tutorial2': 'מתרגלים',
    'level.name.fallbackGrove': 'חורשה עדינה (גיבוי)',
    'level.numberedName': '{shape} {num}',
    'level.shape.CIRCLE': 'מעגל',
    'level.shape.CROSS': 'צלב',
    'level.shape.DIAMOND': 'יהלום',
    'level.shape.HEART': 'לב',
    'level.shape.HEXAGON': 'משושה',
    'level.shape.RING': 'טבעת',
    'level.shape.T': 'T',
    'level.shape.TRIANGLE': 'משולש',
    'level.shape.U': 'U',
    'score.label': 'ניקוד',
    'chrome.chooseLevel': 'בחירת שלב',
    'chrome.restartLevel': 'הפעלה מחדש של השלב',
    'toolbar.display': 'תצוגה',
    'toolbar.fullScreen': 'מסך מלא',
    'toolbar.fullScreenDetail':
      'מילוי המסך (מסתיר את ממשק הדפדפן כשהדפדפן תומך)',
    'toolbar.exitFullScreen': 'יציאה ממסך מלא',
    'toolbar.leaveFullScreen': 'עזיבת מסך מלא',
    'toolbar.installApp': 'התקנת אפליקציה',
    'toolbar.installDetail': 'התקנה כאפליקציה למסך גדול יותר בלי שורת כתובת',
    'audio.musicGroup': 'מוזיקת רקע',
    'audio.musicOn': 'מוזיקה פועלת',
    'audio.musicOff': 'מוזיקה כבויה',
    'audio.musicDetail': 'הפעלה או כיבוי מוזיקת רקע',
    'audio.musicVolumeLabel': 'עוצמת מוזיקה',
    'audio.musicVolumeAria': 'עוצמת מוזיקה',
    'audio.sfxGroup': 'אפקטי קול',
    'audio.sfxOn': 'אפקטים פועלים',
    'audio.sfxOff': 'אפקטים כבויים',
    'audio.sfxDetail': 'הפעלה או כיבוי אפקטי קול',
    'audio.sfxVolumeLabel': 'עוצמת אפקטים',
    'audio.sfxVolumeAria': 'עוצמת אפקטי קול',
    'audio.hapticsGroup': 'רטט',
    'audio.hapticsOn': 'רטט פועל',
    'audio.hapticsOff': 'רטט כבוי',
    'audio.hapticsTurnOff': 'כיבוי רטט',
    'audio.hapticsTurnOn': 'הפעלת רטט',
    'audio.vibrationWord': 'רטט',
    'audio.hapticsUnsupportedAria': 'אין תמיכה ברטט בדפדפן זה',
    'audio.hapticsUnsupportedTitle':
      'רטט אינו זמין בדפדפן זה. באנדרואיד Chrome ו-Samsung Internet תומכים; Firefox לאנדרואיד לא.',
    'powerups.group': 'חיזוקים',
    'powerups.undoTitle': 'ביטול המהלך האחרון',
    'powerups.undoAria': 'ביטול המהלך האחרון',
    'powerups.shuffleTitle': 'ערבוב סוגי אריחים על הלוח (המיקומים נשארים)',
    'powerups.shuffleAria': 'ערבוב סוגי אריחים',
    'powerups.removeTypeTitle': 'הסרת כל האריחים מסוג אחד',
    'powerups.removeTypeAria': 'הסרת סוג אריח אחד',
    'board.playfieldAria':
      'זירת משחק (גלול לראות את כל הרשת בשלבים גדולים)',
    'board.gridAria':
      'לוח המשחק: התאימו אריחים חשופים. המיקוד כאן בתחילת השלב; חיצים זזים בארבע כיוונים וקופצים לקצה הנגדי; Enter או רווח לאסוף.',
    'tray.sectionLabel': 'מגש',
    'tray.groupAria': 'מגש',
    'overlay.winTitle': 'השלב הושלם',
    'overlay.winBody': 'סיימת את {name} עם {score} נקודות.',
    'overlay.nextLevel': 'השלב הבא',
    'overlay.restartFrom1': 'התחלה מחדש משלב 1',
    'overlay.lossTitle': 'השלב נכשל',
    'overlay.lossDefault': 'המגש גלש.',
    'overlay.tryAgain': 'נסה שוב',
    'overlay.nextAria': 'השלב הבא',
    'overlay.retryLevelAria': 'נסה שוב את השלב',
    'levelSelect.heading': 'בחירת שלב',
    'levelSelect.close': 'סגור',
    'levelSelect.groupByLabel': 'קבץ לפי',
    'levelSelect.groupAria': 'קבץ שלבים לפי',
    'levelSelect.groupDifficulty': 'קושי (שלישים)',
    'levelSelect.groupShape': 'צורת הלוח',
    'levelSelect.shapeLabel': 'צורה',
    'levelSelect.filterShapeAria': 'סינון לפי צורת תבנית',
    'levelSelect.allShapes': 'כל הצורות',
    'levelSelect.all': 'הכול',
    'levelSelect.easy': 'קל',
    'levelSelect.medium': 'בינוני',
    'levelSelect.hard': 'קשה',
    'levelSelect.hint': 'לחץ על שלב כדי לשחק',
    'levelSelect.hintEmpty': 'אין שלבים שמתאימים למסנן.',
    'levelSelect.cardAriaShape': 'שלב {id}: {name}, צורה {shape}',
    'levelSelect.cardAriaDiff': 'שלב {id}: {name}, קושי {difficulty}',
    'difficulty.easy': 'קל',
    'difficulty.medium': 'בינוני',
    'difficulty.hard': 'קשה',
    'tray.removeTypeTrayAria':
      'בחרו סוג אריח להסרה מהלוח ומהמגש. חיצים לניווט, Enter או רווח לאישור, Escape לביטול.',
    'tray.removeTypeTileAria': '{type} במגש — להסיר את הסוג מהלוח ומהמגש',
    'board.exposedTileAria': '{type}, אריח חשוף',
    'tile.unknown': 'אריח',
    'tile.evergreen-tree': 'ברוש',
    'tile.flower': 'פרח',
    'tile.grapes': 'ענבים',
    'tile.star': 'כוכב',
    'tile.acorn': 'בלוט',
    'tile.mushroom': 'פטרייה',
    'tile.cherry': 'דובדבן',
    'tile.butterfly': 'פרפר',
    'tile.sunflower': 'חמניה',
    'tile.apple': 'תפוח',
    'tile.carrot': 'גזר',
    'tile.lady-beetle': 'חיפושית',
    'loss.trayFull':
      'המגש מלא. בפעם הבאה נסה לנהל את האריחים בזהירות יותר.',
    'loss.trayOverflow': 'המגש גלש.',
    'locale.selectLabel': 'שפה',
    'credits.full':
      'סמלי אריחים: <a href="https://openmoji.org/" target="_blank" rel="noopener noreferrer">OpenMoji</a> (CC&nbsp;BY-SA&nbsp;4.0) · סמלי ממשק: <a href="https://phosphoricons.com/" target="_blank" rel="noopener noreferrer">Phosphor</a> (MIT)'
  },
  ar: {
    'app.docTitle': 'بلاط الثلاثات',
    'app.gameTitle': 'بلاط الثلاثات',
    'level.line': 'المستوى {id}: {name}',
    'level.shape.other': 'أخرى',
    'level.name.tutorial1': 'الخطوات الأولى',
    'level.name.tutorial2': 'التمرّن على اللعب',
    'level.name.fallbackGrove': 'الغابة اللطيفة (احتياطي)',
    'level.numberedName': '{shape} {num}',
    'level.shape.CIRCLE': 'دائرة',
    'level.shape.CROSS': 'صليب',
    'level.shape.DIAMOND': 'معين',
    'level.shape.HEART': 'قلب',
    'level.shape.HEXAGON': 'سداسي',
    'level.shape.RING': 'حلقة',
    'level.shape.T': 'T',
    'level.shape.TRIANGLE': 'مثلث',
    'level.shape.U': 'U',
    'score.label': 'النقاط',
    'chrome.chooseLevel': 'اختر المستوى',
    'chrome.restartLevel': 'إعادة المستوى',
    'toolbar.display': 'العرض',
    'toolbar.fullScreen': 'ملء الشاشة',
    'toolbar.fullScreenDetail':
      'ملء الشاشة (يخفي واجهة المتصفح عند توفر الدعم)',
    'toolbar.exitFullScreen': 'الخروج من ملء الشاشة',
    'toolbar.leaveFullScreen': 'مغادرة ملء الشاشة',
    'toolbar.installApp': 'تثبيت التطبيق',
    'toolbar.installDetail':
      'التثبيت كتطبيق لمساحة عرض أكبر دون شريط العناوين',
    'audio.musicGroup': 'موسيقى الخلفية',
    'audio.musicOn': 'الموسيقى مفعّلة',
    'audio.musicOff': 'الموسيقى معطّلة',
    'audio.musicDetail': 'تشغيل أو إيقاف موسيقى الخلفية',
    'audio.musicVolumeLabel': 'مستوى الموسيقى',
    'audio.musicVolumeAria': 'مستوى الموسيقى',
    'audio.sfxGroup': 'المؤثرات الصوتية',
    'audio.sfxOn': 'المؤثرات مفعّلة',
    'audio.sfxOff': 'المؤثرات معطّلة',
    'audio.sfxDetail': 'تشغيل أو إيقاف المؤثرات الصوتية',
    'audio.sfxVolumeLabel': 'مستوى المؤثرات',
    'audio.sfxVolumeAria': 'مستوى المؤثرات الصوتية',
    'audio.hapticsGroup': 'الاهتزاز',
    'audio.hapticsOn': 'الاهتزاز مفعّل',
    'audio.hapticsOff': 'الاهتزاز معطّل',
    'audio.hapticsTurnOff': 'إيقاف الاهتزاز',
    'audio.hapticsTurnOn': 'تشغيل الاهتزاز',
    'audio.vibrationWord': 'الاهتزاز',
    'audio.hapticsUnsupportedAria': 'الاهتزاز غير مدعوم في هذا المتصفح',
    'audio.hapticsUnsupportedTitle':
      'الاهتزاز غير متوفر في هذا المتصفح. على أندرويد يدعمه Chrome وSamsung Internet؛ لا يدعمه Firefox لأندرويد.',
    'powerups.group': 'التعزيزات',
    'powerups.undoTitle': 'تراجع عن آخر حركة',
    'powerups.undoAria': 'تراجع عن آخر حركة',
    'powerups.shuffleTitle':
      'اخلط أنواع البلاط على اللوحة (المواضع لا تتغير)',
    'powerups.shuffleAria': 'اخلط أنواع البلاط',
    'powerups.removeTypeTitle': 'أزل كل البلاط من نوع واحد',
    'powerups.removeTypeAria': 'أزل نوع بلاط واحد',
    'board.playfieldAria':
      'ساحة اللعب (مرّر لرؤية الشبكة كاملة في المستويات الكبيرة)',
    'board.gridAria':
      'لوحة اللعب: طابق البلاط المكشوف. ينتقل التركيز هنا عند بدء المستوى؛ الأسهم تتحرك في أربع اتجاهات وتقفز إلى الحافة البعيدة؛ Enter أو المسافة للالتقاط.',
    'tray.sectionLabel': 'الصينية',
    'tray.groupAria': 'الصينية',
    'overlay.winTitle': 'اكتمل المستوى',
    'overlay.winBody': 'أنهيت {name} بـ {score} نقطة.',
    'overlay.nextLevel': 'المستوى التالي',
    'overlay.restartFrom1': 'إعادة البدء من المستوى 1',
    'overlay.lossTitle': 'فشل المستوى',
    'overlay.lossDefault': 'فاضت الصينية.',
    'overlay.tryAgain': 'حاول مجدداً',
    'overlay.nextAria': 'المستوى التالي',
    'overlay.retryLevelAria': 'إعادة هذا المستوى',
    'levelSelect.heading': 'اختر المستوى',
    'levelSelect.close': 'إغلاق',
    'levelSelect.groupByLabel': 'تجميع حسب',
    'levelSelect.groupAria': 'تجميع المستويات حسب',
    'levelSelect.groupDifficulty': 'الصعوبة (ثلاث أقسام)',
    'levelSelect.groupShape': 'شكل اللوحة',
    'levelSelect.shapeLabel': 'الشكل',
    'levelSelect.filterShapeAria': 'تصفية حسب شكل القالب',
    'levelSelect.allShapes': 'كل الأشكال',
    'levelSelect.all': 'الكل',
    'levelSelect.easy': 'سهل',
    'levelSelect.medium': 'متوسط',
    'levelSelect.hard': 'صعب',
    'levelSelect.hint': 'انقر مستوى للعب',
    'levelSelect.hintEmpty': 'لا توجد مستويات تطابق هذا التصفية.',
    'levelSelect.cardAriaShape': 'المستوى {id}: {name}، الشكل {shape}',
    'levelSelect.cardAriaDiff': 'المستوى {id}: {name}، صعوبة {difficulty}',
    'difficulty.easy': 'سهلة',
    'difficulty.medium': 'متوسطة',
    'difficulty.hard': 'صعبة',
    'tray.removeTypeTrayAria':
      'اختر نوع بلاط لإزالته من اللوحة والصينية. الأسهم للتحرك، Enter أو المسافة للتأكيد، Escape للإلغاء.',
    'tray.removeTypeTileAria':
      '{type} في الصينية — إزالة هذا النوع من اللوحة والصينية',
    'board.exposedTileAria': '{type}، بلاط مكشوف',
    'tile.unknown': 'بلاط',
    'tile.evergreen-tree': 'شجرة دائمة الخضرة',
    'tile.flower': 'زهرة',
    'tile.grapes': 'عنب',
    'tile.star': 'نجمة',
    'tile.acorn': 'بلوط',
    'tile.mushroom': 'فطر',
    'tile.cherry': 'كرز',
    'tile.butterfly': 'فراشة',
    'tile.sunflower': 'دوار الشمس',
    'tile.apple': 'تفاح',
    'tile.carrot': 'جزر',
    'tile.lady-beetle': 'دعسوقة',
    'loss.trayFull':
      'الصينية ممتلئة. حاول إدارة البلاط بعناية أكثر في المرة القادمة.',
    'loss.trayOverflow': 'فاضت الصينية.',
    'locale.selectLabel': 'اللغة',
    'credits.full':
      'رموز البلاط: <a href="https://openmoji.org/" target="_blank" rel="noopener noreferrer">OpenMoji</a> (CC&nbsp;BY-SA&nbsp;4.0) · رموز الواجهة: <a href="https://phosphoricons.com/" target="_blank" rel="noopener noreferrer">Phosphor</a> (MIT)'
  }
};

let currentLocale = 'en';
/** @type {Array<() => void>} */
const localeChangeListeners = [];

function readStoredLocaleRaw() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return null;
    const v = JSON.parse(raw);
    return typeof v === 'string' ? v : null;
  } catch {
    return null;
  }
}

function writeStoredLocale(code) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(code));
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} raw
 * @returns {string}
 */
export function normalizeLocaleTag(raw) {
  if (!raw || typeof raw !== 'string') return 'en';
  const lower = raw.trim().toLowerCase();
  const base = lower.split(/[-_]/)[0] || 'en';
  if (/** @type {readonly string[]} */ (SUPPORTED_LOCALES).includes(lower)) return lower;
  if (/** @type {readonly string[]} */ (SUPPORTED_LOCALES).includes(base)) return base;
  return 'en';
}

function resolveInitialLocale() {
  try {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('lang');
    if (q) {
      const n = normalizeLocaleTag(q);
      if (/** @type {readonly string[]} */ (SUPPORTED_LOCALES).includes(n)) {
        writeStoredLocale(n);
        return n;
      }
    }
  } catch {
    /* ignore */
  }
  const stored = readStoredLocaleRaw();
  if (stored) {
    const n = normalizeLocaleTag(stored);
    if (/** @type {readonly string[]} */ (SUPPORTED_LOCALES).includes(n)) return n;
  }
  return normalizeLocaleTag(typeof navigator !== 'undefined' ? navigator.language || 'en' : 'en');
}

function applyDocumentLangAndDir(locale) {
  const doc = typeof document !== 'undefined' ? document.documentElement : null;
  if (!doc) return;
  doc.lang = locale;
  const base = locale.split(/[-_]/)[0].toLowerCase();
  doc.dir = RTL_LANG_PREFIXES.has(base) ? 'rtl' : 'ltr';
}

/**
 * @param {string} key
 * @param {string} locale
 */
function lookupMessage(key, locale) {
  const pack = MESSAGES[locale] || MESSAGES.en;
  if (key in pack) return pack[key];
  return MESSAGES.en[key] ?? key;
}

/**
 * @param {string} key
 * @param {Record<string, string | number>} [vars]
 */
export function t(key, vars) {
  let s = lookupMessage(key, currentLocale);
  if (vars && typeof vars === 'object') {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}

export function getLocale() {
  return currentLocale;
}

/**
 * @param {string} code
 * @param {{ persist?: boolean }} [opts]
 */
export function setLocale(code, opts = {}) {
  const next = normalizeLocaleTag(code);
  if (!/** @type {readonly string[]} */ (SUPPORTED_LOCALES).includes(next)) return;
  currentLocale = next;
  applyDocumentLangAndDir(next);
  if (opts.persist !== false) writeStoredLocale(next);
  const sel = /** @type {HTMLSelectElement | null} */ (typeof document !== 'undefined'
    ? document.getElementById('locale-select')
    : null);
  if (sel && sel.value !== next) sel.value = next;
  for (const fn of localeChangeListeners) {
    try {
      fn();
    } catch {
      /* ignore listener errors */
    }
  }
}

/** @param {() => void} fn */
export function onLocaleChange(fn) {
  localeChangeListeners.push(fn);
}

/**
 * @param {HTMLElement | Document | null} [root]
 */
export function applyDomI18n(root) {
  const scope = root || (typeof document !== 'undefined' ? document.body : null);
  if (!scope || typeof scope.querySelectorAll !== 'function') return;

  scope.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });
  scope.querySelectorAll('[data-i18n-html]').forEach((el) => {
    const key = el.getAttribute('data-i18n-html');
    if (key) el.innerHTML = t(key);
  });
  for (const [dataAttr, domAttr] of /** @type {const} */ ([
    ['data-i18n-aria-label', 'aria-label'],
    ['data-i18n-title', 'title'],
    ['data-i18n-placeholder', 'placeholder']
  ])) {
    scope.querySelectorAll(`[${dataAttr}]`).forEach((el) => {
      const key = el.getAttribute(dataAttr);
      if (key) el.setAttribute(domAttr, t(key));
    });
  }
}

/**
 * @param {number | string} n
 */
export function formatGameInteger(n) {
  return new Intl.NumberFormat(currentLocale, { maximumFractionDigits: 0 }).format(Number(n) || 0);
}

/**
 * @param {Date | number} input
 * @param {Intl.DateTimeFormatOptions} [options]
 */
export function formatGameDate(input, options = {}) {
  const d = input instanceof Date ? input : new Date(input);
  return new Intl.DateTimeFormat(currentLocale, options).format(d);
}

/**
 * Stored loss reason may be a message key (preferred) or legacy English prose.
 * @param {string} stored
 */
export function resolveLossMessage(stored) {
  if (!stored) return t('overlay.lossDefault');
  if (/^[a-z][a-z0-9._]*$/i.test(stored) && lookupMessage(stored, 'en') !== stored) {
    return t(stored);
  }
  return stored;
}

/** @param {unknown} typeId layout / tray type index or numeric string */
export function tileTypeLabel(typeId) {
  if (typeof typeId === 'number' && typeId >= 0 && typeId < TILE_TYPES.length) {
    const id = TILE_TYPES[typeId].id;
    return t(`tile.${id}`);
  }
  if (typeof typeId === 'string' && /^\d+$/.test(typeId)) {
    const idx = parseInt(typeId, 10);
    const id = TILE_TYPES[idx]?.id;
    if (id) return t(`tile.${id}`);
  }
  return t('tile.unknown');
}

/**
 * @param {'easy' | 'medium' | 'hard'} band
 */
export function difficultyLabel(band) {
  return t(`difficulty.${band}`);
}

/**
 * @param {string} shapeKey from `getLevelShapeKey`
 */
export function displayShapeName(shapeKey) {
  if (shapeKey === 'Other') return t('level.shape.other');
  if (GENERATED_SHAPE_KEYS.has(shapeKey)) return t(`level.shape.${shapeKey}`);
  return shapeKey;
}

/**
 * Localized title for a level (tutorials, fallback, or generator "SHAPE n" names).
 * @param {{ id?: number, name?: string } | null | undefined} level
 */
export function translateLevelDisplayName(level) {
  const name = level?.name ?? '';
  const id = level?.id;
  if (id === 1) return t('level.name.tutorial1');
  if (id === 2) return t('level.name.tutorial2');
  if (name === 'Gentle Grove (Fallback)') return t('level.name.fallbackGrove');
  const m = String(name).match(/^(.+?)\s+(\d+)\s*$/);
  if (m) {
    const shapeToken = m[1].trim();
    const num = m[2];
    const shapeLabel = GENERATED_SHAPE_KEYS.has(shapeToken)
      ? t(`level.shape.${shapeToken}`)
      : shapeToken;
    return t('level.numberedName', { shape: shapeLabel, num });
  }
  return name;
}

/**
 * @param {{ localeSelect?: HTMLSelectElement | null }} [opts]
 */
export function initI18n(opts = {}) {
  if (typeof document === 'undefined') return;
  const initial = resolveInitialLocale();
  currentLocale = initial;
  applyDocumentLangAndDir(initial);

  const sel = opts.localeSelect ?? document.getElementById('locale-select');
  if (sel instanceof HTMLSelectElement) {
    sel.value = initial;
    sel.addEventListener('change', () => setLocale(sel.value));
  }

  document.title = t('app.docTitle');
  applyDomI18n(document.body);
}
