#!/bin/bash

# Development helper script for MealShare AI

case "$1" in
  setup)
    echo "🔧 Setting up development environment..."
    
    # Check MongoDB
    if ! pgrep -x "mongod" > /dev/null; then
        echo "⚠️  Starting MongoDB..."
        if command -v systemctl &> /dev/null; then
            sudo systemctl start mongodb
        elif command -v brew &> /dev/null; then
            brew services start mongodb-community
        fi
    fi
    
    # Install dependencies
    echo "📦 Installing dependencies..."
    yarn install
    
    echo "✅ Setup complete!"
    ;;
    
  start)
    echo "🚀 Starting MealShare AI..."
    echo ""
    echo "Backend will start on http://localhost:5000"
    echo "Frontend will start on http://localhost:5173"
    echo ""
    echo "Press Ctrl+C to stop both servers"
    echo ""
    
    # Start both servers using tmux or screen if available
    if command -v tmux &> /dev/null; then
        tmux new-session -d -s mealshare 'cd /home/emon/MealSahreAI && yarn server'
        tmux split-window -h -t mealshare 'cd /home/emon/MealSahreAI && yarn dev'
        tmux attach -t mealshare
    else
        echo "Starting backend in background..."
        yarn server &
        BACKEND_PID=$!
        echo "Backend PID: $BACKEND_PID"
        
        echo "Starting frontend..."
        yarn dev
        
        # Cleanup on exit
        kill $BACKEND_PID 2>/dev/null
    fi
    ;;
    
  stop)
    echo "🛑 Stopping servers..."
    pkill -f "node.*server.ts"
    pkill -f "vite"
    echo "✅ Servers stopped"
    ;;
    
  mongo)
    echo "🗄️  Opening MongoDB shell..."
    mongosh mealshare
    ;;
    
  logs)
    echo "📋 Showing recent logs..."
    tail -f logs/*.log 2>/dev/null || echo "No log files found"
    ;;
    
  clean)
    echo "🧹 Cleaning up..."
    rm -rf node_modules
    rm -rf dist
    rm -rf .cache
    echo "✅ Cleanup complete. Run 'yarn install' to reinstall dependencies"
    ;;
    
  test)
    echo "🧪 Running tests..."
    yarn test
    ;;
    
  *)
    echo "MealShare AI - Development Helper"
    echo ""
    echo "Usage: ./dev.sh [command]"
    echo ""
    echo "Commands:"
    echo "  setup   - Install dependencies and check prerequisites"
    echo "  start   - Start both backend and frontend servers"
    echo "  stop    - Stop all running servers"
    echo "  mongo   - Open MongoDB shell"
    echo "  logs    - Show application logs"
    echo "  clean   - Clean build artifacts and dependencies"
    echo "  test    - Run tests"
    echo ""
    echo "Examples:"
    echo "  ./dev.sh setup    # First time setup"
    echo "  ./dev.sh start    # Start development"
    echo "  ./dev.sh stop     # Stop servers"
    ;;
esac
