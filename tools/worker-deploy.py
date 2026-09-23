"""Trampantojo: publica el servidor de los avisos de agua en Cloudflare Workers.

Sin instalar nada (ni Node ni wrangler): habla directamente con la API.

Necesita:
  · worker/.vapid.json      las claves VAPID (pwsh tools/vapid-keys.ps1)
  · un token de la API de Cloudflare con la plantilla «Edit Cloudflare Workers»,
    en la variable CLOUDFLARE_API_TOKEN o en el fichero
    %USERPROFILE%\\.trampantojo-cloudflare-token (una línea). El token NUNCA se
    imprime ni se guarda en el repositorio.

Hace, y puede repetirse sin miedo (es idempotente):
  1. busca la cuenta, 2. crea (o reutiliza) el espacio KV «trampantojo-agua»,
  3. sube agua.js con sus variables y la clave privada como secreto,
  4. pone el cron cada 15 minutos, 5. lo publica en <nombre>.<cuenta>.workers.dev
  y 6. comprueba que responde.
Con --apply escribe la URL y la clave pública en js/agua.js.

Uso: python tools/worker-deploy.py [--apply]
"""
import json
import os
import re
import sys
import urllib.error
import urllib.request
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NAME = 'trampantojo-agua'
API = 'https://api.cloudflare.com/client/v4'


def token():
    t = os.environ.get('CLOUDFLARE_API_TOKEN')
    if not t:
        f = Path(os.environ.get('USERPROFILE', str(Path.home()))) / '.trampantojo-cloudflare-token'
        if f.exists():
            t = f.read_text(encoding='utf-8-sig').strip()
    if not t:
        sys.exit('Falta el token de Cloudflare (CLOUDFLARE_API_TOKEN o %USERPROFILE%\\.trampantojo-cloudflare-token).')
    return t


TOKEN = None


def call(method, path, body=None, raw=None, ctype='application/json'):
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    req = urllib.request.Request(f'{API}{path}', data=data, method=method)
    req.add_header('Authorization', f'Bearer {TOKEN}')
    if data is not None:
        req.add_header('Content-Type', ctype)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try:
            j = json.loads(e.read().decode())
        except Exception:
            j = {'errors': [{'message': str(e)}]}
        return j


def must(j, what):
    if not j.get('success'):
        msgs = '; '.join(f"{x.get('code')}: {x.get('message')}" for x in j.get('errors', []))
        sys.exit(f'✗ {what}: {msgs}')
    return j.get('result')


def main():
    global TOKEN
    apply = '--apply' in sys.argv
    TOKEN = token()
    vapid = json.loads((ROOT / 'worker' / '.vapid.json').read_text(encoding='utf-8-sig'))
    script = (ROOT / 'worker' / 'agua.js').read_text(encoding='utf-8')

    accounts = must(call('GET', '/accounts'), 'leer la cuenta')
    if not accounts:
        sys.exit('✗ El token no ve ninguna cuenta.')
    acc = os.environ.get('CF_ACCOUNT_ID') or accounts[0]['id']
    print(f'· cuenta: {accounts[0].get("name", "?")}')

    # 2. KV
    spaces = must(call('GET', f'/accounts/{acc}/storage/kv/namespaces?per_page=100'), 'listar KV')
    ns = next((s for s in spaces if s['title'] == NAME), None)
    if not ns:
        ns = must(call('POST', f'/accounts/{acc}/storage/kv/namespaces', {'title': NAME}), 'crear KV')
        print('· KV creado')
    else:
        print('· KV reutilizado')

    # 3. el script, con sus variables y el secreto
    meta = {
        'main_module': 'agua.js',
        'compatibility_date': '2026-09-01',
        'bindings': [
            {'type': 'kv_namespace', 'name': 'AGUA', 'namespace_id': ns['id']},
            {'type': 'plain_text', 'name': 'VAPID_PUBLIC', 'text': vapid['publicKey']},
            {'type': 'secret_text', 'name': 'VAPID_PRIVATE_JWK', 'text': json.dumps(vapid['privateJwk'])},
            {'type': 'plain_text', 'name': 'VAPID_SUBJECT', 'text': 'https://fjvmarq.github.io/Trampantojo/'},
        ],
    }
    b = uuid.uuid4().hex
    parts = [
        f'--{b}\r\nContent-Disposition: form-data; name="metadata"; filename="metadata.json"\r\nContent-Type: application/json\r\n\r\n{json.dumps(meta)}\r\n',
        f'--{b}\r\nContent-Disposition: form-data; name="agua.js"; filename="agua.js"\r\nContent-Type: application/javascript+module\r\n\r\n{script}\r\n',
        f'--{b}--\r\n',
    ]
    must(call('PUT', f'/accounts/{acc}/workers/scripts/{NAME}', raw=''.join(parts).encode('utf-8'), ctype=f'multipart/form-data; boundary={b}'), 'subir el script')
    print('· script subido')

    # 4. el cron
    must(call('PUT', f'/accounts/{acc}/workers/scripts/{NAME}/schedules', [{'cron': '*/15 * * * *'}]), 'poner el cron')
    print('· cron cada 15 minutos')

    # 5. publicarlo en workers.dev
    sub = call('GET', f'/accounts/{acc}/workers/subdomain')
    subdomain = (sub.get('result') or {}).get('subdomain') if sub.get('success') else None
    if not subdomain:
        sys.exit('✗ La cuenta aún no tiene subdominio workers.dev. Entra una vez en Workers & Pages en el panel de Cloudflare para crearlo y vuelve a ejecutar.')
    must(call('POST', f'/accounts/{acc}/workers/scripts/{NAME}/subdomain', {'enabled': True, 'previews_enabled': False}), 'publicar en workers.dev')
    url = f'https://{NAME}.{subdomain}.workers.dev'
    print(f'· publicado: {url}')

    # 6. ¿responde?
    try:
        with urllib.request.urlopen(url, timeout=30) as r:
            print('· responde:', r.read().decode()[:120])
    except Exception as e:
        print('· aún no responde (tarda unos segundos la primera vez):', e)

    if apply:
        p = ROOT / 'js' / 'agua.js'
        s = p.read_text(encoding='utf-8')
        s = re.sub(r"export const PUSH_URL = '[^']*';", f"export const PUSH_URL = '{url}';", s)
        s = re.sub(r"export const VAPID_PUBLIC = '[^']*';", f"export const VAPID_PUBLIC = '{vapid['publicKey']}';", s)
        p.write_text(s, encoding='utf-8', newline='\n')
        print('· js/agua.js apunta al servidor')


if __name__ == '__main__':
    main()
