# AGENTS.md

Clon de Asteroids en Canvas HTML5 puro. Sin dependencias, bundler, tests ni linter: no hay `package.json` ni CI.

## Ejecución y verificación

- No hay build: `index.html` carga `game.js` directamente.
- Para probar: abrir `index.html` en el navegador o `npx serve .` → `http://localhost:3000`.
- No existe suite de tests ni comandos lint/typecheck. Toda verificación es manual en el navegador.

## Arquitectura

- Toda la lógica vive en `game.js` (un solo archivo, sin módulos): clases `Bullet`, `Asteroid`, `Ship`, `Particle`, más el loop principal (`loop`/`update`/`draw`) con `dt` limitado a 0.05 s.
- Input global: `keys` (mantenido) y `justPressed` (un frame, se consume con `pressed(code)`).
- Radio/velocidad/puntos de asteroides: arrays `RADII`, `SPEEDS`, `POINTS` indexados por tamaño (1=pequeño, 2=mediano, 3=grande).

## Reglas del repositorio

- El tamaño del canvas está duplicado: constantes `W`/`H` en `game.js` (1600×1200) y atributos `width`/`height` del `<canvas>` en `index.html`. Deben mantenerse sincronizadas.
- Comentarios y textos del juego (HUD, overlays) en español; identificadores en inglés.
- El README menciona power-ups y la "estrella fugaz", pero no están implementados en `game.js`; el código es la fuente de verdad.
