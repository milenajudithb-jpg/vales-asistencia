/**
 * ─────────────────────────────────────────────────────────────────
 *  VALES DE ASISTENCIA · BODEGA — servidor en Google Apps Script
 * ─────────────────────────────────────────────────────────────────
 *  Guarda en esta hoja de Google lo que registran los bodegueros
 *  desde el tablero publicado en GitHub Pages, y las fotos en una
 *  carpeta de Google Drive.
 *
 *  INSTALACIÓN (una sola vez)
 *   1. En la hoja: Extensiones ▸ Apps Script. Borra lo que haya,
 *      pega este código y guarda (Ctrl+S).
 *   2. Arriba elige la función «configurar» y pulsa Ejecutar.
 *      Google pide permiso: Revisar permisos ▸ tu cuenta ▸
 *      Configuración avanzada ▸ Ir a … ▸ Permitir.
 *   3. Implementar ▸ Nueva implementación ▸ tipo «Aplicación web».
 *        Ejecutar como: Yo
 *        Quién tiene acceso: Cualquier persona
 *      Copia la URL que termina en /exec.
 *   4. Esa URL va en index.html  →  const API_URL = '…';
 *
 *  SI CAMBIAS ESTE CÓDIGO
 *   Implementar ▸ Gestionar implementaciones ▸ lápiz ▸
 *   Versión: «Nueva versión» ▸ Implementar. La URL no cambia.
 *
 *  PIN
 *   Cada bodeguero tiene su PIN en la hoja «Bodegueros».
 *   Rol: Bodeguero (registra) · Administrador (además anula y
 *   reabre vales) · Consulta (solo ve, si el tablero pide PIN).
 *
 *  No cambies los encabezados de las hojas: el servidor encuentra
 *  cada columna por su nombre. Sí puedes agregar columnas al final.
 * ─────────────────────────────────────────────────────────────────
 */

const ZONA = 'America/Guatemala';
const PREFIJO = 'VA-';
const CARPETA_FOTOS = 'Vales de asistencia - Fotos';
const TABLERO_URL = 'https://milenajudithb-jpg.github.io/vales-asistencia/';
const MAX_BITACORA = 3000;
const MAX_LINEAS = 60;
const MAX_FOTO_BYTES = 6 * 1024 * 1024;

const ESTADO = {
  abierto: 'Abierto',
  completo: 'Liquidado completo',
  faltante: 'Liquidado con faltantes',
  anulado: 'Anulado',
};

/* [clave, encabezado, tipo, ancho]
   tipo: t texto · n número · f fecha · h hora · s fecha y hora · m mes */
const HOJAS = {
  vales: {
    nombre: 'Vales',
    cols: [
      ['id', 'ID vale', 't', 80],
      ['numero', 'No. vale físico', 't', 100],
      ['estado', 'Estado', 't', 160],
      ['fecha', 'Fecha salida', 'f', 95],
      ['hora', 'Hora salida', 'h', 70],
      ['mes', 'Mes', 'm', 70],
      ['unidad', 'Unidad', 't', 200],
      ['mecanico', 'Mecánico', 't', 220],
      ['apoyo', 'Mecánico de apoyo', 't', 200],
      ['entrego', 'Bodeguero que entregó', 't', 180],
      ['obsSalida', 'Observaciones de salida', 't', 220],
      ['origen', 'Registrado en', 't', 100],
      ['registrado', 'Registrado', 's', 140],
      ['registradoPor', 'Registrado por', 't', 170],
      ['fechaLiq', 'Fecha liquidación', 'f', 105],
      ['horaLiq', 'Hora liquidación', 'h', 80],
      ['liquido', 'Bodeguero que liquidó', 't', 180],
      ['obsLiq', 'Observaciones de liquidación', 't', 220],
      ['salio', 'Salió', 'n', 60],
      ['devuelto', 'Devuelto sin usar', 'n', 85],
      ['utilizado', 'Utilizado', 'n', 75],
      ['viejaReq', 'Piezas viejas a regresar', 'n', 105],
      ['viejaRec', 'Piezas viejas recibidas', 'n', 105],
      ['viejaFalta', 'Piezas viejas faltantes', 'n', 105],
      ['diferencia', 'Sin justificar', 'n', 80],
      ['nFotos', 'Fotos', 'n', 55],
      ['sinFotoMotivo', 'Motivo sin foto', 't', 180],
      ['motivoAnulacion', 'Motivo de anulación', 't', 200],
      ['actualizado', 'Última actualización', 's', 140],
      ['opAbrir', 'Control apertura', 't', 110],
      ['opLiquidar', 'Control liquidación', 't', 110],
    ],
  },
  lineas: {
    nombre: 'Detalle de repuestos',
    cols: [
      ['valeId', 'ID vale', 't', 80],
      ['linea', 'Línea', 'n', 50],
      ['numero', 'No. vale físico', 't', 100],
      ['fecha', 'Fecha salida', 'f', 95],
      ['unidad', 'Unidad', 't', 180],
      ['mecanico', 'Mecánico', 't', 200],
      ['codigo', 'Código', 't', 100],
      ['descripcion', 'Repuesto', 't', 240],
      ['requiereVieja', 'Regresa pieza vieja', 't', 90],
      ['salio', 'Salió', 'n', 60],
      ['devuelto', 'Devuelto sin usar', 'n', 85],
      ['utilizado', 'Utilizado', 'n', 75],
      ['viejaReq', 'Pieza vieja a regresar', 'n', 100],
      ['viejaRec', 'Pieza vieja recibida', 'n', 100],
      ['viejaFalta', 'Pieza vieja faltante', 'n', 100],
      ['diferencia', 'Sin justificar', 'n', 80],
      ['estadoLinea', 'Estado', 't', 130],
      ['agregada', 'Agregado al liquidar', 't', 90],
      ['obs', 'Observación', 't', 200],
      ['lineaId', 'Control línea', 't', 110],
    ],
  },
  fotos: {
    nombre: 'Fotos',
    cols: [
      ['valeId', 'ID vale', 't', 80],
      ['fecha', 'Fecha y hora', 's', 140],
      ['momento', 'Momento', 't', 120],
      ['tipo', 'Tipo', 't', 170],
      ['subio', 'Subida por', 't', 170],
      ['url', 'Ver foto', 't', 260],
      ['driveId', 'Archivo en Drive', 't', 120],
      ['fotoId', 'Control foto', 't', 110],
    ],
  },
  bodegueros: {
    nombre: 'Bodegueros',
    cols: [
      ['nombre', 'Nombre', 't', 240],
      ['pin', 'PIN', 't', 80],
      ['rol', 'Rol', 't', 130],
      ['activo', 'Activo', 't', 70],
    ],
  },
  catalogos: {
    nombre: 'Catálogos',
    cols: [
      ['unidad', 'Unidades', 't', 230],
      ['mecanico', 'Mecánicos', 't', 270],
      ['codigo', 'Código repuesto', 't', 120],
      ['repuesto', 'Repuesto', 't', 260],
      ['consumible', 'Consumible (no regresa pieza vieja)', 't', 160],
    ],
  },
  bitacora: {
    nombre: 'Bitácora',
    cols: [
      ['fecha', 'Fecha y hora', 's', 140],
      ['usuario', 'Usuario', 't', 170],
      ['accion', 'Acción', 't', 150],
      ['valeId', 'ID vale', 't', 80],
      ['detalle', 'Detalle', 't', 460],
    ],
  },
  config: {
    nombre: 'Config',
    cols: [
      ['param', 'Parámetro', 't', 300],
      ['valor', 'Valor', 't', 320],
      ['nota', 'Nota', 't', 420],
    ],
  },
};

const ACCIONES = {
  datos: accionDatos_,
  validarPin: accionValidarPin_,
  abrir: accionAbrir_,
  editar: accionEditar_,
  liquidar: accionLiquidar_,
  piezasViejas: accionPiezasViejas_,
  foto: accionFoto_,
  verFoto: accionVerFoto_,
  anular: accionAnular_,
  reabrir: accionReabrir_,
};

/* ═════════════════════════ Web app ═════════════════════════ */

function doGet(e) {
  const p = (e && e.parameter) || {};
  return responder_(() => {
    if (p.accion === 'ping') return { ok: true, servidor: ahora_() };
    return accionDatos_({});
  });
}

function doPost(e) {
  return responder_(() => {
    let body;
    try {
      body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    } catch (err) {
      throw falla_('Solicitud inválida.', 'SOLICITUD');
    }
    const accion = ACCIONES[body && body.accion];
    if (!accion) throw falla_('Acción desconocida.', 'SOLICITUD');
    return accion(body);
  });
}

function responder_(fn) {
  let out;
  try {
    out = fn();
  } catch (err) {
    if (!err || !err.mensaje) console.error(err && err.stack ? err.stack : err);
    out = {
      ok: false,
      error: (err && (err.mensaje || err.message)) || String(err),
      codigo: (err && err.codigo) || 'ERROR',
    };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/* ═════════════════════════ Acciones ═════════════════════════ */

function accionDatos_(body) {
  const conf = config_();
  let usuario = null;
  if (!conf.publico) usuario = usuario_(body.pin, true);

  const cat = leer_('catalogos');
  const repuestos = cat
    .filter(c => texto_(c.repuesto) || texto_(c.codigo))
    .map(c => ({ codigo: texto_(c.codigo, 60), descripcion: texto_(c.repuesto, 150), consumible: esSi_(c.consumible, false) }));
  const bodegueros = leer_('bodegueros')
    .filter(b => texto_(b.nombre) && esSi_(b.activo, true) && rolDe_(b.rol) !== 'consulta')
    .map(b => texto_(b.nombre, 120));

  return {
    ok: true,
    servidor: ahora_(),
    publico: conf.publico,
    diasAtraso: conf.diasAtraso,
    hojaUrl: libro_().getUrl(),
    usuario: usuario,
    vales: leer_('vales').map(publicoVale_),
    lineas: leer_('lineas').map(publicoLinea_),
    fotos: leer_('fotos').map(publicoFoto_),
    bitacora: leer_('bitacora', { ultimas: MAX_BITACORA }).map(b => ({
      fecha: b.fecha, usuario: b.usuario, accion: b.accion, valeId: b.valeId, detalle: b.detalle,
    })),
    catalogos: {
      unidades: unicos_(cat.map(c => texto_(c.unidad, 120))),
      mecanicos: unicos_(cat.map(c => texto_(c.mecanico, 120))),
      repuestos: repuestos,
    },
    bodegueros: unicos_(bodegueros),
  };
}

function accionValidarPin_(body) {
  const u = usuario_(body.pin, true);
  return { ok: true, usuario: u };
}

function accionAbrir_(body) {
  const u = escritor_(body.pin);
  return conBloqueo_(() => {
    const vales = leer_('vales');
    const op = texto_(body.opId, 80);
    if (op) {
      const ya = buscar_(vales, 'opAbrir', op);
      if (ya) return paquete_(ya, lineasDe_(ya.id), { repetido: true });
    }
    const v = body.vale || {};
    const unidad = texto_(v.unidad, 120);
    const mecanico = texto_(v.mecanico, 120);
    if (!unidad) throw falla_('Falta la unidad.', 'VALIDACION');
    if (!mecanico) throw falla_('Falta el mecánico.', 'VALIDACION');
    const crudas = Array.isArray(body.lineas) ? body.lineas : [];
    const lineas = lineasSalida_(crudas);
    if (!lineas.length) throw falla_('Agrega al menos un repuesto.', 'VALIDACION');

    const liq = body.liquidacion && typeof body.liquidacion === 'object' ? body.liquidacion : null;
    const fecha = fechaValida_(v.fecha) || hoy_();
    const entregoPedido = texto_(v.entrego, 120);
    const nuevo = {
      id: siguienteId_(vales),
      numero: texto_(v.numero, 40),
      estado: ESTADO.abierto,
      fecha: fecha,
      hora: horaValida_(v.hora) || horaAhora_(),
      mes: fecha.slice(0, 7),
      unidad: unidad,
      mecanico: mecanico,
      apoyo: texto_(v.apoyo, 120),
      entrego: (liq || u.rol === 'admin') && entregoPedido ? entregoPedido : u.nombre,
      obsSalida: texto_(v.obsSalida, 500),
      origen: liq ? 'Al liquidar' : 'Entrega',
      registrado: ahora_(),
      registradoPor: u.nombre,
      fechaLiq: '', horaLiq: '', liquido: '', obsLiq: '',
      salio: '', devuelto: '', utilizado: '', viejaReq: '', viejaRec: '', viejaFalta: '', diferencia: '',
      nFotos: 0, sinFotoMotivo: '', motivoAnulacion: '',
      actualizado: ahora_(),
      opAbrir: op,
      opLiquidar: '',
    };
    if (liq) {
      lineas.forEach((l, i) => liquidarLinea_(l, crudas[i]));
      nuevo.liquido = u.nombre;
      nuevo.fechaLiq = fechaValida_(liq.fecha) || hoy_();
      nuevo.horaLiq = horaValida_(liq.hora) || horaAhora_();
      nuevo.obsLiq = texto_(liq.obs, 500);
      nuevo.sinFotoMotivo = texto_(liq.sinFotoMotivo, 300);
      nuevo.opLiquidar = op;
    }
    lineas.forEach((l, i) => Object.assign(l, cabeceraLinea_(nuevo), { linea: i + 1 }));
    totales_(nuevo, lineas);
    agregar_('vales', [nuevo]);
    agregar_('lineas', lineas);
    bitacora_(u.nombre, liq ? 'Registró y liquidó' : 'Abrió vale', nuevo.id,
      resumenSalida_(nuevo, lineas) + (liq ? ' · ' + resumenLiq_(nuevo) : ''));
    return paquete_(nuevo, lineas);
  });
}

function accionEditar_(body) {
  const u = escritor_(body.pin);
  return conBloqueo_(() => {
    const v = vale_(body.id);
    if (claveEstado_(v.estado) === 'anulado') throw falla_('Este vale está anulado.', 'ESTADO');
    if (texto_(v.liquido)) throw falla_('Este vale ya fue liquidado; ya no se puede editar.', 'ESTADO');
    const d = body.vale || {};
    const cambios = [];
    const poner = (campo, valor, etiqueta) => {
      if (String(v[campo]) !== String(valor)) {
        cambios.push(etiqueta + ': ' + (v[campo] || '—') + ' → ' + (valor || '—'));
        v[campo] = valor;
      }
    };
    const unidad = texto_(d.unidad, 120);
    const mecanico = texto_(d.mecanico, 120);
    if (!unidad) throw falla_('Falta la unidad.', 'VALIDACION');
    if (!mecanico) throw falla_('Falta el mecánico.', 'VALIDACION');
    poner('numero', texto_(d.numero, 40), 'No. vale');
    poner('fecha', fechaValida_(d.fecha) || v.fecha, 'Fecha');
    poner('hora', horaValida_(d.hora) || v.hora, 'Hora');
    poner('unidad', unidad, 'Unidad');
    poner('mecanico', mecanico, 'Mecánico');
    poner('apoyo', texto_(d.apoyo, 120), 'Apoyo');
    poner('obsSalida', texto_(d.obsSalida, 500), 'Observaciones');
    if (u.rol === 'admin' && texto_(d.entrego, 120)) poner('entrego', texto_(d.entrego, 120), 'Entregó');
    v.mes = String(v.fecha).slice(0, 7);

    const actuales = lineasDe_(v.id);
    const nuevas = lineasSalida_(body.lineas);
    if (!nuevas.length) throw falla_('El vale debe tener al menos un repuesto.', 'VALIDACION');
    const porId = {};
    actuales.forEach(l => { porId[l.lineaId] = l; });
    const aActualizar = [];
    const aAgregar = [];
    const quedan = {};
    nuevas.forEach((n, i) => {
      const a = porId[n.lineaId];
      const base = Object.assign(cabeceraLinea_(v), { linea: i + 1 });
      if (a) {
        quedan[n.lineaId] = true;
        if (a.descripcion !== n.descripcion || num_(a.salio) !== n.salio || esSi_(a.requiereVieja, true) !== (n.requiereVieja === 'Sí') || a.codigo !== n.codigo) {
          cambios.push(a.descripcion + ' (' + fmt_(a.salio) + ') → ' + n.descripcion + ' (' + fmt_(n.salio) + ')' + (n.requiereVieja === 'No' ? ', sin pieza vieja' : ''));
        }
        Object.assign(a, n, base);
        aActualizar.push(a);
      } else {
        cambios.push('Agregó ' + n.descripcion + ' (' + fmt_(n.salio) + ')');
        aAgregar.push(Object.assign(n, base));
      }
    });
    const aBorrar = actuales.filter(l => !quedan[l.lineaId]);
    aBorrar.forEach(l => cambios.push('Quitó ' + l.descripcion + ' (' + fmt_(l.salio) + ')'));

    v.actualizado = ahora_();
    totales_(v, aActualizar.concat(aAgregar));
    actualizarVarios_('lineas', aActualizar);
    borrar_('lineas', aBorrar);
    agregar_('lineas', aAgregar);
    actualizarVarios_('vales', [v]);
    bitacora_(u.nombre, 'Editó salida', v.id, cambios.length ? cambios.join(' · ') : 'Sin cambios');
    return paquete_(v, lineasDe_(v.id));
  });
}

function accionLiquidar_(body) {
  const u = escritor_(body.pin);
  return conBloqueo_(() => {
    const v = vale_(body.id);
    const op = texto_(body.opId, 80);
    if (claveEstado_(v.estado) === 'anulado') throw falla_('Este vale está anulado.', 'ESTADO');
    if (texto_(v.liquido)) {
      if (op && v.opLiquidar === op) return paquete_(v, lineasDe_(v.id), { repetido: true });
      throw falla_('Este vale ya fue liquidado por ' + v.liquido + '.', 'ESTADO');
    }
    const lineas = lineasDe_(v.id);
    const porId = {};
    (Array.isArray(body.lineas) ? body.lineas : []).forEach(d => { if (d && d.lineaId) porId[d.lineaId] = d; });
    lineas.forEach(l => liquidarLinea_(l, porId[l.lineaId] || {}));

    const crudas = Array.isArray(body.nuevas) ? body.nuevas : [];
    if (lineas.length + crudas.length > MAX_LINEAS) throw falla_('Máximo ' + MAX_LINEAS + ' repuestos por vale.', 'VALIDACION');
    const extra = lineasSalida_(crudas);
    extra.forEach((l, i) => {
      liquidarLinea_(l, crudas[i]);
      Object.assign(l, cabeceraLinea_(v), { linea: lineas.length + i + 1, agregada: 'Sí' });
    });

    v.liquido = u.nombre;
    v.fechaLiq = fechaValida_(body.fecha) || hoy_();
    v.horaLiq = horaValida_(body.hora) || horaAhora_();
    v.obsLiq = texto_(body.obs, 500);
    v.sinFotoMotivo = texto_(body.sinFotoMotivo, 300);
    v.opLiquidar = op;
    v.actualizado = ahora_();
    const todas = lineas.concat(extra);
    totales_(v, todas);
    actualizarVarios_('lineas', lineas);
    agregar_('lineas', extra);
    actualizarVarios_('vales', [v]);
    bitacora_(u.nombre, 'Liquidó vale', v.id,
      resumenLiq_(v) + (extra.length ? ' · Agregó al liquidar: ' + extra.map(l => l.descripcion + ' (' + fmt_(l.salio) + ')').join(', ') : ''));
    return paquete_(v, todas);
  });
}

function accionPiezasViejas_(body) {
  const u = escritor_(body.pin);
  return conBloqueo_(() => {
    const v = vale_(body.id);
    if (claveEstado_(v.estado) === 'anulado') throw falla_('Este vale está anulado.', 'ESTADO');
    if (!texto_(v.liquido)) throw falla_('Primero hay que liquidar el vale.', 'ESTADO');
    const lineas = lineasDe_(v.id);
    const porId = {};
    lineas.forEach(l => { porId[l.lineaId] = l; });
    const cambiadas = [];
    const detalle = [];
    (Array.isArray(body.lineas) ? body.lineas : []).forEach(d => {
      const l = d && porId[d.lineaId];
      if (!l) return;
      const actual = num_(l.viejaRec);
      const nuevo = num_(d.viejaRec);
      if (nuevo === actual) return;
      if (num_(d.antes) !== actual) {
        throw falla_('Este vale cambió mientras lo llenabas. Actualiza el tablero y vuelve a intentarlo.', 'CONFLICTO');
      }
      if (nuevo < 0) throw falla_('Cantidad inválida en «' + l.descripcion + '».', 'VALIDACION');
      l.viejaRec = nuevo;
      cambiadas.push(l);
      detalle.push(l.descripcion + ': ' + fmt_(actual) + ' → ' + fmt_(nuevo));
    });
    if (!cambiadas.length) return paquete_(v, lineas, { repetido: true });
    const obs = texto_(body.obs, 300);
    v.actualizado = ahora_();
    totales_(v, lineas);
    actualizarVarios_('lineas', lineas);
    actualizarVarios_('vales', [v]);
    bitacora_(u.nombre, 'Recibió pieza vieja', v.id, detalle.join(' · ') + (obs ? ' · ' + obs : '') + ' → ' + v.estado);
    return paquete_(v, lineas);
  });
}

function accionFoto_(body) {
  const u = escritor_(body.pin);
  const fotoId = texto_(body.fotoId, 80) || Utilities.getUuid();
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/.exec(String(body.data || ''));
  if (!m) throw falla_('La foto no es válida.', 'VALIDACION');
  const bytes = Utilities.base64Decode(m[2].replace(/\s+/g, ''));
  if (bytes.length > MAX_FOTO_BYTES) throw falla_('La foto es demasiado grande.', 'VALIDACION');
  const tipo = texto_(body.tipo, 60) || 'Otra';
  const momento = texto_(body.momento, 60) || 'Adicional';

  return conBloqueo_(() => {
    const fotos = leer_('fotos');
    const ya = buscar_(fotos, 'fotoId', fotoId);
    if (ya) return { ok: true, repetido: true, foto: publicoFoto_(ya) };
    const v = vale_(body.valeId);
    if (claveEstado_(v.estado) === 'anulado') throw falla_('Este vale está anulado.', 'ESTADO');
    const ext = m[1] === 'image/png' ? '.png' : m[1] === 'image/webp' ? '.webp' : '.jpg';
    const nombre = v.id + ' - ' + tipo + ' - ' + ahora_().replace(/:/g, '.') + ext;
    const archivo = carpetaFotos_(String(v.fecha || hoy_()).slice(0, 7)).createFile(Utilities.newBlob(bytes, m[1], nombre));
    try { archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) { /* el tablero usa verFoto */ }
    try { archivo.setDescription(v.id + ' · ' + v.unidad + ' · ' + momento + ' · ' + tipo + ' · subida por ' + u.nombre); } catch (e) { /* opcional */ }
    const reg = {
      valeId: v.id, fecha: ahora_(), momento: momento, tipo: tipo, subio: u.nombre,
      url: archivo.getUrl(), driveId: archivo.getId(), fotoId: fotoId,
    };
    agregar_('fotos', [reg]);
    v.nFotos = fotos.filter(f => f.valeId === v.id).length + 1;
    v.actualizado = ahora_();
    actualizarVarios_('vales', [v]);
    bitacora_(u.nombre, 'Agregó foto', v.id, momento + ' · ' + tipo);
    return { ok: true, foto: publicoFoto_(reg), nFotos: v.nFotos };
  });
}

function accionVerFoto_(body) {
  const conf = config_();
  if (!conf.publico) usuario_(body.pin, true);
  const id = texto_(body.driveId, 120);
  const f = id && buscar_(leer_('fotos'), 'driveId', id);
  if (!f) throw falla_('Foto no encontrada.', 'NO_EXISTE');
  const blob = DriveApp.getFileById(f.driveId).getBlob();
  return { ok: true, data: 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes()) };
}

function accionAnular_(body) {
  const u = admin_(body.pin);
  const motivo = texto_(body.motivo, 300);
  if (!motivo) throw falla_('Escribe el motivo de la anulación.', 'VALIDACION');
  return conBloqueo_(() => {
    const v = vale_(body.id);
    if (claveEstado_(v.estado) === 'anulado') return paquete_(v, lineasDe_(v.id), { repetido: true });
    v.estado = ESTADO.anulado;
    v.motivoAnulacion = motivo + ' — ' + u.nombre + ', ' + ahora_();
    v.actualizado = ahora_();
    actualizarVarios_('vales', [v]);
    bitacora_(u.nombre, 'Anuló vale', v.id, motivo);
    return paquete_(v, lineasDe_(v.id));
  });
}

function accionReabrir_(body) {
  const u = admin_(body.pin);
  const motivo = texto_(body.motivo, 300);
  if (!motivo) throw falla_('Escribe el motivo.', 'VALIDACION');
  return conBloqueo_(() => {
    const v = vale_(body.id);
    const eraAnulado = claveEstado_(v.estado) === 'anulado';
    if (!eraAnulado && !texto_(v.liquido)) return paquete_(v, lineasDe_(v.id), { repetido: true });
    if (eraAnulado) {
      v.motivoAnulacion = '';
    } else {
      v.liquido = ''; v.fechaLiq = ''; v.horaLiq = ''; v.opLiquidar = ''; v.sinFotoMotivo = '';
    }
    v.estado = ESTADO.abierto;
    v.actualizado = ahora_();
    const lineas = lineasDe_(v.id);
    totales_(v, lineas);
    actualizarVarios_('lineas', lineas);
    actualizarVarios_('vales', [v]);
    bitacora_(u.nombre, eraAnulado ? 'Restauró vale' : 'Reabrió vale', v.id, motivo);
    return paquete_(v, lineas);
  });
}

/* ═════════════════════════ Reglas del vale ═════════════════════════ */

function lineasSalida_(arr) {
  if (!Array.isArray(arr)) arr = [];
  if (arr.length > MAX_LINEAS) throw falla_('Máximo ' + MAX_LINEAS + ' repuestos por vale.', 'VALIDACION');
  return arr.map((l, i) => {
    l = l || {};
    const descripcion = texto_(l.descripcion, 150);
    const salio = num_(l.salio);
    if (!descripcion) throw falla_('Falta el nombre del repuesto en la línea ' + (i + 1) + '.', 'VALIDACION');
    if (!(salio > 0)) throw falla_('La cantidad de «' + descripcion + '» debe ser mayor que cero.', 'VALIDACION');
    return {
      lineaId: texto_(l.lineaId, 80) || Utilities.getUuid(),
      codigo: texto_(l.codigo, 60),
      descripcion: descripcion,
      requiereVieja: l.requiereVieja === false ? 'No' : 'Sí',
      salio: salio,
      devuelto: '', utilizado: '', viejaReq: '', viejaRec: '', viejaFalta: '', diferencia: '',
      estadoLinea: 'Pendiente',
      agregada: '',
      obs: texto_(l.obs, 300),
    };
  });
}

function liquidarLinea_(l, d) {
  d = d || {};
  if (d.requiereVieja === false) l.requiereVieja = 'No';
  else if (d.requiereVieja === true) l.requiereVieja = 'Sí';
  const salio = num_(l.salio);
  const dev = num_(d.devuelto);
  const uti = d.utilizado === '' || d.utilizado == null ? redondea_(salio - dev) : num_(d.utilizado);
  if (dev < 0 || uti < 0) throw falla_('Hay cantidades negativas en «' + l.descripcion + '».', 'VALIDACION');
  if (redondea_(dev + uti) > salio) {
    throw falla_('En «' + l.descripcion + '» lo devuelto (' + fmt_(dev) + ') más lo utilizado (' + fmt_(uti) +
      ') es mayor que lo que salió (' + fmt_(salio) + ').', 'VALIDACION');
  }
  const rec = esSi_(l.requiereVieja, true) ? num_(d.viejaRec) : 0;
  if (rec < 0) throw falla_('Cantidad inválida de pieza vieja en «' + l.descripcion + '».', 'VALIDACION');
  l.devuelto = dev;
  l.utilizado = uti;
  l.viejaRec = rec;
  if (d.obs !== undefined) l.obs = texto_(d.obs, 300);
  return l;
}

function calcLinea_(l, liquidado) {
  l.requiereVieja = esSi_(l.requiereVieja, true) ? 'Sí' : 'No';
  l.salio = num_(l.salio);
  if (!liquidado) {
    l.viejaReq = ''; l.viejaFalta = ''; l.diferencia = ''; l.estadoLinea = 'Pendiente';
    return l;
  }
  const dev = num_(l.devuelto);
  const uti = l.utilizado === '' || l.utilizado == null ? redondea_(l.salio - dev) : num_(l.utilizado);
  const rec = l.requiereVieja === 'Sí' ? num_(l.viejaRec) : 0;
  l.devuelto = dev;
  l.utilizado = uti;
  l.viejaRec = rec;
  l.viejaReq = l.requiereVieja === 'Sí' ? uti : 0;
  l.viejaFalta = Math.max(0, redondea_(l.viejaReq - rec));
  l.diferencia = redondea_(l.salio - dev - uti);
  l.estadoLinea = l.diferencia > 0 ? 'Sin justificar'
    : l.diferencia < 0 ? 'Revisar cantidades'
      : l.viejaFalta > 0 ? 'Falta pieza vieja' : 'Completo';
  return l;
}

function totales_(v, lineas) {
  const liquidado = !!texto_(v.liquido);
  const t = { salio: 0, devuelto: 0, utilizado: 0, viejaReq: 0, viejaRec: 0, viejaFalta: 0, diferencia: 0 };
  lineas.forEach(l => {
    calcLinea_(l, liquidado);
    t.salio += num_(l.salio);
    if (liquidado) {
      t.devuelto += num_(l.devuelto);
      t.utilizado += num_(l.utilizado);
      t.viejaReq += num_(l.viejaReq);
      t.viejaRec += num_(l.viejaRec);
      t.viejaFalta += num_(l.viejaFalta);
      t.diferencia += Math.abs(num_(l.diferencia));
    }
  });
  v.salio = redondea_(t.salio);
  ['devuelto', 'utilizado', 'viejaReq', 'viejaRec', 'viejaFalta', 'diferencia'].forEach(k => {
    v[k] = liquidado ? redondea_(t[k]) : '';
  });
  if (claveEstado_(v.estado) === 'anulado') {
    v.estado = ESTADO.anulado;
  } else if (!liquidado) {
    v.estado = ESTADO.abierto;
  } else {
    v.estado = t.viejaFalta > 0 || t.diferencia > 0 ? ESTADO.faltante : ESTADO.completo;
  }
  return v;
}

function claveEstado_(etiqueta) {
  const n = normal_(etiqueta);
  if (n.indexOf('anulad') === 0) return 'anulado';
  if (n.indexOf('faltante') >= 0) return 'faltante';
  if (n.indexOf('completo') >= 0) return 'completo';
  return 'abierto';
}

function cabeceraLinea_(v) {
  return { valeId: v.id, numero: v.numero, fecha: v.fecha, unidad: v.unidad, mecanico: v.mecanico };
}

function resumenSalida_(v, lineas) {
  const lista = lineas.map(l => l.descripcion + ' (' + fmt_(l.salio) + ')').join(', ');
  return v.unidad + ' · ' + v.mecanico + ' · Entregó ' + v.entrego + ' · ' + lineas.length +
    (lineas.length === 1 ? ' repuesto: ' : ' repuestos: ') + lista;
}

function resumenLiq_(v) {
  let s = 'Utilizó ' + fmt_(v.utilizado) + ' · Devolvió ' + fmt_(v.devuelto) +
    ' · Pieza vieja ' + fmt_(v.viejaRec) + ' de ' + fmt_(v.viejaReq);
  if (num_(v.diferencia)) s += ' · Sin justificar ' + fmt_(v.diferencia);
  return s + ' → ' + v.estado;
}

function paquete_(v, lineas, extra) {
  return Object.assign({ ok: true, id: v.id, vale: publicoVale_(v), lineas: lineas.map(publicoLinea_) }, extra || {});
}

function publicoVale_(v) {
  return {
    id: v.id, numero: v.numero, estado: claveEstado_(v.estado),
    fecha: v.fecha, hora: v.hora, unidad: v.unidad, mecanico: v.mecanico, apoyo: v.apoyo,
    entrego: v.entrego, obsSalida: v.obsSalida, origen: v.origen,
    registrado: v.registrado, registradoPor: v.registradoPor,
    fechaLiq: v.fechaLiq, horaLiq: v.horaLiq, liquido: v.liquido, obsLiq: v.obsLiq,
    nFotos: num_(v.nFotos), sinFotoMotivo: v.sinFotoMotivo, motivoAnulacion: v.motivoAnulacion,
    actualizado: v.actualizado,
  };
}

function publicoLinea_(l) {
  return {
    valeId: l.valeId, linea: num_(l.linea), lineaId: l.lineaId, codigo: l.codigo, descripcion: l.descripcion,
    requiereVieja: esSi_(l.requiereVieja, true), salio: num_(l.salio),
    devuelto: numONulo_(l.devuelto), utilizado: numONulo_(l.utilizado), viejaRec: numONulo_(l.viejaRec),
    agregada: esSi_(l.agregada, false), obs: l.obs,
  };
}

function publicoFoto_(f) {
  return { fotoId: f.fotoId, valeId: f.valeId, fecha: f.fecha, momento: f.momento, tipo: f.tipo, subio: f.subio, driveId: f.driveId };
}

function vale_(id) {
  const v = buscar_(leer_('vales'), 'id', texto_(id, 40));
  if (!v) throw falla_('No encontré el vale ' + id + '. Actualiza el tablero.', 'NO_EXISTE');
  return v;
}

function lineasDe_(valeId) {
  return leer_('lineas')
    .filter(l => l.valeId === valeId)
    .sort((a, b) => num_(a.linea) - num_(b.linea) || a._fila - b._fila);
}

function siguienteId_(vales) {
  const props = PropertiesService.getScriptProperties();
  let n = num_(props.getProperty('CORRELATIVO'));
  vales.forEach(v => {
    const m = /(\d+)\s*$/.exec(String(v.id));
    if (m) n = Math.max(n, Number(m[1]));
  });
  n += 1;
  props.setProperty('CORRELATIVO', String(n));
  const s = String(n);
  return PREFIJO + (s.length < 4 ? ('0000' + s).slice(-4) : s);
}

/* ═════════════════════════ PIN y permisos ═════════════════════════ */

function usuario_(pin, requerido) {
  pin = String(pin == null ? '' : pin).trim();
  if (!pin) {
    if (requerido) throw falla_('Escribe tu PIN.', 'PIN_REQUERIDO');
    return null;
  }
  const cache = CacheService.getScriptCache();
  const fallos = num_(cache.get('fallosPin'));
  if (fallos >= 25) throw falla_('Demasiados intentos con PIN incorrecto. Espera 10 minutos.', 'PIN_BLOQUEADO');
  const lista = leer_('bodegueros');
  for (let i = 0; i < lista.length; i++) {
    const b = lista[i];
    const guardado = String(b.pin == null ? '' : b.pin).trim();
    if (!guardado || !texto_(b.nombre) || !esSi_(b.activo, true)) continue;
    const igual = guardado === pin || (/^\d+$/.test(pin) && /^\d+$/.test(guardado) && Number(guardado) === Number(pin) && guardado.length < pin.length);
    if (igual) return { nombre: texto_(b.nombre, 120), rol: rolDe_(b.rol) };
  }
  cache.put('fallosPin', String(fallos + 1), 600);
  throw falla_('PIN incorrecto.', 'PIN_INVALIDO');
}

function escritor_(pin) {
  const u = usuario_(pin, true);
  if (u.rol === 'consulta') throw falla_('Tu PIN es solo de consulta; no puede registrar vales.', 'SIN_PERMISO');
  return u;
}

function admin_(pin) {
  const u = usuario_(pin, true);
  if (u.rol !== 'admin') throw falla_('Esto solo lo puede hacer un PIN de administrador.', 'SIN_PERMISO');
  return u;
}

function rolDe_(rol) {
  const n = normal_(rol);
  if (n.indexOf('admin') === 0) return 'admin';
  if (n.indexOf('consult') === 0) return 'consulta';
  return 'bodeguero';
}

function config_() {
  const conf = { publico: true, diasAtraso: 2 };
  let filas = [];
  try { filas = leer_('config'); } catch (e) { return conf; }
  filas.forEach(f => {
    const p = normal_(f.param);
    if (p.indexOf('visible sin pin') >= 0) conf.publico = esSi_(f.valor, true);
    else if (p.indexOf('dias') === 0 && p.indexOf('atras') >= 0) conf.diasAtraso = Math.max(1, num_(f.valor) || 2);
  });
  return conf;
}

/* ═════════════════════════ Hoja: leer y escribir ═════════════════════════ */

function libro_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function hoja_(clave) {
  const def = HOJAS[clave];
  const sh = libro_().getSheetByName(def.nombre);
  if (!sh) throw falla_('Falta la hoja «' + def.nombre + '». En Apps Script ejecuta «configurar».', 'CONFIG');
  return sh;
}

function indices_(def, encabezados) {
  const porNombre = {};
  encabezados.forEach((h, i) => {
    const k = normal_(h);
    if (k && !(k in porNombre)) porNombre[k] = i;
  });
  const idx = {};
  def.cols.forEach(c => {
    const i = porNombre[normal_(c[1])];
    if (i !== undefined) idx[c[0]] = i;
  });
  return idx;
}

function aValor_(v, tipo) {
  if (v instanceof Date) {
    if (tipo === 'n') return v.getTime();
    const patron = tipo === 'h' ? 'HH:mm' : tipo === 's' ? 'yyyy-MM-dd HH:mm:ss' : tipo === 'm' ? 'yyyy-MM' : 'yyyy-MM-dd';
    return Utilities.formatDate(v, ZONA, patron);
  }
  if (tipo === 'n') return v === '' || v == null ? '' : num_(v);
  if (v === true) return 'Sí';
  if (v === false) return 'No';
  return v == null ? '' : String(v).trim();
}

function leer_(clave, opciones) {
  const def = HOJAS[clave];
  const sh = hoja_(clave);
  const ultima = sh.getLastRow();
  const ancho = sh.getLastColumn();
  if (ultima < 2 || ancho < 1) return [];
  const idx = indices_(def, sh.getRange(1, 1, 1, ancho).getValues()[0]);
  const desde = opciones && opciones.ultimas ? Math.max(2, ultima - opciones.ultimas + 1) : 2;
  const vals = sh.getRange(desde, 1, ultima - desde + 1, ancho).getValues();
  const out = [];
  vals.forEach((fila, k) => {
    const o = { _fila: desde + k };
    let vacia = true;
    def.cols.forEach(c => {
      const i = idx[c[0]];
      const v = i === undefined ? '' : aValor_(fila[i], c[2]);
      if (v !== '') vacia = false;
      o[c[0]] = v;
    });
    if (vacia) return;
    if (clave === 'lineas' && !o.lineaId) o.lineaId = 'fila-' + o._fila;
    out.push(o);
  });
  return out;
}

/* Las columnas de texto van en formato «texto sin formato» (@) para que Sheets no
   convierta fechas, horas o números de vale con ceros. Si una celda no está en
   ese formato, el texto que Sheets podría convertir se escribe con apóstrofo. */
function celda_(v, tipo, formato) {
  if (tipo === 'n') {
    if (v === '' || v == null) return '';
    return num_(v);
  }
  const s = v == null ? '' : String(v);
  if (!s || formato === '@') return s;
  return /^[=+\-@'\d.,:\/\s]/.test(s) || /^(true|false|verdadero|falso)$/i.test(s) ? "'" + s : s;
}

function crudo_(v, formato) { return typeof v === 'string' ? celda_(v, 't', formato) : v; }

function asegurarFilas_(sh, hasta) {
  const max = sh.getMaxRows();
  if (hasta > max) sh.insertRowsAfter(max, Math.max(200, hasta - max));
}

function agregar_(clave, objetos) {
  if (!objetos || !objetos.length) return;
  const def = HOJAS[clave];
  const sh = hoja_(clave);
  const ancho = sh.getLastColumn();
  const idx = indices_(def, sh.getRange(1, 1, 1, ancho).getValues()[0]);
  const inicio = sh.getLastRow() + 1;
  asegurarFilas_(sh, inicio + objetos.length - 1);
  def.cols.forEach(c => {
    const i = idx[c[0]];
    if (i !== undefined && c[2] !== 'n') sh.getRange(inicio, i + 1, objetos.length, 1).setNumberFormat('@');
  });
  const filas = objetos.map(o => {
    const fila = [];
    for (let i = 0; i < ancho; i++) fila.push('');
    def.cols.forEach(c => {
      const i = idx[c[0]];
      if (i !== undefined) fila[i] = celda_(o[c[0]], c[2], '@');
    });
    return fila;
  });
  sh.getRange(inicio, 1, filas.length, ancho).setValues(filas);
  objetos.forEach((o, k) => { o._fila = inicio + k; });
}

/* Actualiza filas completas (objetos leídos con leer_) conservando columnas extra y fórmulas. */
function actualizarVarios_(clave, objetos) {
  if (!objetos || !objetos.length) return;
  const def = HOJAS[clave];
  const sh = hoja_(clave);
  const ancho = sh.getLastColumn();
  const idx = indices_(def, sh.getRange(1, 1, 1, ancho).getValues()[0]);
  const orden = objetos.filter(o => o._fila).sort((a, b) => a._fila - b._fila);
  let i = 0;
  while (i < orden.length) {
    let j = i;
    while (j + 1 < orden.length && orden[j + 1]._fila === orden[j]._fila + 1) j++;
    const rango = sh.getRange(orden[i]._fila, 1, j - i + 1, ancho);
    const vals = rango.getValues();
    const forms = rango.getFormulas();
    const fmts = rango.getNumberFormats();
    const salida = vals.map((fila, r) => fila.map((v, c) => (forms[r][c] ? forms[r][c] : crudo_(v, fmts[r][c]))));
    for (let k = i; k <= j; k++) {
      const o = orden[k];
      const fila = salida[k - i];
      def.cols.forEach(c => {
        const p = idx[c[0]];
        if (p !== undefined) fila[p] = celda_(o[c[0]], c[2], fmts[k - i][p]);
      });
    }
    rango.setValues(salida);
    i = j + 1;
  }
}

function borrar_(clave, objetos) {
  if (!objetos || !objetos.length) return;
  const sh = hoja_(clave);
  objetos.map(o => o._fila).filter(Boolean).sort((a, b) => b - a).forEach(f => sh.deleteRow(f));
}

function escribirColumnas_(clave, objetos, campos) {
  if (!objetos.length) return;
  const def = HOJAS[clave];
  const sh = hoja_(clave);
  const ultima = sh.getLastRow();
  if (ultima < 2) return;
  const idx = indices_(def, sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]);
  const tipos = {};
  def.cols.forEach(c => { tipos[c[0]] = c[2]; });
  campos.forEach(campo => {
    const p = idx[campo];
    if (p === undefined) return;
    const rango = sh.getRange(2, p + 1, ultima - 1, 1);
    const fmts = rango.getNumberFormats();
    const col = rango.getValues().map((r, k) => [crudo_(r[0], fmts[k][0])]);
    objetos.forEach(o => {
      if (o._fila >= 2 && o._fila <= ultima) col[o._fila - 2][0] = celda_(o[campo], tipos[campo], fmts[o._fila - 2][0]);
    });
    rango.setValues(col);
  });
}

function bitacora_(usuario, accion, valeId, detalle) {
  agregar_('bitacora', [{ fecha: ahora_(), usuario: usuario, accion: accion, valeId: valeId || '', detalle: texto_(detalle, 1500) }]);
}

function conBloqueo_(fn) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
  } catch (e) {
    throw falla_('El servidor está ocupado. Intenta de nuevo en unos segundos.', 'OCUPADO');
  }
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

/* ═════════════════════════ Drive ═════════════════════════ */

function carpetaFotos_(mes) {
  const props = PropertiesService.getScriptProperties();
  let raiz = null;
  const idRaiz = props.getProperty('CARPETA_FOTOS');
  if (idRaiz) {
    try {
      raiz = DriveApp.getFolderById(idRaiz);
      if (raiz.isTrashed()) raiz = null;
    } catch (e) { raiz = null; }
  }
  if (!raiz) {
    let padre = DriveApp.getRootFolder();
    try {
      const padres = DriveApp.getFileById(libro_().getId()).getParents();
      if (padres.hasNext()) padre = padres.next();
    } catch (e) { /* queda en Mi unidad */ }
    const it = padre.getFoldersByName(CARPETA_FOTOS);
    raiz = it.hasNext() ? it.next() : padre.createFolder(CARPETA_FOTOS);
    props.setProperty('CARPETA_FOTOS', raiz.getId());
  }
  if (!mes) return raiz;
  const clave = 'CARPETA_' + mes;
  const idMes = props.getProperty(clave);
  if (idMes) {
    try {
      const c = DriveApp.getFolderById(idMes);
      if (!c.isTrashed()) return c;
    } catch (e) { /* se vuelve a crear */ }
  }
  const it = raiz.getFoldersByName(mes);
  const c = it.hasNext() ? it.next() : raiz.createFolder(mes);
  props.setProperty(clave, c.getId());
  return c;
}

/* ═════════════════════════ Configuración de la hoja ═════════════════════════ */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Vales de asistencia')
    .addItem('Configurar o reparar hojas', 'configurar')
    .addItem('Recalcular totales y estados', 'recalcular')
    .addToUi();
}

function configurar() {
  const ss = libro_();
  try { ss.setSpreadsheetTimeZone(ZONA); } catch (e) { /* opcional */ }
  const creadas = [];
  Object.keys(HOJAS).forEach(clave => {
    const def = HOJAS[clave];
    let sh = ss.getSheetByName(def.nombre);
    if (!sh) {
      sh = ss.insertSheet(def.nombre);
      creadas.push(def.nombre);
    }
    prepararHoja_(sh, def);
  });
  ['Hoja 1', 'Hoja1', 'Sheet1', 'Sheet 1'].forEach(n => {
    const sh = ss.getSheetByName(n);
    if (sh && sh.getLastRow() === 0 && sh.getLastColumn() === 0 && ss.getSheets().length > 1) ss.deleteSheet(sh);
  });
  Object.keys(HOJAS).forEach((clave, i) => {
    const sh = ss.getSheetByName(HOJAS[clave].nombre);
    ss.setActiveSheet(sh);
    ss.moveActiveSheet(i + 1);
  });

  const lista = (sh, campo, opciones) => {
    const def = HOJAS[campo[0]];
    const idx = indices_(def, sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]);
    const i = idx[campo[1]];
    if (i === undefined) return;
    const regla = SpreadsheetApp.newDataValidation().requireValueInList(opciones, true).setAllowInvalid(false).build();
    sh.getRange(2, i + 1, Math.max(1, sh.getMaxRows() - 1), 1).setDataValidation(regla);
  };
  const shB = ss.getSheetByName(HOJAS.bodegueros.nombre);
  lista(shB, ['bodegueros', 'rol'], ['Bodeguero', 'Administrador', 'Consulta']);
  lista(shB, ['bodegueros', 'activo'], ['Sí', 'No']);
  lista(ss.getSheetByName(HOJAS.catalogos.nombre), ['catalogos', 'consumible'], ['Sí', 'No']);
  try {
    shB.getRange(1, 2).setNote('PIN de 4 a 6 números, distinto para cada persona. Quien lo escribe queda registrado como quien entregó o liquidó el vale.');
  } catch (e) { /* opcional */ }

  sembrar_();
  const carpeta = carpetaFotos_('');
  escribirConfig_('Carpeta de fotos', carpeta.getUrl(), 'Se crea sola. Las fotos quedan en subcarpetas por mes.');
  escribirConfig_('Enlace del tablero', TABLERO_URL, 'Comparte este enlace con los bodegueros y con quien consulte el tablero.');
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('CORRELATIVO')) props.setProperty('CORRELATIVO', '0');
  ss.setActiveSheet(shB);

  const msg = 'Listo. ' + (creadas.length ? 'Hojas creadas: ' + creadas.join(', ') + '. ' : 'Hojas revisadas. ') +
    'Escribe en «Bodegueros» el nombre, PIN y rol de cada persona.';
  try { SpreadsheetApp.getUi().alert('Vales de asistencia', msg, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) { Logger.log(msg); }
  return msg;
}

function prepararHoja_(sh, def) {
  const n = def.cols.length;
  if (sh.getMaxColumns() < n) sh.insertColumnsAfter(sh.getMaxColumns(), n - sh.getMaxColumns());
  const ancho = Math.max(n, sh.getLastColumn());
  const enc = sh.getRange(1, 1, 1, ancho).getValues()[0];
  if (enc.every(v => v === '')) {
    sh.getRange(1, 1, 1, n).setValues([def.cols.map(c => c[1])]);
  } else {
    const idx = indices_(def, enc);
    const faltan = def.cols.filter(c => idx[c[0]] === undefined);
    if (faltan.length) {
      const desde = sh.getLastColumn() + 1;
      const hasta = desde + faltan.length - 1;
      if (sh.getMaxColumns() < hasta) sh.insertColumnsAfter(sh.getMaxColumns(), hasta - sh.getMaxColumns());
      sh.getRange(1, desde, 1, faltan.length).setValues([faltan.map(c => c[1])]);
    }
  }
  const total = sh.getLastColumn();
  const idx = indices_(def, sh.getRange(1, 1, 1, total).getValues()[0]);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, total)
    .setFontWeight('bold')
    .setVerticalAlignment('middle')
    .setWrap(true)
    .setBorder(null, null, true, null, null, null, '#000000', SpreadsheetApp.BorderStyle.SOLID);
  sh.setRowHeight(1, 34);
  const filas = Math.max(1, sh.getMaxRows() - 1);
  def.cols.forEach(c => {
    const i = idx[c[0]];
    if (i === undefined) return;
    if (c[3]) sh.setColumnWidth(i + 1, c[3]);
    if (c[2] !== 'n') sh.getRange(2, i + 1, filas, 1).setNumberFormat('@');
  });
}

function sembrar_() {
  const ss = libro_();
  const shC = ss.getSheetByName(HOJAS.catalogos.nombre);
  if (shC.getLastRow() < 2) {
    const unidades = UNIDADES_INICIALES;
    const mecanicos = MECANICOS_INICIALES;
    const n = Math.max(unidades.length, mecanicos.length);
    const filas = [];
    for (let i = 0; i < n; i++) filas.push({ unidad: unidades[i] || '', mecanico: mecanicos[i] || '', codigo: '', repuesto: '', consumible: '' });
    agregar_('catalogos', filas);
  }
  const shB = ss.getSheetByName(HOJAS.bodegueros.nombre);
  if (shB.getLastRow() < 2) {
    agregar_('bodegueros', [{ nombre: 'MILENA BARRIOS', pin: '', rol: 'Administrador', activo: 'Sí' }]);
  }
  const shK = ss.getSheetByName(HOJAS.config.nombre);
  if (shK.getLastRow() < 2) {
    agregar_('config', [
      { param: 'Tablero visible sin PIN', valor: 'Sí', nota: 'Sí: cualquiera con el enlace ve el tablero (registrar siempre pide PIN). No: para ver también pide PIN; usa el rol Consulta para quien solo mira.' },
      { param: 'Días para marcar un vale abierto como atrasado', valor: '2', nota: 'Un vale abierto más días que estos se marca en rojo en el tablero.' },
    ]);
  }
}

function escribirConfig_(param, valor, nota) {
  const filas = leer_('config');
  const f = filas.filter(x => normal_(x.param) === normal_(param))[0];
  if (f) {
    f.valor = valor;
    if (nota && !f.nota) f.nota = nota;
    actualizarVarios_('config', [f]);
  } else {
    agregar_('config', [{ param: param, valor: valor, nota: nota || '' }]);
  }
}

function recalcular() {
  conBloqueo_(() => {
    const vales = leer_('vales');
    const lineas = leer_('lineas');
    const fotos = leer_('fotos');
    const porVale = {};
    lineas.forEach(l => { (porVale[l.valeId] = porVale[l.valeId] || []).push(l); });
    const nf = {};
    fotos.forEach(f => { nf[f.valeId] = (nf[f.valeId] || 0) + 1; });
    vales.forEach(v => {
      totales_(v, porVale[v.id] || []);
      v.nFotos = nf[v.id] || 0;
      v.mes = String(v.fecha).slice(0, 7);
    });
    escribirColumnas_('vales', vales, ['estado', 'mes', 'salio', 'devuelto', 'utilizado', 'viejaReq', 'viejaRec', 'viejaFalta', 'diferencia', 'nFotos']);
    escribirColumnas_('lineas', lineas, ['requiereVieja', 'salio', 'devuelto', 'utilizado', 'viejaRec', 'viejaReq', 'viejaFalta', 'diferencia', 'estadoLinea']);
  });
  try { SpreadsheetApp.getUi().alert('Totales y estados recalculados.'); } catch (e) { /* desde el editor */ }
}

/* ═════════════════════════ Utilidades ═════════════════════════ */

function falla_(mensaje, codigo) {
  const e = new Error(mensaje);
  e.mensaje = mensaje;
  e.codigo = codigo || 'ERROR';
  return e;
}

function ahora_() { return Utilities.formatDate(new Date(), ZONA, 'yyyy-MM-dd HH:mm:ss'); }
function hoy_() { return Utilities.formatDate(new Date(), ZONA, 'yyyy-MM-dd'); }
function horaAhora_() { return Utilities.formatDate(new Date(), ZONA, 'HH:mm'); }

function texto_(v, max) {
  const s = (v == null ? '' : String(v))
    .replace(/[\u0000-\u001F\u007F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[=+@]+\s*/, '');
  return s.slice(0, max || 500);
}

function num_(v) {
  if (v === '' || v == null) return 0;
  const x = Number(String(v).replace(',', '.'));
  return isFinite(x) ? Math.round(x * 1000) / 1000 : 0;
}

function numONulo_(v) {
  if (v === '' || v == null) return null;
  const x = Number(String(v).replace(',', '.'));
  return isFinite(x) ? Math.round(x * 1000) / 1000 : null;
}

function redondea_(x) { return Math.round(x * 1000) / 1000; }

function fmt_(x) { return x === '' || x == null ? '0' : String(redondea_(Number(x) || 0)); }

function esSi_(v, defecto) {
  if (v === true) return true;
  if (v === false) return false;
  const s = String(v == null ? '' : v).trim().toLowerCase();
  if (!s) return !!defecto;
  return /^(s[ií]|true|verdadero|1|x|activo|activa)$/.test(s);
}

function fechaValida_(s) {
  s = String(s || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}

function horaValida_(s) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(s || '').trim());
  return m && Number(m[1]) < 24 && Number(m[2]) < 60 ? ('0' + m[1]).slice(-2) + ':' + m[2] : '';
}

function normal_(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function unicos_(lista) {
  const vistos = {};
  const out = [];
  lista.forEach(x => {
    const k = normal_(x);
    if (x && !vistos[k]) { vistos[k] = true; out.push(x); }
  });
  return out;
}

function buscar_(lista, campo, valor) {
  for (let i = 0; i < lista.length; i++) if (String(lista[i][campo]) === String(valor)) return lista[i];
  return null;
}

/* ═════════════════════════ Catálogos iniciales ═════════════════════════
   Tomados del tablero Control de Asistencias. Solo se cargan si la hoja
   «Catálogos» está vacía; después se editan directamente en la hoja.    */

const MECANICOS_INICIALES = [
  'AXEL FLORENCIO PABLO PABLO', 'BYRON DAVID VASQUEZ RIVAS', 'CANDIDO ORDOÑEZ', 'CRISTIAN LEONEL REYES PEREZ',
  'DANIEL BARRIENTOS', 'DAVID ESTUARDO RAMOS ARTEAGA', 'DENILSON AARON CÁCERES LIMA', 'DOUGLAS HERNANDEZ VASQUEZ',
  'EDWIN RUBÉN CANASTÚ SOLIS', 'GERSON ISRAEL BRAN IXCOY', 'GERSON RAFAEL LÓPEZ NICOLAS', 'JAURY ALEXANDER CHACH JIMÉNEZ',
  'JORGE MARIO LÓPEZ SANTOS', 'JOSUÉ BENJAMÍN GIRON GONZÁLEZ', 'JOSÉ VICTOR HUERTAS COLLADO', 'JUAN CARLOS DÍAS HERNÁNDEZ',
  'JUAN CARLOS TZALAM CANEL', 'JUSTIN ARIEL SEN NÁJERA', 'LUDWING ALDAIR GONZALES LEMUS', 'MARVIN ALEXANDER PATZÁN BRAN',
  'MELVIN WILFREDO DEL CID MÁRTIR', 'SELVIN HAROLDO VALDEZ JEREZ', 'WALDEMAR CASTAÑEDA', 'WILLIAM OROZCO',
  'WILMER DALI BENJAMÍN IXCAL MEJIA', 'YEYSON OMAR ALVAREZ FRANCO',
];

const UNIDADES_INICIALES = [
  'Cabezal C-02', 'Cabezal C-17', 'Cabezal C-18', 'C-24', 'Cabezal C-26', 'C-31', 'Cabezal C-54', 'Cabezal C-59',
  'Cabezal C-66', 'Cabezal C-70', 'Cabezal C-71', 'Cabezal C-76', 'Cabezal C-85', 'Cabezal C-89', 'Cabezal C-91',
  'Cabezal C-97', 'Cabezal C-98', 'Cabezal C-101', 'Cabezal C-102', 'Cabezal C-127', 'Cabezal C-134', 'Cabezal C-135',
  'Cabezal C-139', 'Cabezal C-151', 'Cabezal C-166',
  'Camión/Cisterna C-04 / ER-124', 'Camión/Cisterna C-10 / ER-127', 'Camión/Cisterna C-25 / ER-72',
  'Camión/Cisterna C-44 / ER-86', 'Camión/Cisterna C-63 / ER-62', 'Camión/Cisterna C-67 / ER-99',
  'Camión/Cisterna C-104 / ER-123', 'Camión/Cisterna C-106 / ER-135', 'Camión/Cisterna C-110 / ER-134',
  'Camión/Cisterna C-111 / ER-136', 'Camión/Cisterna C-113 / ER-138', 'Camión/Cisterna C-115 / ER-140',
  'Camión/Cisterna C-132 / ER-163', 'Camión/Cisterna C-133 / ER-65', 'Camión/Cisterna C-144 / ER-168',
  'Camión/Cisterna C-149 / ER-66', 'Camión/Cisterna C-156 / ER-169', 'Cisterna ER-83',
];
