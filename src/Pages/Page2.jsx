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
  const [remoteUsers, setRemoteUsers] = useState([]); // ✅ store multiple remote users
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);

  const localVideoRef = useRef(null);
  const remoteVideosContainerRef = useRef(null); // container to append remote videos

  // Get local media
  const getUserMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStreamed(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Failed to get user media:", err);
    }
  };

  // Handle new user joining
  const handleNewUserJoined = useCallback(({ emailid }) => {
    console.log("New user joined:", emailid);
    setRemoteUsers((prev) => [...new Set([...prev, emailid])]);
  }, []);

  // Handle incoming call
  const handleIncomingCall = useCallback(
    async ({ from, offer }) => {
      console.log("Incoming call from:", from);
      const answer = await createAnswer(offer);
      socket.emit("Call-accepted", { emailid: from, answer });
      setRemoteUsers((prev) => [...new Set([...prev, from])]);
      if (streamed) sendStream(streamed);
    },
    [createAnswer, socket, streamed, sendStream]
  );

  // Handle call accepted
  const handleCallAccepted = useCallback(
    async ({ answer }) => {
      console.log("Call accepted by remote user");
      await setRemoteDescription(answer);
      if (streamed) sendStream(streamed);
    },
    [setRemoteDescription, streamed, sendStream]
  );

  // ICE candidate handling
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

  // Set remote stream dynamically
  useEffect(() => {
    if (remotestream) {
      const videoElement = document.createElement("video");
      videoElement.srcObject = remotestream;
      videoElement.autoplay = true;
      videoElement.playsInline = true;
      videoElement.style.width = "300px";
      videoElement.style.borderRadius = "10px";
      videoElement.style.background = "#000";

      remoteVideosContainerRef.current.appendChild(videoElement);
    }
  }, [remotestream]);

  // Socket listeners
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

  // Get local media on mount
  useEffect(() => {
    getUserMedia();
  }, []);

  // Button click: create offer and connect to remote
  const handleCallButton = async () => {
    if (!remoteUsers.length || !streamed) return alert("No remote users or local stream available");
    const offer = await createOffer();
    sendStream(streamed);
    remoteUsers.forEach((remoteEmail) => {
      socket.emit("call-user", { emailid: remoteEmail, offer });
    });
  };

  // Toggle Camera
  const toggleCamera = () => {
    if (!streamed) return;
    streamed.getVideoTracks().forEach((track) => (track.enabled = !cameraOn));
    setCameraOn((prev) => !prev);
  };

  // Toggle Mic
  const toggleMic = () => {
    if (!streamed) return;
    streamed.getAudioTracks().forEach((track) => (track.enabled = !micOn));
    setMicOn((prev) => !prev);
  };

  // End Call
  const handleEndCall = () => {
    if (streamed) {
      streamed.getTracks().forEach((track) => track.stop());
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideosContainerRef.current) remoteVideosContainerRef.current.innerHTML = "";
    setRemoteUsers([]);
    console.log("Call ended");
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Welcome</h1>
      <h2>{remoteUsers.length > 0 ? `Connected to: ${remoteUsers.join(", ")}` : "Waiting for users..."}</h2>
      <div style={{ display: "flex", gap: "20px" }}>
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          style={{ width: "300px", borderRadius: "10px", background: "#000" }}
        />
        <div ref={remoteVideosContainerRef} style={{ display: "flex", gap: "10px", flexWrap: "wrap" }} />
      </div>

      <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
        <button onClick={handleCallButton}>Connect Video</button>
        <button onClick={toggleCamera}>{cameraOn ? "Turn Camera Off" : "Turn Camera On"}</button>
        <button onClick={toggleMic}>{micOn ? "Mute Mic" : "Unmute Mic"}</button>
        <button onClick={handleEndCall} style={{ backgroundColor: "red", color: "white" }}>End Call</button>
      </div>
    </div>
  );
}

export default Page2;
