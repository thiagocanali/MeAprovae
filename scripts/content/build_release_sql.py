#!/usr/bin/env python3
"""Emit a reviewable SQL statement; never connects to a database."""
from pathlib import Path
import argparse
import base64
import hashlib
import json
import re

parser = argparse.ArgumentParser()
parser.add_argument('--notice-id', required=True)
parser.add_argument('--commit', required=True)
parser.add_argument('--output', required=True)
args = parser.parse_args()
if not re.fullmatch(r'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}', args.notice_id):
    parser.error('notice-id inválido')
if not re.fullmatch(r'[a-f0-9]{40}', args.commit):
    parser.error('commit deve ser o SHA completo de um commit revisado')
root = Path(__file__).resolve().parents[2]
raw = (root / 'content/releases/matematica-original-001.jsonl').read_bytes()
manifest_raw = (root / 'content/releases/matematica-original-001.manifest.json').read_bytes()
manifest = json.loads(manifest_raw)
if hashlib.sha256(raw).hexdigest() != manifest['contentSha256']:
    parser.error('hash divergente')
# Only base64, validated UUID/SHA and a fixed collection name enter SQL syntax.
body = base64.b64encode(raw).decode('ascii')
manifest_body = base64.b64encode(manifest_raw).decode('ascii')
query = f"""select public.install_original_question_release(
  'matematica-original-001', '{args.notice_id}'::uuid, '{args.commit}',
  convert_from(decode('{body}', 'base64'), 'UTF8'),
  convert_from(decode('{manifest_body}', 'base64'), 'UTF8')::jsonb
) as release;
"""
Path(args.output).write_text(query, encoding='utf-8')
print(json.dumps({'sqlFile': args.output, 'questions': manifest['questionCount'], 'sha256': manifest['contentSha256']}))
