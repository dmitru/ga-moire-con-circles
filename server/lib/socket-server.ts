import http from "http";
import { Server } from "socket.io";
import express from "express";
import cors from "cors";

/** A thin wrapper around Socket.IO server */
export class SocketIOServer {
  io: Server;
  wsServer: http.Server;

  constructor(props: { listenPort: number }) {
    const app = express();
    app.use(
      cors({
        origin: ["*"],
      })
    );
    const wsServer = http.createServer(app);
    this.wsServer = wsServer;

    const io = new Server(wsServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      } as any,
    } as any);

    this.io = io;

    console.log("[SocketIO]: listen on", props.listenPort);
    wsServer.listen(props.listenPort, "0.0.0.0");
    wsServer.on("error", () => {
      console.error("[SocketIO]: error");
    });
    wsServer.on("listening", () => {
      console.log("[SocketIO]: listening");
    });
    wsServer.on("connnection", () => {
      console.log("[SocketIO]: connnection");
    });
  }

  destroy = () => {
    this.io.close();
    this.wsServer.close();
  };
}
