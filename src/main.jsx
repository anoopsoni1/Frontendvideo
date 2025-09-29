import { createRoot } from 'react-dom/client'
import './index.css'
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import App from './Pages/App'
import Page2 from './Pages/Page2'
import SocketProvider from "./Provider/Socket.jsx"
import PeerProvider from './Provider/Peer.jsx'
import LandingPage from './Components/Home.jsx'
import { ThemeProvider } from './Provider/ThemeProvider.jsx'
import {ChatPage} from "../src/Components/page.jsx"
const router = createBrowserRouter([
  {
    path: "/roompage" ,
    element: <App /> ,
  } , {
    path : "/mainpage" ,
    element :  <Page2 />
  }  ,
  {
    path : "/" , 
    element : <LandingPage />
  }
  ,
  {
    path : "/page" , 
    element : <ChatPage />
  }
])


createRoot(document.getElementById('root')).render(
  <ThemeProvider>
    <SocketProvider>
      <PeerProvider>
    <RouterProvider router={router} />
    </PeerProvider>
    </SocketProvider>
     </ThemeProvider>
)

  
   
   
