import { createRoot } from 'react-dom/client'
import './index.css'
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import App from './Pages/App'
import Page2 from './Pages/Page2'
import SocketProvider from "./Provider/Socket.jsx"
import Peerprovider from './Provider/Peer.jsx'

const router = createBrowserRouter([
  {
    path: "/" ,
    element: <App /> ,
  } , {
    path : "/room/:roomid" ,
    element :  <Page2 />
  }
])


createRoot(document.getElementById('root')).render(
    <SocketProvider>
      <Peerprovider>
    <RouterProvider router={router} />
    </Peerprovider>
    </SocketProvider>
)
