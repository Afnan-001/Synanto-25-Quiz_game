const mongoose = require("mongoose");

const GameStateSchema = new mongoose.Schema({
  started: { type: Boolean, default: false }
});

module.exports = mongoose.model("GameState", GameStateSchema);
