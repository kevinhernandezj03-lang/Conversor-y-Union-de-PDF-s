# Convertidor Local Express

Microapp 100 % local para convertir y unir archivos en el navegador.  
Los archivos **nunca salen de tu dispositivo**.

## Qué hace (MVP)

- **WebP → PNG**
- **JSON → CSV** (array de objetos o un solo objeto)
- **Imagen (JPG/PNG) → PDF**
- **PDF → JPG** (una página = un JPG; varias páginas = ZIP con un JPG por página)
- **Unir varios PDFs** en un solo documento (con posibilidad de reordenar)

## Cómo usarlo

### Opción 1 – Abrir directamente
1. Abre el archivo `index.html` con un navegador moderno (Chrome, Firefox, Edge o Safari).
2. Arrastra los archivos a la zona de drop o haz clic para seleccionarlos.
3. Elige la acción deseada en cada archivo (si aplica).
4. Pulsa **Procesar**.
5. Descarga los resultados individualmente o todos juntos en un ZIP.

### Opción 2 – Servir localmente (recomendado)
```bash
# Desde la carpeta del proyecto
python3 -m http.server 8080
# Luego abre http://localhost:8080
```

## Requisitos

- Navegador moderno con soporte de ES6+, Canvas, File API y Web Workers.
- No necesita conexión a internet una vez cargada la página (las librerías están incluidas en la carpeta `vendor/`).

## Estructura

```
convertidor-local-express/
├── index.html
├── styles.css
├── app.js
├── vendor/
│   ├── pdf-lib.min.js
│   ├── jszip.min.js
│   ├── pdf.min.js
│   └── pdf.worker.min.js
└── README.md
```

## Limitaciones conocidas del MVP

- Archivos muy grandes pueden agotar la memoria del navegador.
- Los PDFs protegidos con contraseña no se pueden procesar.
- La conversión PDF → JPG renderiza a escala 1.5 (buena calidad, no profesional).
- No hay edición de páginas ni OCR.
- El orden de unión de PDFs se controla con las flechas ↑↓ cuando hay varios PDFs seleccionados para unir.

## Privacidad

Todo el procesamiento ocurre en tu navegador. No hay llamadas a servidores externos ni envío de datos.

---
Hecho con el principio “Simple y bueno es dos veces bueno”.
