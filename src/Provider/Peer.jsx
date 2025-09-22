import React, { createContext, useContext, useState, useCallback } from "react";

const PeerContext = createContext(null);
export const Usepeer = () => useContext(PeerContext);

const PeerProvider = ({ children }) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]); // ✅ store multiple streams
  const peers = new Map(); // ✅ maintain peers per user

  const createPeerConnection = useCallback((remoteEmail, socket) => {
    if (peers.has(remoteEmail)) return peers.get(remoteEmail);

    const newPeer = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        {
          urls: "turn:turn.myserver.com:3478?transport=tcp",
          username: "user",
          credential: "pass",
        },
      ],
    });

    // Add local tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        newPeer.addTrack(track, localStream);
      });
    }

    // Listen for remote tracks
    newPeer.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStreams((prev) => {
          const exists = prev.find((s) => s.id === event.streams[0].id);
          return exists ? prev : [...prev, event.streams[0]];
        });
      }
    };

    // ICE candidate handling
    newPeer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", { to: remoteEmail, candidate: event.candidate });
      }
    };

    peers.set(remoteEmail, newPeer);
    return newPeer;
  }, [localStream]);

  // Send stream (set once)
  const sendStream = useCallback((stream) => {
    setLocalStream(stream);
    // Add tracks to all existing peers
    peers.forEach((peer) => {
      stream.getTracks().forEach((track) => {
        peer.addTrack(track, stream);
      });
    });
  }, []);

  // Create offer for specific remote user
  const createOffer = async (remoteEmail, socket) => {
    const peer = createPeerConnection(remoteEmail, socket);
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    return offer;
  };

  // Create answer for incoming offer
  const createAnswer = async (remoteEmail, offer, socket) => {
    const peer = createPeerConnection(remoteEmail, socket);
    await peer.setRemoteDescription(offer);
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    return answer;
  };

  // Set remote description (when receiving answer)
  const setRemoteDescription = async (remoteEmail, answer) => {
    const peer = peers.get(remoteEmail);
    if (peer) await peer.setRemoteDescription(answer);
  };

  // Add ICE candidate
  const addIceCandidate = async (remoteEmail, candidate) => {
    const peer = peers.get(remoteEmail);
    if (peer && candidate) {
      try {
        await peer.addIceCandidate(candidate);
      } catch (err) {
        console.error("Failed to add ICE candidate:", err);
      }
    }
  };

  return (
    <PeerContext.Provider
      value={{
        peers,
        createPeerConnection,
        createOffer,
        createAnswer,
        setRemoteDescription,
        addIceCandidate,
        sendStream,
        localStream,
        remoteStreams, 
      }}
    >
      {children}
    </PeerContext.Provider>
  );
};

export default PeerProvider;
