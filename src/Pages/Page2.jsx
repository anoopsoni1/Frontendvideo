import React from "react";

function Page2({ localVideoRef, remoteVideosContainerRef, remoteUsers, cameraOn, micOn, handleCallButton, toggleCamera, toggleMic, handleEndCall }) {
  return (
    <div className="min-h-screen bg-gray-100 p-6 flex flex-col items-center">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Video Call Room</h1>
      <h2 className="text-gray-600 mb-6">
        {remoteUsers.length > 0
          ? `Connected to: ${remoteUsers.join(", ")}`
          : "Waiting for users..."}
      </h2>

      {/* Videos */}
      <div className="flex flex-wrap justify-center gap-6 mb-6">
        {/* Local Video */}
        <div className="relative w-72 h-48 rounded-lg overflow-hidden shadow-lg bg-black">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <span className="absolute bottom-2 left-2 bg-gray-800 bg-opacity-50 text-white text-sm px-2 py-1 rounded">
            You
          </span>
        </div>

        {/* Remote Videos */}
        <div
          ref={remoteVideosContainerRef}
          className="flex flex-wrap gap-4 justify-center"
        />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4">
        <button
          onClick={handleCallButton}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow transition"
        >
          Connect Video
        </button>
        <button
          onClick={toggleCamera}
          className={`py-2 px-4 rounded shadow font-semibold transition ${
            cameraOn
              ? "bg-green-600 hover:bg-green-700 text-white"
              : "bg-gray-400 text-gray-800"
          }`}
        >
          {cameraOn ? "Camera On" : "Camera Off"}
        </button>
        <button
          onClick={toggleMic}
          className={`py-2 px-4 rounded shadow font-semibold transition ${
            micOn
              ? "bg-yellow-500 hover:bg-yellow-600 text-white"
              : "bg-gray-400 text-gray-800"
          }`}
        >
          {micOn ? "Mic On" : "Mic Off"}
        </button>
        <button
          onClick={handleEndCall}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded shadow transition"
        >
          End Call
        </button>
      </div>
    </div>
  );
}

export default Page2;
