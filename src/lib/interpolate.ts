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

export const interpol = (
  points: [number, number][],
  type: "lin" | "exp" = "lin"
) => {
  // return a function that interpolates linearly between the given points

  let interpolate = type === "lin" ? interpolateLinearly : interpolateLinearly;
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
