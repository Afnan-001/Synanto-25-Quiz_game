// userRoutes.js
const express = require("express");
const User = require("./models/UserSchema");
const router = express.Router();

// ✅ Create new user with start time
router.post("/start", async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ ok: false, error: "Name is required" });
    }

    const user = await User.create({
      name: name.trim(),
      startTime: new Date()
    });

    res.json({ 
      ok: true, 
      user: { 
        id: user._id, 
        name: user.name, 
        startTime: user.startTime 
      } 
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ✅ Complete user session with end time and total time
router.post("/complete/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const endTime = new Date();

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ ok: false, error: "User not found" });
    }

    if (user.completed) {
      return res.status(400).json({ ok: false, error: "User already completed" });
    }

    const totalTime = Math.floor((endTime - user.startTime) / 1000); // in seconds
    
    user.endTime = endTime;
    user.totalTime = totalTime;
    user.completed = true;
    await user.save();

    res.json({ 
      ok: true, 
      user: { 
        id: user._id, 
        name: user.name, 
        startTime: user.startTime, 
        endTime: user.endTime, 
        totalTime: user.totalTime 
      } 
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ✅ Get all users (for leaderboard)
router.get("/leaderboard", async (req, res) => {
  try {
    const users = await User.find({ completed: true })
      .sort({ totalTime: 1 }) // sort by fastest time first
      .select("name totalTime startTime endTime")
      .limit(50); // top 50

    res.json({ ok: true, users });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ✅ Get user by ID
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ ok: false, error: "User not found" });
    }

    res.json({ ok: true, user });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;