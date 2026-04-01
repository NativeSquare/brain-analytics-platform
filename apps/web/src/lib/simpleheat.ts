/**
 * simpleheat - a tiny JavaScript library for drawing heatmaps with Canvas
 *
 * Vendored and adapted for TypeScript. Original constructor-style API preserved.
 * This library uses a prototype-based pattern with `any` internally -- do not
 * rewrite the core logic; only the public surface is typed.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface SimpleHeatInstance {
  data(data: [number, number, number][]): SimpleHeatInstance;
  max(max: number): SimpleHeatInstance;
  add(point: [number, number, number]): SimpleHeatInstance;
  clear(): SimpleHeatInstance;
  radius(r: number, blur?: number): SimpleHeatInstance;
  resize(): void;
  gradient(grad: Record<number, string>): SimpleHeatInstance;
  draw(minOpacity?: number): SimpleHeatInstance;
}

export default function simpleheat(
  this: any,
  canvas: HTMLCanvasElement | string,
): SimpleHeatInstance {
  if (!(this instanceof simpleheat))
    return new (simpleheat as any)(canvas) as SimpleHeatInstance;

  const canvasElement =
    typeof canvas === "string"
      ? (document.getElementById(canvas) as HTMLCanvasElement | null)
      : canvas;
  if (!canvasElement) {
    throw new Error("simpleheat: canvas element not found");
  }

  const ctx = canvasElement.getContext("2d");
  if (!ctx) {
    throw new Error("simpleheat: could not get 2d context for canvas");
  }

  (this as any)._canvas = canvasElement;
  (this as any)._ctx = ctx;
  (this as any)._width = canvasElement.width;
  (this as any)._height = canvasElement.height;

  (this as any)._max = 1;
  (this as any)._data = [] as [number, number, number][];

  return this as unknown as SimpleHeatInstance;
}

(simpleheat as any).prototype = {
  defaultRadius: 25,

  defaultGradient: {
    0.4: "blue",
    0.6: "cyan",
    0.7: "lime",
    0.8: "yellow",
    1.0: "red",
  } as Record<number, string>,

  data(this: any, data: [number, number, number][]) {
    this._data = data;
    return this;
  },

  max(this: any, max: number) {
    this._max = max;
    return this;
  },

  add(this: any, point: [number, number, number]) {
    this._data.push(point);
    return this;
  },

  clear(this: any) {
    this._data = [];
    return this;
  },

  radius(this: any, r: number, blur?: number) {
    blur = blur === undefined ? 15 : blur;

    const circle = (this._circle = this._createCanvas());
    const ctx = circle.getContext("2d");
    const r2 = (this._r = r + blur);

    circle.width = circle.height = r2 * 2;

    ctx.shadowOffsetX = ctx.shadowOffsetY = r2 * 2;
    ctx.shadowBlur = blur;
    ctx.shadowColor = "black";

    ctx.beginPath();
    ctx.arc(-r2, -r2, r, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();

    return this;
  },

  resize(this: any) {
    this._width = this._canvas.width;
    this._height = this._canvas.height;
  },

  gradient(this: any, grad: Record<number, string>) {
    const canvas = this._createCanvas();
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);

    canvas.width = 1;
    canvas.height = 256;

    for (const i in grad) {
      gradient.addColorStop(+i, grad[i]);
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1, 256);

    this._grad = ctx.getImageData(0, 0, 1, 256).data;

    return this;
  },

  draw(this: any, minOpacity?: number) {
    if (!this._circle) this.radius(this.defaultRadius);
    if (!this._grad) this.gradient(this.defaultGradient);

    const ctx = this._ctx;

    ctx.clearRect(0, 0, this._width, this._height);

    for (let i = 0, len = this._data.length; i < len; i++) {
      const p = this._data[i];
      ctx.globalAlpha = Math.min(
        Math.max(
          p[2] / this._max,
          minOpacity === undefined ? 0.05 : minOpacity,
        ),
        1,
      );
      ctx.drawImage(this._circle, p[0] - this._r, p[1] - this._r);
    }

    const colored = ctx.getImageData(0, 0, this._width, this._height);
    this._colorize(colored.data, this._grad);
    ctx.putImageData(colored, 0, 0);

    return this;
  },

  _colorize(pixels: Uint8ClampedArray, gradient: Uint8ClampedArray) {
    for (let i = 0, len = pixels.length; i < len; i += 4) {
      const j = pixels[i + 3] * 4;

      if (j) {
        pixels[i] = gradient[j];
        pixels[i + 1] = gradient[j + 1];
        pixels[i + 2] = gradient[j + 2];
      }
    }
  },

  _createCanvas() {
    if (typeof document !== "undefined") {
      return document.createElement("canvas");
    } else {
      return typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(1, 1)
        : null;
    }
  },
};
