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
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [webcamStream, setWebcamStream] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideosContainerRef = useRef(null);

  const getUserMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true
       });
        setStreamed(stream);
       setWebcamStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Failed to get user media:", err);
    }
  };
  const handleScreenShare = async () => {
    if (!peer) return;

    if (!screenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        const screenTrack = screenStream.getVideoTracks()[0];
     
       
        const sender = peer.getSenders().find(s => s.track.kind === "video");
        if (sender) sender.replaceTrack(screenTrack);

       
        if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;

       
        screenTrack.onended = () => {
          stopScreenShare();
        };

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
    const sender = peer.getSenders().find(s => s.track.kind === "video");
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
videoElement.className =
  "absolute inset-0 w-full h-full object-cover bg-black";
remoteVideosContainerRef.current.appendChild(videoElement);

    }
  }, [remotestream]);

  useEffect(() => {
    socket.on("user-joined", handleNewUserJoined);
    socket.on("incoming-call", handleIncomingCall);
    socket.on("Call-accepted", handleCallAccepted);

    return () => {
      socket.off("user-joined", handleNewUserJoined);
      socket.off("incoming-call", handleIncomingCall);
      socket.off("Call-accepted", handleCallAccepted);
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
      window.location.href = "/"
     setRemoteUsers([]);
  };

  useEffect(() => {
    getUserMedia();
  }, []);

  return (
<div style={{ height: "100dvh" }} className="bg-black flex flex-col relative overflow-hidden">
  <div className="absolute top-3 left-0 right-0 text-center z-20">
    <div className="sm:text-3xl text-[20px] font-bold text-white">
      Room
    </div>
    <h2 className="text-sm text-gray-300">
      {remoteUsers.length > 0
        ? `Connected to: ${remoteUsers.join(", ")}`
        : "Waiting for users..."}
    </h2>
  </div>


  <div className="flex-1 relative">
    <div
      ref={remoteVideosContainerRef}
      className="absolute inset-0 w-full h-full bg-black"
    >
 
    </div>

    <video
      ref={localVideoRef}
      autoPlay
      muted
      playsInline
      className="absolute bottom-4 right-4 w-[120px] h-[180px] sm:w-[180px] sm:h-[240px] rounded-xl shadow-lg object-cover border-2 border-white z-30"
    />
  </div>
  <div className="grid place-items-center">
 <div className="sm:p-3 flex gap-1 sm:border-2 sm:border-amber-50  sm:backdrop-contrast-50 backdrop-blur-md rounded-3xl sm:bg-slate-950/50 sm:gap-6 z-20 sm:h-[9vh] mb-2 h-[6vh] sm:text-[15px] text-[12px] ">
    <button
      onClick={handleCallButton}
      className="sm:px-4 sm:py-3  text-white bg-gradient-to-b from-green-400 to-green-600 "
    >
      Connect
    </button>
    <button
      onClick={toggleCamera}
      className="sm:px-4  sm:py-2 text-white rounded-[20px]  bg-gradient-to-b from-orange-400 to-orange-600 "
    >
      {cameraOn ? "Cam off" : "Cam On"}
    </button>
    <button
      onClick={toggleMic}
      className="sm:px-4 sm:py-2 text-white rounded-[20px] shadow bg-gradient-to-b from-pink-300 to-pink-800"
    >
      {micOn ? "Mute" : "Unmute"}
    </button>
    <button
      onClick={handleScreenShare}
      className="sm:px-4 sm:py-2 text-white rounded-[20px] shadow bg-gradient-to-b from-yellow-600 to-yellow-800 hover:from-yellow-500 hover:to-yellow-700 transition"
    >
      {screenSharing ? "Stop" : "Share"}
    </button>
    <button
      onClick={handleEndCall}
      className="sm:px-4  sm:py-2 text-white rounded-[20px] shadow bg-gradient-to-b from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 transition"
    >
      End
    </button>
  </div>
  </div>
</div>
  );
}

export default Page2;
