"""Local dev server. Wraps index.html in the same skeleton the artifact host adds."""
import http.server, socketserver, sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKEL = ('<!doctype html><html><head><meta charset=utf-8><meta name=viewport '
        'content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>')
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(self, *a): pass
    def do_GET(self):
        if self.path.split('?')[0] in ('/', '/index.html'):
            body = (SKEL + open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read() + '</body></html>').encode()
            self.send_response(200); self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body); return
        return super().do_GET()
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
socketserver.TCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(('127.0.0.1', port), H) as s: s.serve_forever()
