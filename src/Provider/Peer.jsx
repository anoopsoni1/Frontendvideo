import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from "react";

const PeerContext = createContext(null);
export const Usepeer = () => useContext(PeerContext);

const PeerProvider = ({ children }) => {
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);

  // ✅ Safe peer creation
  const peer = useMemo(() => {
    if (typeof RTCPeerConnection === "undefined") return null;
    return new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        {
          urls: "turn:turn.myserver.com:3478?transport=tcp",
          username: "user",
          credential: "pass",
        },
      ],
    });
  }, []);

  /** =========================
   *  Track handling
   * ========================= */
  const handleTrackEvent = useCallback((event) => {
    if (event.streams && event.streams[0]) {
      setRemoteStream(event.streams[0]);
    }
  }, []);

  useEffect(() => {
    if (!peer) return; // ✅ guard if peer is not ready
    peer.addEventListener("track", handleTrackEvent);
    return () => {
      peer.removeEventListener("track", handleTrackEvent);
    };
  }, [peer, handleTrackEvent]);

  /** =========================
   *  Send local stream
   * ========================= */
  const sendStream = useCallback(
    (stream) => {
      if (!stream || !peer) return;
      setLocalStream(stream);

      const existingSenders = peer.getSenders();
      stream.getTracks().forEach((track) => {
        const alreadyAdded = existingSenders.some((s) => s.track?.kind === track.kind);
        if (!alreadyAdded) peer.addTrack(track, stream);
      });
    },
    [peer]
  );

  /** =========================
   *  Offer / Answer
   * ========================= */
  const createOffer = useCallback(async () => {
    if (!peer) throw new Error("Peer connection not initialized");
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    return offer;
  }, [peer]);

  const createAnswer = useCallback(async (offer) => {
    if (!peer) throw new Error("Peer connection not initialized");
    await peer.setRemoteDescription(offer);
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    return answer;
  }, [peer]);

  const setRemoteDescription = useCallback(
    async (answer) => {
      if (!peer) throw new Error("Peer connection not initialized");
      await peer.setRemoteDescription(answer);
    },
    [peer]
  );

  /** =========================
   *  ICE Candidates
   * ========================= */
  const addIceCandidate = useCallback(
    async (candidate) => {
      if (!peer || !candidate) return;
      try {
        await peer.addIceCandidate(candidate);
      } catch (err) {
        console.error("Failed to add ICE candidate:", err);
      }
    },
    [peer]
  );

  const onIceCandidate = useCallback(
    (callback) => {
      if (!peer) return;
      peer.addEventListener("icecandidate", (event) => {
        if (event.candidate) callback(event.candidate);
      });
    },
    [peer]
  );

  return (
    <PeerContext.Provider
      value={{
        peer,
        localStream,
        remoteStream,
        sendStream,
        createOffer,
        createAnswer,
        setRemoteDescription,
        addIceCandidate,
        onIceCandidate,
      }}
    >
      {children}
    </PeerContext.Provider>
  );
};

export default PeerProvider;
