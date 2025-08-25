let messages = [];

function getMessages(userA, userB) {
  return messages.filter(
    m =>
      (m.from === userA && m.to === userB) ||
      (m.from === userB && m.to === userA)
  );
}

function addMessage(from, to, text) {
  messages.push({ from, to, text, time: new Date() });
}

module.exports = { getMessages, addMessage };