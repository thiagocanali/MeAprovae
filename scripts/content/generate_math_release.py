#!/usr/bin/env python3
"""Deterministic original practice questions. Does not connect to any database."""
from fractions import Fraction
from math import comb, factorial, gcd, lcm
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / 'content/releases'
RELEASE = 'matematica-original-001'
SUBJECT = 'Raciocínio Lógico e Matemática'
questions, checks = [], []
TOPICS = {
    'percentuais-sucessivos': 'Porcentagem', 'produtividade-inversa': 'Regra de três',
    'fracao-quantidade': 'Frações e operações', 'media-valor-ausente': 'Médias', 'media-ponderada': 'Médias',
    'juros-simples': 'Matemática financeira', 'probabilidade-sem-reposicao': 'Probabilidade',
    'combinacoes': 'Análise combinatória', 'permutacao-bloco': 'Análise combinatória',
    'mmc-periodos': 'Divisibilidade', 'mdc-kits': 'Divisibilidade',
    'progressao-aritmetica': 'Sequências numéricas', 'progressao-geometrica': 'Sequências numéricas',
    'equacao-tarifa': 'Equações e sistemas', 'sistema-soma-diferenca': 'Equações e sistemas',
    'area-composta': 'Geometria plana', 'velocidade-media': 'Grandezas e medidas',
    'conjuntos': 'Teoria dos conjuntos', 'logica-atribuicoes': 'Lógica proposicional',
    'divisao-proporcional': 'Razão e proporção',
}


def number(value):
    value = Fraction(value)
    return str(value.numerator) if value.denominator == 1 else f'{value.numerator}/{value.denominator}'


def add(family, variant, statement, correct, explanation, parameters, difficulty='medium', distractors=None):
    correct = Fraction(correct)
    if distractors is None:
        step = Fraction(1) if correct.denominator == 1 else Fraction(1, correct.denominator * 2)
        distractors = [correct - step, correct + step, correct + 2 * step]
    values = [correct] + [Fraction(value) for value in distractors]
    assert len(set(values)) == 4, (family, values)
    position = (len(questions) + variant) % 4
    values.insert(position, values.pop(0))
    external_id = f'mat-original-001-{family}-{variant + 1:02d}'
    questions.append({
        'externalId': external_id, 'subject': SUBJECT, 'topic': TOPICS[family], 'statement': statement,
        'explanation': explanation + ' As demais alternativas não correspondem ao resultado desse cálculo.',
        'sourceLabel': 'Original Me Aprovaê — matemática com assistência de IA',
        'rights': 'original',
        'rightsEvidence': 'Texto original elaborado com assistência de IA em 11/11/2026. Cálculos conferidos automaticamente; revisão humana pendente. Não atribuído a banca ou prova real.',
        'difficulty': difficulty, 'options': [number(value) for value in values], 'correctOption': position,
    })
    checks.append({'externalId': external_id, 'family': family, 'parameters': parameters})


for k in range(5):
    base, increase, decrease = 500 + 100 * k, 10 + 5 * k, 20
    result = Fraction(base * (100 + increase) * (100 - decrease), 10000)
    add('percentuais-sucessivos', k,
        f'Um produto de R$ {base} recebe aumento de {increase}% e, depois, desconto de {decrease}% sobre o preço já aumentado. Qual é o preço final, em reais?', result,
        f'Aplicam-se os fatores sucessivos: {base} × {number(Fraction(100 + increase, 100))} × 4/5 = {number(result)} reais. Somar as taxas ignora que o desconto incide sobre uma base diferente.',
        [base, increase, decrease])

    workers, days, more = 4 + k, 6 * (k + 1), 3 * (4 + k)
    result = Fraction(workers * days, more)
    add('produtividade-inversa', k,
        f'Uma equipe de {workers} trabalhadores conclui um serviço em {days} dias. Mantidas a produtividade individual, a jornada diária e as condições de trabalho, quantos dias uma equipe de {more} trabalhadores levará para fazer o mesmo serviço?', result,
        f'O serviço exige {workers} × {days} = {workers * days} trabalhador-dias. Dividindo por {more} trabalhadores, obtêm-se {number(result)} dias.',
        [workers, days, more])

    numerator, denominator = k + 2, k + 5
    total = denominator * 24
    result = Fraction(total * numerator, denominator)
    add('fracao-quantidade', k,
        f'Um arquivo tem {total} processos, dos quais {numerator}/{denominator} já foram digitalizados. Quantos processos já foram digitalizados?', result,
        f'Divide-se {total} por {denominator} e multiplica-se por {numerator}: {total}/{denominator} × {numerator} = {number(result)}.',
        [total, numerator, denominator], 'easy')

    average, known = 14 + k, [10 + k, 12 + k, 16 + k]
    result = 4 * average - sum(known)
    add('media-valor-ausente', k,
        f'A média aritmética de quatro valores é {average}. Três deles são {known[0]}, {known[1]} e {known[2]}. Qual é o quarto valor?', result,
        f'A soma necessária é 4 × {average} = {4 * average}. Subtraindo os três valores conhecidos, resulta {4 * average} − {sum(known)} = {result}.',
        [average, *known])

    a, b, wa, wb = 6 + k, 12 + k, 2, 3
    result = Fraction(a * wa + b * wb, wa + wb)
    add('media-ponderada', k,
        f'Em uma seleção, a nota {a} tem peso {wa} e a nota {b} tem peso {wb}. Qual é a média ponderada? Expresse o resultado como número inteiro ou fração irredutível.', result,
        f'A soma ponderada é {a} × {wa} + {b} × {wb} = {a * wa + b * wb}; a soma dos pesos é {wa + wb}. A média é {number(result)}.',
        [a, b, wa, wb])

    capital, rate, months = 1000 + 500 * k, 2 + k, 3 + k
    result = Fraction(capital * rate * months, 100)
    add('juros-simples', k,
        f'Um capital de R$ {capital} é aplicado a juros simples de {rate}% ao mês por {months} meses. Qual é apenas o valor dos juros, em reais, sem incluir o capital inicial?', result,
        f'Em juros simples, J = C × i × t. Logo, J = {capital} × {rate}/100 × {months} = {number(result)} reais. O montante seria o capital mais esses juros.',
        [capital, rate, months], distractors=[result + capital, Fraction(capital * rate, 100), result * 2])

    red, blue = 3 + k, 4 + k
    result = Fraction(comb(red, 2), comb(red + blue, 2))
    add('probabilidade-sem-reposicao', k,
        f'Uma urna contém {red} bolas vermelhas e {blue} azuis, indistinguíveis ao tato. Duas bolas são retiradas ao acaso, sem reposição. Qual é a probabilidade de ambas serem vermelhas? Use fração irredutível.', result,
        f'A probabilidade é {red}/{red + blue} × {red - 1}/{red + blue - 1} = {number(result)}. A segunda retirada tem uma bola a menos e, no evento considerado, uma vermelha a menos.',
        [red, blue], distractors=[Fraction(red, red + blue), Fraction(red * (red - 1), (red + blue) ** 2), Fraction(red * (red - 1), (red + blue - 1) ** 2)])

    n = 5 + k
    result = comb(n, 2)
    add('combinacoes', k,
        f'Uma comissão de duas pessoas será escolhida entre {n} candidatos distintos. Não existem cargos diferentes dentro da comissão e a ordem da escolha não importa. Quantas comissões são possíveis?', result,
        f'Escolhem-se dois candidatos sem ordem: C({n}, 2) = {n} × {n - 1}/2 = {result}. Dividir por 2 evita contar cada dupla duas vezes.',
        [n])

    n = 5 + k
    result = 2 * factorial(n - 1)
    add('permutacao-bloco', k,
        f'{n} pessoas distintas formarão uma fila. Duas pessoas previamente identificadas, Ana e Bia, devem ficar lado a lado, em qualquer ordem entre si. Quantas filas diferentes atendem à condição?', result,
        f'Ana e Bia formam um bloco. Há {n - 1} unidades para ordenar, em ({n - 1})! maneiras, e duas ordens internas para o bloco. Total: 2 × ({n - 1})! = {result}.',
        [n])

    a, b = [(6, 8), (8, 12), (9, 15), (10, 14), (12, 18)][k]
    result = lcm(a, b)
    add('mmc-periodos', k,
        f'Dois avisos automáticos são emitidos, respectivamente, a cada {a} e {b} minutos, com períodos constantes. Ambos foram emitidos juntos agora. Após quantos minutos ocorrerá a próxima emissão simultânea?', result,
        f'Procura-se o menor múltiplo positivo comum a {a} e {b}. O MMC({a}, {b}) é {result}; portanto, o próximo encontro ocorre em {result} minutos.',
        [a, b], 'easy')

    a, b = [(24, 36), (30, 45), (40, 60), (42, 70), (48, 72)][k]
    result = gcd(a, b)
    add('mdc-kits', k,
        f'Há {a} lápis e {b} canetas para distribuir em kits idênticos, todos contendo lápis e canetas, sem sobrar material. Qual é o maior número de kits que se pode formar?', result,
        f'O número de kits deve dividir {a} e {b}. O maior divisor comum é MDC({a}, {b}) = {result}; cada kit recebe {a // result} lápis e {b // result} canetas.',
        [a, b], 'easy')

    first, difference, n = 3 + k, 2 + k, 8 + k
    result = first + (n - 1) * difference
    add('progressao-aritmetica', k,
        f'Uma progressão aritmética tem primeiro termo {first} e razão {difference}. Qual é o {n}º termo?', result,
        f'Em uma PA, aₙ = a₁ + (n − 1)r. Assim, a_{n} = {first} + {n - 1} × {difference} = {result}.',
        [first, difference, n], 'easy')

    first, ratio, n = 2 + k, 2, 4 + k
    result = first * ratio ** (n - 1)
    add('progressao-geometrica', k,
        f'Uma progressão geométrica tem primeiro termo {first} e razão {ratio}. Qual é o {n}º termo?', result,
        f'Em uma PG, aₙ = a₁ × q^(n − 1). Portanto, a_{n} = {first} × {ratio}^{n - 1} = {result}.',
        [first, ratio, n])

    fee, rate, distance = 8 + k, 3 + k, 4 + k
    total = fee + rate * distance
    add('equacao-tarifa', k,
        f'Uma corrida custa uma taxa fixa de R$ {fee}, acrescida de R$ {rate} por quilômetro percorrido, sem outros encargos. Se a corrida custou R$ {total}, quantos quilômetros foram percorridos?', distance,
        f'Se x é a distância, {fee} + {rate}x = {total}. Logo, x = ({total} − {fee})/{rate} = {distance} km.',
        [fee, rate, total], 'easy')

    small, big = 8 + k, 12 + 2 * k
    total, difference = small + big, big - small
    add('sistema-soma-diferenca', k,
        f'Dois setores têm juntos {total} servidores. O setor A tem {difference} servidores a mais que o setor B. Quantos servidores há no setor A?', big,
        f'As equações são A + B = {total} e A − B = {difference}. Somando-as, 2A = {total + difference}; portanto, A = {big}.',
        [total, difference])

    length, width, hole_l, hole_w = 12 + 2 * k, 8 + k, 4 + k, 2 + k
    result = length * width - hole_l * hole_w
    add('area-composta', k,
        f'Um terreno retangular mede {length} m por {width} m. Dentro dele, uma área retangular de {hole_l} m por {hole_w} m será reservada a um jardim. Qual é a área restante do terreno, em metros quadrados?', result,
        f'A área total é {length} × {width} = {length * width} m². O jardim ocupa {hole_l} × {hole_w} = {hole_l * hole_w} m². Restam {result} m².',
        [length, width, hole_l, hole_w])

    v1 = [30, 36, 45, 54, 60][k]
    v2 = 2 * v1
    result = Fraction(2 * v1 * v2, v1 + v2)
    add('velocidade-media', k,
        f'Um veículo percorre um trecho de ida a {v1} km/h e retorna pelo mesmo trecho a {v2} km/h, sempre com velocidades constantes e sem paradas. Qual é a velocidade média em todo o percurso, em km/h?', result,
        f'As distâncias são iguais, mas os tempos são diferentes. A velocidade média é 2v₁v₂/(v₁ + v₂) = 2 × {v1} × {v2}/({v1} + {v2}) = {number(result)} km/h.',
        [v1, v2])

    total, a, b, both = 80 + 10 * k, 35 + 3 * k, 30 + 2 * k, 10 + k
    result = total - (a + b - both)
    add('conjuntos', k,
        f'Em um grupo de {total} pessoas, {a} estudam inglês, {b} estudam espanhol e {both} estudam ambos. Quantas pessoas não estudam nenhum desses dois idiomas?', result,
        f'A união tem {a} + {b} − {both} = {a + b - both} pessoas. Subtraindo-a do total, restam {total} − {a + b - both} = {result}.',
        [total, a, b, both])

    n = 3 + k
    result = 2 ** (n - 1) - 1
    clause = ' OU '.join(f'P{i}' for i in range(2, n + 1))
    add('logica-atribuicoes', k,
        f'Considere {n} proposições independentes P1, P2, ..., P{n}, cada uma com valor verdadeiro ou falso. Quantas atribuições de valores tornam verdadeira a expressão P1 E ({clause}), em que OU é inclusivo?', result,
        f'P1 precisa ser verdadeira. Para as outras {n - 1} proposições existem 2^{n - 1} atribuições; exclui-se apenas aquela em que todas são falsas. O total é 2^{n - 1} − 1 = {result}.',
        [n])

    a, b, multiplier = 3 + k, 2, 100 * (k + 1)
    total = (a + b) * multiplier
    result = a * multiplier
    add('divisao-proporcional', k,
        f'Uma verba de R$ {total} será dividida integralmente entre os setores A e B na razão {a}:{b}, respectivamente. Quantos reais caberão ao setor A?', result,
        f'Existem {a + b} partes. Cada uma vale {total}/{a + b} = {multiplier} reais. O setor A recebe {a} partes: {a} × {multiplier} = {result} reais.',
        [total, a, b], 'easy')

assert len(questions) == 100
DEST.mkdir(parents=True, exist_ok=True)
jsonl = ''.join(json.dumps(item, ensure_ascii=False, separators=(',', ':')) + '\n' for item in questions)
(DEST / f'{RELEASE}.jsonl').write_text(jsonl, encoding='utf-8')
manifest = {
    'release': RELEASE, 'version': 1, 'createdOn': '2026-11-11', 'questionCount': len(questions),
    'subject': SUBJECT, 'contentSha256': hashlib.sha256(jsonl.encode()).hexdigest(),
    'authoring': 'Conteúdo original elaborado por assistente de IA sob solicitação do proprietário do projeto.',
    'reviewStatus': 'pending_human_review', 'reviewer': None,
    'difficultyStatus': 'suggested_not_reviewed',
    'conceptualBasis': 'Definições e identidades matemáticas explicitadas nas resoluções; nenhuma questão copiada ou atribuída a prova real.',
    'verification': 'scripts/content/check_math_release.py; cálculos exatos com conferência independente por enumeração ou identidades alternativas.',
    'checks': checks,
}
(DEST / f'{RELEASE}.manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'release': RELEASE, 'questions': len(questions), 'sha256': manifest['contentSha256']}))
