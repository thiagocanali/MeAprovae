#!/usr/bin/env python3
"""Build review proposals only. No database writes or release modifications."""
from fractions import Fraction as F
from math import factorial, gcd, lcm
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parents[2]
RELEASE = ROOT / 'content/releases/matematica-original-001'
DEST = ROOT / 'content/reviews/matematica-2026-11-21.proposals.json'


def candidates(family, p):
    if family == 'percentuais-sucessivos':
        base, up, down = p
        return [(F(base * (100 + up - down), 100), 'Somar as taxas como se incidissem sobre a mesma base.'), (F(base * (100 + up), 100), 'Aplicar somente o aumento.'), (F(base * (100 - down), 100), 'Aplicar somente o desconto sobre o preço inicial.')]
    if family == 'produtividade-inversa':
        workers, days, new = p
        return [(F(days * new, workers), 'Tratar a relação inversa como diretamente proporcional.'), (days, 'Manter o prazo sem considerar o aumento da equipe.'), (workers * days, 'Calcular trabalhador-dias sem dividir pela nova equipe.')]
    if family == 'fracao-quantidade':
        total, num, den = p
        return [(F(total, den), 'Dividir pelo denominador e esquecer o numerador.'), (total - num, 'Subtrair o numerador como quantidade absoluta, ignorando a fração.'), (total * num, 'Multiplicar pelo numerador sem dividir pelo denominador.')]
    if family == 'media-valor-ausente':
        average, *known = p
        return [(average, 'Supor que o valor ausente deve ser igual à média.'), (F(sum(known), 3), 'Calcular apenas a média dos três valores conhecidos.'), (3 * average - sum(known), 'Usar três valores no total em vez dos quatro do enunciado.')]
    if family == 'media-ponderada':
        a, b, wa, wb = p
        return [(F(a + b, 2), 'Ignorar os pesos e usar a média aritmética simples.'), (F(a * wa + b * wb, wa * wb), 'Dividir pelo produto dos pesos em vez da soma.'), (F(a * wb + b * wa, wa + wb), 'Trocar os pesos atribuídos às duas notas.')]
    if family == 'juros-simples':
        capital, rate, months = p
        interest = F(capital * rate * months, 100)
        return [(capital + interest, 'Responder o montante quando foram pedidos apenas os juros.'), (F(capital * rate, 100), 'Calcular os juros de um único mês.'), (capital * rate * months, 'Usar a taxa percentual sem dividir por cem.')]
    if family == 'probabilidade-sem-reposicao':
        red, blue = p
        total = red + blue
        return [(F(red, total), 'Considerar somente a primeira retirada.'), (F(red * red, total * total), 'Tratar as retiradas como se houvesse reposição.'), (F(red * (red - 1), total * total), 'Reduzir as vermelhas, mas manter o total inicial na segunda retirada.')]
    if family == 'combinacoes':
        n, = p
        return [(n * (n - 1), 'Contar a ordem da dupla, embora os cargos não sejam distintos.'), (n * n, 'Permitir repetição e considerar a ordem.'), (n * (n + 1) // 2, 'Contar combinações com repetição, incluindo a pessoa consigo mesma.')]
    if family == 'permutacao-bloco':
        n, = p
        return [(factorial(n), 'Ignorar a condição de adjacência.'), (factorial(n - 1), 'Contar o bloco sem considerar suas duas ordens internas.'), (2 * factorial(n - 2), 'Tratar o bloco como se não ocupasse uma posição na fila.')]
    if family == 'mmc-periodos':
        a, b = p
        return [(a * b, 'Multiplicar os períodos sem retirar os fatores comuns.'), (gcd(a, b), 'Confundir mínimo múltiplo comum com máximo divisor comum.'), (max(a, b), 'Escolher o maior período sem verificar se é múltiplo do outro.')]
    if family == 'mdc-kits':
        a, b = p
        return [(lcm(a, b), 'Confundir a divisão em kits com o cálculo de múltiplos comuns.'), (min(a, b), 'Usar a menor quantidade de materiais sem verificar a divisibilidade da outra.'), (a + b, 'Contar unidades de material em vez de kits idênticos.')]
    if family == 'progressao-aritmetica':
        first, difference, n = p
        return [(first + n * difference, 'Aplicar n incrementos em vez de n menos um.'), (first + (n - 2) * difference, 'Parar um incremento antes do termo solicitado.'), (n * difference, 'Multiplicar índice e razão, ignorando o primeiro termo.')]
    if family == 'progressao-geometrica':
        first, ratio, n = p
        return [(first * ratio ** n, 'Usar expoente n em vez de n menos um.'), (first * (n - 1) * ratio, 'Trocar a potência por multiplicação linear.'), (ratio ** (n - 1), 'Omitir o fator correspondente ao primeiro termo.')]
    if family == 'equacao-tarifa':
        fee, rate, total = p
        return [(F(total, rate), 'Dividir o preço total pela tarifa variável sem retirar a taxa fixa.'), (F(total + fee, rate), 'Somar a taxa fixa ao preço total em vez de subtraí-la.'), (total - fee, 'Retirar a taxa fixa e esquecer de dividir pela tarifa por quilômetro.')]
    if family == 'sistema-soma-diferenca':
        total, difference = p
        return [(F(total - difference, 2), 'Responder a quantidade do setor B em vez do setor A.'), (total, 'Responder o total dos dois setores em vez da quantidade de A.'), (total + difference, 'Somar as equações sem dividir o resultado por dois.')]
    if family == 'area-composta':
        length, width, hole_l, hole_w = p
        return [(length * width, 'Responder a área total sem retirar o jardim.'), (length * width + hole_l * hole_w, 'Somar a área do jardim em vez de subtraí-la.'), (length * width - 2 * (hole_l + hole_w), 'Subtrair o perímetro do jardim no lugar de sua área.')]
    if family == 'velocidade-media':
        a, b = p
        return [(F(a + b, 2), 'Usar média aritmética apesar dos tempos diferentes.'), (a + b, 'Somar velocidades em vez de dividir distância total por tempo total.'), (F(a * b, a + b), 'Considerar apenas uma das distâncias no numerador da média.')]
    if family == 'conjuntos':
        total, a, b, both = p
        return [(total - a - b, 'Subtrair os dois grupos sem compensar a interseção contada duas vezes.'), (total - a - b - both, 'Subtrair novamente a interseção em vez de compensá-la.'), (a + b - both, 'Responder o tamanho da união em vez de seu complemento.')]
    if family == 'logica-atribuicoes':
        n, = p
        return [(2 ** (n - 1), 'Não excluir o caso em que todas as proposições do OU são falsas.'), (2 ** n - 1, 'Ignorar a exigência de P1 verdadeira.'), (n - 1, 'Exigir exatamente uma das proposições do OU verdadeira, em vez de ao menos uma.')]
    if family == 'divisao-proporcional':
        total, a, b = p
        return [(F(total, 2), 'Dividir igualmente em vez de respeitar a razão.'), (F(total * a, b), 'Aplicar a razão a:b diretamente ao total em vez de usar a soma das partes.'), (F(total * b, a + b), 'Responder a parcela do setor B no lugar da parcela de A.')]
    raise ValueError(f'Família sem proposta: {family}')


def number(value):
    value = F(value)
    return str(value.numerator) if value.denominator == 1 else f'{value.numerator}/{value.denominator}'


def build():
    raw = RELEASE.with_suffix('.jsonl').read_bytes()
    manifest = json.loads(RELEASE.with_suffix('.manifest.json').read_text(encoding='utf-8'))
    assert hashlib.sha256(raw).hexdigest() == manifest['contentSha256']
    cases = {case['externalId']: case for case in manifest['checks']}
    entries = []
    for q in map(json.loads, raw.decode().splitlines()):
        case = cases[q['externalId']]
        correct = F(q['options'][q['correctOption']])
        wrong = [(F(value), reason) for value, reason in candidates(case['family'], case['parameters'])]
        assert len({correct, *(value for value, _ in wrong)}) == 4, q['externalId']
        assert all(value >= 0 for value, _ in wrong), q['externalId']
        proposed = [{'content': number(value), 'isCorrect': False, 'misconception': reason} for value, reason in wrong]
        proposed.insert(q['correctOption'], {'content': number(correct), 'isCorrect': True, 'misconception': None})
        entries.append({
            'externalId': q['externalId'], 'family': case['family'], 'topic': q['topic'],
            'statement': q['statement'], 'existingOptions': q['options'], 'proposedOptions': proposed,
            'correctOption': q['correctOption'], 'resolution': q['explanation'].replace(' As demais alternativas não correspondem ao resultado desse cálculo.', ''),
            'reviewStatus': 'pending_human_review', 'difficultyReviewed': False,
            'action': 'review_proposal_only',
        })
    return {
        'kind': 'editorial_review_proposals_not_import', 'createdOn': '2026-11-21',
        'release': manifest['release'], 'sourceSha256': manifest['contentSha256'],
        'authoring': 'Propostas elaboradas com assistência de IA; não constituem revisão humana.',
        'readyForPublication': False, 'humanReviewer': None, 'rightsReview': 'pending',
        'summary': {'questions': len(entries), 'families': len(set(e['family'] for e in entries)), 'topics': len(set(e['topic'] for e in entries)), 'proposedDistractors': 3 * len(entries)},
        'entries': entries,
    }


if __name__ == '__main__':
    payload = build()
    DEST.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(json.dumps(payload['summary'], ensure_ascii=False))
