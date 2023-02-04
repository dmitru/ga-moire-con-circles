import SocketIOClient, { Socket } from "socket.io-client";
// @ts-ignore
import * as timesync from "timesync/dist/timesync";

export type SocketIOProps = {
  host: string;
  port: number;
};

/** Socket.IO client extended with timesync and latency test */
export class SocketIO {
  socket: Socket;

  constructor(props: SocketIOProps) {
    console.log("SocketIO constructor", props);
    this.socket = SocketIOClient(`ws://${props.host}:${props.port}`, {
      rejectUnauthorized: false,
      transports: ["websocket"],
    });
  }

  destroy = () => {
    // this.socket.close()
  };

  /** Measures latency in ms */
  testLatency = (): Promise<number> => {
    return new Promise((resolve) => {
      const start = Date.now();
      this.socket.emit("ping", () => {
        const duration = Date.now() - start;
        resolve(duration);
      });
    });
  };

  timesyncOffset: number | undefined;
  startTimesync = (onTimeOffsetChange?: (offsetMs: number) => void) => {
    let tinesyncInstance = timesync.create({
      server: this.socket,
      interval: 5000,
    });

    tinesyncInstance.on("sync", (state: any) => {
      // console.log('[TIMESYNC]: sync ' + state + '')
    });

    tinesyncInstance.on("change", (offset: number) => {
      // console.log('[TIMESYNC]: changed offset: ' + offset + ' ms')
      onTimeOffsetChange?.(offset);
      this.timesyncOffset = offset;
    });

    tinesyncInstance.send = (socket: any, data: any, timeout: any) => {
      //console.log('send', data);
      return new Promise<void>(function (resolve, reject) {
        const timeoutFn = setTimeout(reject, timeout);
        socket.emit("timesync", data, function () {
          clearTimeout(timeoutFn);
          resolve();
        });
      });
    };

    this.socket.on("timesync", (data) => {
      tinesyncInstance.receive(null, data);
    });
  };
}
