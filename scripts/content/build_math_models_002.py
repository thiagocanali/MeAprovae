#!/usr/bin/env python3
"""Append draft model versions using a verified release-item mapping; no DB connection."""
from pathlib import Path
from collections import defaultdict
import argparse,json,uuid
root=Path(__file__).resolve().parents[2]
p=argparse.ArgumentParser();p.add_argument('--mapping',required=True);p.add_argument('--output',required=True);p.add_argument('--provenance-output',required=True);args=p.parse_args()
m=json.loads((root/'content/releases/matematica-original-002.manifest.json').read_text());mapping=json.loads(Path(args.mapping).read_text())
assert mapping['release']=='matematica-original-002' and mapping['contentSha256']==m['contentSha256']
subject=str(uuid.UUID(mapping['subjectId']));ids={item['externalId']:str(uuid.UUID(item['questionId'])) for item in mapping['items']}
assert len(ids)==len(set(ids.values()))==len(m['checks'])==100 and set(ids)=={item['externalId'] for item in m['checks']}
groups=defaultdict(list)
for item in m['checks']:groups[item['family']].append(item['externalId'])
names=['Mediana','Moda','Amplitude','Desconto inverso','Juros compostos','Área do trapézio','Área do triângulo','Teorema de Pitágoras','Comprimento da circunferência','Volume do cilindro','Capacidade em litros','Escala de mapas','Duração entre horários','Senhas com repetição','Ocupação de cargos distintos','Probabilidade complementar','Contagem de múltiplos','Lucro unitário e total','Variação absoluta','Potências']
assert len(groups)==len(names)==20
output=Path(args.output);catalog=json.loads(output.read_text()) if output.exists() else dict(schemaVersion=1,models=[])
provenance=[]
for (family,externals),name in zip(groups.items(),names):
 model_id=str(uuid.uuid5(uuid.NAMESPACE_URL,'https://meaprovae.vercel.app/exam-models/matematica-original-002/'+family))
 questions=[ids[external] for external in externals]
 model=dict(modelId=model_id,version=1,title='Prática autoral — '+name,description=f'Cinco variantes autorais de {name.lower()}, com composição fixa. Caderno em revisão, sem publicação nem equivalência a prova oficial.',kind='subject-foundations',status='draft',durationMinutes=len(questions)*6,questionIds=questions,allocation=[dict(subjectId=subject,questionIds=questions)],reviewedBy=None,reviewedAt=None,rightsChecked=False,publishedAt=None)
 existing=next((x for x in catalog['models'] if x['modelId']==model_id and x['version']==1),None)
 if existing is not None:assert existing==model,'Existing model version must not be overwritten'
 else:catalog['models'].append(model)
 provenance.append(dict(modelId=model_id,family=family,externalIds=externals,questionIds=questions))
output.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
Path(args.provenance_output).write_text(json.dumps(dict(release=m['release'],contentSha256=m['contentSha256'],subjectId=subject,models=provenance),ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'draftModels':20,'questions':100,'publishedModels':0}))
