#!/usr/bin/env python3
"""
Simple HTTP server to serve debug files on localhost
"""
import http.server
import socketserver
import os
import webbrowser
from pathlib import Path

# Configuration
PORT = 3001
DIRECTORY = Path(__file__).parent

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIRECTORY), **kwargs)
    
    def end_headers(self):
        # Add CORS headers to allow cross-origin requests
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

def main():
    print(f"🚀 Starting HTTP server on localhost:{PORT}")
    print(f"📁 Serving files from: {DIRECTORY}")
    print(f"🌐 Open: http://localhost:{PORT}/deep-debug.html")
    print("Press Ctrl+C to stop the server")
    print("-" * 50)
    
    try:
        with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
            # Open browser automatically
            webbrowser.open(f'http://localhost:{PORT}/deep-debug.html')
            
            print(f"✅ Server running at http://localhost:{PORT}")
            print("🔍 Debug file should open automatically in your browser")
            print("📊 Make sure to open DevTools (F12) before running tests")
            
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ Port {PORT} is already in use")
            print(f"💡 Try a different port or stop the existing service")
        else:
            print(f"❌ Server error: {e}")

if __name__ == "__main__":
    main()

