# Juego de cumpleaños CHE — 7 rondas

## Archivos

- `index.html`: abre directamente en Chrome o Safari; sin `fetch` ni servidor obligatorio.
- `config.js`: 28 parejas (7 rondas de 8 cartas), nombres de categorías y rutas de audio.
- `videos.js`: vincula cada pareja con un archivo de video. Es editable sin modificar la lógica.
- `assets/imagenes/`: `abrazo.png`, `cortavenas.png`, `imagen1_A.png`, `imagen1_B.png` ... `imagen28_B.png`.
- `assets/videos/`: coloca los saludos indicados en `videos.js`, `cortavenas.mp4` y `cumpleanos.mp4`.

La pareja `imagen1_A.png` + `imagen1_B.png` abre el video asignado a `imagen1` en `videos.js`. Completa 28 asociaciones, una por pareja. Si falta alguna, aparece una advertencia al desbloquearla. No hay archivos de medios reales incluidos.

## Rondas y transiciones

1. MARCAS (imagen1 a imagen4)
2. GASTRONOMÍA (imagen5 a imagen8)
3. BEBIDAS ESPIRITUOSAS (imagen9 a imagen12)
4. APODOS (imagen13 a imagen16)
5. PERSONAJES (imagen17 a imagen20)
6. MÁS APODOS (imagen21 a imagen24)
7. VAJILLA (imagen25 a imagen28)

Después de la tercera ronda se muestra una pantalla musical. `cortavenas.png` es la imagen; para escuchar necesitas `assets/videos/cortavenas.mp4`. El usuario pulsa REPRODUCIR CANCIÓN para escucharla y puede continuar sin hacerlo.

Tras completar las 28 parejas aparece «¡FELIZ CUMPLE CHE!» con papel picado y `assets/videos/cumpleanos.mp4` como música. La música comienza automáticamente al entrar a la pantalla final, sin botón de reproducción. Algunos navegadores pueden bloquear el audio automático por sus políticas de seguridad.

El progreso se almacena en `localStorage`. El botón Reiniciar permite volver a empezar, y las pantallas musicales no causan desplazamiento en móviles. Los sonidos al destapar, acertar, fallar y pulsar botones se sintetizan en el navegador (sin archivos adicionales).

Para compartirlo en el teléfono, publica la carpeta en un hosting estático (por ejemplo, Vercel o Netlify).


## Fondo de portadas de la celebración final

Coloca **28 imágenes** en `assets/portadas/`, con los nombres exactos `portada1.png` hasta `portada28.png` (sin saltos). Cuando termina el juego aparecen automáticamente en un mosaico de fondo de la pantalla **¡FELIZ CUMPLE CHE!**, detrás del texto y del confeti, mientras intenta reproducirse `assets/videos/cumpleanos.mp4` de manera automática. No hay botón para reproducir la música. El mosaico es de 4 columnas × 7 filas en orientación vertical y 7 × 4 en horizontal, sin scroll. Las imágenes se recortan si es necesario para llenar cada recuadro; deja las caras centradas. Si falta alguna portada, su recuadro mostrará un fondo decorativo sin bloquear el juego.

## Animación final de portadas
Al terminar el juego, las 28 portadas se revelan **una por una, en orden aleatorio**, aproximadamente cada 0,45 segundos, y permanecen visibles hasta completar el mosaico de fondo. Reiniciar permite ver otra secuencia aleatoria.
