import React, { useCallback, useEffect, useRef, useState } from "react";
import { Usesocket } from "../Provider/Socket";
import { Usepeer } from "../Provider/Peer";

function Page2() {
  const socket = Usesocket();
  const {
    peer,
    createOffer,
    createAnswer,
    setRemoteDescription,
    sendStream,
    addIceCandidate,
    localStream,
    remotestream,
  } = Usepeer();

  const [remoteUsers, setRemoteUsers] = useState([]); // Track multiple remote users
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);

  const localVideoRef = useRef(null);
  const remoteVideosRef = useRef({}); // Store refs for remote users

  // Get local media
  const getUserMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      sendStream(stream); // Send to peer
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Failed to get user media:", err);
    }
  };

  useEffect(() => { getUserMedia(); }, []);

  // Toggle Camera
  const toggleCamera = () => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach(track => (track.enabled = !cameraOn));
    setCameraOn(prev => !prev);
  };

  // Toggle Mic
  const toggleMic = () => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach(track => (track.enabled = !micOn));
    setMicOn(prev => !prev);
  };

  // End Call
  const handleEndCall = () => {
    if (localStream) localStream.getTracks().forEach(track => track.stop());
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    Object.values(remoteVideosRef.current).forEach(v => v.srcObject = null);
    setRemoteUsers([]);
  };

  // Create offer to all remote users
  const handleCallButton = async () => {
    if (!remoteUsers.length || !localStream) return alert("No remote users or local stream available");
    const offer = await createOffer();
    sendStream(localStream);
    remoteUsers.forEach(emailid => socket.emit("call-user", { emailid, offer }));
  };

  // Handle incoming call
  const handleIncomingCall = useCallback(async ({ from, offer }) => {
    const answer = await createAnswer(offer);
    socket.emit("Call-accepted", { emailid: from, answer });
    if (!remoteUsers.includes(from)) setRemoteUsers(prev => [...prev, from]);
  }, [createAnswer, socket, remoteUsers]);

  // Handle call accepted
  const handleCallAccepted = useCallback(async ({ answer }) => {
    await setRemoteDescription(answer);
  }, [setRemoteDescription]);

  // ICE candidate handling
  useEffect(() => {
    peer.addEventListener("icecandidate", e => {
      if (e.candidate) {
        remoteUsers.forEach(emailid => socket.emit("ice-candidate", { to: emailid, candidate: e.candidate }));
      }
    });

    socket.on("ice-candidate", async ({ candidate }) => {
      await addIceCandidate(candidate);
    });

    socket.on("incoming-call", handleIncomingCall);
    socket.on("Call-accepted", handleCallAccepted);

    return () => {
      socket.off("ice-candidate");
      socket.off("incoming-call", handleIncomingCall);
      socket.off("Call-accepted", handleCallAccepted);
    };
  }, [peer, remoteUsers, socket, addIceCandidate, handleIncomingCall, handleCallAccepted]);

  // Render remote streams dynamically
  useEffect(() => {
    if (remotestream) {
      const videoId = `remote-${remotestream.id}`;
      if (!remoteVideosRef.current[videoId]) {
        remoteVideosRef.current[videoId] = document.createElement("video");
        const v = remoteVideosRef.current[videoId];
        v.srcObject = remotestream;
        v.autoplay = true;
        v.playsInline = true;
        v.className = "w-72 h-48 rounded-lg bg-black object-cover shadow-lg";
        document.getElementById("remote-videos").appendChild(v);
      }
    }
  }, [remotestream]);

  return (
    <div className="flex flex-col items-center p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-4 text-gray-800">Video Call Room</h1>
      <h2 className="text-lg mb-6 text-gray-600">
        {remoteUsers.length > 0 ? `Connected to: ${remoteUsers.join(", ")}` : "Waiting for users..."}
      </h2>

      <div className="flex flex-wrap justify-center gap-4 mb-6">
        {/* Local Video */}
        <div className="relative w-72 h-48 rounded-lg overflow-hidden shadow-lg bg-black">
          <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          <div className="absolute bottom-2 left-2 bg-gray-800 bg-opacity-50 text-white text-sm px-2 py-1 rounded">You</div>
        </div>

        {/* Remote Videos */}
        <div id="remote-videos" className="flex flex-wrap gap-4"></div>
      </div>

      {/* Controls */}
      <div className="flex gap-4">
        <button onClick={handleCallButton} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow">
          Connect Video
        </button>
        <button
          onClick={toggleCamera}
          className={`py-2 px-4 rounded shadow font-semibold ${cameraOn ? "bg-green-600 hover:bg-green-700 text-white" : "bg-gray-400 text-gray-800"}`}
        >
          {cameraOn ? "Camera On" : "Camera Off"}
        </button>
        <button
          onClick={toggleMic}
          className={`py-2 px-4 rounded shadow font-semibold ${micOn ? "bg-yellow-500 hover:bg-yellow-600 text-white" : "bg-gray-400 text-gray-800"}`}
        >
          {micOn ? "Mic On" : "Mic Off"}
        </button>
        <button onClick={handleEndCall} className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded shadow">
          End Call
        </button>
      </div>
    </div>
  );
}

export default Page2;
