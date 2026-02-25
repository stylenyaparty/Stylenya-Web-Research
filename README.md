# Stylenya-Web-Research

Stylenya-Web-Research es un servicio web diseñado para realizar búsquedas avanzadas de términos en Internet, devolviendo un clúster de respuestas útiles para alimentar otros servicios. Utiliza herramientas modernas como Genkit, Prisma, Fastify y TypeScript para ofrecer un backend potente y flexible.

## Features

*   **Integración con Genkit:** Orquestación de inteligencia artificial y acceso a diversos modelos de IA.
*   **Base de Datos con Prisma:** ORM para interactuar con la base de datos.
*   **Servidor con Fastify:** Backend robusto para manejar solicitudes de investigación y búsquedas.
*   **Variables de Entorno:** Manejo de claves de API y configuración del servidor a través de archivos `.env`.
*   **Nuevas Rutas API:** Se han añadido endpoints para la gestión de investigaciones (`/v1/research/*`).
*   **Caching:** Implementación de caché en memoria para mejorar el rendimiento de las búsquedas de Tavily.
*   **Reintentos y Timeouts:** Manejo robusto de errores con reintentos para llamadas a la API de OpenAI y timeouts configurables.
*   **Limpieza de Caché:** La caché en memoria ahora se puede limpiar manualmente.
*   **Research Runner:** Introducción de un sistema de ejecución de investigaciones asíncronas con control de concurrencia y encolamiento.

## Setup

1.  **Clona el repositorio:**
    ```bash
    git clone <repository-url>
    cd stylenya-web-research
    ```

2.  **Instala las dependencias:**
    ```bash
    npm install
    ```

3.  **Configura las variables de entorno:**
    Crea un archivo `.env` en la raíz del proyecto y añade tus claves de API y la URL de la base de datos:
    ```
    OPENAI_API_KEY=tu_api_key_openai
    DATABASE_URL=postgresql://user:password@host:port/database
    PORT=4000 # Opcional: especificar el puerto
    HOST=0.0.0.0 # Opcional: especificar el host

    # Configuración de caché para Tavily
    TAVILY_CACHE_ENABLED=true # o false
    TAVILY_CACHE_TTL_MS=21600000 # Tiempo de vida en milisegundos (por defecto 6 horas)

    # Configuración de reintentos y timeouts para OpenAI
    OPENAI_API_KEY=tu_api_key_openai
    LLM_TIMEOUT_MS=60000 # Timeout global para LLM en milisegundos
    OPENAI_RETRY_MAX=3 # Número máximo de reintentos para OpenAI
    OPENAI_RETRY_BASE_MS=500 # Tiempo base de espera entre reintentos en milisegundos
    OPENAI_RETRY_MAX_MS=8000 # Tiempo máximo de espera entre reintentos en milisegundos

    # Configuración del Research Runner
    RESEARCH_MAX_CONCURRENCY=2 # Número máximo de investigaciones concurrentes
    RESEARCH_TIMEOUT_MS_QUICK=90000 # Timeout para modo 'quick' en ms
    RESEARCH_TIMEOUT_MS_DEEP=180000 # Timeout para modo 'deep' en ms
    RESEARCH_ASYNC_ENABLED=true # Habilita el modo asíncrono para las investigaciones (por defecto true)
    ```

4.  **Ejecuta las migraciones de Prisma:**
    ```bash
    npx prisma migrate dev --name init_web_research
    ```

## Ejecución de la Aplicación

*   **Servidor de Desarrollo:**
    ```bash
    npm run dev
    ```
    Esto iniciará el servidor con hot-reloading habilitado.

*   **Compilación para Producción:**
    ```bash
    npm run build
    ```
    Este comando compila el código TypeScript a JavaScript.

*   **Servidor de Producción:**
    ```bash
    npm start
    ```
    Esto ejecutará el código JavaScript compilado.

## API Endpoints

*   **`/health` (GET):**
    Verifica el estado de salud del servidor.
    ```bash
    curl http://localhost:4000/health
    ```
    Respuesta esperada: `{"status":"ok"}`

*   **`/v1/research/web` (POST):**
    Inicia una tarea de investigación web. Si `RESEARCH_ASYNC_ENABLED` es `true` (por defecto), la solicitud será procesada de forma asíncrona y responderá con un estado `202 Accepted`.

    **Cuerpo de la Solicitud:**
    ```json
    {
      "query": "tendencias para fiestas de San Valentín",
      "mode": "deep" // o "quick"
    }
    ```

    **Ejemplo de Solicitud:**
    ```bash
    curl -X POST http://localhost:4000/v1/research/web \
    -H "Content-Type: application/json" \
    -d '{"query":"tendencias para fiestas de San Valentín", "mode":"deep"}'
    ```

    **Ejemplo de Respuesta (Asíncrona):**
    ```json
    {
      "runId": "some-uuid",
      "status": "QUEUED"
    }
    ```

*   **`/v1/research/runs/:id` (GET):**
    Obtiene los detalles de una tarea de investigación específica.

    **Ejemplo de Solicitud:**
    ```bash
    curl http://localhost:4000/v1/research/runs/some-uuid
    ```

    **Ejemplo de Respuesta:**
    ```json
    {
      "id": "some-uuid",
      "query": "tendencias para fiestas de San Valentín",
      "mode": "deep",
      "status": "SUCCESS",
      "createdAt": "2024-07-27T10:00:00.000Z",
      "updatedAt": "2024-07-27T10:05:00.000Z",
      "clusters": [],
      "rows": []
    }
    ```

*   **`/v1/research/web` (POST):**
    Inicia una nueva investigación web. Si `RESEARCH_ASYNC_ENABLED` es `true` (por defecto), la solicitud será procesada de forma asíncrona y responderá con un estado `202 Accepted`.

    **Cuerpo de la Solicitud:**
    ```json
    {
      "query": "ejemplo de consulta de investigación",
      "mode": "deep", // Opcional, por defecto 'quick'
      "locale": "en-US", // Opcional
      "geo": "US", // Opcional
      "language": "en" // Opcional
      "market": "US", // Opcional
      "topic": "seasonal" // Opcional, puede ser "seasonal", "product", "supplier", "general"
    }
    ```

    **Ejemplo de Solicitud:**
    ```bash
    curl -X POST http://localhost:4000/v1/research/web \
    -H "Content-Type: application/json" \
    -d '{"query": "ideas para fiestas de cumpleaños temáticas de unicornio", "mode": "deep", "locale": "en-US", "market": "US", "topic": "seasonal"}'
    ```

    **Respuesta (Asíncrona):**
    ```json
    {
      "runId": "uuid-del-run",
      "status": "QUEUED", // El estado ahora puede ser QUEUED, RUNNING, SUCCESS, o FAILED
      "timingsMs": null // Timings no disponibles hasta que la ejecución comience
    }
    ```

*   **`/v1/research/runs/:id` (GET):**
    Obtiene el estado y los resultados de una tarea de investigación específica.

    **Ejemplo de Solicitud:**
    ```bash
    curl http://localhost:4000/v1/research/runs/uuid-del-run
    ```

    **Respuesta:** Devuelve un objeto detallado con el estado, clústeres y filas de la investigación.
    ```json
    {
      "id": "uuid-del-run",
      "query": "ideas para fiestas de cumpleaños temáticas de unicornio",
      "mode": "deep",
      "locale": "en-US",
      "geo": "US",
      "language": "en",
      "market": "US",
      "topic": "seasonal",
      "status": "SUCCESS",
      "createdAt": "2024-07-27T10:00:00.000Z",
      "updatedAt": "2024-07-27T10:05:00.000Z",
      "timingsMs": {
        "pipeline": 1500,
        "tavily": 1000,
        "llm": 400,
        "scoring": 50,
        "persist": 100,
        "total": 1750
      },
      "resultJson": { ... }, // El resultado completo de la pipeline
      "errorJson": null, // O información del error si el estado es FAILED
      "clusters": [],
      "rows": []
    }
    ```

*   **`/v1/research/runs/:id/cancel` (POST):**
    Solicita la cancelación de una tarea de investigación en curso o en cola.

    **Ejemplo de Solicitud:**
    ```bash
    curl -X POST http://localhost:4000/v1/research/runs/uuid-del-run/cancel
    ```

    **Respuesta:**
    ```json
    {
      "runId": "uuid-del-run",
      "status": "RUNNING", // Estado actual del run
      "cancelRequested": true, // Indica si la solicitud de cancelación fue procesada
      "cancelled": true // Indica si el run fue efectivamente cancelado (puede ser false si ya estaba finalizado)
    }
    ```

## Contribuciones

¡Las contribuciones son bienvenidas! Por favor, sigue el flujo estándar de Git: fork, crea una rama, realiza un commit y abre un pull request.

## Licencia

Este proyecto está licenciado bajo la licencia ISC. Consulta el archivo [LICENSE.md](LICENSE.md) para más detalles.