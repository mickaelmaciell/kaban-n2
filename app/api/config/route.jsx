import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

// Inicializa o Redis com as chaves que você colocou no .env.local
const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// CONFIGURAÇÃO PADRÃO (Usada se o banco estiver vazio na primeira vez)
const DEFAULT_CONFIG = {
  tecnicos: [
    'mickael.maciel@cardapioweb.com',
    'samara.patricio@cardapioweb.com',
    'thalysson.lucas@cardapioweb.com',
    'carlos.isaac@cardapioweb.com',
    'gustavo.ribeiro@cardapioweb.com',
    'nicolas.alves@cardapioweb.com'
  ],
  filtros: ['ocupado', '🟣', '[sup]', 'sem ativação', 'almoço']
};

export async function GET() {
  try {
    // Busca os dados no Redis. Se retornar null, usa o padrão.
    const tecnicos = await redis.get('config:tecnicos');
    const filtros = await redis.get('config:filtros');

    return NextResponse.json({
      tecnicos: tecnicos || DEFAULT_CONFIG.tecnicos,
      filtros: filtros || DEFAULT_CONFIG.filtros
    });
  } catch (error) {
    console.error("Erro Redis GET:", error);
    // Em caso de erro no banco, retorna o padrão para o sistema não quebrar
    return NextResponse.json(DEFAULT_CONFIG);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Salva no Redis (persiste para sempre)
    if (body.tecnicos) await redis.set('config:tecnicos', body.tecnicos);
    if (body.filtros) await redis.set('config:filtros', body.filtros);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro Redis POST:", error);
    return NextResponse.json({ error: 'Erro ao salvar configs' }, { status: 500 });
  }
}