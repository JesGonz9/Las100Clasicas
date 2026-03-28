# 🧗 Las 100 Clásicas

Aplicación web de escalada para el tracking de vías del libro **"Las 100 Clásicas"**. Permite registrar ascensiones, explorar vías en un mapa interactivo e interactuar con otros escaladores.

## ✨ Funcionalidades

- **Autenticación** — Registro e inicio de sesión con email o Google
- **Catálogo de vías** — Listado con búsqueda, filtros y detalle completo (dificultad libre/obligatoria/artificial, longitud, enlaces externos)
- **Mapa interactivo** — Visualización de paredes con Leaflet, búsqueda por zona y navegación directa desde el detalle de vía
- **Ascensiones** — Registro de ascensiones con fecha, valoración, compañeros y fotos
- **Comentarios** — Comentarios en cada vía
- **Social** — Seguir a otros usuarios, feed de actividad y notificaciones
- **Perfiles** — Foto de perfil, bio y estadísticas
- **Panel de administración** — CRUD completo de zonas, paredes, vías y logros con edición inline y búsqueda
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
├── public/              # Assets estáticos
├── src/
│   ├── app/             # Componente raíz y rutas
│   ├── components/      # Componentes compartidos (Layout, Sidebar, BottomNav, Spinner...)
│   ├── features/        # Módulos por funcionalidad
│   │   ├── admin/       # Panel de administración
│   │   ├── ascents/     # Registro de ascensiones
│   │   ├── auth/        # Login y registro
│   │   ├── dashboard/   # Dashboard principal
│   │   ├── map/         # Mapa interactivo
│   │   ├── profile/     # Perfil de usuario
│   │   ├── routes/      # Listado y detalle de vías
│   │   └── social/      # Social, seguidores y notificaciones
│   ├── hooks/           # Custom hooks (useAuth, useAuthStore)
│   ├── models/          # Tipos TypeScript
│   ├── services/        # Firebase (auth, firestore, storage)
│   └── utils/           # Utilidades (cn)
├── package.json
├── tsconfig.json
└── vite.config.ts
```

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
