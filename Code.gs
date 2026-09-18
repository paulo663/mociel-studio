/**
 * Mon Ciel Studio — Google Apps Script Backend
 * ─────────────────────────────────────────────
 * Funciones:
 *   1. Recibe reservas desde booking.html
 *   2. Las guarda en Google Sheets
 *   3. Crea eventos en Google Calendar por empleada
 *   4. Retorna disponibilidad horaria
 *
 * SETUP (hacer una sola vez):
 *   1. Ir a script.google.com → Nuevo proyecto
 *   2. Pegar este código → guardar
 *   3. Ejecutar setupSheets() para crear las hojas
 *   4. Desplegar → Nueva implementación → Aplicación web
 *      - Ejecutar como: Yo (tu cuenta)
 *      - Quién puede acceder: Cualquier persona
 *   5. Copiar la URL y pegarla en booking.html → CFG.APPS_SCRIPT_URL
 */

// ══════════════════════════════════
// CONFIGURACIÓN
// ══════════════════════════════════

const CONFIG = {
  SHEET_NAME: 'Reservas',
  TIMEZONE: 'America/Costa_Rica',
  // IDs de Google Calendar por empleada (crear o copiar de calendar.google.com)
  CALENDARS: {
    marta:   '',  // ID del calendario de Marta
    difrani: '',  // ID del calendario de Difrani
    tatiana: '',  // ID del calendario de Tatiana
    alisson: '',  // ID del calendario de Alisson
    any:     '',  // Calendario general del salón
  },
  WHATSAPP: '50688346266',
};

// ══════════════════════════════════
// SETUP INICIAL
// ══════════════════════════════════

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
  }

  // Encabezados
  const headers = [
    'ID', 'Fecha', 'Hora', 'Duración (min)', 'Servicio', 'Precio',
    'Empleada', 'Cliente', 'Teléfono', 'Email', 'Notas', 'Estado',
    'Evento Google Calendar', 'Creado en'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.getRange(1, 1, 1, headers.length).setBackground('#1E2A35');
  sheet.getRange(1, 1, 1, headers.length).setFontColor('#C9943A');
  sheet.setFrozenRows(1);

  Logger.log('✅ Hoja "Reservas" creada correctamente.');
}

// ══════════════════════════════════
// ENTRADA PRINCIPAL (POST)
// ══════════════════════════════════

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const result = processBooking(data);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, ...result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ══════════════════════════════════
// CONSULTA DE DISPONIBILIDAD (GET)
// ══════════════════════════════════

function doGet(e) {
  const action = e.parameter.action;

  if (action === 'list') {
    const bookings = getAllBookings();
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, bookings }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'availability') {
    const date  = e.parameter.date;   // 'YYYY-MM-DD'
    const empId = e.parameter.emp;    // 'marta', 'any', etc.
    const dur   = parseInt(e.parameter.dur) || 60;
    const slots = getAvailableSlots(date, empId, dur);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, slots }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, status: 'Mon Ciel Studio API' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ══════════════════════════════════
// PROCESAR RESERVA
// ══════════════════════════════════

function processBooking(data) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

  if (!sheet) throw new Error('Hoja no encontrada. Ejecutá setupSheets() primero.');

  // Crear evento en Google Calendar
  let calEventId = '';
  try {
    calEventId = createCalendarEvent(data);
  } catch (e) {
    Logger.log('⚠️ No se pudo crear evento en Calendar: ' + e.message);
  }

  // Guardar en Google Sheets
  const row = [
    data.id,
    data.date,
    data.time,
    data.duration,
    data.svcName,
    data.svcPrice,
    data.empName || data.empId,
    data.clientName,
    data.clientPhone,
    data.clientEmail  || '',
    data.clientNotes  || '',
    'confirmada',
    calEventId,
    new Date().toISOString(),
  ];

  sheet.appendRow(row);

  // Opcional: enviar notificación por email al salón
  try { sendNotificationEmail(data); } catch (e) { /* falla silenciosamente */ }

  return { id: data.id, calEventId };
}

// ══════════════════════════════════
// GOOGLE CALENDAR
// ══════════════════════════════════

function createCalendarEvent(data) {
  const calId = CONFIG.CALENDARS[data.empId] || CONFIG.CALENDARS.any;
  if (!calId) {
    Logger.log('⚠️ ID de calendario no configurado para: ' + data.empId);
    return '';
  }

  const cal = CalendarApp.getCalendarById(calId);
  if (!cal) throw new Error('Calendario no encontrado: ' + calId);

  // Parsear fecha y hora
  const [year, month, day] = data.date.split(' ');
  const [hour, min] = data.time.split(':').map(Number);

  // Construir el objeto Date en Costa Rica
  const startDate = new Date(data.date);
  startDate.setHours(hour, min, 0, 0);
  const endDate = new Date(startDate.getTime() + data.duration * 60000);

  const title = `${data.svcIcon || '✂️'} ${data.svcName} — ${data.clientName}`;
  const description = [
    `👩 Cliente: ${data.clientName}`,
    `📱 WhatsApp: ${data.clientPhone}`,
    data.clientEmail ? `✉️ Email: ${data.clientEmail}` : '',
    `💅 Servicio: ${data.svcName}`,
    `💰 Precio estimado: ₡${(data.svcPrice||0).toLocaleString()}`,
    data.clientNotes ? `📝 Notas: ${data.clientNotes}` : '',
    '',
    `🔖 Reserva #${data.id}`,
    `⏱ Duración: ${data.duration} minutos`,
  ].filter(Boolean).join('\n');

  const event = cal.createEvent(title, startDate, endDate, {
    description,
    guests: data.clientEmail || '',
    sendInvites: false,
  });

  return event.getId();
}

// ══════════════════════════════════
// DISPONIBILIDAD
// ══════════════════════════════════

function getAvailableSlots(dateStr, empId, durationMin) {
  const HOUR_START = 9, HOUR_END = 18, INTERVAL = 30;
  const takenSlots = getBookedSlots(dateStr, empId);

  const slots = [];
  for (let t = HOUR_START * 60; t <= HOUR_END * 60 - durationMin; t += INTERVAL) {
    const h  = Math.floor(t / 60).toString().padStart(2, '0');
    const m  = (t % 60).toString().padStart(2, '0');
    const ts = `${h}:${m}`;

    const taken = takenSlots.some(b => {
      const bs = timeToMin(b.time);
      const be = bs + b.duration;
      return t < be && t + durationMin > bs;
    });

    slots.push({ time: ts, available: !taken });
  }
  return slots;
}

function getAllBookings() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  return data.slice(1).map(row => ({
    id:          row[0],
    date:        row[1],
    time:        row[2],
    duration:    row[3],
    svcName:     row[4],
    svcPrice:    row[5],
    empName:     row[6],
    empId:       row[6]?.toLowerCase(),
    clientName:  row[7],
    clientPhone: row[8],
    clientEmail: row[9],
    clientNotes: row[10],
    status:      row[11] || 'confirmada',
    createdAt:   row[13],
  }));
}

function getBookedSlots(dateStr, empId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  // Skip header row
  return data.slice(1)
    .filter(row => {
      const bookingDate = row[1]; // Columna B: Fecha
      const bookingEmp  = row[6]; // Columna G: Empleada
      const status      = row[11];// Columna L: Estado
      return bookingDate === dateStr
          && (empId === 'any' || bookingEmp === empId)
          && status !== 'cancelada';
    })
    .map(row => ({
      time:     row[2],  // Hora
      duration: parseInt(row[3]) || 60, // Duración
    }));
}

// ══════════════════════════════════
// NOTIFICACIÓN POR EMAIL
// ══════════════════════════════════

function sendNotificationEmail(data) {
  const subject = `Nueva reserva: ${data.svcName} — ${data.clientName}`;
  const body = `
    <h2 style="color:#1E2A35">Nueva reserva en Mon Ciel Studio</h2>
    <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">
      <tr><td style="padding:6px 12px;color:#6E80A0">Servicio</td><td style="padding:6px 12px"><strong>${data.svcName}</strong></td></tr>
      <tr><td style="padding:6px 12px;color:#6E80A0">Fecha</td><td style="padding:6px 12px">${data.date}</td></tr>
      <tr><td style="padding:6px 12px;color:#6E80A0">Hora</td><td style="padding:6px 12px">${data.time}</td></tr>
      <tr><td style="padding:6px 12px;color:#6E80A0">Especialista</td><td style="padding:6px 12px">${data.empName || data.empId}</td></tr>
      <tr><td style="padding:6px 12px;color:#6E80A0">Cliente</td><td style="padding:6px 12px">${data.clientName}</td></tr>
      <tr><td style="padding:6px 12px;color:#6E80A0">WhatsApp</td><td style="padding:6px 12px">${data.clientPhone}</td></tr>
      ${data.clientNotes ? `<tr><td style="padding:6px 12px;color:#6E80A0">Notas</td><td style="padding:6px 12px">${data.clientNotes}</td></tr>` : ''}
      <tr><td style="padding:6px 12px;color:#6E80A0">Precio estimado</td><td style="padding:6px 12px">₡${(data.svcPrice||0).toLocaleString()}</td></tr>
    </table>
    <p style="color:#6E80A0;font-size:12px">Reserva #${data.id} · Mon Ciel Studio</p>
  `;

  GmailApp.sendEmail(
    Session.getActiveUser().getEmail(), // Al dueño de la cuenta
    subject,
    'Revisar en HTML', // Fallback texto plano
    { htmlBody: body }
  );
}

// ══════════════════════════════════
// UTILIDADES
// ══════════════════════════════════

function timeToMin(timeStr) {
  const [h, m] = (timeStr || '09:00').split(':').map(Number);
  return h * 60 + m;
}

// TEST — ejecutar manualmente para verificar
function testBooking() {
  const sample = {
    id: 'test-' + Date.now(),
    date: 'Mon Sep 22 2026',
    time: '10:00',
    duration: 60,
    svcId: 'corte',
    svcName: 'Corte de cabello',
    svcPrice: 15000,
    svcIcon: '✂️',
    empId: 'marta',
    empName: 'Marta',
    clientName: 'Ana Prueba',
    clientPhone: '+506 8888 8888',
    clientEmail: 'ana@test.com',
    clientNotes: 'Prueba desde Apps Script',
  };
  const result = processBooking(sample);
  Logger.log('Resultado: ' + JSON.stringify(result));
}
