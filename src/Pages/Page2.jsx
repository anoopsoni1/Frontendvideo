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

  const userId = localStorage.getItem("email"); 

  const [streamed, setStreamed] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [webcamStream, setWebcamStream] = useState(null);


  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatVisible, setChatVisible] = useState(false); 

  const localVideoRef = useRef(null);
  const remoteVideosContainerRef = useRef(null);

  const getUserMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStreamed(stream);
      setWebcamStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Failed to get user media:", err);
    }
  };

  const handleScreenShare = async () => {
    if (!navigator.mediaDevices.getDisplayMedia) {
      alert("Your browser does not support screen sharing.");
      return;
    }
    if (!peer) return;

    if (!screenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        const sender = peer.getSenders().find((s) => s.track.kind === "video");
        if (sender) sender.replaceTrack(screenTrack);

        if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;

        screenTrack.onended = () => stopScreenShare();
        setScreenSharing(true);
      } catch (err) {
        console.error("Screen sharing failed:", err);
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    if (!peer || !webcamStream) return;

    const videoTrack = webcamStream.getVideoTracks()[0];
    const sender = peer.getSenders().find((s) => s.track.kind === "video");
    if (sender) sender.replaceTrack(videoTrack);

    if (localVideoRef.current) localVideoRef.current.srcObject = webcamStream;
    setScreenSharing(false);
  };

  const handleNewUserJoined = useCallback(({ emailid }) => {
    setRemoteUsers((prev) => [...new Set([...prev, emailid])]);
  }, []);

  const handleIncomingCall = useCallback(
    async ({ from, offer }) => {
      const answer = await createAnswer(offer);
      socket.emit("Call-accepted", { emailid: from, answer });
      setRemoteUsers((prev) => [...new Set([...prev, from])]);
      if (streamed) sendStream(streamed);
    },
    [createAnswer, socket, streamed, sendStream]
  );

  const handleCallAccepted = useCallback(
    async ({ answer }) => {
      await setRemoteDescription(answer);
      if (streamed) sendStream(streamed);
    },
    [setRemoteDescription, streamed, sendStream]
  );

  useEffect(() => {
    peer.addEventListener("icecandidate", (event) => {
      if (event.candidate) {
        remoteUsers.forEach((remoteEmail) => {
          socket.emit("ice-candidate", { to: remoteEmail, candidate: event.candidate });
        });
      }
    });

    socket.on("ice-candidate", async ({ candidate }) => {
      try {
        await addIceCandidate(candidate);
      } catch (err) {
        console.error("Failed to add ICE candidate:", err);
      }
    });

    return () => {
      socket.off("ice-candidate");
    };
  }, [peer, remoteUsers, socket, addIceCandidate]);

  useEffect(() => {
    if (remotestream) {
      const videoElement = document.createElement("video");
      videoElement.srcObject = remotestream;
      videoElement.autoplay = true;
      videoElement.playsInline = true;
      videoElement.className = "absolute inset-0 w-full h-full object-cover bg-black ";
      remoteVideosContainerRef.current.appendChild(videoElement);
    }
  }, [remotestream]);

  useEffect(() => {
    socket.on("user-joined", handleNewUserJoined);
    socket.on("incoming-call", handleIncomingCall);
    socket.on("Call-accepted", handleCallAccepted);

    socket.on("chat-message", ({ message, from }) => {
      setMessages((prev) => [...prev, { self: false, message, from }]);
    });

    return () => {
      socket.off("user-joined", handleNewUserJoined);
      socket.off("incoming-call", handleIncomingCall);
      socket.off("Call-accepted", handleCallAccepted);
      socket.off("chat-message");
    };
  }, [socket, handleNewUserJoined, handleIncomingCall, handleCallAccepted]);

  useEffect(() => {
    getUserMedia();
  }, []);

  const handleCallButton = async () => {
    if (!remoteUsers.length || !streamed) return alert("No remote users or local stream available");
    const offer = await createOffer();
    sendStream(streamed);
    remoteUsers.forEach((remoteEmail) => {
      socket.emit("call-user", { emailid: remoteEmail, offer });
    });
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
    if (streamed) streamed.getTracks().forEach((track) => track.stop());
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideosContainerRef.current) remoteVideosContainerRef.current.innerHTML = "";
    window.location.href = "/";
    setRemoteUsers([]);
    setMessages([]);
  };

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    socket.emit("chat-message", { message: chatInput, from: userId });
    setMessages((prev) => [...prev, { self: true, message: chatInput, from: userId }]);
    setChatInput("");
  };

  const toggleChat = () => setChatVisible((prev) => !prev);

  return (
    <div style={{ height: "100dvh" }} className="bg-black flex flex-col relative overflow-hidden">
      <div className="absolute top-3 left-0 right-0 text-center z-20">
        <div className="sm:text-3xl text-[20px] font-bold text-white">Room</div>
        <h2 className="text-sm text-gray-300">
          {remoteUsers.length > 0 ? `Connected to: ${remoteUsers.join(", ")}` : "Waiting for users..."}
        </h2>
      </div>

      <div className="flex-1 relative">
        <div ref={remoteVideosContainerRef} className="absolute inset-0 w-full h-full bg-black"></div>
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="absolute bottom-4 left-4 w-[120px] h-[180px] sm:w-[180px] sm:h-[240px] rounded-xl shadow-lg object-cover border-2 border-white z-30"
        />
      </div>

      <div className="grid place-items-center">
        <div className="md:p-3 sm:absolute absolute sm:bottom-3 flex gap-[2.9px] md:border-2 md:border-amber-50  md:backdrop-contrast-50 backdrop-blur-md rounded-3xl md:bg-slate-950/50 md:gap-6 z-20 sm:h-[9vh] md:h-[9vh] mb-2 h-[6vh] sm:text-[15px] text-[12px] place-items-center ">
          <button
            onClick={handleCallButton}
            className="sm:px-4 sm:py-2 rounded-lg text-white hover:bg-gray-600 "
          >
            Connect
          </button>
          <button
            onClick={toggleCamera}
            className="sm:px-4 sm:py-2 rounded-lg text-white hover:bg-gray-600 "
          >
            {cameraOn ? "Camoff" : "Cam On"}
          </button>
          <button
            onClick={toggleMic}
            className="sm:px-4 sm:py-2 text-center  shadow rounded-lg text-white hover:bg-gray-600"
          >
            {micOn ? "Mute" : "Unmute"}
          </button>
          <button
            onClick={handleScreenShare}
            className="sm:px-4 sm:py-2 rounded-lg text-white hover:bg-gray-600"
          >
            {screenSharing ? "Stop" : "Share"}
          </button>
          <button
            onClick={handleEndCall}
            className="sm:px-4  sm:py-2 rounded-lg text-white hover:bg-gray-600"
          >
            End
          </button>
        </div>
      </div>

      <button
        onClick={toggleChat}
        className="absolute right-2 top-1/2 transform -translate-y-1/2 z-50 bg-green-600 text-white px-3 py-2 rounded-l-full shadow-lg"
      >
        {chatVisible ? "Close Chat" : "Open Chat"}
      </button>

      <div
        className={`absolute right-0 bottom-0 w-full sm:w-[50vh] h-1/2 bg-black/80 backdrop-blur-md flex flex-col p-2 gap-2 overflow-hidden rounded-tl-xl z-40 transition-transform duration-300 ${
          chatVisible ? "-translate-x-1" : "translate-x-full"
        }`}
      >
        <div className="flex-1 overflow-y-auto space-y-1">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`p-2 rounded-md text-white ${
                msg.self ? "bg-blue-500 self-end" : "bg-gray-700 self-start"
              }`}
            >
              {!msg.self && <div className="text-xs text-gray-300 mb-1">{msg.from}</div>}
              {msg.message}
            </div>
          ))}
        </div>
        <div className="flex gap-1 mt-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 p-2 rounded-md bg-gray-900 text-white"
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button
            onClick={sendMessage}
            className="px-3 py-2 bg-green-600 rounded-md text-white"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default Page2;
