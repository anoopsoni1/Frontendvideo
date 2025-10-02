import React, { useEffect, useRef, useState, useCallback } from "react";
import { Usepeer } from "../Provider/Peer";
import { Usesocket } from "../Provider/Socket";
import { FaVideo, FaMicrophone, FaDesktop } from "react-icons/fa";
import { BsFillRecordCircleFill } from "react-icons/bs";
import { MdOutlineCallEnd } from "react-icons/md";
import { LuMessageSquare } from "react-icons/lu";
import Draggable from "react-draggable";
import ChatBox from "../Components/ChatBox";
import { Sun, Moon } from "lucide-react";

function Page2() {
  const socket = Usesocket();
  const {
    peer,
    createOffer,
    createAnswer,
    setRemoteDescription,
    sendStream,
    remotestream,
  } = Usepeer();

  const [streamed, setStreamed] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState(
    JSON.parse(localStorage.getItem("remoteUsers")) || []
  );
  const [email, setEmail] = useState(localStorage.getItem("email"));

  const videoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const connectionRef = useRef(null);

  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recorder, setRecorder] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMyVideoLarge, setIsMyVideoLarge] = useState(true);

  // ✅ glare-safe incoming offer handler
  const handleIncomingCall = useCallback(
    async ({ from, offer }) => {
      try {
        if (peer.signalingState !== "stable") {
          console.warn("Glare detected, rolling back...");
          await peer.setLocalDescription({ type: "rollback" });
        }

        await setRemoteDescription(offer);
        const answer = await createAnswer(offer);

        socket.emit("Call-accepted", { emailid: from, answer });

        setRemoteUsers((prev) => {
          const updated = [...new Set([...prev, from])];
          localStorage.setItem("remoteUsers", JSON.stringify(updated));
          return updated;
        });

        if (streamed) sendStream(streamed);
      } catch (err) {
        console.error("Error handling incoming call:", err);
      }
    },
    [createAnswer, socket, streamed, sendStream, peer, setRemoteDescription]
  );

  // ✅ glare-safe answer handler
  const handleCallAccepted = useCallback(
    async ({ answer }) => {
      try {
        if (peer.signalingState === "have-local-offer") {
          await setRemoteDescription(answer);
          if (streamed) sendStream(streamed);
        } else {
          console.warn("Skipping answer, state=", peer.signalingState);
        }
      } catch (err) {
        console.error("Error handling call accepted:", err);
      }
    },
    [setRemoteDescription, streamed, sendStream, peer]
  );

  // ✅ setup streams
  useEffect(() => {
    const getUserMediaStream = async () => {
      try {
        const constraints = { video: true, audio: true };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        setStreamed(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Error accessing media devices:", error);
      }
    };

    getUserMediaStream();

    socket.on("incoming-call", handleIncomingCall);
    socket.on("call-accepted", handleCallAccepted);

    return () => {
      socket.off("incoming-call", handleIncomingCall);
      socket.off("call-accepted", handleCallAccepted);
    };
  }, [socket, handleIncomingCall, handleCallAccepted]);

  // ✅ auto-call remote users after refresh, but only if stable
  useEffect(() => {
    if (remoteUsers.length > 0 && streamed) {
      (async () => {
        if (peer.signalingState === "stable") {
          try {
            const offer = await createOffer();
            await peer.setLocalDescription(offer);
            sendStream(streamed);

            remoteUsers.forEach((remoteEmail) => {
              socket.emit("call-user", { emailid: remoteEmail, offer });
            });
          } catch (err) {
            console.error("Error creating offer:", err);
          }
        } else {
          console.warn("Skipping offer, state=", peer.signalingState);
        }
      })();
    }
  }, [remoteUsers, streamed, createOffer, sendStream, socket, peer]);

  // ✅ show remote video
  useEffect(() => {
    if (remotestream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remotestream;
    }
  }, [remotestream]);

  // ✅ toggle mic
  const handleToggleMic = () => {
    if (streamed) {
      streamed.getAudioTracks().forEach((track) => (track.enabled = !track.enabled));
      setIsMicOn((prev) => !prev);
    }
  };

  // ✅ toggle camera
  const handleToggleCamera = () => {
    if (streamed) {
      streamed.getVideoTracks().forEach((track) => (track.enabled = !track.enabled));
      setIsCameraOn((prev) => !prev);
    }
  };

  // ✅ screen share
  const handleShareScreen = async () => {
    if (!isSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        const sender = peer.getSenders().find((s) => s.track.kind === "video");
        if (sender) sender.replaceTrack(screenTrack);
        setIsSharing(true);
        screenTrack.onended = () => handleStopShareScreen();
      } catch (err) {
        console.error("Error sharing screen:", err);
      }
    } else {
      handleStopShareScreen();
    }
  };

  const handleStopShareScreen = () => {
    if (streamed) {
      const videoTrack = streamed.getVideoTracks()[0];
      const sender = peer.getSenders().find((s) => s.track.kind === "video");
      if (sender) sender.replaceTrack(videoTrack);
    }
    setIsSharing(false);
  };

  // ✅ recording
  const handleStartRecording = () => {
    if (streamed) {
      const mediaRecorder = new MediaRecorder(streamed);
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) setRecordedChunks((prev) => [...prev, e.data]);
      };
      mediaRecorder.start();
      setRecorder(mediaRecorder);
      setIsRecording(true);
    }
  };

  const handleStopRecording = () => {
    if (recorder) {
      recorder.stop();
      setIsRecording(false);
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "recording.webm";
      a.click();
      setRecordedChunks([]);
    }
  };

  // ✅ end call
  const handleEndCall = () => {
    if (connectionRef.current) connectionRef.current.close();
    if (streamed) streamed.getTracks().forEach((track) => track.stop());
    setStreamed(null);
    localStorage.removeItem("remoteUsers");
    window.location.href = "/";
  };

  const handleToggleChat = () => setIsChatOpen((prev) => !prev);
  const handleToggleTheme = () => setIsDarkMode((prev) => !prev);
  const handleVideoClick = () => setIsMyVideoLarge((prev) => !prev);

  return (
    <div
      className={`relative h-screen w-screen flex flex-col items-center justify-center transition-colors duration-500 ${
        isDarkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-black"
      }`}
    >
      <button
        onClick={handleToggleTheme}
        className="absolute top-4 right-4 p-2 rounded-full shadow-lg hover:scale-110 transition-transform"
      >
        {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
      </button>

      {/* Video Area */}
      <div className="flex w-full h-full justify-center items-center gap-2">
        <div
          className="relative cursor-pointer"
          onClick={handleVideoClick}
        >
          <video
            ref={isMyVideoLarge ? videoRef : remoteVideoRef}
            autoPlay
            playsInline
            muted
            className="w-[80vw] h-[70vh] rounded-xl shadow-lg object-cover"
          />
        </div>
        <div
          className="relative cursor-pointer"
          onClick={handleVideoClick}
        >
          <video
            ref={isMyVideoLarge ? remoteVideoRef : videoRef}
            autoPlay
            playsInline
            className="w-[20vw] h-[20vh] rounded-xl shadow-lg object-cover"
          />
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-6 flex space-x-6 bg-opacity-40 px-6 py-3 rounded-full shadow-md">
        <button onClick={handleToggleMic} className="p-3 rounded-full shadow-lg bg-white hover:scale-110 transition">
          <FaMicrophone className={isMicOn ? "text-green-500" : "text-red-500"} />
        </button>
        <button onClick={handleToggleCamera} className="p-3 rounded-full shadow-lg bg-white hover:scale-110 transition">
          <FaVideo className={isCameraOn ? "text-green-500" : "text-red-500"} />
        </button>
        <button onClick={handleShareScreen} className="p-3 rounded-full shadow-lg bg-white hover:scale-110 transition">
          <FaDesktop className={isSharing ? "text-green-500" : "text-black"} />
        </button>
        <button
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          className="p-3 rounded-full shadow-lg bg-white hover:scale-110 transition"
        >
          <BsFillRecordCircleFill className={isRecording ? "text-red-500" : "text-black"} />
        </button>
        <button onClick={handleEndCall} className="p-3 rounded-full shadow-lg bg-red-500 hover:scale-110 transition">
          <MdOutlineCallEnd className="text-white" />
        </button>
        <button onClick={handleToggleChat} className="p-3 rounded-full shadow-lg bg-white hover:scale-110 transition">
          <LuMessageSquare className="text-black" />
        </button>
      </div>

      {/* Chat Box */}
      {isChatOpen && (
        <Draggable>
          <div className="absolute top-20 right-6 w-80 h-96 bg-white shadow-xl rounded-lg overflow-hidden">
            <ChatBox socket={socket} email={email} />
          </div>
        </Draggable>
      )}
    </div>
  );
}

export default Page2;
