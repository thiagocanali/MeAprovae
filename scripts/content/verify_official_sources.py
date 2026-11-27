#!/usr/bin/env python3
"""Opt-in network verification. Writes a new report, never publishes or imports."""
from urllib.request import Request,build_opener,HTTPRedirectHandler
from urllib.parse import urlsplit
from concurrent.futures import ThreadPoolExecutor,as_completed
from pathlib import Path
from datetime import datetime,timezone
import argparse,hashlib,json,io
from pypdf import PdfReader
HOSTS={'www.gov.br','download.inep.gov.br','conhecimento.fgv.br'}
def allowed(url):
 p=urlsplit(url)
 return p.scheme=='https' and p.hostname in HOSTS and not p.username and not p.password and p.port in (None,443)
class OfficialRedirect(HTTPRedirectHandler):
 def redirect_request(self,request,fp,code,message,headers,newurl):
  if not allowed(newurl):raise ValueError('Redirect outside official hosts')
  return super().redirect_request(request,fp,code,message,headers,newurl)
def verify(url):
 try:
  if not allowed(url):raise ValueError('Unapproved source URL')
  response=build_opener(OfficialRedirect()).open(Request(url,headers={'User-Agent':'MeAprovae-SourceVerification/1.0'}),timeout=40)
  raw=response.read(32*1024*1024+1)
  if len(raw)>32*1024*1024 or not raw.startswith(b'%PDF-'):raise ValueError('Expected bounded PDF body')
  return dict(url=url,finalUrl=response.url,status=response.status,bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest(),pages=len(PdfReader(io.BytesIO(raw)).pages),checkedAt=day)
 except Exception as error:return dict(url=url,error=type(error).__name__+': '+str(error))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--output',required=True);args=p.parse_args()
 day=datetime.now(timezone.utc).date().isoformat()
 root=Path(__file__).resolve().parents[2];catalog=json.loads((root/'content/sources/official-exams.json').read_text())
 urls=sorted({exam[key] for exam in catalog['exams'] for key in ['proofUrl','answerKeyUrl']})
 with ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(verify,urls))
 Path(args.output).write_text(json.dumps(dict(checkedAt=day,files=results),ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'files':len(results),'verified':sum('error' not in item for item in results),'failed':sum('error' in item for item in results)}))
