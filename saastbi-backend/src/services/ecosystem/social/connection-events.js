let emitToUserFn = null;

export function setConnectionSocketEmitter(fn) {
  emitToUserFn = fn;
}

export function emitConnectionEvent(userId, event, data) {
  if (emitToUserFn) {
    try {
      emitToUserFn(userId, event, data);
    } catch (error) {
      console.error("Connection socket emit failed:", error.message);
    }
  }
}
