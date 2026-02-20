import { buildApp } from "./app";
import dotenv from "dotenv";

dotenv.config();

const app = buildApp();

const PORT = Number(process.env.PORT) || 4000;

app.listen({ port: PORT }, (err, address) => {
    if (err) {
        app.log.error(err);
        process.exit(1);
    }
    console.log(`Server running at ${address}`);
});