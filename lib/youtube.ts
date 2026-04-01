import { YoutubeTranscript } from "youtube-transcript";

export async function fetchYouTubeTranscript(videoId: string) {
  const transcript = await YoutubeTranscript.fetchTranscript(videoId);
  return transcript.map((line) => line.text).join(" ");
}
