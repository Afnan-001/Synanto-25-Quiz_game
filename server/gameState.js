// gameState.js
const express = require("express");
const GameState = require("./models/GameState");
const router = express.Router();

// ✅ Get current game state
router.get("/", async (req, res) => {
  try {
    let state = await GameState.findOne();
    if (!state) {
      // create default if not exists
      state = await GameState.create({ started: false });
    }
    res.json({ started: state.started });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ✅ Toggle game state
router.post("/toggle", async (req, res) => {
  try {
    const { started } = req.body;
    if (typeof started !== "boolean") {
      return res.status(400).json({ ok: false, error: "started must be boolean" });
    }

    let state = await GameState.findOne();
    if (!state) {
      state = await GameState.create({ started });
    } else {
      state.started = started;
      await state.save();
    }

    res.json({ ok: true, started: state.started });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
