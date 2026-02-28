const mongoose = require('mongoose');
const validator = require('validator');

const blacklistSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Please provide the banned email'],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email'],
    },
    reason: {
      type: String,
      required: [true, 'Please provide the reason for the permanent ban'],
    },
    bannedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const Blacklist = mongoose.model('Blacklist', blacklistSchema);

module.exports = Blacklist;