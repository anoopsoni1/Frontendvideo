import React, { createContext, useContext, useCallback } from "react";

// Create the context
const PeerContext = createContext(null);

// Custom hook to easily access the context
export const Usepeer = () => useContext(PeerContext);

// The provider component
export const PeerProvider = ({ children }) => {
  // This function creates a new, fully configured peer connection.
  // Your main component will call this for each new user that joins.
  const createPeerConnection = useCallback(() => {
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        
         {
          urls: "turn:your-turn-server.com:3478",
          username: "your-username",
          credential: "your-password"
         }
      ],
    });
    return peer;
  }, []);

  
  const createOffer = useCallback(async (peer) => {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    return offer;
  }, []);

  const createAnswer = useCallback(async (peer, offer) => {
    await peer.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    return answer;
  }, []);

  const setRemoteDescription = useCallback(async (peer, answer) => {
    await peer.setRemoteDescription(new RTCSessionDescription(answer));
  }, []);

  const sendStream = useCallback((peer, stream) => {
    if (!stream) return;
    stream.getTracks().forEach((track) => {
      peer.addTrack(track, stream);
    });
  }, []);
  
  const addIceCandidate = useCallback(async (peer, candidate) => {
    if (!candidate) return;
    try {
        const iceCandidate = new RTCIceCandidate(candidate);
        await peer.addIceCandidate(iceCandidate);
    } catch (err) {
        console.error("Error adding received ICE candidate", err);
    }
  }, []);


  const value = {
    createPeerConnection,
    createOffer,
    createAnswer,
    setRemoteDescription,
    sendStream,
    addIceCandidate,
  };

  return (
    <PeerContext.Provider value={value}>
      {children}
    </PeerContext.Provider>
  );
};