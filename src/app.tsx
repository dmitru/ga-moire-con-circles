import { useEffect, useState } from "preact/hooks";
import preactLogo from "./assets/preact.svg";
import "./app.css";
import chroma from "chroma-js";

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
};

class State {
  t = 0;
  circles: Circle[] = [];

  // update positions of circles based on their vx, vy velocities
  update = (dt: number) => {
    this.t += dt;

    for (const circle of this.circles) {
      circle.x += circle.vx;
      circle.y += circle.vy;
    }
  };

  addCircle = (x: number, y: number, r: number, vx = 0, vy = 0) => {
    this.circles.push({
      x,
      y,
      r,
      vx,
      vy,
      period: random(1, 2),
      phase: random(0, Math.PI * 2),
    });
  };

  addRandomCircle = (r = 0.1) => {
    const x = random(0.3, 1 - 0.3);
    const y = random(0.3, 1 - 0.3);
    const v = 1e-4;
    const vx = v * random(-1, 1);
    const vy = v * random(-1, 1);
    this.addCircle(x, y, r, vx, vy);
  };

  addRandomCircleAt = (x: number, y: number, r = 0.1) => {
    const v = 1e-4;
    const vx = v * random(-1, 1);
    const vy = v * random(-1, 1);
    this.addCircle(x, y, r, vx, vy);
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

  const interpLin = (points: [number, number][]) => {
    // return a function that interpolates linearly between the given points
    return (x: number) => {
      if (x >= points[points.length - 1][0]) {
        return points[points.length - 1][1];
      }
      if (x <= points[0][0]) {
        return points[0][1];
      }
      const p2I = points.findIndex((p) => p[0] >= x);
      const p2 = points[p2I];
      const p1 = points[p2I - 1];

      if (!p1 || !p2) {
        return 0;
      }
      const [x1, y1] = p1;
      const [x2, y2] = p2;
      const m = (y2 - y1) / (x2 - x1);
      const b = y1 - m * x1;
      return m * x + b;
    };
  };
  // window["interpLin"] = interpLin;

  const distToA = interpLin([
    [0, 0.1],
    [0.3, 1],
    // [0.4, 0.3],
    [0.5, 0.1],
    // [0.5, 1],
    // [1, 0],
  ]);

  const perdiodToA = interpLin([
    [-1, 0.8],
    [1, 1],
  ]);

  // get grayscale hex color from a number between 0 and 1
  const gray = (x: number) => {
    return chroma.rgb(255, 255, 255, x).hex();
  };

  let offset = 0.0 * state.t;
  let width = 0.01 / 4;
  let space = width;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.strokeStyle = "white";
  ctx.lineWidth = width * d;

  for (let stripeIdx = 0; stripeIdx < 300; stripeIdx++) {
    for (const circle of state.circles) {
      const a = perdiodToA(
        Math.sin(circle.phase + circle.period * state.t * 0.003)
      );
      if (a > 1 || a < 0) {
        debugger;
      }
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

export function App() {
  useEffect(() => {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const randomizeAndRender = () => {
      const state = new State();
      const circlesCount = 2;
      let x = random(0.3, 1 - 0.3);
      let y = random(0.3, 1 - 0.3);
      const dx = 0.05;
      for (let i = 0; i < circlesCount; i++) {
        state.addRandomCircleAt(x + random(-dx, dx), y + random(-dx, dx));
      }

      render({
        to: canvas,
        state,
      });
    };

    const randomizeAndAnimate = () => {
      const state = new State();
      for (let i = 0; i < Math.round(random(2, 3)); i++) {
        state.addRandomCircle();
      }

      let stopped = false;

      let lastT = performance.now();

      const raf = () => {
        if (stopped) {
          return;
        }
        const now = performance.now();
        state.update(now - lastT);
        lastT = now;
        render({
          to: canvas,
          state,
        });
        requestAnimationFrame(raf);
      };

      requestAnimationFrame(raf);

      return () => {
        stopped = true;
      };
    };

    const sceneTimeoutMs = 1 * 1000;

    let clearScene = () => {};

    const clearAndRenderScene = () => {
      clearScene();
      const stop = randomizeAndAnimate();
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
