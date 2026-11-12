module.exports = {
  format: (title, body) => {
    return `╭━━━━━━━━━━━━━━━━━━╮\n` +
           `   ✦ ${title.toUpperCase()} ✦\n` +
           `╰━━━━━━━━━━━━━━━━━━╯\n\n` +
           `${body}`;
  },
  error: (body) => {
    return `╭━━━━━━━━━━━━━━━━━━╮\n` +
           `   ❌ ERROR\n` +
           `╰━━━━━━━━━━━━━━━━━━╯\n\n` +
           `${body}`;
  },
  success: (body) => {
    return `╭━━━━━━━━━━━━━━━━━━╮\n` +
           `   ✅ SUCCESS\n` +
           `╰━━━━━━━━━━━━━━━━━━╯\n\n` +
           `${body}`;
  }
};
