export type MatchdayAudioTrack = {
  id: string;
  label: string;
  src: string;
};

export const MATCHDAY_AUDIO_TRACKS: MatchdayAudioTrack[] = [
  {
    id: "magic-in-the-air",
    label: "Magic in the Air",
    src: "/audio/magic-in-the-air.mp3"
  },
  {
    id: "crystalo-imbattables",
    label: "Crystalo - Imbattables",
    src: "/audio/crystalo-imbattables.mp3"
  }
];

export const DEFAULT_MATCHDAY_AUDIO = MATCHDAY_AUDIO_TRACKS[0];
