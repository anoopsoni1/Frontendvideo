import React, { useState } from "react";
import { BsCameraVideoFill, BsPlayCircle } from "react-icons/bs";
import { Sun, Moon } from "lucide-react";
import { Link } from "react-router-dom";

const LandingPage = () => {
  const [theme, setTheme] = useState("dark");

  
 
  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        theme === "dark" ? "bg-slate-950 text-slate-50" : "bg-white text-slate-900"
      }`}
    >
      <header className="mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BsCameraVideoFill className="text-3xl text-indigo-600" />
          <span className="text-2xl font-bold">Nexo</span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-full shadow-md transition-all duration-200 ${
              theme === "dark" ? "bg-slate-800 hover:bg-slate-700" : "bg-slate-200 hover:bg-slate-300"
            }`}
          >
            {theme === "dark" ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-slate-800" />}
          </button>
          <Link
            to="/roompage"
            className="hidden md:inline-block font-semibold"
          >
           <p className="text-white bg-indigo-600 px-6 py-2 rounded-3xl"> Get Started </p>
          </Link>
        </div>
      </header>

   
      <main className="mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24 text-center md:text-left">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="flex flex-col items-center md:items-start">
            <h1 className="text-5xl md:text-6xl font-extrabold leading-tight">
              Connect <span className="text-indigo-600">face-to-face</span> anywhere
            </h1>
            <p
              className={`mt-6 text-lg max-w-lg transition-colors duration-300 ${
                theme === "dark" ? "text-slate-200" : "text-slate-700"
              }`}
            >
              Experience crystal-clear one-to-one video calls with enterprise-grade security. Connect instantly with
              friends, family, or colleagues.
            </p>

            
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                to="/roompage"
                className=""
              >
               <p className="bg-indigo-500 font-semibold px-8 py-4 rounded-lg text-amber-50">Start Video Call</p> 
              </Link>
              <a
                href="#"
                className={`font-semibold px-8 py-4 rounded-lg border transition-all duration-300 shadow-lg flex items-center justify-center gap-2 ${
                  theme === "dark" ? "bg-white text-slate-800 border-slate-300 hover:bg-slate-100" : "bg-slate-200 text-slate-800 border-slate-300 hover:bg-slate-300"
                }`}
              >
                <BsPlayCircle />
                Watch Demo
              </a>
            </div>

            {/* Features */}
            <div
              className={`mt-8 flex flex-col sm:flex-row gap-6 transition-colors duration-300 ${
                theme === "dark" ? "text-slate-400" : "text-slate-600"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>No downloads required</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>End-to-end encrypted</span>
              </div>
            </div>
          </div>

          {/* Right Image */}
          <div className="relative mt-12 md:mt-0">
            <div className="absolute -inset-4 bg-gradient-to-tr from-indigo-500 to-cyan-400 opacity-60 rounded-xl blur-3xl -z-10"></div>
            <img
              src="https://images.pexels.com/photos/4126743/pexels-photo-4126743.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
              alt="Video call on a monitor"
              className="relative w-full rounded-xl shadow-2xl"
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
