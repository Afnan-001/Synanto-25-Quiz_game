// models/GameState.js
const mongoose = require("mongoose");

const GameStateSchema = new mongoose.Schema({
  started: { type: Boolean, default: false }
});

// Only one document will be used
module.exports = mongoose.model("GameState", GameStateSchema);
