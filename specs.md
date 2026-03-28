# 🧠 Especificación del Proyecto - App Web de Escalada

## 🎯 Contexto del Proyecto

Desarrollar una aplicación web social de escalada centrada en el tracking de vías del libro *“Las 100 clásicas”*. La aplicación permitirá a los usuarios registrar ascensiones, interactuar socialmente y visualizar información detallada de las vías.

La aplicación debe ser:
- Escalable
- Modular
- Mobile-first
- Lista para producción

---

## 🧱 Stack Tecnológico

### Frontend
- React + Vite
- TypeScript
- TailwindCSS
- shadcn/ui
- React Router
- Zustand o Context API

### Backend (Serverless)
- Firebase Authentication
- Firestore
- Firebase Storage
- Cloud Functions

### Mapas
- Mapbox

---

## 🧠 Arquitectura

```
/src
  /app
  /features
    /auth
    /routes
    /ascents
    /profile
    /social
    /map
    /admin
  /components
  /services
    /firebase
    /api
  /hooks
  /models
  /utils
```

Separación clara entre UI, lógica y datos.

---

## 🗄️ Modelo de Datos

### users
```ts
{
  id: string
  username: string
  email: string
  photoURL: string
  bio: string
  createdAt: timestamp
}
```

### routes
```ts
{
  id: string
  name: string
  zoneId: string
  description: string
  difficulty: {
    free: string
    mandatory: string
    aid: string
  }
  length: number
  coordinates: {
    lat: number
    lng: number
  }
  images: string[]
  externalLinks: string[]
  createdAt: timestamp
}
```

### zones
```ts
{
  id: string
  name: string
}
```

### ascents
```ts
{
  id: string
  userId: string
  routeId: string
  date: timestamp
  rating: number
  comment: string
  partners: string[]
  photos: string[]
  createdAt: timestamp
}
```

### comments
```ts
{
  id: string
  userId: string
  routeId: string
  content: string
  createdAt: timestamp
}
```

### follows
```ts
{
  id: string
  followerId: string
  followingId: string
}
```

### notifications
```ts
{
  id: string
  userId: string
  type: string
  message: string
  read: boolean
  createdAt: timestamp
}
```

### achievements
```ts
{
  id: string
  name: string
  description: string
  condition: string
}
```

---

## ⚙️ Funcionalidades

### Autenticación
- Registro / login
- Persistencia de sesión
- Protección de rutas

### Vías
- Listado general
- Búsqueda por nombre
- Filtros por zona y dificultad

### Detalle de vía
- Información completa
- Croquis
- Enlaces externos
- Comentarios
- Lista de usuarios

### Ascensiones
- Crear, editar, eliminar
- Múltiples por vía
- Incluye fotos con compresión

### Perfil
- Información básica
- Estadísticas
- Actividad reciente

### Social
- Sistema de follow
- Comentarios
- Likes

### Notificaciones
- Sistema in-app

### Logros
- Primera vía
- 10 vías
- Primera zona

### Mapa
- Visualización con clustering

### Dashboard
- Estadísticas por zona
- Ranking global y social

### Admin
- CRUD de vías, zonas y logros
- Gestión de usuarios

---

## 🎨 UI/UX

- Mobile-first
- Diseño moderno
- Navegación clara

---

## ⚡ Rendimiento

- Paginación
- Queries optimizadas
- Lazy loading

---

## 🔒 Seguridad

- Reglas de Firestore
- Validación de datos

---

## 🧪 Buenas Prácticas

- TypeScript estricto
- Componentes reutilizables
- Hooks personalizados
- Código limpio

---

## 🚀 Objetivo

Construir una aplicación profesional, escalable y mantenible, preparada para evolucionar en el tiempo.

