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
  const [remoteEmail, setRemoteEmail] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

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
    setRemoteEmail(emailid);
  }, []);

  // Handle incoming call
  const handleIncomingCall = useCallback(async ({ from, offer }) => {
    console.log("Incoming call from:", from);
    const answer = await createAnswer(offer);
    socket.emit("Call-accepted", { emailid: from, answer });
    setRemoteEmail(from);
    if (streamed) sendStream(streamed);
  }, [createAnswer, socket, streamed, sendStream]);

  // Handle call accepted
  const handleCallAccepted = useCallback(async ({ answer }) => {
    console.log("Call accepted by remote user");
    await setRemoteDescription(answer);
    if (streamed) sendStream(streamed);
  }, [setRemoteDescription, streamed, sendStream]);

  // ICE candidate handling
  useEffect(() => {
    peer.addEventListener("icecandidate", (event) => {
      if (event.candidate && remoteEmail) {
        socket.emit("ice-candidate", { to: remoteEmail, candidate: event.candidate });
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
  }, [peer, remoteEmail, socket, addIceCandidate]);

  // Set remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remotestream) {
      remoteVideoRef.current.srcObject = remotestream;
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
  useEffect(() => { getUserMedia(); }, []);

  // Button click: create offer and connect to remote
  const handleCallButton = async () => {
    if (!remoteEmail || !streamed) return alert("No remote user or local stream available");
    const offer = await createOffer();
    sendStream(streamed);
    socket.emit("call-user", { emailid: remoteEmail, offer });
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Welcome</h1>
      <h2>{remoteEmail ? `Remote: ${remoteEmail}` : "Waiting for user..."}</h2>
      <div style={{ display: "flex", gap: "20px" }}>
        <video ref={localVideoRef} autoPlay muted playsInline style={{ width: "600px", borderRadius: "10px", background: "#000" }} />
        <video ref={remoteVideoRef} autoPlay playsInline style={{ width: "600px", borderRadius: "10px", background: "#000" }} />
      </div>
      <button
        onClick={handleCallButton}
        style={{ marginTop: "20px", padding: "10px 20px", borderRadius: "8px", backgroundColor: "#007bff", color: "#fff", border: "none", cursor: "pointer" }}
      >
        Connect Video
      </button>
    </div>
  );
}

export default Page2;
