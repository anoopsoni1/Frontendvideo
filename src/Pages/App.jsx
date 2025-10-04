import { useEffect, useState, useCallback } from "react";
import { Usesocket } from "../Provider/Socket";
import { useNavigate } from "react-router-dom";
import { Sun, Moon } from "lucide-react";

function Home() {
  const socket = Usesocket();
  const [email, setEmail] = useState("");
  const [roomId, setRoomId] = useState("");
  const [theme, setTheme] = useState("dark")

  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem("email", email);
  }, [email]);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  const handleJoinRoom = useCallback(() => {
    if (!email || !roomId) {
      alert("Please enter both Email and Room ID");
      return;
    }
    socket.emit("join-room", { emailid: email, roomid: roomId });
  }, [email, roomId, socket]);

  const handleRoomJoined = useCallback(() => {
    navigate(`/mainpage`);
  }, [navigate]);

  useEffect(() => {
    socket.on("joined-room", handleRoomJoined);
    return () => socket.off("joined-room", handleRoomJoined);
  }, [socket, handleRoomJoined]);

  return (
    <div
      className={`${
        theme === "dark"
          ? "bg-[url('https://img.freepik.com/free-photo/woman-with-headset-video-call_23-2148854900.jpg')]"
          : "bg-[url('https://images.pexels.com/photos/4126695/pexels-photo-4126695.jpeg?auto=compress&cs=tinysrgb&h=627&fit=crop&w=1200')]"
      } bg-cover bg-center min-h-screen relative flex flex-col items-center justify-center`}
    >
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 z-50 p-2 rounded-full bg-gray-700/70 hover:bg-gray-500 text-white"
      >
        {theme === "dark" ? <Sun size={20} color="black"/> : <Moon size={20} color="black" />}
      </button>

      <div className="z-50 relative flex flex-col items-center justify-center gap-6 w-full">
        <h1
          className={`text-3xl font-bold ${
            theme === "dark" ? "text-gray-100" : "text-gray-800"
          }`}
        >
          Join a Room
        </h1>

        <div className="flex flex-col gap-4 w-80">
          <input
            type="text"
            placeholder="Enter your Name"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`p-3 border rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none
              ${theme === "dark" ? "bg-gray-800 text-white border-gray-600" : "bg-white text-black border-gray-300"}`}
          />

          <input
            type="text"
            placeholder="Enter Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className={`p-3 border rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none
              ${theme === "dark" ? "bg-gray-800 text-white border-gray-600" : "bg-white text-black border-gray-300"}`}
          />

          <button
            onClick={handleJoinRoom}
            className={`font-medium py-2 rounded-lg shadow-md transition-all duration-200 
              ${theme === "dark" ? " text-black" : " text-black"}`}
          >
            Enter Room
          </button>
        </div>
      </div>
    </div>
  );
}

export default Home;
