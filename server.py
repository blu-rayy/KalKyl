from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import sys
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, 'core'))
from main import run, compile_for_grid


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/api/compile':
            length = int(self.headers['Content-Length'])
            body   = json.loads(self.rfile.read(length))
            result = run(body.get('source', ''))
            self._respond(200, {'output': result})
        elif self.path == '/api/grid':
            length = int(self.headers['Content-Length'])
            body   = json.loads(self.rfile.read(length))
            try:
                text, grid = compile_for_grid(body.get('source', ''))
            except Exception as e:
                import traceback; traceback.print_exc()
                self._respond(500, {'error': str(e), 'grid': None})
                return
            self._respond(200, {'output': text, 'grid': grid})
        else:
            self._respond(404, {'error': 'Not found'})

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors_headers()
        self.end_headers()

    def _respond(self, code, data):
        payload = json.dumps(data).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(payload)))
        self._cors_headers()
        self.end_headers()
        self.wfile.write(payload)

    def _cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def log_message(self, fmt, *args):
        pass  # silence access logs


PORT = 8080

if __name__ == '__main__':
    server = HTTPServer(('localhost', PORT), Handler)
    print(f"KalKyl server running on http://localhost:{PORT}")
    print("Press Ctrl+C to stop.")
    server.serve_forever()
