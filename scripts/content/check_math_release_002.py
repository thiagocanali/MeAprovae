#!/usr/bin/env python3
"""Separate oracle: does not import the generator or connect to a database."""
from fractions import Fraction as F
from pathlib import Path
from itertools import product,permutations
from functools import reduce
from math import isqrt
from datetime import datetime,timedelta
from collections import Counter
import hashlib,json,statistics,unicodedata
ROOT=Path(__file__).resolve().parents[2]
raw=(ROOT/'content/releases/matematica-original-002.jsonl').read_bytes()
m=json.loads((ROOT/'content/releases/matematica-original-002.manifest.json').read_text())
qs=[json.loads(line) for line in raw.splitlines()]
assert hashlib.sha256(raw).hexdigest()==m['contentSha256']
assert len(qs)==m['questionCount']==100 and len(m['checks'])==100
assert m['reviewStatus']=='pending_human_review' and m['reviewer'] is None
checks={c['externalId']:c for c in m['checks']}
assert len(checks)==100 and len({c['family'] for c in checks.values()})==20
normalize=lambda s:' '.join(unicodedata.normalize('NFKC',s).lower().split())
old=[json.loads(line) for line in (ROOT/'content/releases/matematica-original-001.jsonl').read_text().splitlines()]
seen={normalize(q['statement']) for q in old}
for q in qs:
 assert q['externalId'] in checks and q['rights']=='original' and 'pendente' in q['rightsEvidence']
 assert normalize(q['statement']) not in seen;seen.add(normalize(q['statement']))
 c=checks[q['externalId']];p=c['parameters'];f=c['family']
 if f=='mediana':answer=statistics.median(p)
 elif f=='moda':answer=Counter(p).most_common(1)[0][0]
 elif f=='amplitude':answer=sorted(p)[-1]-sorted(p)[0]
 elif f=='desconto-inverso':answer=next(x for x in range(p[0],p[0]*2) if x*(100-p[1])==p[0]*100)
 elif f=='juros-compostos':
  answer=F(p[0])
  for _ in range(p[2]):answer+=answer*F(p[1],100)
 elif f=='area-trapezio':
  b,B,h=p;vertices=[(0,0),(B,0),(b,h),(0,h)]
  answer=F(abs(sum(vertices[i][0]*vertices[(i+1)%4][1]-vertices[(i+1)%4][0]*vertices[i][1] for i in range(4))),2)
 elif f=='area-triangulo':answer=F(sum(p[0] for _ in range(p[1])),2)
 elif f=='pitagoras':answer=isqrt(sum(v*v for v in p));assert answer**2==sum(v*v for v in p)
 elif f=='comprimento-circunferencia':answer=sum(p[0]*2 for _ in range(p[1]))
 elif f=='volume-cilindro':answer=sum(p[2]*p[0]*p[0] for _ in range(p[1]))
 elif f=='capacidade-litros':answer=F(p[0],10)*F(p[1],10)*F(p[2],10)
 elif f=='escala-mapa':answer=F(p[1],100000)*p[0]
 elif f=='duracao-horarios':
  date=datetime(2026,1,1);answer=((date+timedelta(minutes=p[1]))-(date+timedelta(minutes=p[0]))).seconds//60
 elif f=='senhas-repeticao':answer=sum(1 for _ in product(range(p[0]),repeat=p[1]))
 elif f=='cargos-distintos':answer=sum(1 for _ in permutations(range(p[0]),2))
 elif f=='probabilidade-complemento':answer=1-F(p[1],p[0])
 elif f=='contagem-multiplos':answer=sum(1 for n in range(1,p[0]+1) if n%p[1]==0)
 elif f=='lucro-unitario':answer=p[1]*p[2]-p[0]*p[2]
 elif f=='variacao-absoluta':answer=F(p[0],4)
 elif f=='potencias':answer=reduce(lambda x,y:x*y,[p[0]]*p[1],1)
 else:raise AssertionError(f)
 values=[F(v) for v in q['options']]
 assert len(set(values))==4 and values[q['correctOption']]==answer,(q['externalId'],answer,values)
 assert values.count(F(answer))==1
 assert len(q['distractorRationales'])==len(set(q['distractorRationales']))==3
assert set(checks)=={q['externalId'] for q in qs}
print(json.dumps({'status':'PASS','questions':100,'families':20,'answerPositions':dict(Counter(q['correctOption'] for q in qs)),'humanReview':'pending'}))
