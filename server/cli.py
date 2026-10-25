"""CLI entry point: `samurai serve` starts backend + web client and opens the browser."""
import argparse
import socket
import sys
import threading
import time
import webbrowser

from . import __version__


def _find_free_port(preferred: int, host: str) -> int:
    for candidate in (preferred, *range(preferred + 1, preferred + 21)):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                s.bind((host, candidate))
                return candidate
            except OSError:
                continue
    raise RuntimeError(f"No free port near {preferred}")


def _open_browser_later(url: str, delay: float = 1.5) -> None:
    def _open():
        time.sleep(delay)
        try:
            webbrowser.open(url)
        except Exception:
            print("[samurai] could not open browser automatically; visit:", url)

    threading.Thread(target=_open, daemon=True).start()


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(prog="samurai", description="Samurai 3D Action RPG")
    sub = parser.add_subparsers(dest="command", required=True)

    serve = sub.add_parser("serve", help="Start backend + game client and open the browser")
    serve.add_argument("--host", default="127.0.0.1")
    serve.add_argument("--port", type=int, default=8000)
    serve.add_argument("--no-browser", action="store_true", help="Do not auto-open the browser")
    serve.add_argument("--reload", action="store_true", help="Dev auto-reload of the Python backend")

    sub.add_parser("version", help="Print version")

    args = parser.parse_args(argv)
    if args.command == "version":
        print(f"samurai-web {__version__}")
        return 0

    if args.command == "serve":
        host = args.host
        port = _find_free_port(args.port, host)
        url = f"http://{host}:{port}"
        print("=" * 60)
        print(f"  SAMURAI 3D ACTION RPG  v{__version__}")
        print(f"  Server : {url}")
        print(f"  Stop   : Ctrl+C")
        print("=" * 60)
        if not args.no_browser and not args.reload:
            _open_browser_later(url)
        try:
            import uvicorn

            uvicorn.run(
                "server.main:app",
                host=host,
                port=port,
                log_level="info",
                reload=args.reload,
            )
        except KeyboardInterrupt:
            print("\n[samurai] server stopped")
        return 0
    return 1


if __name__ == "__main__":
    sys.exit(main())
