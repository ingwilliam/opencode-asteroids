---
description: Crea un git worktree en .worktrees/ con el nombre derivado del argumento o del contexto actual.
---

Crea un git worktree siguiendo estos pasos, sin hacer nada más.

## 1. Obtener el nombre del worktree

El usuario invocó el comando con este argumento (puede contener espacios o venir vacío):

$ARGUMENTS

- Si hay argumento: úsalo para derivar el nombre.
- Si viene vacío: infiere un nombre descriptivo a partir del contexto de la conversación actual (la tarea en la que estamos trabajando).

## 2. Normalizar el nombre

Convierte el nombre a un slug en kebab-case:

- Todo en minúsculas.
- Sin espacios, sin acentos y sin caracteres especiales: solo letras, números y guiones.
- Palabras separadas por un único guion.
- Ejemplo: "Fix del bug de colisiones" → `fix-bug-colisiones`.

## 3. Crear el worktree

Ejecuta únicamente este comando, desde el directorio actual del proyecto (sin cambiar de directorio):

git worktree add .worktrees/<nombre>

## Restricciones

- No hagas nada más: sin `cd`, sin commits, sin crear o modificar archivos, sin comandos adicionales.
- No verifiques el worktree con `ls` ni con ningún otro comando después de crearlo.
- Reporta al usuario únicamente el resultado de la creación del worktree (nombre y ruta) y termina.
