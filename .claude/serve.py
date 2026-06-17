#!/usr/bin/env python3
"""Минимальный статический сервер для превью прототипов.
Не использует os.getcwd() — путь задан явно (песочница блокирует getcwd)."""
import http.server
import socketserver

PORT = 8124
ROOT = "/Users/evgenii/Documents/Claude/МТПК"


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, *args):
        pass


socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as httpd:
    print(f"serving {ROOT} on http://127.0.0.1:{PORT}/")
    httpd.serve_forever()
