#!/bin/bash
# DiffNator CLI Helper Script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

case "${1:-}" in
  start)
    echo "🔥 Starting DiffNator..."
    npm start
    ;;
  
  stop)
    echo "⏹️  Stopping DiffNator..."
    npm run stop
    echo "✅ Stopped"
    ;;
  
  restart)
    echo "🔄 Restarting DiffNator..."
    npm restart
    ;;
  
  status|health)
    echo "🏥 Checking DiffNator health..."
    npm run health
    ;;
  
  dev)
    echo "🔥 Starting DiffNator in development mode..."
    npm run dev
    ;;
  
  dev:visible)
    echo "🔥 Starting DiffNator with visible browser..."
    npm run dev:visible
    ;;
  
  install)
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Installation complete!"
    echo "Run './diffnator.sh start' to launch the app"
    ;;
  
  *)
    echo "🔥 DiffNator - The Ultimate Visual Comparison Tool"
    echo ""
    echo "Usage: ./diffnator.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start        Start the server (web + proxy + screenshots)"
    echo "  stop         Stop all running processes"
    echo "  restart      Restart all services"
    echo "  status       Check server health"
    echo "  dev          Start in development mode"
    echo "  dev:visible  Start with visible browser (for debugging)"
    echo "  install      Install dependencies"
    echo ""
    echo "After starting, visit: http://localhost:8080"
    exit 1
    ;;
esac

