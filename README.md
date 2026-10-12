# Vales de asistencia · Bodega

Tablero para que los bodegueros registren los vales de asistencia y para ver, en un solo lugar:

- la unidad a la que le sacaron los repuestos y el mecánico;
- el bodeguero que los entregó y el que liquidó el vale;
- todos los repuestos que salieron;
- lo que devolvió sin usar;
- lo que utilizó y si trajo la pieza vieja que quitó de la unidad;
- las fotos de los repuestos.

Página: **https://milenajudithb-jpg.github.io/vales-asistencia/**

| Archivo | Para qué |
|---|---|
| `index.html` | La página (GitHub Pages). |
| `Code.gs` | El servidor en Google Apps Script que guarda en la hoja de Google y sube las fotos a Drive. |

Todo es gratuito: GitHub Pages, Google Sheets, Apps Script y Google Drive (15 GB de la cuenta).

---

## Cómo se usa

### Bodegueros (pestaña **Bodega**)

1. **Entregar repuestos.** Cuando el mecánico sale a la asistencia: unidad, mecánico, repuestos y cantidades. Para consumibles (aceite, grasa, tornillería) se apaga «Debe regresar la pieza vieja». Foto opcional.
2. **Liquidar vale.** Cuando regresa: por cada repuesto, cuánto **devolvió sin usar**, cuánto **utilizó** y cuántas **piezas viejas** trajo. Si no hay foto de lo que regresó, la página pide el motivo.
3. **Recibir pieza vieja.** Si el mecánico trae la pieza vieja después, se registra desde la lista «Falta pieza vieja».
4. **Vale de papel que no se abrió aquí:** «Regístralo y liquídalo de una vez».

Al guardar, cada bodeguero **firma con su PIN**: así queda registrado quién entregó y quién liquidó. En su propio teléfono puede marcar «Recordar mi PIN».

Si no hay señal, el registro (con sus fotos) queda guardado en el teléfono y se envía solo cuando vuelve la conexión.

### Tablero y Vales

- **Tablero:** vales, por liquidar (los atrasados en rojo), retorno de pieza vieja, piezas viejas faltantes, repuestos sin justificar, y cortes por mecánico, unidad, repuesto, bodeguero y mes. Toca un mecánico, bodeguero o mes para filtrar.
- **Vales:** la lista completa con filtros y **Descargar Excel** (hojas «Vales» y «Repuestos»).
- Al abrir un vale se ve su detalle, las fotos y el historial de quién hizo cada cosa.

### Qué significa cada número

- **Utilizado** = lo que salió − lo que devolvió sin usar (el bodeguero lo puede corregir).
- **Piezas viejas a regresar** = lo utilizado, salvo consumibles.
- **Retorno de pieza vieja** = piezas viejas recibidas ÷ piezas viejas que debían regresar (solo vales liquidados).
- **Sin justificar** = salió − devuelto − utilizado. Debe ser 0.
- Un vale queda **Liquidado completo** cuando no faltan piezas viejas y no hay nada sin justificar; si no, **Liquidado con faltantes**.

---

## La hoja de Google

| Hoja | Contenido |
|---|---|
| **Vales** | Una fila por vale con totales y estado. |
| **Detalle de repuestos** | Una fila por repuesto de cada vale. |
| **Fotos** | Enlace a cada foto en Drive (carpeta «Vales de asistencia - Fotos», por mes). |
| **Bodegueros** | Nombre, **PIN**, rol y si está activo. |
| **Catálogos** | Unidades, mecánicos y repuestos que la página sugiere al escribir. |
| **Bitácora** | Quién hizo qué y cuándo. |
| **Config** | Si el tablero se ve sin PIN y los días para marcar un vale como atrasado. |

**PIN y roles** (hoja *Bodegueros*): un PIN distinto por persona, de 4 a 6 números.

- *Bodeguero*: entrega, liquida, recibe piezas viejas y sube fotos.
- *Administrador*: además anula, restaura y reabre vales.
- *Consulta*: solo ve el tablero cuando «Tablero visible sin PIN» está en *No*.

Para quitar a alguien, pon *Activo* en *No*. No cambies los encabezados de las hojas; sí puedes agregar columnas al final. Si corriges cantidades a mano en la hoja, usa el menú **Vales de asistencia ▸ Recalcular totales y estados**.

---

## Instalación (ya hecha; sirve si hay que repetirla)

1. Crear una hoja de Google ▸ **Extensiones ▸ Apps Script** ▸ pegar `Code.gs` ▸ guardar.
2. Elegir la función **configurar** ▸ **Ejecutar** ▸ autorizar (Configuración avanzada ▸ Ir a… ▸ Permitir).
3. **Implementar ▸ Nueva implementación ▸ Aplicación web** · Ejecutar como: *Yo* · Acceso: *Cualquier persona* ▸ copiar la URL que termina en `/exec`.
4. En `index.html`, poner esa URL en `const API_URL = '…';` y subir el archivo a este repositorio.
5. En la hoja *Bodegueros*, escribir el nombre, PIN y rol de cada persona.

**Si se cambia `Code.gs`:** Implementar ▸ Gestionar implementaciones ▸ lápiz ▸ Versión: *Nueva versión* ▸ Implementar. La URL no cambia.
