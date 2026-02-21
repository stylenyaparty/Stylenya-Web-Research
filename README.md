# Stylenya-Web-Research

Stylenya-Web-Research es un servicio web diseñado para realizar búsquedas avanzadas de términos en Internet, devolviendo un clúster de respuestas útiles para alimentar otros servicios. Utiliza herramientas modernas como Genkit, Tavily, Fastify y TypeScript para ofrecer un backend potente y flexible.

## Features

*   **Integración con Genkit:** Orquestación de inteligencia artificial y acceso a diversos modelos de IA.
*   **Raspado Web:** Utiliza la API de búsqueda Tavily para recopilar datos web relevantes.
*   **Servidor con Fastify:** Backend robusto para manejar solicitudes de investigación y búsquedas.
*   **Validación con Zod:** Garantiza la integridad de los datos de entrada.
*   **Variables de Entorno:** Manejo de claves de API y configuración del servidor a través de archivos `.env`.
*   **Nuevas Rutas API:** Se han añadido endpoints para la gestión de investigaciones (`/v1/research/*`).

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
    Crea un archivo `.env` en la raíz del proyecto y añade tus claves de API:
    ```
    OPENAI_API_KEY=tu_api_key_openai
    TAVILY_API_KEY=tu_api_key_tavily
    PORT=4000 # Opcional: especificar el puerto
    HOST=0.0.0.0 # Opcional: especificar el host
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

*   **`/research/run` (POST):**
    Inicia una tarea de investigación.

    **Cuerpo de la Solicitud:**
    ```json
    {
      "prompt": "tendencias para fiestas de San Valentín",
      "mode": "deep", // o "quick"
      "market": "US",
      "language": "en", // Opcional
      "topic": "seasonal" // Opcional, valores: "seasonal", "product", "supplier", "general"
    }
    ```

    **Ejemplo de Solicitud:**
    ```bash
    curl -X POST http://localhost:4000/research/run \
    -H "Content-Type: application/json" \
    -d '{"prompt":"tendencias para fiestas de San Valentín", "mode":"deep", "market":"US"}'
    ```

    **Ejemplo de Respuesta:**
    ```json
    {
      "runId": "some-uuid",
      "meta": {
        "prompt": "tendencias para fiestas de San Valentín",
        "mode": "deep",
        "market": "US",
        "generatedAt": "2024-07-27T10:00:00.000Z",
        "cache": {"hit": false, "ttlSeconds": 3600},
        "disclaimer": "Resultados basados en investigación. No volumen de búsqueda."
      },
      "rows": [
        // ... datos de la investigación ...
      ],
      "clusterBundles": [
        // ... datos de clústeres ...
      ],
      "resultBundle": {
        "title": "Investigación Web: tendencias para fiestas de San Valentín",
        "summary": "...",
        "nextSteps": ["..."],
        "sources": [{"url": "...", "title": "..."}]
      }
    }
    ```

*   **`/v1/research/web` (POST):**
    Inicia una nueva investigación web.

    **Cuerpo de la Solicitud:**
    ```json
    {
      "query": "ejemplo de consulta de investigación",
      "mode": "deep", // Opcional, por defecto 'quick'
      "locale": "en-US", // Opcional
      "geo": "US", // Opcional
      "language": "en" // Opcional
    }
    ```

    **Ejemplo de Solicitud:**
    ```bash
    curl -X POST http://localhost:4000/v1/research/web \
    -H "Content-Type: application/json" \
    -d '{"query": "ideas para fiestas de cumpleaños temáticas de unicornio", "mode": "deep", "locale": "en-US"}'
    ```

    **Respuesta:**
    ```json
    {
      "runId": "uuid-del-run",
      "status": "QUEUED"
    }
    ```

*   **`/v1/research/runs/:id` (GET):**
    Obtiene el estado y los resultados de una tarea de investigación específica.

    **Ejemplo de Solicitud:**
    ```bash
    curl http://localhost:4000/v1/research/runs/uuid-del-run
    ```

    **Respuesta:** Devuelve un objeto detallado con el estado, clústeres y filas de la investigación.

## Contribuciones

¡Las contribuciones son bienvenidas! Por favor, sigue el flujo estándar de Git: fork, crea una rama, realiza un commit y abre un pull request.

## Licencia

Este proyecto está licenciado bajo la licencia ISC. Consulta el archivo [LICENSE.md](LICENSE.md) para más detalles.