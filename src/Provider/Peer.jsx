import React, { createContext, useContext, useState, useCallback, useRef } from "react";

const PeerContext = createContext(null);

export const Usepeer = () => useContext(PeerContext);

const PeerProvider = ({ children }) => {
  const peersRef = useRef(new Map()); // email -> RTCPeerConnection
  const [remoteStreams, setRemoteStreams] = useState([]); // [{ email, stream }]
  const [localStream, setLocalStream] = useState(null);

  // ✅ Create a new RTCPeerConnection for a specific user
  const createPeer = useCallback((email) => {
    if (peersRef.current.has(email)) return peersRef.current.get(email);

    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        {
          urls: "turn:turn.myserver.com:3478?transport=tcp",
          username: "user",
          credential: "pass",
        },
      ],
    });

    // Add local tracks if already available
    if (localStream) {
      localStream.getTracks().forEach((track) => peer.addTrack(track, localStream));
    }

    // When remote track is received
    peer.ontrack = (event) => {
      const stream = event.streams[0];
      setRemoteStreams((prev) => {
        // avoid duplicate streams for same user
        const exists = prev.find((r) => r.email === email);
        if (exists) return prev;
        return [...prev, { email, stream }];
      });
    };

    peersRef.current.set(email, peer);
    return peer;
  }, [localStream]);

  // ✅ Add local stream to all peers
  const sendStream = useCallback((stream) => {
    if (!stream) return;
    setLocalStream(stream);
    peersRef.current.forEach((peer) => {
      stream.getTracks().forEach((track) => {
        const sender = peer.getSenders().find((s) => s.track && s.track.kind === track.kind);
        if (!sender) peer.addTrack(track, stream);
      });
    });
  }, []);

  // ✅ Create offer for a specific peer
  const createOffer = useCallback(async (email) => {
    const peer = createPeer(email);
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    return offer;
  }, [createPeer]);

  // ✅ Create answer for a specific peer
  const createAnswer = useCallback(async (email, offer) => {
    const peer = createPeer(email);
    await peer.setRemoteDescription(offer);
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    return answer;
  }, [createPeer]);

  // ✅ Set remote description (when answer is received)
  const setRemoteDescription = useCallback(async (email, answer) => {
    const peer = createPeer(email);
    await peer.setRemoteDescription(answer);
  }, [createPeer]);

  // ✅ Add ICE candidate for a specific peer
  const addIceCandidate = useCallback(async (email, candidate) => {
    if (!candidate) return;
    const peer = createPeer(email);
    try {
      await peer.addIceCandidate(candidate);
    } catch (err) {
      console.error("Failed to add ICE candidate:", err);
    }
  }, [createPeer]);

  // ✅ Listen for ICE candidates for a specific peer
  const onIceCandidate = useCallback((email, callback) => {
    const peer = createPeer(email);
    peer.onicecandidate = (event) => {
      if (event.candidate) callback(event.candidate);
    };
  }, [createPeer]);

  // ✅ Cleanup all peers
  const closeAllPeers = useCallback(() => {
    peersRef.current.forEach((peer) => peer.close());
    peersRef.current.clear();
    setRemoteStreams([]);
  }, []);

  return (
    <PeerContext.Provider
      value={{
        createPeer,
        createOffer,
        createAnswer,
        setRemoteDescription,
        addIceCandidate,
        onIceCandidate,
        sendStream,
        closeAllPeers,
        remoteStreams,
        localStream,
      }}
    >
      {children}
    </PeerContext.Provider>
  );
};

export default PeerProvider;
