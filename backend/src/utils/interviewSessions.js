// Older sessions attached a response to the next question. Normalize them on
// read/continue so each item consistently represents one question and answer.
export function normalizeInterviewExchanges(exchanges = []) {
  const normalized = Array.isArray(exchanges) ? exchanges.map((item) => ({ ...item })) : []
  for (let index = 1; index < normalized.length; index += 1) {
    const previous = normalized[index - 1]
    const current = normalized[index]
    if (!previous.answer && current.answer) {
      previous.answer = current.answer
      previous.feedback = current.feedback || null
      previous.answered_at = current.answered_at || current.created_at || null
      current.answer = ''
      current.feedback = null
    }
  }
  return normalized
}
