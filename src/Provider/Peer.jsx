import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from "react";

const PeerContext = createContext(null);

export const Usepeer = () => useContext(PeerContext);

const PeerProvider = ({ children }) => {
  const [remotestream, setRemotestream] = useState(null);
  const [localStream, setLocalStream] = useState(null);

  const peer = useMemo(() => new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      {
        urls: "turn:turn.myserver.com:3478?transport=tcp",
        username: "user",
        credential: "pass"
      }
    ]
  }), []);

  // Handle remote track
  const handleTrackEvent = useCallback((event) => {
    if (event.streams && event.streams[0]) {
      setRemotestream(event.streams[0]);
    }
  }, []);

  useEffect(() => {
    peer.addEventListener("track", handleTrackEvent);
    return () => {
      peer.removeEventListener("track", handleTrackEvent);
    };
  }, [peer, handleTrackEvent]);

  // Send local stream to peer
  const sendStream = useCallback((stream) => {
    if (!stream) return;
    setLocalStream(stream);
    stream.getTracks().forEach((track) => {
      // Check if track already exists to prevent duplicate sender errors
      const sender = peer.getSenders().find((s) => s.track && s.track.kind === track.kind);
      if (!sender) {
        peer.addTrack(track, stream);
      }
    });
  }, [peer]);

  // Create offer
  const createOffer = useCallback(async () => {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    return offer;
  }, [peer]);

  // Create answer
  const createAnswer = useCallback(async (offer) => {
    await peer.setRemoteDescription(offer);
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    return answer;
  }, [peer]);

  // Set remote description (for answers)
  const setRemoteDescription = useCallback(async (answer) => {
    await peer.setRemoteDescription(answer);
  }, [peer]);

  // Handle ICE candidates
  const addIceCandidate = useCallback(async (candidate) => {
    if (!candidate) return;
    try {
      await peer.addIceCandidate(candidate);
    } catch (err) {
      console.error("Failed to add ICE candidate:", err);
    }
  }, [peer]);


  const onIceCandidate = useCallback((callback) => {
    peer.addEventListener("icecandidate", (event) => {
      if (event.candidate) callback(event.candidate);
    });
  }, [peer]);

  return (
    <PeerContext.Provider value={{
      peer,
      sendStream,
      createOffer,
      createAnswer,
      setRemoteDescription,
      remotestream,
      addIceCandidate,
      onIceCandidate,
      localStream
    }}>
      {children}
    </PeerContext.Provider>
  );
};

export default PeerProvider;
