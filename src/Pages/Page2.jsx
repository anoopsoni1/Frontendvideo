import React, { useCallback, useEffect, useRef, useState } from "react";
import { Usesocket } from "../Provider/Socket";
import { Usepeer } from "../Provider/Peer";

function Page2() {
  const socket = Usesocket();
  const { createOffer, createAnswer, setRemoteDescription, sendStream, addIceCandidate } = Usepeer();

  const [streamed, setStreamed] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({}); // {socketId: MediaStream}
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);

  const localVideoRef = useRef(null);

  // ✅ Get user media
  const getUserMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStreamed(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Failed to get user media:", err);
    }
  };

  // ✅ Helper: Add remote stream to state
  const addRemoteStream = useCallback((socketId, stream) => {
    setRemoteStreams((prev) => ({ ...prev, [socketId]: stream }));
  }, []);

  // ✅ Helper: Remove remote stream when user leaves
  const removeRemoteStream = useCallback((socketId) => {
    setRemoteStreams((prev) => {
      const newStreams = { ...prev };
      delete newStreams[socketId];
      return newStreams;
    });
  }, []);

  // ✅ Handle Offer (incoming)
  const handleReceiveOffer = useCallback(
    async ({ from, offer }) => {
      console.log("📥 Received Offer from", from);
      const answer = await createAnswer(offer, (track) => {
        const remoteStream = new MediaStream();
        remoteStream.addTrack(track);
        addRemoteStream(from, remoteStream);
      });
      socket.emit("send-answer", { to: from, answer });
      if (streamed) sendStream(streamed);
    },
    [createAnswer, socket, streamed, sendStream, addRemoteStream]
  );

  // ✅ Handle Answer
  const handleReceiveAnswer = useCallback(
    async ({ from, answer }) => {
      console.log("📥 Received Answer from", from);
      await setRemoteDescription(answer);
      if (streamed) sendStream(streamed);
    },
    [setRemoteDescription, streamed, sendStream]
  );

  // ✅ Handle ICE Candidate
  const handleReceiveIceCandidate = useCallback(
    async ({ from, candidate }) => {
      console.log("📥 Received ICE candidate from", from);
      try {
        await addIceCandidate(candidate);
      } catch (err) {
        console.error("Failed to add ICE candidate:", err);
      }
    },
    [addIceCandidate]
  );

  // ✅ Handle new user joined -> create offer for them
  const handleUserJoined = useCallback(
    async ({ socketId }) => {
      console.log("👤 New user joined:", socketId);
      const offer = await createOffer((track) => {
        const remoteStream = new MediaStream();
        remoteStream.addTrack(track);
        addRemoteStream(socketId, remoteStream);
      });
      socket.emit("send-offer", { to: socketId, offer });
    },
    [createOffer, socket, addRemoteStream]
  );

  // ✅ Handle all existing users when you join
  const handleAllUsers = useCallback(
    async (existingUsers) => {
      console.log("👥 Existing users in room:", existingUsers);
      for (const userId of existingUsers) {
        const offer = await createOffer((track) => {
          const remoteStream = new MediaStream();
          remoteStream.addTrack(track);
          addRemoteStream(userId, remoteStream);
        });
        socket.emit("send-offer", { to: userId, offer });
      }
    },
    [createOffer, socket, addRemoteStream]
  );

  // ✅ Handle user leaving -> remove their video
  const handleUserLeft = useCallback(
    ({ socketId }) => {
      console.log("❌ User left:", socketId);
      removeRemoteStream(socketId);
    },
    [removeRemoteStream]
  );

  // ✅ Setup socket listeners
  useEffect(() => {
    socket.on("receive-offer", handleReceiveOffer);
    socket.on("receive-answer", handleReceiveAnswer);
    socket.on("receive-ice-candidate", handleReceiveIceCandidate);
    socket.on("user-joined", handleUserJoined);
    socket.on("all-users", handleAllUsers);
    socket.on("user-left", handleUserLeft);

    return () => {
      socket.off("receive-offer", handleReceiveOffer);
      socket.off("receive-answer", handleReceiveAnswer);
      socket.off("receive-ice-candidate", handleReceiveIceCandidate);
      socket.off("user-joined", handleUserJoined);
      socket.off("all-users", handleAllUsers);
      socket.off("user-left", handleUserLeft);
    };
  }, [socket, handleReceiveOffer, handleReceiveAnswer, handleReceiveIceCandidate, handleUserJoined, handleAllUsers, handleUserLeft]);

  useEffect(() => {
    getUserMedia();
  }, []);

  // ✅ Toggle camera
  const toggleCamera = () => {
    if (!streamed) return;
    streamed.getVideoTracks().forEach((track) => (track.enabled = !cameraOn));
    setCameraOn((prev) => !prev);
  };

  // ✅ Toggle mic
  const toggleMic = () => {
    if (!streamed) return;
    streamed.getAudioTracks().forEach((track) => (track.enabled = !micOn));
    setMicOn((prev) => !prev);
  };

  // ✅ End call
  const handleEndCall = () => {
    if (streamed) streamed.getTracks().forEach((track) => track.stop());
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    setRemoteStreams({});
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-2">Video Call Room</h1>
      <h2 className="text-lg mb-4">
        {Object.keys(remoteStreams).length > 0 ? `Connected with ${Object.keys(remoteStreams).length} users` : "Waiting for users..."}
      </h2>

      <div className="flex flex-wrap gap-4 justify-center mb-6">
        {/* Local Video */}
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="w-64 h-48 rounded-lg shadow-lg bg-black object-cover"
        />
        {/* Remote Videos */}
        {Object.entries(remoteStreams).map(([id, stream]) => (
          <video
            key={id}
            autoPlay
            playsInline
            className="w-64 h-48 rounded-lg shadow-lg bg-black object-cover"
            ref={(el) => {
              if (el) el.srcObject = stream;
            }}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-4 justify-center">
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
