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
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
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
      videoElement.className = "sm:w-[100vh] sm:h-[75vh]  rounded-lg shadow-lg bg-black object-cover";
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
    <div className="bg-black h-screen">
      <div className="flex flex-col items-center">
        <div className="sm:text-3xl text-[25px] font-bold mb-2">Room</div>
        <h2 className="text-lg mb-2">
          {remoteUsers.length > 0 ? `Connected to: ${remoteUsers.join(", ")}` : "Waiting for users..."}
        </h2>

        <div className="sm:flex gap-4">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="sm:w-[100vh] sm:h-[75vh] rounded-lg shadow-lg bg-black sm:block absolute inset-0 w-full h-full object-cover"
          />
          <div ref={remoteVideosContainerRef} className="flex flex-wrap gap-4" />
        </div>

        <div className=" z-50 relative top-[80vh] flex text-[6px] sm:gap-4 gap-2 mt-2 justify-center border-[2px] sm:p-2 bg-neutral-100 rounded-2xl  ">
          <button
            onClick={handleCallButton}
            className="sm:px-2 sm:py-1 text-white rounded-lg shadow bg-gradient-to-b from-yellow-600 to-yellow-800 hover:bg-yellow-500 transition"
          >
            Connect Video
          </button>
          <button
            onClick={toggleCamera}
            className="sm:px-2 sm:py-1 bg-gradient-to-b from-yellow-600 to-yellow-800 hover:bg-yellow-500 transition"
          >
            {cameraOn ? "Turn Camera Off" : "Turn Camera On"}
          </button>
          <button
            onClick={toggleMic}
            className="sm:px-2 sm:py-1 bg-gradient-to-b from-yellow-600 to-yellow-800 hover:bg-yellow-500 transition"
          >
            {micOn ? "Mute Mic" : "Unmute Mic"}
          </button>
         
       <button
    onClick={handleScreenShare}
    className="sm:px-2 sm:py-1 bg-gradient-to-b from-yellow-600 to-yellow-800 hover:bg-yellow-500 transition"
  >
    {screenSharing ? "Stop Sharing" : "Share Screen"}
       </button>
          <button
            onClick={handleEndCall}
            className="sm:px-2 sm:py-1 bg-gradient-to-b from-yellow-600 to-yellow-800 hover:bg-yellow-500 transition"
          >
            End Call
          </button>
        </div>
      </div>
    </div>
  );
}

export default Page2;
