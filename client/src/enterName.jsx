import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function EnterName() {
  const [name, setName] = useState("");
  const navigate = useNavigate();

  const handleSubmit = () => {
    if (!name.trim()) return alert("Please enter your username!");
    localStorage.setItem("quizUserName", name.trim());
    navigate("/game");
  };

  return (
    <div style={{ textAlign: "center", marginTop: 50 }}>
      <h2>Welcome to the Quiz</h2>
      <p className="muted">Enter your username to get started.</p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter your username"
        style={{ padding: 10, fontSize: 16, width: "300px" }}
      />
      <br />
      <button
        onClick={handleSubmit}
        style={{ marginTop: 12, padding: "10px 20px", fontSize: 16 }}
      >
        Proceed
      </button>
    </div>
  );
}
