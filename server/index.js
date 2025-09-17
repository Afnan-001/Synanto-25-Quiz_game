const express = require("express");
const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb, degrees } = require("pdf-lib");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();

// CONFIG
const PORT = process.env.PORT;
const MONGO_URI = process.env.MONGO_URI;
const SECRET_DIGITS = ["1", "1", "1", "0", "2", "5"]; // digits for each question's PDF

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use("/public", express.static(path.join(__dirname, "public")));

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// User Schema
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  totalTime: {
    type: Number // in seconds
  },
  completed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const User = mongoose.model("User", UserSchema);

// ------------------- Routes -------------------

// Game state routes
const gameStateRoutes = require("./gameState");
app.use("/api/game-state", gameStateRoutes);

// User routes
app.post("/api/users", async (req, res) => {
  try {
    const { name } = req.body;
    const user = new User({ name });
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch("/api/users/:id", async (req, res) => {
  try {
    const { completed, endTime, totalTime } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { completed, endTime, totalTime },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Leaderboard route - GET top 10 players with shortest completion time
app.get("/api/leaderboard", async (req, res) => {
  try {
    const leaderboard = await User.find({ 
      completed: true,
      totalTime: { $exists: true, $ne: null } 
    })
    .sort({ totalTime: 1 }) // Sort by totalTime ascending (shortest first)
    .limit(10) // Limit to top 10
    .select('name totalTime'); // Only return name and totalTime fields

    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get("/", (req, res) => {
  res.send("Backend is running!");
});

// ------------------- Questions -------------------
const questions = [
  { id: 1, q: "Sequence: 1, 1, 2, 3, 5, ?", answer: "8" },
  { id: 2, q: "If: 1=3, 2=3, 3=5, 4=4, 5=4, so 6=?", answer: "3" },
  {
    id: 3,
    q: "1,2,3,4,5,6,7,8,9 after removing one number and remaining sum is even → which type of number was removed?",
    answer: "odd",
  },
  { id: 4, q: "If CAT=24, DOG=26, so BAT=?", answer: "23" },
  {
    id: 5,
    q: "682 → one digit right but wrong place \n 614 → one digit right and right place \n 206 → two digits right but wrong places \n What is the code?",
    answer: "042",
  },
  {
    id: 6,
    q: "Fill in the question mark in the puzzle: Grid 1: Top 18, Left 9, Right 6, Bottom 17, Center 38. Grid 2: Top 12, Left 8, Right 3, Bottom 12, Center 29. Grid 3: Top 13, Left 11, Right 7, Bottom 8, Center ?",
    answer: "25",
  },
  { id: 7, q: "What did you find?", answer: "111025" },
];

// ------------------- API Endpoints -------------------

// Return questions (without answers)
app.get("/api/questions", (req, res) => {
  const qs = questions.map(({ id, q }) => ({ id, q }));
  res.json(qs);
});

// Validate an answer for a question id
app.post("/api/validate", (req, res) => {
  const { questionId, answer } = req.body;
  const q = questions.find((x) => x.id === questionId);
  if (!q)
    return res.status(400).json({ ok: false, error: "Invalid question id" });

  const normalized = (answer || "").toString().trim().toLowerCase();
  const correct = q.answer.toLowerCase() === normalized;
  res.json({ ok: true, correct });
});

// Generate a PNG with the specific digit for the question placed at a random position on top of a map
app.get("/api/generate-clue", async (req, res) => {
  try {
    const questionId = parseInt(req.query.questionId) || 1;
    const digitIndex = Math.min(questionId - 1, SECRET_DIGITS.length - 1);
    const secretDigit = SECRET_DIGITS[digitIndex];
    
    // Determine which map image to use based on question ID
    const mapNumber = Math.min(questionId, 6); // Use map1-6 for questions 1-6, map6 for question 7+
    const mapExtension = 'png';// map1.png, map2-6.jpg
    const MAP_IMAGE_PATH = path.join(__dirname, "public", `map${mapNumber}.${mapExtension}`);

    // Check if we already have a cached image for this digit at a position
    // For simplicity, we'll generate a new one each time, but you could cache these
    const { createCanvas, loadImage } = require('canvas');
    const canvas = createCanvas(800, 600);
    const ctx = canvas.getContext('2d');

    // Load and draw the map as background
    try {
      const mapImage = await loadImage(MAP_IMAGE_PATH);
      ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);
    } catch (err) {
      // If map image fails to load, draw a placeholder
      console.error(`Failed to load map image: ${MAP_IMAGE_PATH}`, err);
      ctx.fillStyle = '#e0e0e0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#000';
      ctx.font = '20px Arial';
      ctx.fillText(`MAP IMAGE MISSING: map${mapNumber}.${mapExtension}`, 50, 50);
    }

    // Random position for the digit
    const margin = 50;
    const maxX = canvas.width - margin;
    const maxY = canvas.height - margin;
    const randomX = Math.floor(Math.random() * (maxX - margin)) + margin;
    const randomY = Math.floor(Math.random() * (maxY - margin)) + margin;

    // Draw the digit on the map
    ctx.fillStyle = 'red';
    ctx.font = '48px Arial';
    ctx.save();
    ctx.translate(randomX, randomY);
    ctx.rotate(Math.random() * Math.PI * 2); // Random rotation
    ctx.fillText(secretDigit, 0, 0);
    ctx.restore();

    // Send the image as PNG
    res.setHeader('Content-Type', 'image/png');
    const buffer = canvas.toBuffer('image/png');
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Image generation failed" });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));