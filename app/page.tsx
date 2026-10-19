import { SongLibrary } from "@/components/SongLibrary";

// Authentication is restored on the client before rendering this route.
export const instant = false;

export default function Home() {
  return <SongLibrary />;
}
