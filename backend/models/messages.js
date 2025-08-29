// backend/models/messages.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const MessageSchema = new Schema({
  thread: { type: Schema.Types.ObjectId, ref: 'MessageThread', index: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, trim: true, required: true },
  seenBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const MessageThreadSchema = new Schema({
  listing: { type: Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
  participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }],
  lastMessage: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

MessageThreadSchema.index({ listing: 1, participants: 1 }, { unique: false });

const Message = mongoose.model('Message', MessageSchema);
const MessageThread = mongoose.model('MessageThread', MessageThreadSchema);

module.exports = { Message, MessageThread };