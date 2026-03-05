#!/bin/bash

SESSION="medintel"
ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

echo "Cleaning ports..."
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null

tmux kill-session -t $SESSION 2>/dev/null

echo "Starting MedIntel..."

# Start session with frontend (LEFT pane)
tmux new-session -d -s $SESSION -c "$FRONTEND"
tmux send-keys -t $SESSION "pnpm dev" C-m

# Split and run backend (RIGHT pane)
tmux split-window -h -t $SESSION -c "$BACKEND"
tmux send-keys -t $SESSION "source .venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000" C-m

# focus left pane by default
tmux select-pane -t 0

tmux attach -t $SESSION
