# Stylenya-Web-Research

This project implements a web service for conducting research on party decoration trends using AI and web scraping.

## Features

*   **AI-Powered Research:** Leverages OpenAI's models for analyzing and synthesizing research data.
*   **Web Scraping:** Utilizes Tavily Search API to gather relevant web data.
*   **FastAPI Server:** Provides a robust backend using Fastify for handling research requests.
*   **Zod Validation:** Ensures data integrity for incoming requests.
*   **Environment Variables:** Manages API keys and server configuration through `.env` files.

## Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd stylenya-web-research
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure environment variables:**
    Create a `.env` file in the root of the project and add your API keys:
    ```
    OPENAI_API_KEY=your_openai_api_key
    TAVILY_API_KEY=your_tavily_api_key
    PORT=4000 # Optional: specify port
    ```

## Running the Application

*   **Development Server:**
    ```bash
    npm run dev
    ```
    This will start the server with hot-reloading enabled.

*   **Build for Production:**
    ```bash
    npm run build
    ```
    This command compiles the TypeScript code into JavaScript.

*   **Start Production Server:**
    ```bash
    npm start
    ```
    This runs the compiled JavaScript code.

## API Endpoints

*   **`/health` (GET):**
    Checks the health status of the server.
    ```bash
    curl http://localhost:4000/health
    ```
    Expected response: `{"status":"ok"}`

*   **`/research/run` (POST):**
    Initiates a research task.

    **Request Body:**
    ```json
    {
      "prompt": "valentines party trends",
      "mode": "deep", // or "quick"
      "market": "US",
      "language": "en", // Optional
      "topic": "seasonal" // Optional, values: "seasonal", "product", "supplier", "general"
    }
    ```

    **Example Request:**
    ```bash
    curl -X POST http://localhost:4000/research/run \
    -H "Content-Type: application/json" \
    -d '{"prompt":"valentines party trends", "mode":"deep", "market":"US"}'
    ```

    **Example Response:**
    ```json
    {
      "runId": "some-uuid",
      "meta": {
        "prompt": "valentines party trends",
        "mode": "deep",
        "market": "US",
        "generatedAt": "2024-07-27T10:00:00.000Z",
        "cache": {"hit": false, "ttlSeconds": 3600},
        "disclaimer": "Research-based recurrence. Not search volume."
      },
      "rows": [
        // ... research data rows ...
      ],
      "clusterBundles": [
        // ... cluster data ...
      ],
      "resultBundle": {
        "title": "Web Research: valentines party trends",
        "summary": "...",
        "nextSteps": ["..."],
        "sources": [{"url": "...", "title": "..."}]
      }
    }
    ```

## Contributing

Contributions are welcome! Please follow the standard Git workflow: fork, branch, commit, and create a pull request.

## License

This project is licensed under the ISC License - see the [LICENSE.md](LICENSE.md) file for details.
