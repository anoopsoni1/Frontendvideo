import React from 'react'
import { useState } from 'react';
import { Usesocket } from '../Provider/Socket';
import { useEffect } from 'react';

const Chat = () => {
    const socket = Usesocket() ;
const [messages, setMessages] = useState([]);
const [chatInput, setChatInput] = useState("");

const sendMessage = () => {
  if (!chatInput.trim()) return;
  socket.emit("chat-message", { message: chatInput });
  setMessages((prev) => [...prev, { self: true, message: chatInput }]);
  setChatInput("");
};

useEffect(() => {
  socket.on("chat-message", ({ message }) => {
    setMessages((prev) => [...prev, { self: false, message }]);
  });

  return () => {
    socket.off("chat-message");
  };
}, [socket]);
  return (
    <>
    <div className="absolute right-0 bottom-0 w-full sm:w-1/4 h-1/2 bg-black/80 backdrop-blur-md flex flex-col p-2 gap-2 overflow-hidden rounded-tl-xl">
  <div className="flex-1 overflow-y-auto space-y-1">
    {messages.map((msg, index) => (
      <div
        key={index}
        className={`p-2 rounded-md text-white ${
          msg.self ? "bg-blue-500 self-end" : "bg-gray-700 self-start"
        }`}
      >
        {msg.message}
      </div>
    ))}
  </div>
  <div className="flex gap-1 mt-2">
    <input
      type="text"
      value={chatInput}
      onChange={(e) => setChatInput(e.target.value)}
      placeholder="Type a message..."
      className="flex-1 p-2 rounded-md bg-gray-900 text-white"
      onKeyDown={(e) => e.key === "Enter" && sendMessage()}
    />
    <button
      onClick={sendMessage}
      className="px-3 py-2 bg-green-600 rounded-md text-white"
    >
      Send
    </button>
  </div>
</div>

    </>
  )
}

export default Chat