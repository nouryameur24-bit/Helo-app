import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import router from "./routes";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/download/design", (_req, res) => {
  const file = path.resolve("/home/runner/workspace/helo_design.tar.gz");
  res.download(file, "helo_design.tar.gz");
});

app.use("/api", router);

export default app;
