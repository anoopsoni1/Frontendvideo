import React, { useEffect, useRef, useState } from "react";
import { Usesocket } from "../Provider/Socket";
import { Usepeer } from "../Provider/Peer";

function Page2({ roomId, email }) {
  const socket = Usesocket();
  const { createOffer, createAnswer, setRemoteDescription, addIceCandidate, sendStream, peer } = Usepeer();

  const [stream, setStream] = useState(null);
  const [peers, setPeers] = useState({});
  const localVideoRef = useRef(null);
  const remoteContainerRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      const userStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(userStream);
      if (localVideoRef.current) localVideoRef.current.srcObject = userStream;

      socket.emit("join-room", { roomid: roomId, emailid: email });
    };
    init();
  }, [roomId, email, socket]);

  useEffect(() => {
    socket.on("user-joined", async ({ emailid }) => {
      // Create offer for new user
      const offer = await createOffer();
      sendStream(stream);
      socket.emit("call-user", { emailid, offer });
    });

    socket.on("incoming-call", async ({ from, offer }) => {
      const answer = await createAnswer(offer);
      sendStream(stream);
      socket.emit("call-accepted", { emailid: from, answer });
    });

    socket.on("call-accepted", async ({ answer, from }) => {
      await setRemoteDescription(answer);
    });

    socket.on("ice-candidate", async ({ candidate }) => {
      await addIceCandidate(candidate);
    });

    return () => {
      socket.off("user-joined");
      socket.off("incoming-call");
      socket.off("call-accepted");
      socket.off("ice-candidate");
    };
  }, [socket, createOffer, createAnswer, setRemoteDescription, addIceCandidate, sendStream, stream]);

  useEffect(() => {
    peer.ontrack = (event) => {
      const remoteStream = event.streams[0];
      if (!peers[remoteStream.id]) {
        const videoEl = document.createElement("video");
        videoEl.srcObject = remoteStream;
        videoEl.autoplay = true;
        videoEl.playsInline = true;
        videoEl.className = "w-1/3 h-1/3 object-cover rounded-md";
        remoteContainerRef.current.appendChild(videoEl);

        setPeers(prev => ({ ...prev, [remoteStream.id]: videoEl }));
      }
    };
  }, [peer, peers]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="grid grid-cols-3 gap-2 p-4" ref={remoteContainerRef}>
        {/* Local video */}
        <video ref={localVideoRef} autoPlay muted playsInline className="w-1/3 h-1/3 object-cover rounded-md bg-black" />
      </div>
    </div>
  );
}

export default Page2;
