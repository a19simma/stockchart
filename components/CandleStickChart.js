import { useEffect, useRef, useState } from "react";
import { CandleStickChart } from "../lib/CandleStickChart";
import * as test_data from "../lib/aapl.json";

export default function () {
  const canvasRef = useRef(null);
  const rowRef = useRef(null);
  const columnRef = useRef(null);
  const cornerRef = useRef(null);
  const [size, setSize] = useState({ width: 1000, height: 800 });

  useEffect(() => {
    const ui_elements = [rowRef.current, columnRef.current, cornerRef.current];
    const canvas = canvasRef.current;
    const chart = new CandleStickChart(test_data, canvas, size, ui_elements);
    chart.draw();
  }, []);

  return (
    <table className="bg-slate-900 m-2">
      <tbody>
        <tr>
          <td>
            <canvas
              width={size.width}
              height={size.height}
              ref={canvasRef}
            ></canvas>
          </td>
          <td>
            <canvas ref={columnRef}></canvas>
          </td>
        </tr>
        <tr>
          <td>
            <canvas ref={rowRef}></canvas>
          </td>
          <td>
            <canvas ref={cornerRef}></canvas>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
