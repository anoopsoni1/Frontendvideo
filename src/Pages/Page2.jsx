import React, { useCallback, useEffect, useRef, useState } from "react";
import { Usesocket } from "../Provider/Socket";
import { Usepeer } from "../Provider/Peer";

function Page2() {
  const socket = Usesocket();
  const { sendStream } = Usepeer(); // we only need sendStream here
  const [localStream, setLocalStream] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState({}); // { email: MediaStream }
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);

  const localVideoRef = useRef(null);

  // Store a separate peer connection per remote user
  const peers = useRef({}); // { email: RTCPeerConnection }

  // Get local media
  const getUserMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      sendStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Failed to get user media:", err);
    }
  };

  // Create or get peer for a remote user
  const getPeer = useCallback((email) => {
    if (peers.current[email]) return peers.current[email];

    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "turn:turn.myserver.com:3478", username: "user", credential: "pass" }
      ]
    });

    // Add local tracks to this peer
    if (localStream) {
      localStream.getTracks().forEach(track => peer.addTrack(track, localStream));
    }

    // Remote track handling
    peer.ontrack = (event) => {
      setRemoteUsers(prev => ({ ...prev, [email]: event.streams[0] }));
    };

    // ICE candidate handling
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", { to: email, candidate: event.candidate });
      }
    };

    peers.current[email] = peer;
    return peer;
  }, [localStream, socket]);

  // Handle incoming call
  const handleIncomingCall = useCallback(async ({ from, offer }) => {
    const peer = getPeer(from);
    await peer.setRemoteDescription(offer);
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    socket.emit("Call-accepted", { emailid: from, answer });
  }, [getPeer, socket]);

  // Handle call accepted
  const handleCallAccepted = useCallback(async ({ from, answer }) => {
    const peer = getPeer(from);
    await peer.setRemoteDescription(answer);
  }, [getPeer]);

  // Handle ICE candidate from remote
  const handleIceCandidate = useCallback(async ({ from, candidate }) => {
    const peer = peers.current[from];
    if (peer && candidate) await peer.addIceCandidate(candidate);
  }, []);

  // Socket listeners
  useEffect(() => {
    socket.on("incoming-call", handleIncomingCall);
    socket.on("Call-accepted", handleCallAccepted);
    socket.on("ice-candidate", handleIceCandidate);

    return () => {
      socket.off("incoming-call", handleIncomingCall);
      socket.off("Call-accepted", handleCallAccepted);
      socket.off("ice-candidate", handleIceCandidate);
    };
  }, [socket, handleIncomingCall, handleCallAccepted, handleIceCandidate]);

  useEffect(() => { getUserMedia(); }, []);

  // Initiate call to all remote users
  const handleCallButton = async () => {
    Object.keys(peers.current).forEach(async (email) => {
      const peer = getPeer(email);
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket.emit("call-user", { emailid: email, offer });
    });
  };

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
    Object.values(peers.current).forEach(peer => peer.close());
    peers.current = {};
    if (localStream) localStream.getTracks().forEach(track => track.stop());
    setRemoteUsers({});
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Welcome</h1>
      <h2>{Object.keys(remoteUsers).length ? `Connected: ${Object.keys(remoteUsers).join(", ")}` : "Waiting for users..."}</h2>
      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
        <video ref={localVideoRef} autoPlay muted playsInline style={{ width: "300px", borderRadius: "10px", background: "#000" }} />
        {Object.entries(remoteUsers).map(([email, stream]) => (
          <video key={email} autoPlay playsInline ref={el => el && (el.srcObject = stream)} style={{ width: "300px", borderRadius: "10px", background: "#000" }} />
        ))}
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
