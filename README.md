# JAIRRESTAURA EVANGELIZA
**Fábrica Inteligente de Videos Evangelísticos** — Creada por el **Pastor y Psicólogo Jair Hernández** (`ESCUCHA · ORIENTACIÓN · FE`).

Aplicación Web Progresiva (PWA) gratuita, autónoma y completamente en español para producir videos evangelísticos fundamentados en la Biblia, listos para compartir en WhatsApp, Facebook, Instagram, TikTok y YouTube.

## Características principales

- **Estudio de Creación y Automatización**: Escribe cualquier tema y genera automáticamente guion, escenas por tiempos, imágenes bíblicas coherentes, narración, música instrumental, subtítulos y archivo MP4 real.
- **12 Predicaciones en Video sin conexión**: Mensajes completos con introducción, desarrollo, versículo bíblico, reflexión y llamado a Cristo.
- **7 Campañas Evangelísticas**: Incluye *7 días con Jesús*, *7 mensajes de esperanza*, *30 días de evangelización*, *Evangelismo para jóvenes*, *Evangelismo familiar*, *Campañas de oración* e *Invitaciones a cultos y escuelas dominicales*.
- **Editor Real + Exportación MP4**: Previsualización en Canvas (`9:16`, `1:1`, `16:9`), mezcla de música instrumental sintetizada con Web Audio, grabadora de voz propia (`MediaRecorder`), y codificación real H.264/AAC MP4 con `FFmpeg.wasm`.
- **Autonomía y Respaldos**: Persistencia local en IndexedDB sin registro obligatorio, descarga individual de proyectos y respaldo completo en `.json`.
- **PWA Instalable**: Funciona sin conexión en Android, iOS, tabletas y computadores.

## Desarrollo local

```bash
npm install
npm run dev
```

## Compilación para producción

```bash
npm run build
```

## Despliegue gratuito en Vercel y GitHub

1. Sube este repositorio a **GitHub**.
2. Importa el repositorio en **Vercel** (detecta automáticamente Vite mediante `vercel.json`).
3. *(Opcional)* Si deseas habilitar el asistente opcional de redacción con Gemini en línea, configura la variable de entorno `GEMINI_API_KEY` en Vercel. Si no la configuras, el estudio funciona de forma completamente autónoma y sin conexión con su motor bíblico local.
