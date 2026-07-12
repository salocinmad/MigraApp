# MigraApp 🧠

**MigraApp** es una aplicación web progresiva (PWA) orientada a dispositivos móviles diseñada para el registro, seguimiento y análisis de episodios de migraña. Permite a los usuarios llevar un control detallado de la intensidad del dolor, síntomas asociados, medicación y notas, además de generar informes en PDF para compartir con especialistas médicos.

La aplicación incluye un gestor de usuarios integrado con roles de administrador y paciente.

---

## 🚀 Características principales

### 1. Registro rápido y responsive
* Diseño moderno y premium optimizado para teléfonos móviles (*mobile-first*), con soporte para modo oscuro por defecto.
* **Intensity Picker táctil:** Escala de dolor del 1 al 10 con un solo toque y colores dinámicos (verde a rojo).
* Registro de síntomas acompañantes: **Neuralgia** y **Fotosensibilidad**.
* Registro opcional de medicación tomada y notas libres.

### 2. Lógica inteligente de episodios continuados ("Viene de la anterior")
Al registrar una migraña, el usuario puede indicar si el dolor continúa desde el episodio anterior:
* **Saltos de días cubiertos:** Si la migraña empieza el lunes y se vuelve a registrar el jueves indicando que "viene de la anterior", el sistema calcula automáticamente que el episodio lleva **4 días** activos.
* **Visualización en tiempo real:** Informa en el formulario cuántos días de dolor acumulado lleva el episodio actual.
* **Cálculo de estadísticas:** "Días con migraña" en las estadísticas sumará la duración real de los episodios completos, mientras que la intensidad media se calculará únicamente sobre los días registrados reales para evitar alterar los promedios.

### 3. Calendario e Historial
* Calendario mensual interactivo con puntos indicadores coloreados por intensidad.
* Historial con vista expandible para ver los detalles, editar o eliminar registros antiguos.

### 4. Generación de informes en PDF
* Filtrado por rango de fechas personalizable o acceso rápido a los **últimos 3 meses**.
* Generación instantánea en el navegador de un PDF detallado que incluye:
  * Resumen estadístico (días con migraña, episodios, promedio de intensidad, etc.).
  * Gráfico evolutivo de días con migraña por mes.
  * Tabla con el registro detallado de episodios agrupados.
  * Anexo con el desglose diario.

### 5. Control de Usuarios (Administrador)
* El usuario administrador principal es **admin**.
* Creación, edición y eliminación de pacientes desde el panel de control.
* El administrador puede **ver los registros de cualquier paciente** y generar informes en su nombre.
* Funcionalidad para **Exportar/Importar** toda la base de datos de la aplicación en un archivo JSON de respaldo.

---

## 🛠️ Stack Tecnológico

* **Frontend:** HTML5, CSS3 (Vanilla CSS con diseño Glassmorphism), Javascript (Vanilla SPA).
* **Backend:** Node.js + Express.js.
* **Base de datos:** SQLite3 (con el motor síncrono de alto rendimiento `better-sqlite3` y modo WAL activado).
* **Sesiones:** Almacenadas en SQLite usando `connect-sqlite3`.
* **Gráficos:** Chart.js (vía CDN).
* **PDFs:** jsPDF y jspdf-autotable (vía CDN).
* **Contenedor:** Docker + Docker Compose.

---

## 🔑 Credenciales por defecto

Al arrancar la aplicación por primera vez, se inicializa automáticamente el usuario administrador:

* **Usuario:** `admin`
* **Contraseña:** `MigraApp-admin`

> [!WARNING]
> Por motivos de seguridad, te recomendamos cambiar la contraseña predeterminada desde el panel de **Admin → ✏️ Editar usuario** nada más acceder.

---

## 🐳 Despliegue con Docker (Recomendado)

La aplicación está completamente dockerizada. Para ejecutarla no necesitas tener instalado Node.js ni SQLite en tu máquina, únicamente **Docker** y **Docker Compose**.

### Instrucciones para levantar el proyecto

1. Clona el repositorio en tu máquina local:
   ```bash
   git clone https://github.com/salocinmad/MigraApp.git
   ```
2. Accede al directorio del proyecto:
   ```bash
   cd MigraApp
   ```
3. Ejecuta el siguiente comando para construir la imagen e iniciar la aplicación:
   ```bash
   docker compose up -d --build
   ```
4. Abre tu navegador web y accede a:
   **[http://localhost:9456](http://localhost:9456)**

### Comandos de utilidad

* **Parar la aplicación (preservando datos):**
  ```bash
  docker compose down
  ```
* **Borrar datos por completo (resetea base de datos a cero):**
  ```bash
  docker compose down -v
  ```
* **Ver logs del servidor en tiempo real:**
  ```bash
  docker logs -f migraapp
  ```

---

## 📁 Estructura del repositorio

```
MigraApp/
├── Dockerfile              # Configuración de compilación multi-stage de Docker
├── docker-compose.yml      # Definición de puerto, volumen y variables del contenedor
├── .dockerignore           # Archivos omitidos en el contexto de Docker
├── package.json            # Dependencias del servidor Node.js
├── README.md               # Este archivo de documentación
│
├── server/                 # Backend Node.js
│   ├── app.js              # Servidor Express, manejo de sesiones y rutas estáticas
│   ├── db.js               # Conexión SQLite, esquemas y carga inicial de administrador
│   ├── middleware/
│   │   └── auth.js         # Filtros de sesión y control de roles
│   └── routes/
│       ├── auth.js         # Rutas de login, logout y sesión activa
│       ├── users.js        # CRUD de gestión de usuarios (solo admin)
│       ├── migraines.js    # CRUD de registros de migrañas
│       └── data.js         # Endpoints para exportar e importar datos en JSON
│
└── public/                 # Frontend (Servido de forma estática por Express)
    ├── index.html          # HTML principal
    ├── manifest.json       # Configuración PWA
    ├── sw.js               # Service Worker para almacenamiento en caché local (PWA)
    ├── css/                # Hojas de estilo estructuradas
    ├── assets/             # Iconos e imágenes del proyecto
    └── js/                 # Lógica del cliente estructurada por módulos
```

---

## 📱 Instalación como App Móvil (PWA)

Una vez que la aplicación esté corriendo en Docker, puedes instalarla en tu teléfono móvil como si fuera una aplicación nativa:

1. Asegúrate de que el ordenador y el teléfono están conectados a la **misma red Wi-Fi**.
2. Averigua la dirección IP local de tu ordenador (por ejemplo, `192.168.1.50`).
3. Abre el navegador en tu teléfono móvil y entra a `http://192.168.1.50:9456`.
4. **En Android (Chrome):** Pulsa el botón de menú (⋮) y selecciona **"Añadir a pantalla de inicio"** o **"Instalar aplicación"**.
5. **En iOS (Safari):** Pulsa el botón de compartir (el icono del cuadrado con la flecha hacia arriba) y selecciona **"Añadir a pantalla de inicio"**.
