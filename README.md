# 🧗 Las 100 Clásicas

Aplicación web de escalada para el tracking de vías del libro **"Las 100 Clásicas"**. Permite registrar ascensiones, explorar vías en un mapa interactivo e interactuar con otros escaladores.

## ✨ Funcionalidades

- **Autenticación** — Registro e inicio de sesión con email o Google
- **Catálogo de vías** — Listado con búsqueda, filtros y detalle completo (dificultad libre/obligatoria/artificial, longitud, enlaces externos)
- **Mapa interactivo** — Visualización de paredes con Leaflet, búsqueda por zona y navegación directa desde el detalle de vía
- **Ascensiones** — Registro de ascensiones con fecha, valoración, compañeros y comentario
- **Comentarios** — Comentarios en cada vía
- **Social** — Seguir a otros usuarios, feed de actividad, ranking total y entre amigos, y notificaciones
- **Perfiles** — Perfil propio y de otros usuarios con 3 pestañas: Progreso (estadísticas por zona), Logros (con barra de progreso en los no conseguidos) y Vías ascendidas
- **Sistema de logros y puntos** — Logros desbloqueables por tipo (número de ascensiones, zonas, vías específicas) con cálculo automático de puntos
- **Panel de administración** — CRUD completo de zonas, paredes, vías y logros con edición inline, búsqueda y edición de coordenadas en mapa interactivo
- **Datos de prueba** — Herramienta de seed en el panel de admin para generar un entorno social realista con usuarios, ascensiones, follows y logros
- **Diseño responsive** — Mobile-first con navegación inferior en móvil y sidebar en escritorio

## 🛠️ Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19, TypeScript, Vite 6 |
| Estilos | TailwindCSS 4 |
| Estado | Zustand |
| Routing | React Router 7 |
| Backend | Firebase (Auth, Firestore, Storage) |
| Mapas | Leaflet + react-leaflet |
| Iconos | lucide-react |

## 📁 Estructura del proyecto

```
app/
├── public/              # Assets estáticos (imágenes de fondo)
├── src/
│   ├── app/             # Componente raíz y rutas
│   ├── components/      # Componentes compartidos (Layout, Sidebar, BottomNav, Spinner...)
│   ├── features/        # Módulos por funcionalidad
│   │   ├── admin/       # Panel de administración + herramienta de seed
│   │   ├── ascents/     # Registro de ascensiones
│   │   ├── auth/        # Login y registro
│   │   ├── map/         # Mapa interactivo
│   │   ├── profile/     # Perfil de usuario (3 pestañas: Progreso / Logros / Vías)
│   │   ├── routes/      # Listado y detalle de vías
│   │   └── social/      # Social, ranking, seguidores y notificaciones
│   ├── hooks/           # Custom hooks (useAuth, useAuthStore)
│   ├── models/          # Tipos TypeScript
│   ├── services/        # Firebase (auth, firestore, storage) + caché en memoria
│   └── utils/           # Utilidades (cn)
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## ⚡ Caché de datos estáticos

Las colecciones que raramente cambian (rutas, zonas, paredes y logros) se cachean en memoria con un TTL de 10 minutos. La caché se invalida automáticamente cuando el administrador realiza cualquier modificación, evitando lecturas innecesarias a Firestore durante la sesión.

## 🔐 Roles y permisos

Los roles de usuario se gestionan mediante **custom claims de Firebase Auth** (`role: 'admin'`). Las reglas de Firestore verifican `request.auth.token.role == 'admin'` para proteger las operaciones de escritura en colecciones sensibles.

## 🚀 Instalación

```bash
# Clonar el repositorio
git clone https://github.com/JesGonz9/Las100Clasicas.git
cd Las100Clasicas/app

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Firebase
```

### Variables de entorno necesarias

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## 💻 Desarrollo

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción
npm run preview  # Preview del build
```

## 📄 Licencia

Este proyecto es privado y de uso personal.
