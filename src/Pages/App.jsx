import { useEffect, useState, useCallback } from "react";
import { Usesocket } from "../Provider/Socket";
import { useNavigate } from "react-router-dom";

function Home() {
  const socket = Usesocket();
  const [email, setEmail] = useState("");
  const [roomId, setRoomId] = useState("");

  const navigate = useNavigate();

  const handleJoinRoom = useCallback(() => {
    if (!email || !roomId) {
      alert("Please enter both Email and Room ID");
      return;
    }
    // Just emit join-room to tell server we are joining
    socket.emit("join-room", { emailid: email, roomid: roomId });
  }, [email, roomId, socket]);

  useEffect(() => {
    socket.on("joined-room", (roomid) => {
      console.log("✅ Joined room:", roomid);
      // Navigate to group video call page
      navigate(`/room/${roomid}`, { state: { email, roomid } });
    });

    return () => {
      socket.off("joined-room");
    };
  }, [socket, navigate, email, roomId]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-gray-50">
      <h1 className="text-3xl font-bold text-gray-800">Join a Group Call</h1>

      <div className="flex flex-col gap-4 w-80">
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none"
        />

        <input
          type="text"
          placeholder="Enter Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none"
        />

        <button
          onClick={handleJoinRoom}
          className="bg-amber-500 hover:bg-amber-600 text-white font-medium py-2 rounded-lg shadow-md transition-all duration-200"
        >
          Join Group Call
        </button>
      </div>
    </div>
  );
}

export default Home;
