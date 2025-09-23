const express = require("express");
const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb, degrees } = require("pdf-lib");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cors = require("cors");
app.use(cors({
  origin: "https://synanto-25-quiz-game.vercel.app", // allow only your frontend
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// If using preflight requests, also handle OPTIONS explicitly
app.options("*", cors());


dotenv.config();

// CONFIG
const PORT = process.env.PORT;
const MONGO_URI = process.env.MONGO_URI;
const SECRET_DIGITS = ["1", "1", "1", "0", "2", "5"]; // digits for each question's PDF

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use("/public", express.static(path.join(__dirname, "public")));

// MongoDB connection
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ------------------- Routes -------------------

// Game state routes
const gameStateRoutes = require("./gameState");
app.use("/api/game-state", gameStateRoutes);

// User routes (✅ use userRoutes.js only)
const userRoutes = require("./userRoutes");
app.use("/api/users", userRoutes);

app.get("/", (req, res) => {
  res.send("Backend is running!");
});

// ------------------- Questions -------------------
const questions = [
  { id: 1, q: "Next in series: 0,1,1,2,3,?", answer: "5", type: "text" },

  // Q2 - Image puzzle with image options
  {
    id: 2,
    q: "Solve the puzzle from the given image:",
    type: "image",
    answerType: "mcq-image",
    questionImage: "/public/q2.png",
    options: [
      { key: "a", image: "/public/q2_a.png" },
      { key: "b", image: "/public/q2_b.png" },
      { key: "c", image: "/public/q2_c.png" },
      { key: "d", image: "/public/q2_d.png" },
    ],
    answer: "a",
  },

  // Q3 - Normal text question
  { id: 3, q: "Next letter in series: A,D,G,J, ?", answer: "M", type: "text" },

  // Q4 - Image-based with TEXT options
  {
    id: 4,
    q: "Which 'X' (pattern) can be formed by the given shapes?",
    type: "image",
    answerType: "mcq-text",
    questionImage: "/public/q4.png",
    options: [
      { key: "a", text: "1" },
      { key: "b", text: "2" },
      { key: "c", text: "3" },
      { key: "d", text: "4" },
    ],
    answer: "b",
  },

  
  { id: 5, q: "Find the odd one out: \n3, 5, 11, 14, 17, 21", answer: "14", type: "text" },

  // 🆕 Q6 - Image + Free-text input
  {
    id: 6,
    q: "Which number completes the puzzle?",
    type: "image",
    answerType: "text", // free-text input
    questionImage: "/public/q6.png",
    answer: "19",
  },

  { id: 7, q: "What did you find?", answer: "111025", type: "text" },
];


// ------------------- API Endpoints -------------------

// Return questions (without answers)
app.get("/api/questions", (req, res) => {
  const qs = questions.map(({ id, q, type, answerType, questionImage, options }) => ({
    id, q, type, answerType, questionImage, options
  }));
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

    const mapNumber = Math.min(questionId, 6);
    const mapExtension = "png";
    const MAP_IMAGE_PATH = path.join(
      __dirname,
      "public",
      `map${mapNumber}.${mapExtension}`
    );

    const { createCanvas, loadImage } = require("canvas");
    const canvas = createCanvas(800, 600);
    const ctx = canvas.getContext("2d");

    try {
      const mapImage = await loadImage(MAP_IMAGE_PATH);
      ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);
    } catch (err) {
      console.error(`Failed to load map image: ${MAP_IMAGE_PATH}`, err);
      ctx.fillStyle = "#e0e0e0";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#000";
      ctx.font = "20px Arial";
      ctx.fillText(
        `MAP IMAGE MISSING: map${mapNumber}.${mapExtension}`,
        50,
        50
      );
    }

    const margin = 50;
    const maxX = canvas.width - margin;
    const maxY = canvas.height - margin;
    const randomX = Math.floor(Math.random() * (maxX - margin)) + margin;
    const randomY = Math.floor(Math.random() * (maxY - margin)) + margin;

    ctx.fillStyle = "red";
    ctx.font = "48px Arial";
    ctx.save();
    ctx.translate(randomX, randomY);
    ctx.rotate(Math.random() * Math.PI * 2);
    ctx.fillText(secretDigit, 0, 0);
    ctx.restore();

    res.setHeader("Content-Type", "image/png");
    const buffer = canvas.toBuffer("image/png");
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Image generation failed" });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
