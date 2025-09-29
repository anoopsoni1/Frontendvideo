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
          ? "bg-[url('https://images.unsplash.com/photo-1615966650071-855b15f29ad1?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8c3Vuc2V0JTIwY291cGxlfGVufDB8fDB8fHww')]"
          : "bg-[url('https://blog.zegocloud.com/wp-content/uploads/2023/05/video-call-service.jpg')]"
      } bg-cover bg-center min-h-screen relative flex flex-col items-center justify-center`}
    >
      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 z-50 p-2 rounded-full bg-gray-700/70 hover:bg-gray-500 text-white"
      >
        {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
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
              ${theme === "dark" ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-yellow-500 hover:bg-yellow-600 text-white"}`}
          >
            Enter Room
          </button>
        </div>
      </div>
    </div>
  );
}

export default Home;
