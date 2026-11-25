#!/usr/bin/env python3
"""Original, deterministic practice. Never imports or publishes content."""
from fractions import Fraction as F
from pathlib import Path
from math import sqrt
import hashlib,json,statistics,argparse
ROOT=Path(__file__).resolve().parents[2]; RELEASE='matematica-original-002'; questions=[]; cases=[]
def num(x):
 x=F(x);return str(x.numerator) if x.denominator==1 else f'{x.numerator}/{x.denominator}'
def add(family,k,topic,statement,answer,explanation,parameters,wrong,errors):
 answer=F(answer); values=[answer]+[F(x) for x in wrong]
 assert len(set(values))==4,(family,k,values)
 correct=(len(questions)+k)%4; values.insert(correct,values.pop(0))
 ext=f'mat-original-002-{family}-{k+1:02d}'
 questions.append(dict(externalId=ext,subject='Raciocínio Lógico e Matemática',topic=topic,statement=statement,explanation=explanation,sourceLabel='Original Me Aprovaê — matemática 002 com assistência de IA',rights='original',rightsEvidence='Texto original com assistência de IA em 25/11/2026. Não extraído de prova externa. Conferência automática independente; revisão humana pendente.',difficulty='medium',difficultyReviewed=False,options=[num(x) for x in values],correctOption=correct,distractorRationales=errors))
 cases.append(dict(externalId=ext,family=family,parameters=parameters))
for k in range(5):
 a=3+k; seq=[a+8,a,a+4,a+2,a+6]
 add('mediana',k,'Estatística descritiva',f'Os tempos, em minutos, de cinco atendimentos foram {", ".join(map(str,seq))}. Qual é a mediana desses tempos?',a+4,f'Ordenando os tempos, obtém-se {sorted(seq)}. A mediana é o terceiro valor: {a+4} minutos.',seq,[a+2,a+6,a+8],['Seleciona o segundo valor ordenado.','Seleciona o quarto valor ordenado.','Usa o máximo, não a mediana.'])
 seq=[a,a+2,a,a+4,a+2,a,a+6]
 add('moda',k,'Estatística descritiva',f'Uma amostra apresenta os valores {", ".join(map(str,seq))}. Qual é a moda?',a,f'O valor {a} aparece três vezes; {a+2} aparece duas vezes e os demais uma vez. A moda é {a}.',seq,[a+2,a+4,a+6],['Escolhe a segunda maior frequência.','Confunde valor alto com frequência.','Escolhe o maior valor.'])
 seq=[12+k,30+2*k,18+k,9+k,24+k];ans=max(seq)-min(seq)
 add('amplitude',k,'Estatística descritiva',f'As quantidades diárias registradas foram {", ".join(map(str,seq))}. Qual é a amplitude total dessa amostra?',ans,f'Amplitude é máximo menos mínimo: {max(seq)} − {min(seq)} = {ans}.',seq,[max(seq),min(seq),ans+min(seq)+1],['Usa apenas o máximo.','Usa apenas o mínimo.','Não calcula a diferença entre os extremos.'])
 final=160+40*k; rate=20
 add('desconto-inverso',k,'Porcentagem',f'Após um desconto de {rate}%, um equipamento passou a custar R$ {final}. Qual era seu preço antes do desconto, em reais?',F(final*100,80),f'O preço final equivale a 80% do inicial. Assim, o inicial é {final} ÷ 0,8 = {num(F(final*100,80))} reais.',[final,rate],[F(final*120,100),F(final*80,100),final+20],['Acrescenta 20% sobre a base final, que é diferente da inicial.','Aplica um segundo desconto.','Confunde percentual com acréscimo fixo de 20 reais.'])
 principal=1000+200*k; rate=10;answer=F(principal*121,100)
 add('juros-compostos',k,'Matemática financeira',f'Um capital de R$ {principal} rende juros compostos de 10% ao período por dois períodos, sem movimentações. Qual é o montante, em reais?',answer,f'O montante é {principal} × 1,1 × 1,1 = {num(answer)}. No segundo período, os juros incidem também sobre os juros anteriores.',[principal,rate,2],[F(principal*120,100),F(principal*110,100),answer-principal],['Usa juros simples por dois períodos.','Considera somente um período.','Informa os juros, não o montante.'])
 b,B,h=4+k,10+k,6+2*k;answer=F((b+B)*h,2)
 add('area-trapezio',k,'Geometria plana',f'Um trapézio tem bases paralelas de {b} cm e {B} cm e altura perpendicular de {h} cm. Qual é sua área, em centímetros quadrados?',answer,f'A área é a média das bases vezes a altura: ({b} + {B}) × {h} ÷ 2 = {num(answer)} cm².',[b,B,h],[(b+B)*h,b*h,B*h],['Esquece de dividir a soma das bases por dois.','Usa somente a base menor.','Usa somente a base maior.'])
 base,height=8+2*k,5+k;answer=F(base*height,2)
 add('area-triangulo',k,'Geometria plana',f'Um triângulo tem base de {base} cm e altura perpendicular à base de {height} cm. Qual é sua área, em centímetros quadrados?',answer,f'A área é base × altura ÷ 2: {base} × {height} ÷ 2 = {num(answer)} cm².',[base,height],[base*height,base+height,base*height+height],['Usa a área de um retângulo.','Soma medidas lineares em vez de calcular área.','Acrescenta a altura à área do retângulo.'])
 factor=k+1;x,y,z=3*factor,4*factor,5*factor
 add('pitagoras',k,'Geometria plana',f'Um triângulo retângulo possui catetos de {x} cm e {y} cm. Qual é a medida da hipotenusa, em centímetros?',z,f'Pelo teorema de Pitágoras, h² = {x}² + {y}² = {z*z}; a raiz positiva é {z} cm.',[x,y],[x+y,y-x,x*y],['Soma os catetos.','Subtrai os catetos.','Multiplica os catetos.'])
 r=3+k
 add('comprimento-circunferencia',k,'Geometria plana',f'O raio de uma circunferência é {r} cm. Usando π = 3, qual é o comprimento dessa circunferência, em centímetros?',6*r,f'O comprimento é 2πr. Com π = 3: 2 × 3 × {r} = {6*r} cm.',[r,3],[3*r,3*r*r,2*r],['Esquece o fator dois.','Calcula área, não comprimento.','Usa o diâmetro sem multiplicar por π.'])
 r,h=3+k,5+k;answer=3*r*r*h
 add('volume-cilindro',k,'Geometria espacial',f'Um cilindro circular reto tem raio de {r} cm e altura de {h} cm. Usando π = 3, qual é seu volume, em centímetros cúbicos?',answer,f'O volume é πr²h: 3 × {r}² × {h} = {answer} cm³.',[r,h,3],[3*r*h,3*r*r,2*3*r*h],['Não eleva o raio ao quadrado.','Calcula somente a área da base.','Usa área lateral em vez de volume.'])
 length,width,height=40+10*k,20,30;answer=F(length*width*height,1000)
 add('capacidade-litros',k,'Grandezas e medidas',f'Um reservatório retangular tem dimensões internas de {length} cm, {width} cm e {height} cm. Sabendo que 1 litro corresponde a 1.000 cm³, qual é sua capacidade, em litros?',answer,f'O volume é {length} × {width} × {height} = {length*width*height} cm³. Dividindo por 1.000: {num(answer)} litros.',[length,width,height],[answer*10,answer*1000,answer/10],['Divide por 100 em vez de 1.000.','Não converte centímetros cúbicos em litros.','Divide por 10.000.'])
 cm,scale=4+k,50000;answer=F(cm*scale,100000)
 add('escala-mapa',k,'Grandezas e medidas',f'Um mapa tem escala 1:{scale}. Uma distância de {cm} cm no mapa corresponde a quantos quilômetros no terreno?',answer,f'Multiplica-se {cm} por {scale}, obtendo {cm*scale} cm reais. Como 1 km = 100.000 cm, a distância é {num(answer)} km.',[cm,scale],[answer*10,answer*100,answer/10],['Usa 10.000 cm por quilômetro.','Usa 1.000 cm por quilômetro.','Usa 1.000.000 cm por quilômetro.'])
 start,end=8*60+35+k,11*60+10+2*k;answer=end-start
 add('duracao-horarios',k,'Grandezas e medidas',f'Uma atividade começou às {start//60:02d}h{start%60:02d} e terminou às {end//60:02d}h{end%60:02d} do mesmo dia. Quantos minutos ela durou?',answer,f'Convertem-se os horários em minutos desde meia-noite: {end} − {start} = {answer} minutos.',[start,end],[answer+60,answer-60,answer+40],['Acrescenta uma hora indevida.','Desconta uma hora indevida.','Trata a passagem de hora como base decimal.'])
 choices,digits=4+k,3;answer=choices**digits
 add('senhas-repeticao',k,'Análise combinatória',f'Uma senha possui {digits} posições. Cada posição pode usar qualquer um de {choices} símbolos distintos, e repetições são permitidas. Quantas senhas podem ser formadas?',answer,f'Pelo princípio multiplicativo, são {choices} escolhas em cada uma das {digits} posições: {choices}³ = {answer}.',[choices,digits],[choices*digits,choices*(choices-1)*(choices-2),choices**2],['Soma os números de escolhas em vez de multiplicar.','Proíbe repetições apesar do enunciado.','Conta apenas duas posições.'])
 n=5+k;answer=n*(n-1)
 add('cargos-distintos',k,'Análise combinatória',f'Entre {n} pessoas, serão escolhidas uma presidente e uma vice-presidente, sem acúmulo de cargos. Quantas escolhas distintas de ocupantes dos dois cargos existem?',answer,f'Há {n} escolhas para presidência e {n-1} para vice: {n} × {n-1} = {answer}. A troca de cargos cria outra escolha.',[n],[F(answer,2),n*n,n+(n-1)],['Conta pares sem distinguir os cargos.','Permite a mesma pessoa nos dois cargos.','Soma as opções em vez de multiplicar.'])
 total,bad=10+2*k,2+k;answer=F(total-bad,total)
 add('probabilidade-complemento',k,'Probabilidade',f'Uma caixa contém {total} peças, das quais {bad} são defeituosas. Uma peça é escolhida ao acaso, com chances iguais. Qual é a probabilidade de ela não ser defeituosa?',answer,f'Existem {total-bad} peças sem defeito entre {total}. A probabilidade é {total-bad}/{total} = {num(answer)}.',[total,bad],[F(bad,total),F(total-bad,total-bad+1),F(total-bad,total+1)],['Calcula a probabilidade do evento oposto.','Altera indevidamente o total de peças.','Acrescenta uma peça inexistente ao total.'])
 n,r=20+4*k,3+k;answer=len([i for i in range(1,n+1) if i%r==0])
 add('contagem-multiplos',k,'Divisibilidade',f'Quantos números inteiros de 1 a {n}, inclusive, são múltiplos positivos de {r}?',answer,f'Os múltiplos são {r}, {2*r}, …, até {r*answer}. A contagem é a parte inteira de {n}/{r}: {answer}.',[n,r],[answer+1,answer-1,n-r],['Inclui zero, fora do intervalo.','Omite o último múltiplo válido.','Subtrai em vez de contar os múltiplos.'])
 cost,quantity=12+k,30+5*k; revenue=cost+4;answer=quantity*(revenue-cost)
 add('lucro-unitario',k,'Matemática financeira',f'Uma loja comprou {quantity} unidades por R$ {cost} cada e vendeu todas por R$ {revenue} cada, sem outros custos. Qual foi o lucro total, em reais?',answer,f'O lucro por unidade é {revenue} − {cost} = 4 reais. Para {quantity} unidades: 4 × {quantity} = {answer} reais.',[cost,revenue,quantity],[quantity*revenue,quantity*cost,revenue-cost],['Informa receita, sem descontar o custo.','Informa custo total, não lucro.','Informa lucro de uma unidade.'])
 val=40+20*k;rate=25;answer=F(val*rate,100)
 add('variacao-absoluta',k,'Porcentagem',f'Uma quantidade inicial de {val} unidades aumentou 25%. Qual foi somente o acréscimo, em unidades?',answer,f'O acréscimo é 25% de {val}: {val} ÷ 4 = {num(answer)} unidades. Não se pede o total final.',[val,rate],[val+answer,val-answer,answer*2],['Informa o total final.','Calcula uma redução.','Aplica 50%, não 25%.'])
 base,power=3+k,4;answer=base**power
 add('potencias',k,'Potenciação',f'Um processo começa com uma unidade. A cada ciclo, a quantidade total de unidades é multiplicada por {base}, sem perdas. Quantas unidades existem após quatro ciclos?',answer,f'São quatro multiplicações sucessivas pelo fator {base}: {base}⁴ = {answer}.',[base,power],[base*power,base**3,base**5],['Multiplica fator por número de ciclos.','Considera somente três ciclos.','Considera cinco ciclos.'])
assert len(questions)==100
raw=''.join(json.dumps(q,ensure_ascii=False,separators=(',',':'))+'\n' for q in questions).encode()
manifest=dict(release=RELEASE,subject='Raciocínio Lógico e Matemática',questionCount=100,familyCount=20,reviewStatus='pending_human_review',reviewer=None,contentSha256=hashlib.sha256(raw).hexdigest(),version=1,createdOn='2026-11-25',authoring='Conteúdo original com assistência de IA sob solicitação do proprietário.',difficultyStatus='suggested_not_reviewed',conceptualBasis='Definições matemáticas explicitadas nas resoluções; nenhum enunciado externo reproduzido.',checks=cases)
parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
expected={ROOT/'content/releases'/f'{RELEASE}.jsonl':raw,ROOT/'content/releases'/f'{RELEASE}.manifest.json':(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode()}
for path,body in expected.items():
 if args.check:assert path.read_bytes()==body, f'Regenerate {path.name}'
 else:path.write_bytes(body)
print(json.dumps({'questions':100,'families':20,'sha256':manifest['contentSha256']}))
