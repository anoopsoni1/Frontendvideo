import { useEffect, useState, useCallback } from "react";
import { Usesocket } from "../Provider/Socket";
import { useNavigate } from "react-router-dom";

function Home() {
  const socket = Usesocket();
  const [email, setEmail] = useState("");
  const [roomId, setRoomId] = useState("");

  localStorage.setItem("email", email) ;
  
  const navigate = useNavigate();

  const handleJoinRoom = useCallback(() => {
    if (!email || !roomId) {
      alert("Please enter both Email and Room ID");
      return;
    }
    socket.emit("join-room", { emailid: email, roomid: roomId });
  }, [email, roomId, socket]);

  const handleRoomJoined = useCallback(
    () => {
      navigate(`/mainpage`);
    },
    [navigate]
  );

  useEffect(() => {
    socket.on("joined-room", handleRoomJoined);
    return () => socket.off("joined-room", handleRoomJoined);
  }, [socket, handleRoomJoined]);


  return (
    <>
 <div className="bg-[url('https://images.unsplash.com/photo-1615966650071-855b15f29ad1?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8c3Vuc2V0JTIwY291cGxlfGVufDB8fDB8fHww')] bg-cover bg-center">
    <div className="z-50 relative top-0 flex flex-col items-center justify-center min-h-screen gap-6 ">
      <h1 className="text-3xl font-bold text-gray-100">Join a Room</h1>

      <div className="flex flex-col gap-4 w-80">
        <input
          type="email"
          placeholder="Enter your Name"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="p-3 border text-white border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none"
        />

        <input
          type="text"
          placeholder="Enter Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className="p-3 border border-gray-300 text-white rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none"
        />

        <button
          onClick={handleJoinRoom}
          className="bg-amber-500 hover:bg-amber-600 text-white font-medium py-2 rounded-lg shadow-md transition-all duration-200"
        >
          Enter Room
        </button>
      </div>
    </div>
    </div>
    </>
  );
}

export default Home  ;


