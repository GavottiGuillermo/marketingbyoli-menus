# Marketing by Oli · Menús digitales

Motor estático y reutilizable para catálogos gastronómicos con carrito y checkout manual por WhatsApp. No necesita backend, base de datos, pagos ni APIs comerciales.

La configuración incluida corresponde a **NORI · Sushi Bar**, una identidad ficticia de demostración. Sus productos y precios no representan un comercio real.

## Funcionalidades

- Catálogo configurable, búsqueda y filtros por categoría.
- Productos disponibles o agotados, imágenes opcionales y fallback con emoji.
- Carrito con cantidades validadas y persistencia aislada por cliente.
- Retiro o delivery, mínimo de compra y costo estimado de envío.
- Nombre, dirección y aclaraciones sin persistir datos personales.
- Recomendaciones cruzadas declaradas en la configuración.
- Mensaje de WhatsApp con ítems, subtotales, modalidad y total estimado.
- Validación explícita del número: si falta, no se abre WhatsApp.
- Navegación con teclado, foco contenido en el carrito y avisos accesibles.
- Pruebas con el runner nativo de Node.js, sin dependencias externas.
- Generación aislada de una distribución estática por restaurante.

WhatsApp solo abre una conversación con un mensaje precargado. El comprador debe revisarlo y pulsar **Enviar**. El comercio debe confirmar disponibilidad, entrega y precio final; el sitio no registra pedidos ni confirma ventas.

## Requisitos

- Un navegador moderno.
- Python 3 para el servidor local más simple.
- Node.js 22.8 o posterior para pruebas, validación y generación por cliente.

No es necesario ejecutar `npm install`: el proyecto no tiene dependencias de paquetes.

## Desarrollo local

```bash
python -m http.server 8000
```

Abrir `http://localhost:8000`. No abrir `index.html` como archivo local: los navegadores suelen bloquear la carga de `config.json` en ese modo.

Ejecutar las comprobaciones:

```bash
npm test
npm run validate
npm run build:nori
```

La última orden genera `dist/nori`, listo para servir como sitio estático.

## Incorporar un restaurante

1. Crear `clientes/<slug>/config.json` tomando `clientes/nori/config.json` como referencia.
2. Usar un `slug` en minúsculas, sin espacios, y hacerlo coincidir con `business.slug`.
3. Agregar imágenes autorizadas en `clientes/<slug>/assets/` si corresponden.
4. Validar con `node scripts/validate-client.mjs <slug>`.
5. Generar con `node scripts/build-client.mjs <slug>`.
6. Probar el contenido de `dist/<slug>` con un servidor local.

El generador copia solamente la configuración y los recursos del cliente seleccionado. No incluye datos de otros restaurantes.

Para que la raíz del repositorio muestre otro cliente durante el desarrollo, copiar su configuración validada a `config.json`. La distribución de producción siempre toma el archivo de `clientes/<slug>`.

## Configuración

### `business`

| Campo | Uso |
| --- | --- |
| `name` | Nombre completo del comercio y encabezado del mensaje. |
| `shortName` | Marca breve visible en navegación y footer. |
| `type` | Rubro mostrado junto a la marca. |
| `slug` | Identificador del cliente y espacio aislado de `localStorage`. |
| `whatsapp` | Número internacional. Puede contener formato visual, pero debe resultar en 8–15 dígitos. |
| `currency`, `locale` | Formato monetario mediante `Intl.NumberFormat`. |
| `deliveryFee` | Costo estimado no negativo; puede ser `0`. |
| `minimumDelivery` | Subtotal mínimo para delivery. |
| `openingHours` | Texto de horarios. |

El número de la demo está vacío deliberadamente. Antes de publicar un menú real, completar `business.whatsapp` y probar el enlace en un dispositivo autorizado.

### `theme` y `content`

`theme` define colores hexadecimales para acento, fondos, texto, acciones y WhatsApp. `content` contiene los textos de portada, catálogo, explicación y footer. Esto permite cambiar la identidad sin editar HTML, CSS o JavaScript.

Las fuentes usan Google Fonts con fallbacks del sistema. Si un cliente necesita eliminar esa dependencia externa, se puede retirar el `<link>` de fuentes o alojar localmente archivos con licencia adecuada.

### Productos

Campos obligatorios: `id`, `name`, `category`, `description` y `price`.

Campos opcionales:

- `popular: true` muestra una etiqueta.
- `available: false` muestra el producto agotado e impide agregarlo.
- `emoji` define el fallback visual.
- `image` admite una ruta relativa, una ruta bajo `assets/` o una URL HTTPS.
- `imageAlt` describe la imagen; si falta, se usa el nombre del producto.

No incorporar fotos sin autorización. Para producción se recomiendan imágenes WebP/AVIF optimizadas y locales.

### Recomendaciones

Cada elemento de `suggestions` contiene un ID `trigger` y un ID `recommend`. Ambos deben existir y ser distintos. No se realizan llamadas a inteligencia artificial.

## Publicación en Cloudflare Pages

Crear un proyecto Pages por restaurante para mantener URLs y datos separados. Configuración sugerida:

- Build command: `node scripts/build-client.mjs <slug>`
- Output directory: `dist/<slug>`
- Variables o secretos: ninguno para el MVP.

También puede subirse directamente el contenido ya generado de `dist/<slug>`. Antes de publicar, revisar el repositorio, la cuenta de Cloudflare y la rama seleccionada. Este repositorio no presupone ni documenta una URL pública hasta que el despliegue sea verificado.

## Checklist manual previo a producción

- Revisar consola y red sin errores en móvil y escritorio.
- Buscar, filtrar y probar una búsqueda vacía.
- Agregar, quitar y alcanzar el límite de 99 unidades.
- Recargar y comprobar la persistencia del carrito.
- Verificar un producto agotado y una imagen ausente.
- Probar retiro, delivery, envío gratuito y mínimo exacto/inferior.
- Validar nombre y dirección faltantes.
- Confirmar que un WhatsApp vacío no abre otra pestaña.
- Revisar el texto precargado y comprobar que el usuario todavía debe pulsar Enviar.
- Navegar con teclado, Escape y foco dentro del panel.
- Probar nombres largos, zoom y pantallas angostas.

## Límites del MVP

No hay usuarios, fidelización, estados de pedido, registro de ventas, pagos, promociones con backend, analíticas de datos personales, chatbot ni envío automático. Esas funciones requieren decisiones comerciales, privacidad e infraestructura adicionales y no forman parte de esta versión.
