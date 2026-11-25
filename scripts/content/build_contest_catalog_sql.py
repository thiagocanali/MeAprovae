#!/usr/bin/env python3
"""Emit idempotent historical metadata only; no database connection."""
from pathlib import Path
import argparse,base64,json,uuid
root=Path(__file__).resolve().parents[2]
p=argparse.ArgumentParser();p.add_argument('--output',required=True);args=p.parse_args()
raw=(root/'content/sources/contest-seed.json').read_bytes();data=json.loads(raw)
assert len(data['contests'])==3
for item in data['contests']:
 uuid.UUID(item['id']);assert item['scope']=='historical-official-exam-links' and item['rights']=='factual-metadata-only'
encoded=base64.b64encode(raw).decode()
sql=f"""do $catalog$
declare payload jsonb := convert_from(decode('{encoded}','base64'),'UTF8')::jsonb; item jsonb;
begin
 perform pg_advisory_xact_lock(726351,2);
 for item in select value from jsonb_array_elements(payload->'contests') loop
  if exists(select 1 from public.study_contests where id=(item->>'id')::uuid or slug=item->>'slug') then
   if not exists(select 1 from public.study_contests where id=(item->>'id')::uuid and slug=item->>'slug' and title=item->>'title' and organization=item->>'organization' and exam_board=item->>'board' and status='published') then
    raise exception using errcode='22023',message='Historical catalog collision; existing record preserved';
   end if;
  else
   insert into public.study_contests(id,slug,title,organization,exam_board,status,published_at)
   values((item->>'id')::uuid,item->>'slug',item->>'title',item->>'organization',item->>'board','published',clock_timestamp());
  end if;
 end loop;
end $catalog$;
"""
Path(args.output).write_text(sql)
print(json.dumps({'sqlFile':args.output,'historicalContests':3,'questionPublication':False}))
