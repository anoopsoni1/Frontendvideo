import React, { useEffect, useRef, useState, useCallback, memo } from "react";
import { Usesocket } from "../Provider/Socket";
import { Usepeer } from "../Provider/Peer";

const RemoteVideo = memo(({ stream }) => {
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
});

function Page2() {
  const socket = Usesocket();
  const { createPeerConnection, createOffer, createAnswer, setRemoteDescription, sendStream, addIceCandidate } = Usepeer();

  const peerConnectionsRef = useRef({});
  const localStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const screenShareStreamRef = useRef(null);

  const [remoteStreams, setRemoteStreams] = useState({});
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const setupPeerConnection = useCallback((socketId) => {
    const peer = createPeerConnection();
    peerConnectionsRef.current[socketId] = peer;

    peer.ontrack = (event) => {
      setRemoteStreams(prev => ({ ...prev, [socketId]: event.streams[0] }));
    };

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", { to: socketId, candidate: event.candidate });
      }
    };

    if (localStreamRef.current) {
      sendStream(peer, localStreamRef.current);
    }

    return peer;
  }, [createPeerConnection, sendStream, socket]);

  useEffect(() => {
    const getMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        socket.emit("room:join-ready");
      } catch (err) {
        console.error("Failed to get user media:", err);
      }
    };
    getMedia();

    const handleUserJoined = async ({ socketId }) => {
      const peer = setupPeerConnection(socketId);
      const offer = await createOffer(peer);
      socket.emit("call-user", { to: socketId, offer });
    };

    const handleIncomingCall = async ({ from, offer }) => {
      const peer = setupPeerConnection(from);
      const answer = await createAnswer(peer, offer);
      socket.emit("call-accepted", { to: from, answer });
    };

    const handleCallAccepted = async ({ from, answer }) => {
      const peer = peerConnectionsRef.current[from];
      if (peer) {
        await setRemoteDescription(peer, answer);
      }
    };

    const handleUserLeft = ({ socketId }) => {
      if (peerConnectionsRef.current[socketId]) {
        peerConnectionsRef.current[socketId].close();
        delete peerConnectionsRef.current[socketId];
      }
      setRemoteStreams(prev => {
        const newStreams = { ...prev };
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

    return () => {
      socket.off("user-joined", handleUserJoined);
      socket.off("incoming-call", handleIncomingCall);
      socket.off("call-accepted", handleCallAccepted);
      socket.off("user-left", handleUserLeft);
      socket.off("ice-candidate", handleIceCandidate);
      handleEndCall();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, setupPeerConnection, createOffer, createAnswer, setRemoteDescription, addIceCandidate]);

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setCameraOn(videoTrack.enabled);
    }
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setMicOn(audioTrack.enabled);
    }
  };

  const stopScreenShare = useCallback(() => {
    if (screenShareStreamRef.current) {
      screenShareStreamRef.current.getTracks().forEach(track => track.stop());
      screenShareStreamRef.current = null;
    }
    const webcamTrack = localStreamRef.current.getVideoTracks()[0];
    Object.values(peerConnectionsRef.current).forEach(peer => {
        const sender = peer.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
            sender.replaceTrack(webcamTrack);
        }
    });
    if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
    }
    setIsScreenSharing(false);
  }, []);

  const handleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenShareStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];

        Object.values(peerConnectionsRef.current).forEach(peer => {
          const sender = peer.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        });
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        setIsScreenSharing(true);
        
        screenTrack.onended = () => {
          stopScreenShare();
        };
      } catch (err) {
        console.error("Screen sharing failed:", err);
      }
    }
  }, [isScreenSharing, stopScreenShare]);

  const handleEndCall = () => {
    socket.emit("room:leave");
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    Object.values(peerConnectionsRef.current).forEach(peer => peer.close());
    peerConnectionsRef.current = {};
    setRemoteStreams({});
  };

  return (
    <div className="bg-slate-900 min-h-screen text-white p-4 flex flex-col">
      <h1 className="text-3xl font-bold mb-4 text-center">Video Call Room</h1>
      <div className="flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-7xl mx-auto">
        <div className="relative aspect-video">
          <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full rounded-lg shadow-lg bg-black object-cover" />
          <span className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-sm">You</span>
        </div>

        {Object.entries(remoteStreams).map(([socketId, stream]) => (
          <div key={socketId} className="relative aspect-video">
            <RemoteVideo stream={stream} />
            <span className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-sm">{`User ${socketId.substring(0, 4)}`}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 mt-6 justify-center p-4 bg-slate-800 rounded-lg">
        <button onClick={toggleCamera} className={`px-4 py-2 text-white rounded-lg shadow transition ${cameraOn ? 'bg-blue-600 hover:bg-blue-500' : 'bg-gray-600 hover:bg-gray-500'}`}>
          {cameraOn ? "Cam Off" : "Cam On"}
        </button>
        <button onClick={toggleMic} className={`px-4 py-2 text-white rounded-lg shadow transition ${micOn ? 'bg-blue-600 hover:bg-blue-500' : 'bg-gray-600 hover:bg-gray-500'}`}>
          {micOn ? "Mute" : "Unmute"}
        </button>
        <button onClick={handleScreenShare} className="px-4 py-2 text-white rounded-lg shadow bg-green-600 hover:bg-green-500 transition">
          {isScreenSharing ? "Stop Sharing" : "Share Screen"}
        </button>
        <button onClick={handleEndCall} className="px-4 py-2 text-white rounded-lg shadow bg-red-600 hover:bg-red-500 transition">
          End Call
        </button>
      </div>
    </div>
  );
}

export default Page2;