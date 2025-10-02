import React, { useCallback, useEffect, useRef, useState } from "react";
import { Usesocket } from "../Provider/Socket";
import { Usepeer } from "../Provider/Peer";
import { Sun, Moon } from "lucide-react";
import { PiVideoCameraDuotone, PiVideoCameraSlashDuotone } from "react-icons/pi";
import { MdCastConnected, MdScreenShare, MdOutlineStopScreenShare, MdCallEnd } from "react-icons/md";
import { IoVolumeMute } from "react-icons/io5";
import { VscUnmute } from "react-icons/vsc";
 import { BsRecordBtn } from "react-icons/bs";
 import { IoChatbubbleSharp } from "react-icons/io5";
 import { PiChatCircleSlashFill } from "react-icons/pi";

function Page2() {
  const socket = Usesocket();
  const { peer, createOffer, createAnswer, setRemoteDescription, sendStream, remotestream, addIceCandidate } = Usepeer();

  const [streamed, setStreamed] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState(() => {
    const saved = localStorage.getItem("remoteUsers");
    return saved ? JSON.parse(saved) : [];
  });
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [webcamStream, setWebcamStream] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatVisible, setChatVisible] = useState(false);
  const [theme, setTheme] = useState("dark");

  const [isLocalBig, setIsLocalBig] = useState(true);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const userId = localStorage.getItem("email");

  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [isRecording, setIsRecording] = useState(false);


  const [dragPos, setDragPos] = useState({ top: 480, left: 10 });
  const dragRef = useRef(null);
  const offset = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
  };

  const getUserMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 60 , max : 100} },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
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
    setRemoteUsers((prev) => {
      const updated = [...new Set([...prev, emailid])];
      localStorage.setItem("remoteUsers", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleIncomingCall = useCallback(
    async ({ from, offer }) => {
      const answer = await createAnswer(offer);
      socket.emit("Call-accepted", { emailid: from, answer });
      setRemoteUsers((prev) => {
        const updated = [...new Set([...prev, from])];
        localStorage.setItem("remoteUsers", JSON.stringify(updated));
        return updated;
      });
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
    if (remotestream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remotestream;
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

  useEffect(() => {
    if (remoteUsers.length > 0 && streamed) {
      (async () => {
        const offer = await createOffer();
        sendStream(streamed);
        remoteUsers.forEach((remoteEmail) => {
          socket.emit("call-user", { emailid: remoteEmail, offer });
        });
      })();
    }
  }, [remoteUsers, streamed, createOffer, sendStream, socket]);

 useEffect(()=>{
const handleCallButton = async () => {
    const offer = await createOffer();
    sendStream(streamed);
    remoteUsers.forEach((remoteEmail) => {
      socket.emit("call-user", { emailid: remoteEmail, offer });
    });
  };
  handleCallButton()
  })
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
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    localStorage.removeItem("remoteUsers");
    localStorage.removeItem("email");
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

  const handleMouseDown = (e) => {
    isDragging.current = true;
    offset.current = {
      x: e.clientX - dragPos.left,
      y: e.clientY - dragPos.top,
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    const newLeft = e.clientX - offset.current.x;
    const newTop = e.clientY - offset.current.y;
    setDragPos({
      left: Math.max(0, Math.min(newLeft, window.innerWidth - dragRef.current.offsetWidth)),
      top: Math.max(0, Math.min(newTop, window.innerHeight - dragRef.current.offsetHeight)),
    });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleTouchStart = (e) => {
    isDragging.current = true;
    const touch = e.touches[0];
    offset.current = {
      x: touch.clientX - dragPos.left,
      y: touch.clientY - dragPos.top,
    };
  };

  const handleTouchMove = (e) => {
    if (!isDragging.current) return;
    const touch = e.touches[0];
    const newLeft = touch.clientX - offset.current.x;
    const newTop = touch.clientY - offset.current.y;
    setDragPos({
      left: Math.max(0, Math.min(newLeft, window.innerWidth - dragRef.current.offsetWidth)),
      top: Math.max(0, Math.min(newTop, window.innerHeight - dragRef.current.offsetHeight)),
    });
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  const handleSwapVideos = () => {
    if (!localVideoRef.current || !remoteVideoRef.current) return;
    const tempStream = localVideoRef.current.srcObject;
    localVideoRef.current.srcObject = remoteVideoRef.current.srcObject;
    remoteVideoRef.current.srcObject = tempStream;
    setIsLocalBig((prev) => !prev);
  };

useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && webcamStream && localVideoRef.current) {
        localVideoRef.current.srcObject = webcamStream;
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [webcamStream]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
        localStorage.removeItem("email");
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);


  const startRecording = () => {
    if (!remotestream) return alert("No User");
    alert("Recording Has Been started")
    const recorder = new MediaRecorder(webcamStream);
    setMediaRecorder(recorder);
    setRecordedChunks([]);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) setRecordedChunks((prev) => [...prev, e.data]);
    };
    recorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "recorded_video.webm";
      a.click();
    };
    recorder.start();
    setIsRecording(true);
  };
  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };


  return (
    <div
      style={{ height: "100dvh" }}
      className={`${theme === "dark" ? "bg-black" : "bg-white  "} flex flex-col relative overflow-hidden`}
    >
      <button
        onClick={toggleTheme}
        className={`absolute top-3 right-3 z-50 p-2 rounded-full ${theme==="dark" ? "bg-white": "bg-black"}`}
      >
        {theme === "dark" ? <Sun size={20} color="black" /> : <Moon size={20} color="black" />}
      </button>

      <div className="absolute top-3 left-0 right-0 text-center z-20">
        <div className={`sm:text-3xl text-[20px] font-bold ${theme=== "dark" ? "text-white" : "text-black"}`}>Room</div>
        <h2 className={`text-[15px] opacity-100 ${theme=== "dark" ? "text-white" : "text-black"}`}>
          {remoteUsers.length > 0 ? `Connected to: ${remoteUsers.join(", ")}` : "Waiting for users..."}
        </h2>
      </div>

      <div className="flex-1 relative">
        {isLocalBig ? (
          <video ref={localVideoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-screen object-cover -scale-x-100" />
        ) : (
          <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-screen object-cover -scale-x-100" />
        )}

        <div
          ref={dragRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onClick={handleSwapVideos}
          className="absolute w-[100px] h-[120px] sm:w-[180px] sm:h-[240px] rounded-xl shadow-lg border-2 border-white cursor-pointer overflow-hidden z-30"
          style={{ top: dragPos.top, left: dragPos.left }}
        >
          {isLocalBig ? (
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover -scale-x-100" />
          ) : (
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover -scale-x-100" />
          )}
        </div>
      </div>

      <div className="grid place-items-center">
        <div
          className={`md:p-3 flex gap-1 md:border-2 rounded-3xl md:gap-6 sm:h-[9vh] md:h-[9vh] mb-2 h-[6vh] sm:text-[15px] text-[12px] place-items-center z-30
            ${theme === "dark" ? "md:bg-slate-950/50 md:border-amber-50" : " md:bg-white/20 lg:border-pink-100 "}`}
        >
          <button onClick={toggleCamera} className={`px-3 py-1 rounded-lg hover:bg-gray-600 ${theme === "dark" ? "text-black" : "text-black"}`}>
            {cameraOn ? <PiVideoCameraDuotone size={20} /> : <PiVideoCameraSlashDuotone size={20} />}
          </button>
          <button onClick={toggleMic} className={`px-3 py-1 rounded-lg hover:bg-gray-600 ${theme === "dark" ? "text-black" : "text-black"}`}>
            {micOn ? <VscUnmute size={20} /> : <IoVolumeMute size={20} />}
          </button>
          <button onClick={isRecording ? stopRecording : startRecording} className={`px-3 py-1 rounded-lg hover:bg-gray-600 ${theme === "dark" ? "text-black" : "text-black"}`}>
              {isRecording ? <BsRecordBtn size={20} color="red"/> : <BsRecordBtn  size={20} />}
            </button>

          <button onClick={handleScreenShare} className={`px-3 py-1 rounded-lg hover:bg-gray-600 ${theme === "dark" ? "text-black" : "text-black"}`}>
            {screenSharing ? <MdOutlineStopScreenShare size={20} /> : <MdScreenShare size={20} />}
          </button>
          <button onClick={handleEndCall} className={`px-3 py-1 rounded-lg hover:bg-gray-600 ${theme === "dark" ? "text-black" : "text-black"}`}>
            <MdCallEnd size={20} color="red" />
          </button>
        </div>
      </div>

      <button
        onClick={toggleChat}
        className="absolute left-2 sm:right sm:top-1/2 sm:w-[8vh]  top-1/20 transform -translate-y-1/2 z-50 bg-green-600  px-3 py-2 rounded-l-full shadow-lg"
      >< IoChatbubbleSharp  size={20} color="black"/> </button>
      <div
        className={`absolute right-0 bottom-0 w-full sm:w-[50vh] h-1/2 z-50 ${
          theme === "dark" ? "bg-black/80 text-white" : "bg-gray-100/90 text-black"
        } backdrop-blur-md flex flex-col p-2 gap-2 overflow-hidden rounded-tl-xl z-40 transition-transform duration-300 ${
          chatVisible ? "translate-x-1" : "translate-x-full"
        }`}
      >
        <div className="flex-1 overflow-y-auto space-y-1">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`p-2 rounded-md ${msg.self ? "bg-blue-500 self-end text-white text-[16px]" :  " text-[16px]bg-gray-700 text-white self-start"}`}
            >
              {!msg.self && <div className="text-xs opacity-70 mb-1">{msg.from}</div>}
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
            className={`flex-1 p-2 rounded-md ${theme === "dark" ? "bg-gray-900 text-white" : "bg-white text-black border"}`}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button onClick={sendMessage} className={`px-3 py-2 bg-green-600 rounded-md ${theme === "dark" ? "text-black bg-white" :""}`}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default Page2;