import { createError, getRouterParam, readBody } from 'h3'
import { requirePlatformEditor } from '../../../../utils/admin'
import { isUuid } from '../../../../../shared/domain/common/uuid'

interface Body { optionId?: unknown }

export default defineEventHandler(async (event) => {
  const { supabase } = await requirePlatformEditor(event)
  const questionId=getRouterParam(event,'id')
  if(!isUuid(questionId)) throw createError({statusCode:400,statusMessage:'Questão inválida.'})
  const body=(await readBody<Body>(event))??{}
  const optionId=typeof body.optionId==='string'?body.optionId:''
  if(!isUuid(optionId)) throw createError({statusCode:400,statusMessage:'Alternativa inválida.'})

  const {data:option,error:optionError}=await supabase.from('study_question_options').select('id').eq('id',optionId).eq('question_id',questionId).maybeSingle()
  if(optionError) throw createError({statusCode:503,statusMessage:'Não foi possível validar a alternativa.'})
  if(!option) throw createError({statusCode:400,statusMessage:'A alternativa não pertence à questão.'})

  const {data,error}=await supabase.from('study_question_answer_keys').upsert({question_id:questionId,correct_option_id:optionId}).select('question_id, correct_option_id, updated_at').single()
  if(error?.code==='23514') throw createError({statusCode:409,statusMessage:'Despublique a questão antes de alterar o gabarito.'})
  if(error) throw createError({statusCode:503,statusMessage:'Não foi possível salvar o gabarito.'})
  return { answer:data }
})
