import { useEffect, useRef, useState } from "react";
import { CandleStickChart } from "../lib/CandleStickChart";
import * as test_data from "../lib/full_aapl.json";

export default function CreateChart() {
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const rowRef = useRef(null);
  const rowOverlayRef = useRef(null);
  const columnRef = useRef(null);
  const columnOverlayRef = useRef(null);
  const cornerRef = useRef(null);
  const [size, setSize] = useState({ width: 1000, height: 800 });

  useEffect(() => {
    const ui_elements = [
      rowRef.current,
      rowOverlayRef.current,
      columnRef.current,
      columnOverlayRef.current,
      cornerRef.current,
      overlayRef.current,
    ];
    const canvas = canvasRef.current;
    const chart = new CandleStickChart(test_data, canvas, size, ui_elements);
  }, []);

  return (
    <div className="relative">
      <canvas className="z-10 absolute top-0 left-0" ref={overlayRef}></canvas>
      <table className="z-0 bg-slate-900">
        <tbody>
          <tr>
            <td>
              <canvas className="z-0" ref={canvasRef}></canvas>
            </td>
            <td className="relative">
              <canvas className="z-0" ref={columnRef}></canvas>
              <canvas
                className="z-10 absolute top-0 left-0"
                ref={columnOverlayRef}
              ></canvas>
            </td>
          </tr>
          <tr>
            <td className="relative">
              <canvas className="z-0" ref={rowRef}></canvas>
              <canvas
                className="z-10 absolute top-0 left-0"
                ref={rowOverlayRef}
              ></canvas>
            </td>
            <td>
              <canvas className="z-0" ref={cornerRef}></canvas>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
