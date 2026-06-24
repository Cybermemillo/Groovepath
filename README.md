# BassLab

Entrenador interactivo de bajo eléctrico de 4 cuerdas. Visualiza escalas y arpegios en un diapasón interactivo, afina con el micrófono, practica con entrenamiento de notas e intervalos, improvisa sobre backing tracks y sigue tus estadísticas.

## Características

- **Diapasón interactivo:** visualiza escalas (mayor, menor, pentatónica, modos, cromática) y arpegios (triadas, séptimas) con colores.
- **Afinador:** detección de tono por micrófono con indicador de cents, cuerda y traste.
- **Entrenamiento de notas:** toca la nota objetivo y gana puntos. Racha, velocidad, cuenta atrás.
- **Entrenamiento de intervalos:** identifica o toca intervalos desde una nota raíz.
- **Backing tracks:** 9 estilos (rock, funk, blues, jazz, reggae, soul, latin, hiphop, metal) con cambio de acordes automático. Sube tu propia pista.
- **Improvisación:** evalúa en tiempo real las notas que tocas sobre la pista. 4 niveles de dificultad, modo guiado, colores en el diapasón.
- **Metrónomo:** flotante, con BPM, subdivisiones, compás y tap tempo.
- **Estadísticas:** sesiones, precisión, rachas, heatmap de práctica, objetivo diario, calendario.
- **Rutinas:** predefinidas y personalizables, con reproductor automático.
- **Logros:** 30+ logros con rareza y puntuación.
- **Importación/exportación:** copia de seguridad de datos con cifrado opcional.
- **Notación española/inglesa** (Do Re Mi / C D E).
- **Afinaciones personalizadas.**
- **Tema oscuro/claro.**

## Ejecución

Abre `index.html` en un navegador moderno. No requiere servidor ni build step.

Requiere acceso al micrófono para el afinador, entrenamiento e improvisación.

## Tecnologías

HTML5, CSS3, JavaScript ES6 (módulos). Sin frameworks, sin dependencias externas (salvo Font Awesome y Google Fonts).

PWA: instalable, funciona offline con service worker.

## Estructura

```
Bajo/
  index.html          # Punto de entrada
  manifest.json       # PWA
  service-worker.js   # Caché offline
  favicon.svg
  css/
    styles.css
    achievements.css
  js/
    main.js           # Inicialización
    utils/
      dom.js          # Selector shorthand $()
    modules/
      audio-engine.js # AudioContext compartido
      backing-track.js / backing-track-ui.js
      constants.js    # Notas, afinaciones, config
      eastereggs.js / eastereggs-data.js
      export-import.js
      fretboard.js
      help-modal.js
      improvisation.js / improvisation-ui.js
      interval-trainer.js / interval-trainer-ui.js
      metronome.js / metronome-ui.js
      practice-time.js
      routines.js / routines-ui.js
      settings.js
      stats.js / stats-ui.js
      synth.js        # Sintetizador de bajo
      theory.js       # Escalas, acordes, MIDI
      toast.js
      tooltip.js
      training.js / training-ui.js
      tuner-engine.js / tuner-ui.js
      ui-controls.js  # Orquestador central
      user-points.js
      achievements.js / achievements-data.js / achievements-ui.js
```

## Licencia

Uso personal.
