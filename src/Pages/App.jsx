import { useEffect, useState } from "react";
import { Usesocket } from "../Provider/Socket";
import {useNavigate} from "react-router-dom"
function App() {
  const socket  = Usesocket();
  const [email , setemail ] = useState() ;
  const [roomid , setroomid] = useState()


  const navi = useNavigate()

const handlejoinroom = ()=>{
  socket.emit("join-room" ,{emailid : email , roomid})
}

const handleroomjoined = (roomid)=>{
  console.log("Room-joined" , roomid);
     navi(`/room/${roomid}`)
}

  useEffect(() => {
  socket.on("joined-room" ,handleroomjoined )

  return ()=>{
    socket.off('joined-room', handleroomjoined)
  }
  }, [socket]); 
  return (
    <div className="grid place-items-center pt-10 gap-8">
      <input
        type="email"
        className="outline-2 outline-amber-300 rounded-[8px]"
        placeholder="Enter your email"
        value={email}
        onChange={(e)=> setemail(e.target.value)
        }
      />
      <input
        type="text"
        className="outline-2 outline-amber-300 rounded-[8px]"
        placeholder="Enter Room id"
        value={roomid}
        onChange={(e)=> setroomid(e.target.value)}
      />
      <button onClick={handlejoinroom}   >Enter Room</button>
    </div>
  );
}

export default App;

