#!/usr/bin/python3.6
import sys
import traceback

try:
    from wsgiref.handlers import CGIHandler
    from app import app
    CGIHandler().run(app)
except Exception as e:
    print("Content-Type: text/html\n")
    print("<html><head><title>Error</title></head><body>")
    print("<h1>Application Error</h1>")
    print("<pre>")
    print(traceback.format_exc())
    print("</pre>")
    print("<h2>Python Path:</h2>")
    print("<pre>")
    print('\n'.join(sys.path))
    print("</pre>")
    print("</body></html>")
