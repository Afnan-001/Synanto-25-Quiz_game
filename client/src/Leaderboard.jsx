import React, { useState, useEffect } from "react";
import "./leaderboard.css"; // Import CSS

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch leaderboard data
const fetchLeaderboard = async () => {
  try {
    const response = await fetch("http://localhost:4000/api/leaderboard");
    if (!response.ok) {
      throw new Error("Failed to fetch leaderboard data");
    }
    const data = await response.json();
    setLeaderboard(data);
    setLoading(false);
  } catch (err) {
    setError("Failed to fetch leaderboard data");
    setLoading(false);
    console.error("Error fetching leaderboard:", err);
  }
};


  useEffect(() => {
    fetchLeaderboard();
    const intervalId = setInterval(fetchLeaderboard, 5000);
    return () => clearInterval(intervalId);
  }, []);

  const formatTime = (seconds) => {
    if (!seconds && seconds !== 0) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="leaderboard-container">
        <h2>Game Leaderboard</h2>
        <div className="loading">Loading leaderboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="leaderboard-container">
        <h2>Game Leaderboard</h2>
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="leaderboard-container">
      <h2> Game Leaderboard</h2>
      <p>Top 10 fastest completions</p>

      <div className="leaderboard">
        {leaderboard.length === 0 ? (
          <div className="no-data">No players have completed the game yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Completion Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((player, index) => (
                <tr
                  key={player._id}
                  className={index < 3 ? `top-${index + 1}` : ""}
                >
                  <td className="rank">#{index + 1}</td>
                  <td className="player-name">{player.name}</td>
                  <td className="time">{formatTime(player.totalTime)}</td>
                  <td className="status">
                    <span className="completed">Completed</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* <div className="footer">
        <div className="live-indicator">
          <span className="live-dot"></span>
          Live updating every 5 seconds
        </div>
      </div> */}
    </div>
  );
};

export default Leaderboard;
