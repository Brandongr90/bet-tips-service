# BetTips API

API RESTful para una plataforma de tips de apuestas deportivas desarrollada con Node.js, Express y PostgreSQL.

## Características

- Autenticación con JWT (registro, login, recuperación de contraseña)
- Gestión de usuarios y roles (admin, tipster, usuario)
- Sistema de suscripciones
- Gestión de deportes y ligas
- Gestión de tips deportivos
- Sistema de parlays (combinación de tips)
- Casas de apuestas y momios/cuotas
- Estadísticas y análisis
- PostgreSQL como base de datos
- Sequelize ORM
- Validación de datos
- Logs detallados
- Manejo de errores robusto
- Arquitectura escalable por capas

## Requisitos previos

- Node.js (v14 o superior)
- PostgreSQL (v12 o superior)
- npm

## Instalación

1. Clonar el repositorio:

```bash
git clone https://github.com/tu-usuario/bet-tips-api.git
cd bet-tips-api
```

2. Instalar dependencias:

```bash
npm install
```

3. Configurar variables de entorno:

Crear un archivo `.env` en la raíz del proyecto con el siguiente contenido:

```
PORT=3000
NODE_ENV=development

# Configuración de la base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bet_tips
DB_USER=postgres
DB_PASSWORD=tu_contraseña

# JWT
JWT_SECRET=un_secreto_muy_seguro_y_largo_para_jwt_tokens
JWT_EXPIRATION=1d
JWT_REFRESH_EXPIRATION=7d

# Email (para recuperación de contraseña)
EMAIL_SERVICE=gmail
EMAIL_USER=tu_email@gmail.com
EMAIL_PASSWORD=tu_password_de_aplicacion
EMAIL_FROM=noreply@bettips.com

# URL del frontend
FRONTEND_URL=http://localhost:8080
```

4. Crear la base de datos en PostgreSQL:

```sql
CREATE DATABASE bet_tips;
```

5. Ejecutar el script SQL para crear las tablas:

```bash
psql -U postgres -d bet_tips -f bet-tips.sql
```

6. Cargar datos iniciales:

```bash
npm run seed
```

## Inicio

Iniciar en modo desarrollo:

```bash
npm run dev
```

Iniciar en modo producción:

```bash
npm start
```

## Estructura del proyecto

```
bet-tips-api/
├── logs/               # Directorio de logs
├── src/
│   ├── config/         # Configuraciones de la aplicación
│   ├── controllers/    # Controladores de la API
│   ├── middlewares/    # Middlewares
│   ├── models/         # Modelos de datos (Sequelize)
│   ├── routes/         # Rutas de la API
│   ├── scripts/        # Scripts utilitarios
│   ├── services/       # Servicios
│   ├── utils/          # Utilidades
│   ├── validators/     # Validadores
│   └── app.js          # Configuración de Express
├── .env                # Variables de entorno
├── .gitignore
├── package.json
├── server.js           # Punto de entrada
└── README.md
```

## Principales rutas de la API

### Autenticación
- `POST /api/auth/register` - Registrar un nuevo usuario
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/refresh-token` - Renovar token JWT
- `POST /api/auth/forgot-password` - Solicitar recuperación de contraseña
- `POST /api/auth/reset-password` - Restablecer contraseña
- `GET /api/auth/profile` - Obtener perfil del usuario actual
- `PUT /api/auth/profile` - Actualizar perfil
- `POST /api/auth/change-password` - Cambiar contraseña

### Usuarios
- `GET /api/users` - Obtener todos los usuarios (admin)
- `GET /api/users/top-tipsters` - Obtener los mejores tipsters
- `GET /api/users/:id` - Obtener un usuario específico
- `GET /api/users/:id/stats` - Obtener estadísticas de un usuario
- `PUT /api/users/:id` - Actualizar un usuario
- `DELETE /api/users/:id` - Eliminar/deshabilitar un usuario

### Suscripciones
- `GET /api/subscriptions` - Obtener todas las suscripciones
- `GET /api/subscriptions/:id` - Obtener una suscripción específica
- `POST /api/subscriptions` - Crear una nueva suscripción (admin)
- `PUT /api/subscriptions/:id` - Actualizar una suscripción (admin)
- `DELETE /api/subscriptions/:id` - Eliminar una suscripción (admin)
- `POST /api/subscriptions/subscribe` - Suscribir a un usuario
- `GET /api/subscriptions/user/history` - Obtener historial de suscripciones
- `GET /api/subscriptions/user/active` - Verificar suscripción activa
- `POST /api/subscriptions/cancel/:subscriptionId` - Cancelar suscripción

### Tips
- `GET /api/tips` - Obtener todos los tips (con filtros)
- `GET /api/tips/popular` - Obtener tips populares
- `GET /api/tips/live` - Obtener tips en vivo
- `GET /api/tips/upcoming` - Obtener próximos tips
- `GET /api/tips/:id` - Obtener un tip específico
- `POST /api/tips` - Crear un nuevo tip (tipsters y admins)
- `PUT /api/tips/:id` - Actualizar un tip
- `DELETE /api/tips/:id` - Eliminar un tip

### Deportes
- `GET /api/sports` - Obtener todos los deportes
- `GET /api/sports/stats` - Obtener estadísticas por deporte
- `GET /api/sports/:id` - Obtener un deporte específico
- `POST /api/sports` - Crear un nuevo deporte (admin)
- `PUT /api/sports/:id` - Actualizar un deporte (admin)
- `DELETE /api/sports/:id` - Eliminar un deporte (admin)

### Ligas
- `GET /api/leagues` - Obtener todas las ligas
- `GET /api/leagues/stats` - Obtener estadísticas por liga
- `GET /api/leagues/:id` - Obtener una liga específica
- `POST /api/leagues` - Crear una nueva liga (admin)
- `PUT /api/leagues/:id` - Actualizar una liga (admin)
- `DELETE /api/leagues/:id` - Eliminar una liga (admin)

### Casas de apuestas
- `GET /api/bookmakers` - Obtener todas las casas de apuestas
- `GET /api/bookmakers/stats` - Obtener estadísticas de casas de apuestas
- `GET /api/bookmakers/:id` - Obtener una casa de apuestas específica
- `POST /api/bookmakers` - Crear una nueva casa de apuestas (admin)
- `PUT /api/bookmakers/:id` - Actualizar una casa de apuestas (admin)
- `DELETE /api/bookmakers/:id` - Eliminar una casa de apuestas (admin)

### Parlays
- `GET /api/parlays` - Obtener todos los parlays
- `GET /api/parlays/popular` - Obtener parlays populares
- `GET /api/parlays/stats` - Obtener estadísticas de parlays
- `GET /api/parlays/:id` - Obtener un parlay específico
- `POST /api/parlays` - Crear un nuevo parlay
- `PUT /api/parlays/:id` - Actualizar un parlay
- `DELETE /api/parlays/:id` - Eliminar un parlay

## Documentación

La documentación completa de la API está disponible en `/api/docs` una vez que el servidor está en funcionamiento.

## Seguridad

- Autenticación JWT
- Encriptación de contraseñas con bcrypt
- Validación de solicitudes
- Protección contra CSRF y XSS
- Control de acceso basado en roles

## Recursos adicionales

- [Express.js](https://expressjs.com/)
- [Sequelize ORM](https://sequelize.org/)
- [JSON Web Tokens](https://jwt.io/)
- [Nodemailer](https://nodemailer.com/)

## Licencia

Este proyecto está licenciado bajo la Licencia MIT.

## Contacto

Para preguntas o soporte, contacta a [tu-email@example.com](mailto:tu-email@example.com).