import React from "react";
import { Mic, PhoneOff, Video, VideoOff } from "lucide-react";

export function ChatPage() {
  return (
    <div className="bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1f] min-h-screen p-4 flex flex-col">
      <header className="text-white font-bold text-xl mb-4">Olivia</header>

      <div className="flex-1 space-y-3 overflow-y-auto">
     
        <div className="bg-indigo-600 text-white p-3 rounded-2xl self-end max-w-[75%]">
          Hello, how are you?
        </div>
        <div className="bg-gray-700 text-white p-3 rounded-2xl self-start max-w-[75%]">
          I'm good! How about you?
        </div>
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 mt-4">
        <input
          type="text"
          placeholder="Type your message..."
          className="flex-1 p-3 rounded-full bg-gray-800 text-white focus:outline-none"
        />
        <button className="p-3 bg-indigo-600 rounded-full">
          <Mic className="text-white" />
        </button>
      </div>
    </div>
  );
}

export function VoiceCallPage() {
  return (
    <div className="bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1f] min-h-screen flex flex-col items-center justify-center text-white">
      <img
        src="https://via.placeholder.com/150"
        alt="Profile"
        className="w-40 h-40 rounded-full object-cover border-4 border-indigo-600"
      />
      <p className="text-lg mt-4">Olivia</p>
      <p className="text-gray-400 text-sm">00:45</p>

      <div className="flex gap-8 mt-8">
        <button className="p-4 rounded-full bg-red-500">
          <PhoneOff />
        </button>
      </div>
    </div>
  );
}

export function VideoCallPage() {
  return (
    <div className="bg-black min-h-screen relative">
      {/* Remote Video */}
      <video
        autoPlay
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Local Video (small corner preview) */}
      <video
        autoPlay
        muted
        playsInline
        className="absolute bottom-4 right-4 w-28 h-36 rounded-xl border-2 border-white object-cover shadow-lg"
      />

      {/* Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-6">
        <button className="p-4 rounded-full bg-gray-700">
          <Video />
        </button>
        <button className="p-4 rounded-full bg-red-500">
          <PhoneOff />
        </button>
        <button className="p-4 rounded-full bg-gray-700">
          <VideoOff />
        </button>
      </div>
    </div>
  );
}
