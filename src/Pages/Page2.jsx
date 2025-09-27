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
    remotestream,
    addIceCandidate,
  } = Usepeer();

  const [streamed, setStreamed] = useState(null);
  const [partnerId, setPartnerId] = useState(null);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // 🎥 Get user media
  const getUserMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setStreamed(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Failed to get user media:", err);
    }
  };

  // 👥 When partner found, start WebRTC offer
  const handlePartnerFound = useCallback(
    async ({ partnerId }) => {
      console.log("Partner found:", partnerId);
      setPartnerId(partnerId);

      const offer = await createOffer();
      sendStream(streamed);
      socket.emit("signal", { to: partnerId, data: { type: "offer", sdp: offer } });
    },
    [createOffer, sendStream, socket, streamed]
  );

  // 🔄 Handle incoming signals (offer, answer, ICE)
  const handleSignal = useCallback(
    async ({ from, data }) => {
      if (data.type === "offer") {
        const answer = await createAnswer(data.sdp);
        sendStream(streamed);
        socket.emit("signal", { to: from, data: { type: "answer", sdp: answer } });
        setPartnerId(from);
      } else if (data.type === "answer") {
        await setRemoteDescription(data.sdp);
      } else if (data.type === "ice") {
        await addIceCandidate(data.candidate);
      }
    },
    [createAnswer, sendStream, setRemoteDescription, addIceCandidate, streamed, socket]
  );

  // ❌ Handle partner disconnect
  const handlePartnerDisconnected = useCallback(() => {
    console.log("Partner disconnected");
    setPartnerId(null);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  }, []);

  // ICE candidates
  useEffect(() => {
    peer.addEventListener("icecandidate", (event) => {
      if (event.candidate && partnerId) {
        socket.emit("signal", {
          to: partnerId,
          data: { type: "ice", candidate: event.candidate },
        });
      }
    });
  }, [peer, partnerId, socket]);

  // Attach remote stream
  useEffect(() => {
    if (remotestream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remotestream;
    }
  }, [remotestream]);

  useEffect(() => {
    getUserMedia();
socket.on("ready-to-call", ({ peer }) => {
  console.log("Matched with:", peer);

});

socket.on("waiting", ({ message }) => {
  console.log(message);
  
});

socket.on("room-full", ({ message }) => {
  console.log(message);
});
    socket.on("partner-found", handlePartnerFound);
    socket.on("signal", handleSignal);
    socket.on("partner-disconnected", handlePartnerDisconnected);

    return () => {
      socket.off("partner-found", handlePartnerFound);
      socket.off("signal", handleSignal);
      socket.off("partner-disconnected", handlePartnerDisconnected);
    };
  }, [handlePartnerFound, handleSignal, handlePartnerDisconnected, socket]);

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

  const handleNext = () => {
    socket.emit("next-user", { roomid: "my-room" }); // ✅ send room id if required
    handlePartnerDisconnected();
  };

  const handleEndCall = () => {
    if (streamed) streamed.getTracks().forEach((track) => track.stop());
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setPartnerId(null);
  };

  return (
    <div className="bg-slate-900 min-h-screen flex flex-col items-center">
      <h1 className="text-3xl font-bold text-white my-4">1-to-1 Video Chat</h1>

      <div className="flex gap-4">
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="w-[40vw] h-[70vh] rounded-lg shadow-lg bg-black"
        />
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-[40vw] h-[70vh] rounded-lg shadow-lg bg-black"
        />
      </div>

      <div className="flex gap-4 mt-4">
        <button
          onClick={toggleCamera}
          className="px-4 py-2 bg-yellow-600 rounded-lg text-white"
        >
          {cameraOn ? "Turn Camera Off" : "Turn Camera On"}
        </button>
        <button
          onClick={toggleMic}
          className="px-4 py-2 bg-yellow-600 rounded-lg text-white"
        >
          {micOn ? "Mute Mic" : "Unmute Mic"}
        </button>
        <button
          onClick={handleNext}
          className="px-4 py-2 bg-green-600 rounded-lg text-white"
        >
          Next User
        </button>
        <button
          onClick={handleEndCall}
          className="px-4 py-2 bg-red-600 rounded-lg text-white"
        >
          End Call
        </button>
      </div>
    </div>
  );
}

export default Page2;
