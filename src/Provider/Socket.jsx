import React, { useContext, createContext, useMemo } from 'react'
import {io} from "socket.io-client"

const Socketcontext = createContext(null) ;

export const Usesocket = ()=>{
 return useContext(Socketcontext);
}

export const  SocketProvider = (props) => {
    const socket = useMemo(() => 
        io('https://backendvid.onrender.com' ,
           { transports: ['websocket'] }
        ), []
 ) ;
    return (
        <Socketcontext.Provider value={socket}>
          {props.children}
        </Socketcontext.Provider>
    )
}


export default SocketProvider