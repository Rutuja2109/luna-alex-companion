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
    def do_POST(self):
        # Local stub for the optional image service (tests only): echoes the
        # reference image back so the integration path can be exercised.
        if self.path == '/mock/imagegen':
            import json
            n = int(self.headers.get('Content-Length', 0)); body = json.loads(self.rfile.read(n) or b'{}')
            out = json.dumps({'image': body.get('referenceImage')}).encode()
            self.send_response(200); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(out))); self.end_headers(); self.wfile.write(out); return
        self.send_response(404); self.end_headers()
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
socketserver.TCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(('127.0.0.1', port), H) as s: s.serve_forever()
