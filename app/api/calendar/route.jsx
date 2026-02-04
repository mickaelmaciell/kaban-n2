import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const auth = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);
auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
const calendar = google.calendar({ version: 'v3', auth });

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get('view') || 'day';
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  let timeMin = new Date();
  let timeMax = new Date();

  if (start && end) {
    timeMin = new Date(start);
    timeMax = new Date(new Date(end).setHours(23, 59, 59));
  } else {
    timeMin.setHours(0, 0, 0, 0);
    if (view === 'week') {
      const first = timeMin.getDate() - timeMin.getDay();
      timeMin.setDate(first);
      timeMax = new Date(timeMin);
      timeMax.setDate(timeMax.getDate() + 6);
    } else if (view === 'month') {
      timeMin.setDate(1);
      timeMax = new Date(timeMin.getFullYear(), timeMin.getMonth() + 1, 0);
    }
    timeMax.setHours(23, 59, 59);
  }

  try {
    const response = await calendar.events.list({
      calendarId: process.env.CALENDAR_ID_ATIVACOES,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const tickets = (response.data.items || []).map(event => {
      const summary = event.summary || 'Sem Título';
      let status = 'A FAZER';
      
      // Lógica de identificação de colunas por prefixo
      if (summary.toUpperCase().includes('ATENDENDO')) status = 'ATENDENDO';
      else if (summary.includes('🚨') || summary.toUpperCase().includes('NOSHOW')) status = 'NOSHOW';
      else if (summary.toUpperCase().includes('OK') || summary.toUpperCase().includes('FINALIZADO')) status = 'FINALIZADO';

      return {
        id: event.id,
        // Limpa os prefixos para mostrar apenas o nome limpo no card
        summary: summary.replace(/ATENDENDO|NOSHOW|OK|FINALIZADO|🚨| - /gi, '').trim(),
        description: event.description || '',
        attendees: event.attendees || [],
        start: event.start.dateTime || event.start.date,
        status: status
      };
    });

    return NextResponse.json(tickets);
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function PATCH(request) {
  const body = await request.json();
  try {
    await calendar.events.patch({
      calendarId: process.env.CALENDAR_ID_ATIVACOES,
      eventId: body.id,
      requestBody: body.update
    });
    return NextResponse.json({ success: true });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}