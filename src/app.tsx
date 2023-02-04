import { useEffect, useState } from "preact/hooks";
import "./app.css";
import chroma from "chroma-js";
import { CanvasCapture } from "canvas-capture";
import { SocketIO } from "./lib/socket";
import { interpol } from "./lib/interpolate";

class ADEnv {
  attack: number;
  decay: number;

  constructor(props: { attack: number; decay: number }) {
    this.attack = props.attack;
    this.decay = props.decay;
  }

  update = (dt: number) => {
    this.t += dt;
  };

  tReleased: number = 0;
  t = 0;
  gate = false;

  trigger = () => {
    this.gate = true;
    this.t = 0;
    this.tReleased = 0;
  };
  release = () => {
    this.gate = false;
    this.tReleased = this.t;
  };

  get value() {
    if (this.gate) {
      return interpol(
        [
          [0, 0],
          [this.attack, 1],
        ],
        "lin"
      )(this.t);
    } else {
      return interpol(
        [
          [0, 1],
          [this.decay, 0],
        ],
        "lin"
      )(this.t - this.tReleased);
    }
  }
}

const bpmToMs = (bpm: number) => {
  return (60 * 1000) / bpm;
};

const sceneTimeoutMs = bpmToMs(120) * 16;

// random number between two given numbers
const random = (min: number, max: number) => {
  return Math.random() * (max - min) + min;
};

// dist between 2 points
const dist = (x1: number, y1: number, x2: number, y2: number) => {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
};

type Circle = {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  period: number;
  phase: number;
  id?: number;
  env: ADEnv;
};

class State {
  t = 0;
  circles: Circle[] = [];
  attackMs = 50;
  decayMs = 400;

  // update positions of circles based on their vx, vy velocities
  update = (dt: number) => {
    this.t += dt;
    // console.log("t", this.t, dt);

    for (const circle of this.circles) {
      circle.x += circle.vx;
      circle.y += circle.vy;
      circle.env.update(dt);
    }
  };

  addCircle = (x: number, y: number, r: number, vx = 0, vy = 0) => {
    const c: Circle = {
      x,
      y,
      r,
      vx,
      vy,
      period: random(1, 2),
      phase: random(0, Math.PI * 2),
      env: new ADEnv({ attack: this.attackMs, decay: this.decayMs }),
    };
    c.env.trigger();
    this.circles.push(c);
    return c;
  };

  addRandomCircle = (r = 0.1) => {
    const x = random(0.3, 1 - 0.3);
    const y = random(0.3, 1 - 0.3);
    const v = 1e-4 * 2;
    const vx = v * random(0.7, 1) * (random(0, 1) > 0.5 ? 1 : -1);
    const vy = v * random(0.7, 1) * (random(0, 1) > 0.5 ? 1 : -1);
    return this.addCircle(x, y, r, vx, vy);
  };

  addRandomCircleAt = (x: number, y: number, r = 0.1) => {
    const v = 1e-4;
    const vx = v * random(-1, 1);
    const vy = v * random(-1, 1);
    return this.addCircle(x, y, r, vx, vy);
  };
}

const render = ({
  to: canvas,
  state,
}: {
  to: HTMLCanvasElement;
  state: State;
}) => {
  const w = canvas.width;
  const h = canvas.height;
  const d = Math.max(w, h);

  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, w, h);

  // window["interpLin"] = interpLin;

  const perdiodToA = interpol(
    [
      [-1, 0.001],
      [1, 0.5],
    ],
    "exp"
  );

  // get grayscale hex color from a number between 0 and 1
  const gray = (x: number) => {
    return chroma.gl(1, 1, 1, x).hex();
  };

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.strokeStyle = "white";

  for (let stripeIdx = 0; stripeIdx < 200; stripeIdx++) {
    for (const circle of state.circles) {
      let brightest = 0.1 + (circle.env.t * 1e-3) / 10;
      const distToA = interpol(
        [
          [0, 1],
          // [brightest - 0.1, 0.5],
          [brightest, 1],
          [brightest + 0.2, 0.5],
          // [0.4, 0.3],
          [brightest + 0.5, 0.1],
          // [0.5, 1],
          // [1, 0],
        ],
        "exp"
      );

      let offset = 0.0 * state.t;
      let width = 0.01 / 3;
      let space = width * (1 + stripeIdx / 200);
      ctx.lineWidth = width * d;

      let a =
        circle.period === 0
          ? 1
          : perdiodToA(
              Math.sin(circle.phase + circle.period * circle.env.t * 0.003)
            );

      a *= circle.env.value;

      const dd = 0;
      // a *= interpol(
      //   [
      //     [0, 0],
      //     [0.1, 1],
      //     [0.9, 1],
      //     [1, 0],
      //   ],
      //   "lin"
      // )(state.t / sceneTimeoutMs);
      // console.log(state.t);

      // console.log(
      //   "circle.period * state.t * 0.001",
      //   circle.period * state.t * 0.001
      // );
      // ctx.globalAlpha = a;

      const maxDist = Math.max(
        dist(circle.x * w, circle.y * h, 0, 0),
        dist(circle.x * w, circle.y * h, w, 0),
        dist(circle.x * w, circle.y * h, 0, h),
        dist(circle.x * w, circle.y * h, w, h)
      );
      const dis = offset + (width + space) * stripeIdx;
      const stripeMaxCnt = 1 / (width + space);
      if (dis * d > maxDist) {
        continue;
      }

      ctx.strokeStyle = gray(a * distToA((stripeIdx + 1) / stripeMaxCnt));
      ctx.beginPath();
      ctx.arc(circle.x * w, circle.y * h, dis * d, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.globalAlpha = 1;
  }
};

let notesOn = new Set<number>();
const state = new State();

const getRandomSpawnPoint = () => {
  return {
    x: random(0.3, 1 - 0.3),
    y: random(0.3, 1 - 0.3),
  };
};
let spawn = getRandomSpawnPoint();

const updateState = () => {
  let removeCircles = new Set<Circle>();
  for (let circle of state.circles) {
    if (!notesOn.has(circle.id!) && circle.env.gate) {
      circle.env.release();
    }
    if (!circle.env.gate && circle.env.value < 1e-6) {
      removeCircles.add(circle);
    }
  }

  state.circles = state.circles.filter((c) => !removeCircles.has(c));
  if (state.circles.length === 0) {
    state.t = 0;
  }

  if (notesOn.size === 0) {
    spawn = getRandomSpawnPoint();
  }
};

let socket = new SocketIO({ host: "localhost", port: 9999 });
socket.socket.on("noteon", (data) => {
  notesOn.add(data.note);

  let c: Circle;
  const d = 0.03;
  const circles = state.circles.filter((c) => c.env.gate);

  console.log("circles.length", circles.length);

  if (circles.length == 1) {
    const center = circles[0];
    const a = random(0, 2 * Math.PI);
    c = state.addRandomCircleAt(
      center.x + d * Math.cos(a),
      center.y + d * Math.sin(a),
      0.1
    );
  } else if (circles.length >= 2) {
    const c1 = circles[0];
    const c2 = circles[1];
    const center = {
      x: (c1.x + c2.x) / 2,
      y: (c1.y + c2.y) / 2,
    };
    const d = dist(c1.x, c1.y, c2.x, c2.y) / 2;
    const a = random(0, 2 * Math.PI);
    c = state.addRandomCircleAt(
      center.x + d * Math.cos(a),
      center.y + d * Math.sin(a),
      0.1
    );
  } else {
    const a = random(0, 2 * Math.PI);
    const center = spawn;
    c = state.addRandomCircleAt(
      center.x + d * Math.cos(a),
      center.y + d * Math.sin(a),
      0.1
    );
  }

  c.phase = 0;
  c.period = 0;
  c.id = data.note;
  updateState();
  console.log("noteon", data);
});
socket.socket.on("noteoff", (data) => {
  notesOn.delete(data.note);
  console.log(notesOn, state.circles);
  updateState();

  console.log("noteoff", data);
});

export function App() {
  useEffect(() => {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // initCanvasCapture(canvas);

    const randomizeAndRender = () => {
      const state = new State();
      const circlesCount = 2;
      let x = random(0.3, 1 - 0.3);
      let y = random(0.3, 1 - 0.3);
      const dx = 0.05;

      state.addRandomCircleAt(x + random(-dx, dx), y + random(-dx, dx));

      render({
        to: canvas,
        state,
      });
    };

    const randomizeAndAnimate = () => {
      const state = new State();
      let x = random(0.3, 1 - 0.3);
      let y = random(0.3, 1 - 0.3);
      const dx = 0.02;

      const c1 = state.addRandomCircleAt(
        x + random(-dx, dx),
        y + random(-dx, dx)
      );
      const c2 = state.addRandomCircleAt(
        x + random(-dx, dx),
        y + random(-dx, dx)
      );
      const c3 = state.addRandomCircleAt(
        x + random(-dx, dx),
        y + random(-dx, dx)
      );
      // const c3 = state.addRandomCircleAt(random(0, 1), random(0, 1));
      // const c4 = state.addRandomCircleAt(random(0, 1), random(0, 1));

      c1.phase = 0;
      c2.phase = 0;
      c3.phase = 0;

      c1.period = 0;
      c2.period = 0;
      c3.period = 0;
      // c3.period = 2;
      // c4.period = 2;

      let stopped = false;

      let lastT = performance.now();

      const raf = () => {
        if (stopped) {
          return;
        }
        const now = performance.now();
        state.update(now - lastT);
        // console.log("update");
        lastT = now;
        render({
          to: canvas,
          state,
        });

        // CanvasCapture.checkHotkeys();

        // You need to call recordFrame() only if you are recording
        // a video, gif, or frames.
        // if (CanvasCapture.isRecording()) CanvasCapture.recordFrame();

        requestAnimationFrame(raf);
      };

      requestAnimationFrame(raf);

      return () => {
        stopped = true;
      };
    };

    const initAndAnimate = () => {
      let stopped = false;

      let lastT = performance.now();

      const raf = () => {
        if (stopped) {
          return;
        }
        const now = performance.now();
        state.update(now - lastT);
        // console.log("update");
        lastT = now;
        render({
          to: canvas,
          state,
        });

        // CanvasCapture.checkHotkeys();

        // You need to call recordFrame() only if you are recording
        // a video, gif, or frames.
        // if (CanvasCapture.isRecording()) CanvasCapture.recordFrame();

        requestAnimationFrame(raf);
      };

      requestAnimationFrame(raf);

      return () => {
        stopped = true;
      };
    };

    let clearScene = () => {};

    const clearAndRenderScene = () => {
      clearScene();
      // const stop = randomizeAndAnimate();
      const stop = initAndAnimate();
      clearScene = stop;
    };

    const interval = setInterval(() => {
      clearAndRenderScene();
    }, sceneTimeoutMs);
    clearAndRenderScene();

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <>
      <div id="main">
        <canvas id="canvas" />
      </div>
    </>
  );
}
