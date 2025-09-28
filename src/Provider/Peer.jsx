import React, { createContext, useContext, useCallback } from "react";

const PeerContext = createContext(null);

export const Usepeer = () => useContext(PeerContext);

export const PeerProvider = ({ children }) => {
  const createPeerConnection = useCallback(() => {
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:global.stun.twilio.com:3478" }
        // Add your own TURN server here for production
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
    stream.getTracks().forEach((track) => {
      peer.addTrack(track, stream);
    });
  }, []);

  const addIceCandidate = useCallback(async (peer, candidate) => {
    const iceCandidate = new RTCIceCandidate(candidate);
    await peer.addIceCandidate(iceCandidate);
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