# Stylenya-Web-Research

Stylenya-Web-Research es un servicio web diseñado para realizar búsquedas avanzadas de términos en Internet, devolviendo un clúster de respuestas útiles para alimentar otros servicios. Utiliza herramientas modernas como Genkit, Tavily, Fastify y TypeScript para ofrecer un backend potente y flexible.

## Features

*   **Integración con Genkit:** Orquestación de inteligencia artificial y acceso a diversos modelos de IA.
*   **Raspado Web:** Utiliza la API de búsqueda Tavily para recopilar datos web relevantes.
*   **Servidor con Fastify:** Backend robusto para manejar solicitudes de investigación y búsquedas.
*   **Validación con Zod:** Garantiza la integridad de los datos de entrada.
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

*   **`/v1/research/web` (POST):**
    Inicia una tarea de investigación web.

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

    **Ejemplo de Respuesta:**
    ```json
    {
      "runId": "some-uuid",
      "status": "SUCCESS"
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

## Contribuciones

¡Las contribuciones son bienvenidas! Por favor, sigue el flujo estándar de Git: fork, crea una rama, realiza un commit y abre un pull request.

## Licencia

Este proyecto está licenciado bajo la licencia ISC. Consulta el archivo [LICENSE.md](LICENSE.md) para más detalles.