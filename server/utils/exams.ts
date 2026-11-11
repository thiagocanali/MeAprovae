import { createError, type H3Event } from 'h3'
import { createSupabaseServerClient, getAuthenticatedUser } from './supabase'
import type { ExamSession } from '../../shared/domain/questions/exam-session'

export async function examClient(event: H3Event) {
  if (!await getAuthenticatedUser(event)) throw createError({ statusCode: 401, statusMessage: 'Entre para acessar seus simulados.' })
  return createSupabaseServerClient(event)
}
export async function examRpc(event: H3Event, name: string, args: Record<string, unknown>): Promise<{ session: ExamSession }> {
  const client = await examClient(event)
  const { data, error } = await client.rpc(name, args)
  if (error?.code === 'P0002') throw createError({ statusCode: 404, statusMessage: 'Simulado não encontrado.' })
  if (error?.code === '22023') throw createError({ statusCode: 400, statusMessage: 'Configuração inválida ou questões publicadas insuficientes para este simulado.' })
  if (error?.code === '23514' || error?.code === '23505') throw createError({ statusCode: 409, statusMessage: 'Retome seu simulado em andamento. Respostas confirmadas não podem ser alteradas.' })
  if (error?.code === '42501') throw createError({ statusCode: 401, statusMessage: 'Sua sessão não permite acessar o simulado.' })
  if (error || !data) throw createError({ statusCode: 503, statusMessage: 'Não foi possível sincronizar seu simulado. Tente novamente.' })
  return { session: data as ExamSession }
}
