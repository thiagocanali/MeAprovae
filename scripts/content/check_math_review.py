#!/usr/bin/env python3
"""Check editorial proposals against the independent oracle and immutable release."""
from fractions import Fraction
from pathlib import Path
import hashlib
import json
from check_math_release import oracle

ROOT = Path(__file__).resolve().parents[2]
raw = (ROOT / 'content/releases/matematica-original-001.jsonl').read_bytes()
original = {q['externalId']: q for q in map(json.loads, raw.decode().splitlines())}
manifest = json.loads((ROOT / 'content/releases/matematica-original-001.manifest.json').read_text(encoding='utf-8'))
cases = {case['externalId']: case for case in manifest['checks']}
review = json.loads((ROOT / 'content/reviews/matematica-2026-11-21.proposals.json').read_text(encoding='utf-8'))
assert review['kind'] == 'editorial_review_proposals_not_import'
assert review['readyForPublication'] is False and review['humanReviewer'] is None and review['rightsReview'] == 'pending'
assert review['sourceSha256'] == manifest['contentSha256'] == hashlib.sha256(raw).hexdigest()
entries = review['entries']
assert len(entries) == len({e['externalId'] for e in entries}) == 100
assert {e['externalId'] for e in entries} == set(original)
families, topics = set(), set()
integer_counts = {'fracao-quantidade', 'combinacoes', 'permutacao-bloco', 'mmc-periodos', 'mdc-kits', 'sistema-soma-diferenca', 'conjuntos', 'logica-atribuicoes'}
for e in entries:
    q, case = original[e['externalId']], cases[e['externalId']]
    families.add(e['family']); topics.add(e['topic'])
    assert e['family'] == case['family'] and e['topic'] == q['topic'] and e['statement'] == q['statement']
    assert e['existingOptions'] == q['options'] and e['correctOption'] == q['correctOption']
    assert e['reviewStatus'] == 'pending_human_review' and e['difficultyReviewed'] is False
    assert e['action'] == 'review_proposal_only'
    options = e['proposedOptions']
    values = [Fraction(o['content']) for o in options]
    expected = Fraction(oracle(case['family'], case['parameters']))
    assert len(values) == len(set(values)) == 4 and all(v >= 0 for v in values), e['externalId']
    assert values[e['correctOption']] == expected and values.count(expected) == 1, e['externalId']
    assert [o['isCorrect'] for o in options] == [i == e['correctOption'] for i in range(4)]
    reasons = [o['misconception'] for o in options if not o['isCorrect']]
    assert len(set(reasons)) == 3 and all(isinstance(reason, str) and len(reason) > 25 for reason in reasons)
    if e['family'] in integer_counts: assert all(v.denominator == 1 for v in values), e['externalId']
    if e['family'] == 'probabilidade-sem-reposicao': assert all(0 <= v <= 1 for v in values)
assert review['summary'] == {'questions': 100, 'families': len(families), 'topics': len(topics), 'proposedDistractors': 300}
print(json.dumps({'status': 'PASS', **review['summary'], 'humanReview': 'pending'}))
