/**
 * Placeholder for Whisper or faster-whisper integration.
 * Run transcription to get word-level timestamps; reuse transcript when available.
 * Used by detectSpeechEmphasis to build speech segments for candidate windows (reduces Gemini payload).
 */
/**
 * Stub: returns empty. Replace with Whisper/faster-whisper (e.g. subprocess or native binding).
 * If transcript exists (e.g. from a previous call), return it to avoid re-transcribing.
 */
export async function transcribe(_audioPath, _existingTranscript) {
    return _existingTranscript ?? [];
}
