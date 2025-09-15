Quiz Game (Fullstack)
=====================

What you got:
- A Node/Express server that serves question list, validates answers, generates PDFs with a single server-side SECRET_DIGIT (random position on map), and stores leaderboard in SQLite.
- A React + Vite client that walks players through questions, downloads PDFs on each correct answer, and submits scores to the leaderboard.
- Leaderboard endpoint returns top 400 entries.

How to run locally:
1. Ensure Node (v18+) and npm are installed.
2. In one terminal, run the server:
   cd server
   npm install
   # place a map image at server/public/map.jpg (optional). If you don't, a placeholder background will be used.
   npm start
3. In another terminal, run the client:
   cd client
   npm install
   npm start
4. Open the client (vite will show the URL, typically http://localhost:5173). The client talks to server at http://localhost:4000 by default.

Important notes:
- SECRET_DIGIT is defined in server/index.js (process.env.SECRET_DIGIT || '7'). To change it globally, set the environment variable SECRET_DIGIT when starting the server.
- The server will return the leaderboard ordered by score desc, time asc; limited to 400 rows.
- For production deployment, serve the client build from a static host and run the server behind a process manager (pm2, systemd) and consider migrating SQLite to a managed DB if needed.
