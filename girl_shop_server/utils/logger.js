function formatMessage(level, args) {
  return [`[${new Date().toISOString()}]`, level].concat(args);
}

function info(...args) {
  console.log(...formatMessage("INFO", args));
}

function warn(...args) {
  console.warn(...formatMessage("WARN", args));
}

function error(...args) {
  console.error(...formatMessage("ERROR", args));
}

module.exports = {
  info,
  warn,
  error,
};
