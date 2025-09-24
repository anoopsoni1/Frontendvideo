import React, { useCallback, useEffect, useRef, useState } from "react";
import { Usesocket } from "../Provider/Socket";
import { Usepeer } from "../Provider/Peer";

function Page2() {
  const socket = Usesocket();
  const {
    createPeer,
    createOffer,
    createAnswer,
    setRemoteDescription,
    sendStream,
    addIceCandidate,
    onIceCandidate,
    closeAllPeers,
    remoteStreams,
  } = Usepeer();

  const [streamed, setStreamed] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState([]); // email list
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);

  const localVideoRef = useRef(null);

  // ✅ Get user media
  const getUserMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStreamed(stream);
      sendStream(stream); // send to all existing peers
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Failed to get user media:", err);
    }
  };

  // ✅ New user joins → create a peer for them
  const handleNewUserJoined = useCallback(({ emailid }) => {
    setRemoteUsers((prev) => [...new Set([...prev, emailid])]);
    createPeer(emailid);

    // Listen for ICE candidates for this peer
    onIceCandidate(emailid, (candidate) => {
      socket.emit("ice-candidate", { to: emailid, candidate });
    });
  }, [createPeer, onIceCandidate, socket]);

  // ✅ Incoming call → set remote offer, send answer
  const handleIncomingCall = useCallback(
    async ({ from, offer }) => {
      createPeer(from);
      const answer = await createAnswer(from, offer);
      socket.emit("Call-accepted", { emailid: from, answer });
    },
    [createPeer, createAnswer, socket]
  );

  // ✅ Call accepted → set remote answer
  const handleCallAccepted = useCallback(
    async ({ from, answer }) => {
      await setRemoteDescription(from, answer);
    },
    [setRemoteDescription]
  );

  // ✅ ICE candidate received from remote peer
  const handleIceCandidate = useCallback(
    async ({ from, candidate }) => {
      await addIceCandidate(from, candidate);
    },
    [addIceCandidate]
  );

  // ✅ Socket event listeners
  useEffect(() => {
    socket.on("user-joined", handleNewUserJoined);
    socket.on("incoming-call", handleIncomingCall);
    socket.on("Call-accepted", handleCallAccepted);
    socket.on("ice-candidate", handleIceCandidate);

    return () => {
      socket.off("user-joined", handleNewUserJoined);
      socket.off("incoming-call", handleIncomingCall);
      socket.off("Call-accepted", handleCallAccepted);
      socket.off("ice-candidate", handleIceCandidate);
    };
  }, [socket, handleNewUserJoined, handleIncomingCall, handleCallAccepted, handleIceCandidate]);

  // ✅ Get local media on mount
  useEffect(() => {
    getUserMedia();
  }, []);

  // ✅ Call all connected users
  const handleCallButton = async () => {
    if (!streamed) return alert("No local stream available");
    for (const emailid of remoteUsers) {
      const offer = await createOffer(emailid);
      socket.emit("call-user", { emailid, offer });
    }
  };

  const toggleCamera = () => {
    if (!streamed) return;
    streamed.getVideoTracks().forEach((track) => (track.enabled = !cameraOn));
    setCameraOn((prev) => !prev);
  };

  const toggleMic = () => {
    if (!streamed) return;
    streamed.getAudioTracks().forEach((track) => (track.enabled = !micOn));
    setMicOn((prev) => !prev);
  };

  const handleEndCall = () => {
    streamed?.getTracks().forEach((track) => track.stop());
    closeAllPeers();
    setRemoteUsers([]);
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-2">Video Call Room</h1>
      <h2 className="text-lg mb-4">
        {remoteUsers.length > 0
          ? `Connected to: ${remoteUsers.join(", ")}`
          : "Waiting for users..."}
      </h2>

      {/* Video Grid */}
      <div className="flex flex-wrap gap-4 justify-center mb-6">
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="w-64 h-48 rounded-lg shadow-lg bg-black object-cover"
        />
        {remoteStreams.map(({ email, stream }) => (
          <video
            key={email}
            autoPlay
            playsInline
            className="w-64 h-48 rounded-lg shadow-lg bg-black object-cover"
            ref={(el) => el && (el.srcObject = stream)}
          />
        ))}
      </div>

      {/* Control Buttons */}
      <div className="flex flex-wrap gap-4 justify-center">
        <button
          onClick={handleCallButton}
          className="px-4 py-2 bg-blue-600 text-black rounded-lg shadow hover:bg-blue-700 transition"
        >
          Connect Video
        </button>
        <button
          onClick={toggleCamera}
          className="px-4 py-2 bg-yellow-500 text-black rounded-lg shadow hover:bg-yellow-600 transition"
        >
          {cameraOn ? "Turn Camera Off" : "Turn Camera On"}
        </button>
        <button
          onClick={toggleMic}
          className="px-4 py-2 bg-green-500 text-black rounded-lg shadow hover:bg-green-600 transition"
        >
          {micOn ? "Mute Mic" : "Unmute Mic"}
        </button>
        <button
          onClick={handleEndCall}
          className="px-4 py-2 bg-red-600 text-black rounded-lg shadow hover:bg-red-700 transition"
        >
          End Call
        </button>
      </div>
    </div>
  );
}

export default Page2;
