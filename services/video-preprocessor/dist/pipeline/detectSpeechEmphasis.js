/**
 * Detect speech/emphasis segments. Integrate Whisper or faster-whisper for transcript + timestamps
 * and optional emphasis from pitch/energy. Reuse transcript when available to avoid re-transcribing.
 * These segments become candidates so Gemini only scores short clips (reduces timeout and cost).
 */
/**
 * Placeholder: returns empty. Replace with Whisper/faster-whisper integration:
 * - Extract audio, run Whisper for transcript with word-level timestamps.
 * - Optionally compute emphasis from pitch/energy on speech segments.
 * - Return segments with speechEmphasisScore.
 */
export async function detectSpeechEmphasis(_filePath, _threshold, _existingTranscript) {
    if (_existingTranscript?.segments?.length) {
        return _existingTranscript.segments.map((s) => ({
            startSeconds: s.start,
            endSeconds: s.end,
            score: 0.5,
        }));
    }
    return [];
}
