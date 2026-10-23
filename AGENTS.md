# AGENTS.md — Marketing by Oli | Menús digitales reutilizables

## 1. Propósito y contexto
Este repositorio es un producto de **Marketing by Oli** para ofrecer menús digitales a restaurantes, locales gastronómicos y comercios. El objetivo comercial es mantener **un motor/plantilla de menú reutilizable**, configurable por cliente, en lugar de desarrollar una web desde cero para cada restaurante.

**Decisión confirmada del cliente:** en esta primera etapa todos los pedidos terminan en **WhatsApp**, mediante un mensaje precargado que el comprador debe enviar manualmente. NO desarrollar por ahora backend de pedidos, panel de recepción, pagos, seguimiento, IA generativa ni conexión con WhatsApp Business API. Evitar costos mensuales de hosting e infraestructura siempre que sea posible.

El proyecto no pertenece a Capri Store y no debe modificar su repositorio ni compartir sus datos o infraestructura.

## 2. Estado actual: verificar antes de cambiar
Existe una demo inicial llamada **NORI · Sushi Bar**, con identidad y precios ficticios. El paquete original contiene:
- `index.html`: estructura semántica, portada, catálogo y panel lateral del carrito.
- `styles.css`: diseño responsive.
- `app.js`: carga de configuración, filtros/búsqueda, carrito y checkout de WhatsApp.
- `config.json`: datos del negocio, 12 productos, categorías, precios y sugerencias.
- `README.md`: instrucciones de uso y despliegue.

Funcionalidades implementadas en esa demo según su código/documentación: búsqueda, categorías, carrito con persistencia en `localStorage`, recomendaciones basadas en reglas, selección de retiro o delivery, mínimo y costo estimado de entrega, datos del comprador, aclaraciones y generación de `https://wa.me/<numero>?text=<mensaje_codificado>`.

**IMPORTANTE:** verificar el contenido real del repositorio y probar la aplicación antes de asumir que todo funciona. Esta demo no tiene pruebas automatizadas ni despliegue verificado. El número de WhatsApp en la configuración está vacío por seguridad. No afirmar que un pedido fue enviado al abrir un enlace `wa.me`.

## 3. Alcance funcional de la primera versión (MVP)
1. Catálogo ordenado por categorías, buscador, imágenes autorizadas o recursos provisionales.
2. Fichas de producto con nombre, descripción, precio y disponibilidad; opción para agregar/quitar unidades.
3. Carrito usable desde celulares, con subtotal, cantidades y total estimado.
4. Modalidad retiro/delivery y validación de dirección cuando corresponde.
5. Nombre del comprador, observaciones opcionales, aclaración de gastos de envío y mínimos configurables.
6. Mensaje de WhatsApp legible: restaurante, lista de ítems, cantidades, subtotales, modalidad, dirección, notas y total estimado.
7. Recomendaciones cruzadas simples, declaradas en la configuración (sin llamadas a IA).
8. Diseño mobile-first, rápido, accesible y atractivo, con branding por cliente.
9. Configuración separada del código de interfaz y lógica; no hardcodear teléfonos, productos ni precios en componentes compartidos.
10. Evidenciar claramente que WhatsApp requiere que el usuario pulse **Enviar**; el comercio debe confirmar disponibilidad y precio final.

Fuera del MVP: registro de usuarios, sistema de puntos/fidelización, panel del restaurante, estados de pedidos, registro confirmado de ventas, pagos online, promociones con backend, chatbot de IA y envío automático de mensajes. Se podrán evaluar en fases futuras, pero no implementarlos sin solicitud expresa.

## 4. Arquitectura deseada
- Empezar con frontend estático (HTML/CSS/JavaScript existentes, sin framework obligatorio).
- Hosting previsto: **Cloudflare Pages**, inicialmente en URLs `.pages.dev` sin dominio propio; GitHub para control de versiones.
- Una base de código reutilizable; cada cliente tendrá su identidad, menú y WhatsApp propios.
- Corto plazo: configuración `config.json` por cliente y despliegue estático independiente.
- Cuando haya varios clientes: estudiar una carpeta `clientes/<slug>/config.json` y un proceso reproducible que genere una distribución estática individual por negocio. Separar datos para que ningún menú cargue los de otro restaurante.
- No añadir Render, PostgreSQL ni backend únicamente para crear pedidos por WhatsApp.
- No desplegar automáticamente ni hacer cambios destructivos en GitHub sin revisar el destino y el estado del repositorio.

## 5. Modelo de configuración actual
`config.json` contiene:
- `business`: `name`, `tagline`, `whatsapp`, `currency`, `locale`, `deliveryFee`, `minimumDelivery`, `brandColor`, `openingHours`.
- `categories`: lista de categorías.
- `products`: `id`, `name`, `category`, `description`, `price`, `emoji` y `popular` opcional.
- `suggestions`: pares `trigger` / `recommend` entre IDs de productos.

Podés extender este esquema de forma progresiva para logo, imágenes, redes, dirección, textos legales, disponibilidad, zonas de envío u otras necesidades. Mantener compatibilidad o incluir migración explícita si cambia el esquema.

Los productos, nombre NORI, colores y precios son **ficticios**, destinados a mostrar capacidades a potenciales clientes de Marketing by Oli. No usar imágenes con derechos no autorizados y no introducir datos personales reales en el repositorio.

## 6. Requisitos no funcionales y reglas de seguridad
- Priorizar experiencia en teléfonos (navegación táctil, botones grandes, buen rendimiento y contraste).
- Usar atributos accesibles, textos alternativos para imágenes y navegación con teclado donde corresponda.
- Evitar HTML inyectado desde contenido no confiable. Sanitizar o insertar textos con `textContent`.
- Validar precios y cantidades, y no confiar en datos almacenados en `localStorage` sin comprobación.
- Codificar el mensaje usando `encodeURIComponent`; normalizar el número con solo dígitos y exigir teléfono configurado antes de operar en producción.
- No almacenar teléfono, dirección o nombre del comprador en analíticas o almacenamiento persistente sin una necesidad y aviso adecuados.
- Mostrar totales como estimados cuando delivery/stock/precio final requieran confirmación.
- No asumir que abrir WhatsApp equivale a pedido recibido: no existe confirmación automática en este esquema.
- Documentar costos, servicios nuevos y límites antes de agregar dependencias.

## 7. Próximos pasos para Codex (orden sugerido)
1. Auditar archivos del proyecto, ejecutar un servidor local (`python -m http.server 8000`) y revisar consola y funcionamiento en móvil/escritorio.
2. Corregir bugs y mejorar accesibilidad, respuesta visual, manejo de errores de `config.json` y comportamiento de WhatsApp cuando falta un número.
3. Crear pruebas automatizadas para validación de carrito, cálculo de totales, mínimo de delivery y texto del pedido; añadir pasos para pruebas manuales del checkout.
4. Consolidar branding configurable y posibilidad de imágenes por producto con fallback estético.
5. Construir una estrategia simple para generar otra instancia del menú a partir de una nueva configuración, sin duplicar manualmente la lógica.
6. Actualizar el README con onboarding de nuevos clientes, configuración de WhatsApp, desarrollo local, pruebas y publicación en Cloudflare Pages.
7. Solo después, preparar publicación del demo y documentar URL real; no inventar enlaces públicos.

## 8. Criterios de aceptación
- La demo corre localmente con `python -m http.server 8000` y no presenta errores de consola en sus flujos principales.
- Se puede modificar toda la identidad y catálogo de un restaurante sin editar la lógica del carrito.
- Los cálculos coinciden con precios y cantidades configuradas; validar límite, mínimos y delivery.
- El flujo de WhatsApp produce un mensaje completo, codificado correctamente, con datos del pedido y sin enviarlo automáticamente.
- El comportamiento móvil es cómodo y la interfaz no se rompe con productos de nombres extensos.
- El README documenta la incorporación de un cliente y una ruta de despliegue estático.
- No hay backend obligatorio, secretos, APIs pagas ni dependencias innecesarias.

## 9. Forma de trabajo esperada del agente
- Antes de escribir: inspeccionar proyecto, identificar limitaciones y proponer el cambio más pequeño que logre el objetivo.
- Mantener consistencia visual y simplicidad; preferir reutilizar sobre duplicar.
- Cuando hagas cambios, indicar archivos modificados, pruebas realizadas, resultados y pendientes.
- Nunca inventar datos del comercio, números de WhatsApp reales, precios ni funciones completadas.
- Si una mejora requiere backend, costos o decisiones de negocio, explicar el trade-off y mantener el MVP de WhatsApp como prioridad.

## 10. Visión comercial a futuro (no implementar aún)
Marketing by Oli podrá ofrecer un plan básico con menú + carrito + WhatsApp + recomendaciones; y en el futuro servicios premium (edición por cliente, métricas, campañas, fidelización, pagos). El propósito del MVP es validar facilidad de implementación, calidad visual y velocidad para lanzar nuevos clientes, sin costos fijos innecesarios.
