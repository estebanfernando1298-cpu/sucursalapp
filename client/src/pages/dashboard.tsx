import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { LogOut, LayoutDashboard, Users, Settings, Activity, CreditCard, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Dashboard() {
  const [location, setLocation] = useLocation();
  const [username, setUsername] = useState("");

  useEffect(() => {
    // Verificar autenticación simple
    const isAuthenticated = localStorage.getItem("isAuthenticated");
    const storedUser = localStorage.getItem("username");
    
    if (!isAuthenticated) {
      setLocation("/");
    } else {
      setUsername(storedUser || "Usuario");
    }
  }, [setLocation]);

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("username");
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Sidebar simplificado */}
      <div className="hidden md:flex w-64 flex-col border-r bg-background">
        <div className="p-6 border-b">
          <h2 className="font-serif text-xl font-bold tracking-tight">Plataforma</h2>
        </div>
        <div className="flex-1 py-6 px-4 space-y-2">
          <Button variant="secondary" className="w-full justify-start gap-2">
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-2">
            <Users className="w-4 h-4" /> Clientes
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-2">
            <Activity className="w-4 h-4" /> Actividad
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-2">
            <CreditCard className="w-4 h-4" /> Facturación
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-2">
            <Settings className="w-4 h-4" /> Configuración
          </Button>
        </div>
        <div className="p-4 border-t">
          <div className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
            <Avatar className="h-8 w-8">
              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${username}`} />
              <AvatarFallback>{username.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{username}</p>
              <p className="text-xs text-muted-foreground">Pro Plan</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b bg-background px-6 flex items-center justify-between">
          <h1 className="text-lg font-medium md:hidden">Plataforma</h1>
          <div className="flex items-center gap-4 ml-auto">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${username}`} />
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Perfil</DropdownMenuItem>
                <DropdownMenuItem>Ajustes</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <ScrollArea className="flex-1">
          <main className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="font-serif text-3xl font-bold text-foreground">Hola, {username}</h1>
                <p className="text-muted-foreground">Aquí está el resumen de tu actividad hoy.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline">Descargar Reporte</Button>
                <Button>Nueva Operación</Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                  <span className="text-muted-foreground font-bold">$</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$45,231.89</div>
                  <p className="text-xs text-muted-foreground">+20.1% del mes pasado</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Suscripciones</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">+2350</div>
                  <p className="text-xs text-muted-foreground">+180.1% del mes pasado</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ventas Activas</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">+12,234</div>
                  <p className="text-xs text-muted-foreground">+19% del mes pasado</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Resumen General</CardTitle>
                  <CardDescription>Actividad reciente de tu cuenta</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                   <div className="h-[200px] flex items-center justify-center text-muted-foreground bg-muted/20 rounded-md">
                      [Gráfico de Actividad]
                   </div>
                </CardContent>
              </Card>
              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Recientes</CardTitle>
                  <CardDescription>Últimas 5 transacciones</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div className="flex items-center" key={i}>
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-none">
                            Transacción #{1000 + i}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            hace {i} horas
                          </p>
                        </div>
                        <div className="ml-auto font-medium">+$1,999.00</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </ScrollArea>
      </div>
    </div>
  );
}
