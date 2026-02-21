# Stylenya-Web-Research

Stylenya-Web-Research es un servicio web diseñado para realizar búsquedas avanzadas de términos en Internet, devolviendo un clúster de respuestas útiles para alimentar otros servicios. Utiliza herramientas modernas como Genkit, Prisma, Fastify y TypeScript para ofrecer un backend potente y flexible.

## Features

*   **Integración con Genkit:** Orquestación de inteligencia artificial y acceso a diversos modelos de IA.
*   **Base de Datos con Prisma:** ORM para interactuar con la base de datos.
*   **Servidor con Fastify:** Backend robusto para manejar solicitudes de investigación y búsquedas.
*   **Variables de Entorno:** Manejo de claves de API y configuración del servidor a través de archivos `.env`.

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

*   **`/research/run` (POST):**
    Inicia una tarea de investigación.

    **Cuerpo de la Solicitud:**
    ```json
    {
      "prompt": "tendencias para fiestas de San Valentín",
      "mode": "deep", // o "quick"
      "locale": "US",
      "language": "en", // Opcional
      "geo": "US" // Opcional
    }
    ```

    **Ejemplo de Solicitud:**
    ```bash
    curl -X POST http://localhost:4000/research/run \
    -H "Content-Type: application/json" \
    -d '{"prompt":"tendencias para fiestas de San Valentín", "mode":"deep", "locale":"US"}'
    ```

    **Ejemplo de Respuesta:**
    ```json
    {
      "runId": "some-uuid",
      "meta": {
        "prompt": "tendencias para fiestas de San Valentín",
        "mode": "deep",
        "locale": "US",
        "generatedAt": "2024-07-27T10:00:00.000Z",
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

## Contribuciones

¡Las contribuciones son bienvenidas! Por favor, sigue el flujo estándar de Git: fork, crea una rama, realiza un commit y abre un pull request.

## Licencia

Este proyecto está licenciado bajo la licencia ISC. Consulta el archivo [LICENSE.md](LICENSE.md) para más detalles.