// src/app/prototype/rooms/[roomId]/page.tsx
import RoomClient from "./page.client";

export default function RoomPage({ params }: { params: { roomId: string } }) {
  return <RoomClient roomId={params.roomId} />;
}
