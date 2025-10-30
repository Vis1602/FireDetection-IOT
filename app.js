// app.js
const express = require("express");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ===== In-memory event log =====
const MAX_EVENTS = 200;
let events = [];

function addEvent(type, payload) {
  const evt = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    type,
    payload,
    timestamp: new Date().toISOString(),
  };
  events.unshift(evt);
  if (events.length > MAX_EVENTS) events.pop();
  console.log(`[${evt.timestamp}] ${type} -`, payload);
  return evt;
}

// ===== Backend endpoints =====
app.post("/fire", (req, res) => {
  const body = req.body || {};
  if (typeof body !== "object")
    return res.status(400).json({ error: "Invalid body" });
  const evt = addEvent("FIRE", body);
  return res.status(200).json({ status: "received", event: evt });
});

app.post("/clear-events", (req, res) => {
  events = [];
  res.json({ status: "cleared" });
});

app.get("/events", (req, res) => res.json(events));

// ===== Frontend (modern UI) =====
app.get("/", (req, res) => {
  res.send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>🔥 Fire Detection Dashboard</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Roboto, Arial;
      margin: 0; padding: 0;
      background: linear-gradient(135deg, #0f2027, #203a43, #2c5364);
      color: #fff;
      min-height: 100vh;
    }
    header {
      text-align: center;
      padding: 30px 20px;
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    h1 { margin: 0; font-size: 2rem; letter-spacing: 1px; }
    p.subtitle { margin-top: 8px; color: #ccc; }
    main {
      max-width: 900px;
      margin: 30px auto;
      padding: 0 20px;
    }
    .controls {
      display: flex; gap: 10px; flex-wrap: wrap;
      justify-content: center; margin-bottom: 20px;
    }
    button {
      background: #ff4b2b;
      color: white;
      border: none;
      padding: 10px 18px;
      font-size: 1rem;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    button:hover { background: #ff3c00; transform: scale(1.03); }
    #events {
      display: grid;
      gap: 12px;
    }
    .card {
      padding: 16px;
      border-radius: 10px;
      background: rgba(255,255,255,0.08);
      backdrop-filter: blur(6px);
      border: 1px solid rgba(255,255,255,0.1);
      transition: 0.3s ease;
    }
    .card:hover { transform: scale(1.01); }
    .danger {
      background: rgba(255, 60, 60, 0.15);
      border: 1px solid rgba(255, 60, 60, 0.5);
    }
    .meta {
      color: #aaa;
      font-size: 0.9rem;
      margin-bottom: 6px;
    }
    pre {
      margin: 0;
      background: rgba(0,0,0,0.3);
      padding: 10px;
      border-radius: 6px;
      overflow-x: auto;
    }
    footer {
      text-align: center;
      padding: 10px;
      color: #aaa;
      font-size: 0.8rem;
    }
  </style>
</head>
<body>
  <header>
    <h1>🔥 Fire Detection Dashboard</h1>
    <p class="subtitle">Real-time fire alerts from ESP32 + DHT11</p>
  </header>

  <main>
    <div class="controls">
      <button id="btn-refresh">🔄 Refresh</button>
      <button id="btn-clear">🧹 Clear Events</button>
      <button id="btn-send-test">🧪 Send Test</button>
    </div>

    <div id="events"></div>
  </main>

  <footer>
    Made with ❤️ using Node.js + ESP32 + DHT11
  </footer>

  <script>
    const eventsEl = document.getElementById('events');
    const refreshBtn = document.getElementById('btn-refresh');
    const clearBtn = document.getElementById('btn-clear');
    const testBtn = document.getElementById('btn-send-test');

    async function loadEvents() {
      try {
        const r = await fetch('/events');
        const data = await r.json();
        render(data);
      } catch (e) {
        eventsEl.innerHTML = '<p style="color:crimson">⚠️ Failed to fetch events.</p>';
      }
    }

    function render(list) {
      if (!list || list.length === 0) {
        eventsEl.innerHTML = '<p style="color:#ccc;text-align:center;">No events yet.</p>';
        return;
      }
      eventsEl.innerHTML = list.map(ev => {
        const isFire = ev.payload.fire;
        const cardClass = isFire ? 'card danger' : 'card';
        const fireIcon = isFire ? '🔥' : '✅';
        return \`
          <div class="\${cardClass}">
            <div><strong>\${fireIcon} \${ev.type}</strong></div>
            <div class="meta">\${new Date(ev.timestamp).toLocaleString()}</div>
            <pre>\${JSON.stringify(ev.payload, null, 2)}</pre>
          </div>\`;
      }).join('');
    }

    refreshBtn.onclick = loadEvents;

    clearBtn.onclick = async () => {
      if (!confirm('Clear all events?')) return;
      await fetch('/clear-events', { method: 'POST' });
      loadEvents();
    };

    testBtn.onclick = async () => {
      const body = {
        room_number: 1,
        fire: Math.random() > 0.5,
        temperature: (20 + Math.random()*60).toFixed(1),
        humidity: (20 + Math.random()*70).toFixed(1)
      };
      await fetch('/fire', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(body)
      });
      loadEvents();
    };

    // auto-refresh every 2s
    loadEvents();
    setInterval(loadEvents, 2000);
  </script>
</body>
</html>`);
});

// ===== Start Server =====
app.listen(PORT, () => {
  console.log(`🔥 Server running at http://localhost:${PORT}`);
  console.log(`POST fire events to: http://localhost:${PORT}/fire`);
});
