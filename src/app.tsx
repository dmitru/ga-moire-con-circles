import { useEffect, useState } from "preact/hooks";
import "./app.css";
import chroma from "chroma-js";
import { CanvasCapture } from "canvas-capture";

const bpmToMs = (bpm: number) => {
  return (60 * 1000) / bpm;
};

const sceneTimeoutMs = bpmToMs(120) * 16;

const initCanvasCapture = (canvas: HTMLCanvasElement) => {
  // Initialize and pass in canvas.
  CanvasCapture.init(
    canvas,
    { showRecDot: true } // Options are optional, more info below.
  );

  // Bind key presses to begin/end recordings.
  CanvasCapture.bindKeyToVideoRecord("v", {
    format: "webm",
    name: "myVideo",
    quality: 1,
    fps: 30,
  });
  CanvasCapture.bindKeyToGIFRecord("g");
  // Download a series of frames as a zip.
  CanvasCapture.bindKeyToPNGFramesRecord("f", {
    onExportProgress: (progress) => {
      // Options are optional, more info below.
      console.log(`Zipping... ${Math.round(progress * 100)}% complete.`);
    },
  }); // Also try bindKeyToJPEGFramesRecord().

  // These methods immediately save a single snapshot on keydown.
  CanvasCapture.bindKeyToPNGSnapshot("p");
  // CanvasCapture.bindKeyToJPEGSnapshot("j", {
  //   name: "myJpeg", // Options are optional, more info below.
  //   quality: 0.8,
  // });
};

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
    // console.log("t", this.t, dt);

    for (const circle of this.circles) {
      circle.x += circle.vx;
      circle.y += circle.vy;
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
    };
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

  const interpolateLinearly = (
    x: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ) => {
    const m = (y2 - y1) / (x2 - x1);
    const b = y1 - m * x1;
    return m * x + b;
  };

  const interpolateExponentially = (
    x: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ) => {
    // interpolate between 2 points exponentially
    // x1, y1 are the start point
    // x2, y2 are the end point
    // x is the value to interpolate
    // y1 and y2 must be positive
    // x1 and x2 must be positive
    // x must be between x1 and x2
    // y = y1 * (y2 / y1) ** ((x - x1) / (x2 - x1))
    const y = y1 * (y2 / y1) ** ((x - x1) / (x2 - x1));
    return y;
  };

  const interpol = (
    points: [number, number][],
    type: "lin" | "exp" = "lin"
  ) => {
    // return a function that interpolates linearly between the given points

    let interpolate =
      type === "lin" ? interpolateLinearly : interpolateExponentially;
    interpolate = interpolateLinearly;

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
      return interpolate(x, x1, y1, x2, y2);
    };
  };
  // window["interpLin"] = interpLin;

  let brightest = 0.1 + (state.t * 1e-3) / 10;
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

  for (let stripeIdx = 0; stripeIdx < 300; stripeIdx++) {
    for (const circle of state.circles) {
      let offset = 0.0 * state.t;
      let width = 0.01 / 6;
      let space = width * (1 + stripeIdx / 200);
      ctx.lineWidth = width * d;

      let a =
        circle.period === 0
          ? 1
          : perdiodToA(
              Math.sin(circle.phase + circle.period * state.t * 0.003)
            );

      const dd = 0;
      a *= interpol(
        [
          [0, 0],
          [0.1, 1],
          [0.9, 1],
          [1, 0],
        ],
        "lin"
      )(state.t / sceneTimeoutMs);
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

export function App() {
  useEffect(() => {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    initCanvasCapture(canvas);

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

        CanvasCapture.checkHotkeys();

        // You need to call recordFrame() only if you are recording
        // a video, gif, or frames.
        if (CanvasCapture.isRecording()) CanvasCapture.recordFrame();

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
