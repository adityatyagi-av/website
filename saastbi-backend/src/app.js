import express from "express";
import cors from "cors";
import router from "./routes/route.js";
import cookieParser from "cookie-parser";

const app = express();

app.disable("x-powered-by");   
app.set("trust proxy", 1); 


app.use(cookieParser());

const allowedOrigins = [
  "https://startupsocialmedia.vercel.app",
  "https://admin-portal2.vercel.app",
  "http://localhost:3000",
  "http://localhost:3001",
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(router);
export default app;
