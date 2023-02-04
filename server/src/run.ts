import { Socket } from "socket.io";
import { createVirtualMidiIn } from "../lib/midi";
import { SocketIOServer } from "../lib/socket-server";

/** The basics: timesync + persisted synced session data. */
export const createServer = async () => {
  const server = new SocketIOServer({
    listenPort: 9999,
  });

  return server;
};

const run = async () => {
  const server = await createServer();

  let sockets: Socket[] = [];
  server.io.on("connection", (sock) => {
    sockets.push(sock);

    sock.on("disconnect", () => {
      console.log("end");
      sockets = sockets.filter((s) => s !== sock);
    });
    sock.on("data", (data) => {
      console.log("data", data);
    });
  });

  const midiIn = createVirtualMidiIn("Virtual MIDI In VISUAL");
  console.log(midiIn);
  midiIn.on("noteon", (data) => {
    console.log("noteon: ", data);
    for (const sock of sockets) {
      sock.emit("noteon", data);
    }
  });
  midiIn.on("noteoff", (data) => {
    console.log("noteoff: ", data);
    sockets = sockets.filter((s) => !s.disconnected);
    for (const sock of sockets) {
      sock.emit("noteoff", data);
    }
  });

  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
};

run();
