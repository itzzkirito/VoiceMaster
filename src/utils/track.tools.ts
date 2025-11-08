import { Client } from "genius-lyrics";

const GeniusClient = new Client();

export async function getLyrics(name: string): Promise<string> {
  try {
    const songs = await GeniusClient.songs.search(name);
    const song = songs[0];
    if (!song) return "No lyrics found";
    return await song.lyrics();
  } catch (error) {
    return "Failed to fetch lyrics";
  }
}

