import React, { useEffect, useRef, useState, useCallback } from "react";
import { Usesocket } from "../Provider/Socket";
import { Usepeer } from "../Provider/Peer";

// A small, dedicated component to render a remote user's video
const RemoteVideo = ({ stream }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      className="w-full h-full rounded-lg shadow-lg bg-black object-cover"
    />
  );
};


function Page2() {
  const socket = Usesocket();
  const { createPeerConnection, createOffer, createAnswer, setRemoteDescription, sendStream, addIceCandidate } = Usepeer();

  // useRef is for storing data that doesn't trigger a re-render
  const peerConnectionsRef = useRef({}); // Stores all peer connections { socketId: peer }
  const localStreamRef = useRef(null);
  const localVideoRef = useRef(null);

  // useState is for data that triggers a re-render when it changes
  const [remoteStreams, setRemoteStreams] = useState({}); // Stores all remote streams { socketId: stream }
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);

  // Function to set up a new peer connection
  const setupPeerConnection = useCallback((socketId) => {
    const peer = createPeerConnection();
    peerConnectionsRef.current[socketId] = peer;

    // Handle incoming streams from the remote peer
    peer.ontrack = (event) => {
      console.log(`Received remote stream from ${socketId}`);
      setRemoteStreams(prev => ({ ...prev, [socketId]: event.streams[0] }));
    };

    // Handle ICE candidates
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", { to: socketId, candidate: event.candidate });
      }
    };
    
    // Add the local stream to the new connection
    if (localStreamRef.current) {
        sendStream(peer, localStreamRef.current);
    }

    return peer;
  }, [createPeerConnection, sendStream, socket]);


  // Effect to get user media and set up initial socket listeners
  useEffect(() => {
    const getMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        // When the stream is ready, tell the server you are ready to connect
        socket.emit("room:join-ready");
      } catch (err) {
        console.error("Failed to get user media:", err);
      }
    };
    getMedia();

    // A new user has joined the room
    const handleUserJoined = async ({ socketId }) => {
      console.log(`New user joined: ${socketId}`);
      const peer = setupPeerConnection(socketId);
      const offer = await createOffer(peer);
      socket.emit("call-user", { to: socketId, offer });
    };

    // Receiving an offer from another user
    const handleIncomingCall = async ({ from, offer }) => {
      console.log(`Incoming call from: ${from}`);
      const peer = setupPeerConnection(from);
      const answer = await createAnswer(peer, offer);
      socket.emit("call-accepted", { to: from, answer });
    };

    // Call was accepted, set the remote description
    const handleCallAccepted = async ({ from, answer }) => {
      console.log(`Call accepted from: ${from}`);
      const peer = peerConnectionsRef.current[from];
      if (peer) {
        await setRemoteDescription(peer, answer);
      }
    };
    
    // A user has left the call
    const handleUserLeft = ({ socketId }) => {
        console.log(`User left: ${socketId}`);
        if(peerConnectionsRef.current[socketId]) {
            peerConnectionsRef.current[socketId].close();
            delete peerConnectionsRef.current[socketId];
        }
        setRemoteStreams(prev => {
            const newStreams = {...prev};
            delete newStreams[socketId];
            return newStreams;
        });
    };
    
    const handleIceCandidate = async ({ from, candidate }) => {
        const peer = peerConnectionsRef.current[from];
        if (peer && candidate) {
            await addIceCandidate(peer, candidate);
        }
    };

    socket.on("user-joined", handleUserJoined);
    socket.on("incoming-call", handleIncomingCall);
    socket.on("call-accepted", handleCallAccepted);
    socket.on("user-left", handleUserLeft);
    socket.on("ice-candidate", handleIceCandidate);

    // Cleanup function
    return () => {
      socket.off("user-joined", handleUserJoined);
      socket.off("incoming-call", handleIncomingCall);
      socket.off("call-accepted", handleCallAccepted);
      socket.off("user-left", handleUserLeft);
      socket.off("ice-candidate", handleIceCandidate);

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      Object.values(peerConnectionsRef.current).forEach(peer => peer.close());
    };
  }, [socket, setupPeerConnection, createOffer, createAnswer, setRemoteDescription, addIceCandidate]);


  const toggleCamera = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => (track.enabled = !track.enabled));
      setCameraOn(prev => !prev);
    }
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => (track.enabled = !track.enabled));
      setMicOn(prev => !prev);
    }
  };
  
  // You would expand handleScreenShare and handleEndCall similarly

  return (
    <div className="bg-slate-900 min-h-screen text-white p-4">
      <div className="flex flex-col items-center">
        <h1 className="text-3xl font-bold mb-4">Video Call Room</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-6xl">
          {/* Local Video */}
          <div className="relative aspect-video">
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full rounded-lg shadow-lg bg-black object-cover" />
            <span className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded">You</span>
          </div>

          {/* Remote Videos */}
          {Object.entries(remoteStreams).map(([socketId, stream]) => (
            <div key={socketId} className="relative aspect-video">
              <RemoteVideo stream={stream} />
              <span className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded">Remote User</span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-4 mt-8 justify-center">
          <button onClick={toggleCamera} className="px-4 py-2 text-white rounded-lg shadow bg-blue-600 hover:bg-blue-500 transition">
            {cameraOn ? "Turn Camera Off" : "Turn Camera On"}
          </button>
          <button onClick={toggleMic} className="px-4 py-2 text-white rounded-lg shadow bg-blue-600 hover:bg-blue-500 transition">
            {micOn ? "Mute Mic" : "Unmute Mic"}
          </button>
          {/* Add Screen Share and End Call buttons */}
        </div>
      </div>
    </div>
  );
}

export default Page2;