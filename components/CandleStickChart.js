import { useEffect, useRef } from "react";
import { CandleStickChart } from "../lib/CandleStickChart";
import * as test_data from "../lib/aapl.json";

export default function () {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const chart = new CandleStickChart(test_data, canvas);
  }, []);

  return (
    <div className="m-2">
      <canvas width="1000" height="800" className="" ref={canvasRef}></canvas>
    </div>
  );
}
