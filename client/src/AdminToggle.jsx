import React, { useEffect, useState } from "react";

function AdminToggle() {
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_SERVER; // <-- use the environment variable

  // Fetch current game state
  useEffect(() => {
    fetch(`${API_URL}/api/game-state`)
      .then(res => res.json())
      .then(data => {
        setStarted(data.started);
        setLoading(false);
      });
  }, [API_URL]);

  // Toggle game state
  const handleToggle = async () => {
    const newState = !started;
    const res = await fetch(`${API_URL}/api/game-state/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ started: newState }),
    });
    const data = await res.json();
    if (data.ok) setStarted(data.started);
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>🎮 Game Admin Panel</h1>
      <p>Current game status: <strong>{started ? "STARTED ✅" : "STOPPED ❌"}</strong></p>
      <button
        onClick={handleToggle}
        style={{
          padding: "10px 20px",
          fontSize: "18px",
          background: started ? "red" : "green",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          marginTop: "20px"
        }}
      >
        {started ? "Stop Game" : "Start Game"}
      </button>
    </div>
  );
}

export default AdminToggle;
