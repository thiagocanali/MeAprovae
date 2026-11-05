import { createError, getRouterParam, readBody } from 'h3'
import { requirePlatformEditor } from '../../../../utils/admin'
import { isUuid } from '../../../../../shared/domain/common/uuid'

interface Option { id?: unknown; label?: unknown; content?: unknown; position?: unknown }
interface Body { options?: unknown }

export default defineEventHandler(async (event) => {
  const { supabase } = await requirePlatformEditor(event)
  const questionId=getRouterParam(event,'id')
  if(!isUuid(questionId)) throw createError({statusCode:400,statusMessage:'Questão inválida.'})
  const body=(await readBody<Body>(event))??{}
  if(!Array.isArray(body.options)||body.options.length<2||body.options.length>10) throw createError({statusCode:400,statusMessage:'A questão deve ter entre 2 e 10 alternativas.'})

  const options=body.options as Option[]
  const labels=options.map(o=>typeof o.label==='string'?o.label.trim().toUpperCase():'')
  if(new Set(labels).size!==labels.length||labels.some(l=>l.length<1||l.length>4)) throw createError({statusCode:400,statusMessage:'Rótulos de alternativas inválidos ou duplicados.'})
  const rows=options.map((o,i)=>({id:isUuid(typeof o.id==='string'?o.id:'')?o.id:undefined,question_id:questionId,option_label:labels[i],content:typeof o.content==='string'?o.content.trim():'',position:i+1}))
  if(rows.some(r=>r.content.length<1||r.content.length>5000)) throw createError({statusCode:400,statusMessage:'Conteúdo de alternativa inválido.'})

  const { data, error } = await supabase.rpc('set_question_options', {
    p_question_id: questionId,
    p_options: rows.map(({ id, ...row }) => ({
      option_label: row.option_label,
      content: row.content,
      position: row.position,
    })),
  })
  if (error?.code === 'P0002') throw createError({ statusCode: 404, statusMessage: 'Questão não encontrada.' })
  if (error?.code === '23514') throw createError({ statusCode: 409, statusMessage: 'Despublique a questão antes de alterar as alternativas.' })
  if (error?.code === '22023') throw createError({ statusCode: 400, statusMessage: 'Dados de alternativas inválidos.' })
  if (error) throw createError({ statusCode: 503, statusMessage: 'Não foi possível salvar as alternativas.' })
  return { options: data ?? [] }
})
