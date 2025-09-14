declare module 'quagga' {
  interface QuaggaConfig {
    inputStream: {
      name?: string;
      type?: string;
      target?: any;
      constraints?: {
        width?: number;
        height?: number;
        facingMode?: string;
        aspectRatio?: number;
      };
      singleChannel?: boolean;
    };
    decoder: {
      readers?: string[];
      debug?: {
        drawBoundingBox?: boolean;
        drawScanline?: boolean;
        drawPattern?: boolean;
        showPattern?: boolean;
        showSkeleton?: boolean;
        showLabels?: boolean;
        showPatchLabels?: boolean;
        showRemainingPatchLabels?: boolean;
        boxFromPatches?: boolean;
      };
    };
    locate?: boolean;
    numOfWorkers?: number;
    frequency?: number;
    debug?: boolean;
  }

  interface QuaggaResult {
    codeResult: {
      code: string;
      format: string;
      start: number;
      end: number;
      codeset: number;
      startInfo: {
        error: number;
        code: number;
        start: number;
        end: number;
      };
      decodedCodes: Array<{
        error?: number;
        start: number;
        end: number;
        code: number;
        match: string;
      }>;
      direction: number;
      format: string;
    };
    line: {
      x: number;
      y: number;
    }[];
    angle: number;
    pattern: number[];
    box: number[][];
    boxes: number[][][];
  }

  interface Quagga {
    init(config: QuaggaConfig, callback: (err: any) => void): void;
    start(): void;
    stop(): void;
    onDetected(callback: (result: QuaggaResult) => void): void;
    offDetected(callback?: (result: QuaggaResult) => void): void;
    pause(): void;
    resume(): void;
    setReaders(readers: string[]): void;
  }

  const Quagga: Quagga;
  export default Quagga;
}
