import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const auth = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);
auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
const calendar = google.calendar({ version: 'v3', auth });

// --- GET (Mantido igual) ---
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get('view') || 'day';
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const type = searchParams.get('type');

  let timeMin = new Date();
  let timeMax = new Date();

  if (start && end) {
      timeMin = new Date(start);
      timeMax = new Date(end);
      timeMax.setDate(timeMax.getDate() + 1);
      timeMax.setUTCHours(4, 0, 0, 0);
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

  const fields = type === 'report'
      ? 'items(id,summary,attendees,start,created)'
      : 'items(id,summary,description,attendees,start,created)';

  try {
      const response = await calendar.events.list({
          calendarId: process.env.CALENDAR_ID_ATIVACOES,
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 2500,
          fields: fields,
      });

      const tickets = (response.data.items || []).map(event => {
          const summary = event.summary || 'Sem Título';
          let status = 'A FAZER';

          if (summary.includes('🚨') || summary.toUpperCase().includes('NOSHOW')) status = 'NOSHOW';
          else if (summary.toUpperCase().includes('OK') || summary.toUpperCase().includes('FINALIZADO')) status = 'FINALIZADO';

          return {
              id: event.id,
              summary: summary,
              description: event.description || '',
              attendees: event.attendees || [],
              start: event.start.dateTime || event.start.date,
              created: event.created,
              status: status
          };
      });

      return NextResponse.json(tickets);
  } catch (e) {
      console.error("Erro API Google:", e);
      return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// --- PATCH (Mantido igual) ---
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

// --- POST CORRIGIDO (Fuso Horário Adicionado) ---
export async function POST(request) {
  const body = await request.json();
  
  try {
    // Validação básica
    if (!body.start || !body.end) {
      throw new Error("Datas de início e fim são obrigatórias.");
    }

    const event = {
      summary: body.summary, 
      description: body.description, 
      start: { 
        dateTime: body.start, // Ex: "2025-02-06T09:00:00"
        timeZone: 'America/Sao_Paulo' // IMPORTANTE: Define o fuso BRT
      }, 
      end: { 
        dateTime: body.end, 
        timeZone: 'America/Sao_Paulo' // IMPORTANTE: Define o fuso BRT
      },     
      attendees: body.attendees || [],
    };

    const response = await calendar.events.insert({
      calendarId: process.env.CALENDAR_ID_ATIVACOES,
      requestBody: event, // Google V3 usa requestBody, não resource
    });

    return NextResponse.json(response.data);
  } catch (e) {
    console.error("Erro ao criar evento:", e); // Isso vai aparecer no seu terminal do VSCode
    return NextResponse.json({ error: e.message, details: e }, { status: 500 });
  }
}