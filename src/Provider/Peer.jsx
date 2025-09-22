import React, { createContext, useContext, useState, useCallback, useRef } from "react";

const PeerContext = createContext(null);
export const Usepeer = () => useContext(PeerContext);

const PeerProvider = ({ children, socket }) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]); // array of { id, stream }
  
  const peers = useRef(new Map()); // key: remoteId, value: RTCPeerConnection

  // Create peer for a specific remote user
  const createPeer = useCallback((remoteId) => {
    if (peers.current.has(remoteId)) return peers.current.get(remoteId);

    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "turn:turn.myserver.com:3478", username: "user", credential: "pass" },
      ],
    });

    // Add local tracks
    if (localStream) {
      localStream.getTracks().forEach(track => peer.addTrack(track, localStream));
    }

    // Handle remote track
    peer.ontrack = (event) => {
      const [stream] = event.streams;
      setRemoteStreams(prev => [...prev.filter(s => s.id !== stream.id), { id: remoteId, stream }]);
    };

    // Handle ICE candidates
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", { to: remoteId, candidate: event.candidate });
      }
    };

    peers.current.set(remoteId, peer);
    return peer;
  }, [localStream, socket]);

  // Send local stream to all peers
  const sendStreamToAll = useCallback((stream) => {
    setLocalStream(stream);
    peers.current.forEach(peer => {
      stream.getTracks().forEach(track => {
        const senderExists = peer.getSenders().some(s => s.track?.kind === track.kind);
        if (!senderExists) peer.addTrack(track, stream);
      });
    });
  }, []);

  // Handle remote description (offer/answer)
  const handleRemoteDescription = useCallback(async (remoteId, description) => {
    const peer = createPeer(remoteId);
    await peer.setRemoteDescription(description);
    if (description.type === "offer") {
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit("call-accepted", { to: remoteId, answer });
    }
  }, [createPeer, socket]);

  // Add ICE candidate for a specific peer
  const addIceCandidate = useCallback(async (remoteId, candidate) => {
    const peer = peers.current.get(remoteId);
    if (peer && candidate) {
      try {
        await peer.addIceCandidate(candidate);
      } catch (err) {
        console.error("Failed to add ICE candidate:", err);
      }
    }
  }, []);

  // Remove peer (on user leaving)
  const removePeer = useCallback((remoteId) => {
    const peer = peers.current.get(remoteId);
    if (peer) {
      peer.close();
      peers.current.delete(remoteId);
    }
    setRemoteStreams(prev => prev.filter(s => s.id !== remoteId));
  }, []);

  return (
    <PeerContext.Provider value={{
      localStream,
      remoteStreams,
      createPeer,
      sendStreamToAll,
      handleRemoteDescription,
      addIceCandidate,
      removePeer
    }}>
      {children}
    </PeerContext.Provider>
  );
};

export default PeerProvider;
