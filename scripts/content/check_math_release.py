#!/usr/bin/env python3
"""Independent arithmetic/content check; never imports the generator or writes data."""
from collections import Counter
from fractions import Fraction
from itertools import combinations, permutations, product
from pathlib import Path
import hashlib
import json
import sys
import unicodedata

ROOT = Path(__file__).resolve().parents[2]
RELEASE = ROOT / 'content/releases/matematica-original-001'


def oracle(family, p):
    if family == 'percentuais-sucessivos':
        base, up, down = p
        raised = Fraction(base) + sum(Fraction(base, 100) for _ in range(up))
        return raised - sum(raised / 100 for _ in range(down))
    if family == 'produtividade-inversa':
        workers, days, new_workers = p
        return next(d for d in range(1, workers * days + 1) if d * new_workers == workers * days)
    if family == 'fracao-quantidade':
        total, numerator, denominator = p
        return sum(Fraction(total, denominator) for _ in range(numerator))
    if family == 'media-valor-ausente':
        average, *known = p
        return next(x for x in range(1000) if Fraction(sum(known) + x, 4) == average)
    if family == 'media-ponderada':
        a, b, wa, wb = p
        expanded = [a] * wa + [b] * wb
        return Fraction(sum(expanded), len(expanded))
    if family == 'juros-simples':
        capital, rate, months = p
        return sum(Fraction(capital * rate, 100) for _ in range(months))
    if family == 'probabilidade-sem-reposicao':
        red, blue = p
        pairs = list(combinations(range(red + blue), 2))
        return Fraction(sum(a < red and b < red for a, b in pairs), len(pairs))
    if family == 'combinacoes':
        return sum(1 for _ in combinations(range(p[0]), 2))
    if family == 'permutacao-bloco':
        return sum(abs(order.index(0) - order.index(1)) == 1 for order in permutations(range(p[0])))
    if family == 'mmc-periodos':
        a, b = p
        return next(n for n in range(1, a * b + 1) if n % a == 0 and n % b == 0)
    if family == 'mdc-kits':
        a, b = p
        return max(n for n in range(1, min(a, b) + 1) if a % n == 0 and b % n == 0)
    if family == 'progressao-aritmetica':
        first, difference, n = p
        values = [first]
        for _ in range(n - 1):
            values.append(values[-1] + difference)
        return values[-1]
    if family == 'progressao-geometrica':
        first, ratio, n = p
        values = [first]
        for _ in range(n - 1):
            values.append(values[-1] * ratio)
        return values[-1]
    if family == 'equacao-tarifa':
        fee, rate, total = p
        return next(x for x in range(1000) if fee + sum(rate for _ in range(x)) == total)
    if family == 'sistema-soma-diferenca':
        total, difference = p
        return next(a for a in range(total + 1) if a - (total - a) == difference)
    if family == 'area-composta':
        length, width, hole_l, hole_w = p
        return sum(not (x < hole_l and y < hole_w) for x in range(length) for y in range(width))
    if family == 'velocidade-media':
        v1, v2 = p
        distance_each_way = v1 * v2
        time_out = Fraction(distance_each_way, v1)
        time_back = Fraction(distance_each_way, v2)
        return Fraction(2 * distance_each_way, time_out + time_back)
    if family == 'conjuntos':
        total, a, b, both = p
        english = set(range(a))
        spanish = set(range(a - both, a - both + b))
        return len(set(range(total)) - english - spanish)
    if family == 'logica-atribuicoes':
        return sum(values[0] and any(values[1:]) for values in product([False, True], repeat=p[0]))
    if family == 'divisao-proporcional':
        total, a, b = p
        unit_share = Fraction(total, len(['A'] * a + ['B'] * b))
        return sum(unit_share for _ in range(a))
    raise ValueError(f'Família desconhecida: {family}')


def main():
    raw = RELEASE.with_suffix('.jsonl').read_bytes()
    manifest = json.loads(RELEASE.with_suffix('.manifest.json').read_text())
    questions = [json.loads(line) for line in raw.decode().splitlines() if line.strip()]
    assert hashlib.sha256(raw).hexdigest() == manifest['contentSha256'], 'Hash divergente'
    assert len(questions) == manifest['questionCount'] == 100, 'Quantidade divergente'
    assert manifest['reviewStatus'] == 'pending_human_review' and manifest['reviewer'] is None
    cases = {case['externalId']: case for case in manifest['checks']}
    assert len(cases) == 100, 'Casos de conferência duplicados/ausentes'
    assert len({q['externalId'] for q in questions}) == 100, 'ID duplicado'
    normalized = [' '.join(unicodedata.normalize('NFKC', q['statement']).casefold().split()) for q in questions]
    assert len(set(normalized)) == 100, 'Enunciado duplicado'
    for line, q in enumerate(questions, 1):
        case = cases[q['externalId']]
        expected = Fraction(oracle(case['family'], case['parameters']))
        options = [Fraction(option) for option in q['options']]
        assert len(options) == len(set(options)) == 4, f'Linha {line}: alternativas não distintas'
        assert options[q['correctOption']] == expected, f'Linha {line}: gabarito incorreto'
        assert options.count(expected) == 1, f'Linha {line}: mais de uma resposta correta'
        assert q['rights'] == 'original' and 'IA' in q['rightsEvidence'] and 'pendente' in q['rightsEvidence']
        assert not any(key in q for key in ('examBoard', 'contest', 'sourceYear')), 'Atribuição oficial indevida'
        assert len(q['explanation']) >= 80, f'Linha {line}: explicação insuficiente'
    coverage = Counter(case['family'] for case in cases.values())
    assert len(coverage) == 20 and set(coverage.values()) == {5}, 'Cobertura divergente'
    print(json.dumps({'status': 'PASS', 'questions': len(questions), 'families': len(coverage), 'sha256': manifest['contentSha256'], 'humanReview': 'pending'}, ensure_ascii=False))


if __name__ == '__main__':
    try:
        main()
    except (AssertionError, ValueError, KeyError, OSError) as error:
        print(f'FAIL: {error}', file=sys.stderr)
        sys.exit(1)
