import React, { useEffect, useState } from "react";
import "./styles.css"
const SERVER = import.meta.env.VITE_SERVER;

// Generate a simple device ID based on browser characteristics
const generateDeviceId = () => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx.textBaseline = "top";
  ctx.font = "14px Arial";
  ctx.fillText("Device fingerprint", 2, 2);

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + "x" + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL(),
  ].join("|");

  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // 32-bit
  }
  return Math.abs(hash).toString(36);
};

// Format time in MM:SS format
const formatTime = (milliseconds) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export default function App() {
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState("");
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [timeTakenMs, setTimeTakenMs] = useState(0);
  const [name] = useState(() => localStorage.getItem("quizUserName") || "");
  const [gameStarted, setGameStarted] = useState(false);
  const [deviceId] = useState(() => generateDeviceId());
  const [hasSubmitted, setHasSubmitted] = useState(() => {
    return localStorage.getItem("quizSubmitted") === "true";
  });
  const [loadingState, setLoadingState] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerInterval, setTimerInterval] = useState(null);
  const [userId, setUserId] = useState(localStorage.getItem("quizUserId") || null);

  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch(`${SERVER}/api/game-state`);
        const data = await res.json();
        setGameStarted(data.started);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingState(false);
      }
    };
    fetchState();
  }, []);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [timerInterval]);

  const startGame = async () => {
    if (!name.trim()) {
      setMsg("Username not found. Please return to the previous page to enter your name.");
      return;
    }
    
    try {
      // Start user session
      const userResponse = await fetch(`${SERVER}/api/users/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() })
      });
      
      const userData = await userResponse.json();
      
      if (userData.ok) {
        setUserId(userData.user.id);
        localStorage.setItem("quizUserId", userData.user.id);
        
        const response = await fetch(`${SERVER}/api/questions`);
        const data = await response.json();
        setQuestions(data);
        const now = Date.now();
        setStartTime(now);
        setMsg("");
        
        // Start the timer
        setElapsedTime(0);
        if (timerInterval) {
          clearInterval(timerInterval);
        }
        const interval = setInterval(() => {
          setElapsedTime(Date.now() - now);
        }, 1000);
        setTimerInterval(interval);
      } else {
        setMsg("Failed to start game session. Please try again.");
      }
    } catch (err) {
      setMsg("Failed to load questions from server.");
    }
  };

  const submitAnswer = async () => {
    setMsg("Checking...");
    const q = questions[current];
    try {
      const res = await fetch(`${SERVER}/api/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: q.id, answer }),
      });
      const j = await res.json();
      if (j.ok && j.correct) {
        setAnswer("");
        if (current + 1 >= questions.length) {
          // Quiz completed
          setDone(true);
          const taken = Date.now() - startTime;
          setTimeTakenMs(taken);
          
          // Stop the timer
          if (timerInterval) {
            clearInterval(timerInterval);
            setTimerInterval(null);
          }

          if (userId && !hasSubmitted) {
            try {
              // Complete user session
              const completeResponse = await fetch(`${SERVER}/api/users/complete/${userId}`, {
                method: "POST"
              });
              
              const completeData = await completeResponse.json();
              
              if (completeData.ok) {
                setMsg(
                  `Congratulations! Quiz completed in ${formatTime(taken)} Let's see if you made it to the leaderboard!`
                );
                setHasSubmitted(true);
                localStorage.setItem("quizSubmitted", "true");
              } else {
                setMsg(
                  `Congratulations! Quiz completed in ${formatTime(taken)}! ` +
                    (completeData.error || "Score submission failed.")
                );
              }
            } catch (e) {
              setMsg(`Congratulations! Quiz completed in ${formatTime(taken)}! (Score submission failed)`);
            }
          } else {
            setMsg(`Congratulations! Quiz completed in ${formatTime(taken)}!`);
          }
        } else {
          // Trigger PDF download for questions 1–6
          const pdfRes = await fetch(
            `${SERVER}/api/generate-clue?questionId=${q.id}`
          );
          const blob = await pdfRes.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `clue_q${q.id}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);

          setMsg("Correct! PDF downloaded.");
          setCurrent(current + 1);
        }
      } else {
        setMsg("Incorrect — try again.");
      }
    } catch (err) {
      setMsg("Error checking answer.");
    }
  };

  // UI states
  if (loadingState) return <p>Loading...</p>;

  if (!gameStarted) {
    return (
      <div className="app">
        <h1>Sequential Quiz — Collect 6 clues</h1>
        
        <div className="question">
          <h2>The game has not started yet.</h2>
          <div className="muted">Please wait until the game begins!</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <h1>Sequential Quiz — Collect 6 clues</h1>
      
      {!questions.length && (
        <div className="question">
          <h2>Welcome to the Quiz Game!</h2>
          <div className="muted">Answer questions in order. Each correct answer downloads a PDF with a clue placed at a random position on a map.</div>
          <div style={{marginTop:20}}>
            <div>Username: <strong>{name}</strong></div>
          </div>
          <div style={{marginTop:12}}>
            <button onClick={startGame} style={{padding: "10px 20px", fontSize: "16px"}}>Start Game</button>
          </div>
          <div style={{marginTop:12,color:"#9cc"}}> {msg} </div>
        </div>
      )}

      {questions.length > 0 && !done && (
        <div className="question">
          <div style={{fontSize: "24px", fontWeight: "bold", marginBottom: "20px"}}>
            Time: {formatTime(elapsedTime)}
          </div>
          <div><strong>Question {current+1}:</strong> {questions[current].q}</div>
          <div style={{marginTop:12}}>
            <input 
              value={answer} 
              onChange={e=>setAnswer(e.target.value)} 
              placeholder="Type your answer here" 
              style={{padding: "8px", fontSize: "14px", width: "300px"}}
            />
          </div>
          <div style={{marginTop:12}}>
            <button onClick={submitAnswer}>Submit Answer</button>
          </div>
          <div style={{marginTop:12,color:"#9cc"}}> {msg} </div>
        </div>
      )}

      {done && (
        <div className="question">
          <h2>Well done — you finished!</h2>
          <p className="muted">You completed the quiz in {formatTime(timeTakenMs)}</p>
          <div style={{marginTop:12,color:"#9cc"}}>{msg}</div>
        </div>
      )}
    </div>
  );
}