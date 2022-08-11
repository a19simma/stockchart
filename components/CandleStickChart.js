import { useEffect, useRef, useState } from "react";
import { CandleStickChart } from "../lib/CandleStickChart";

export default function CreateChart({ size, data }) {
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const rowRef = useRef(null);
  const rowOverlayRef = useRef(null);
  const columnRef = useRef(null);
  const columnOverlayRef = useRef(null);
  const cornerRef = useRef(null);
  const labelRef = useRef(null);

  useEffect(() => {
    const ui_elements = [
      rowRef.current,
      rowOverlayRef.current,
      columnRef.current,
      columnOverlayRef.current,
      cornerRef.current,
      overlayRef.current,
      labelRef.current,
    ];
    const canvas = canvasRef.current;
    console.log(size);
    if (Object.entries(data).length == 0) {
      console.error("No data");
    } else {
      const chart = new CandleStickChart(data, canvas, size, ui_elements);
    }
  }, [size]);

  return (
    <table className="z-0">
      <tbody>
        <tr className="p-0">
          <td className="relative p-0">
            <canvas className="z-0" ref={canvasRef}></canvas>
            <canvas
              className="z-10 absolute top-2 left-2"
              ref={labelRef}
            ></canvas>
            <canvas
              className="z-20 absolute top-0 left-0"
              ref={overlayRef}
            ></canvas>
          </td>
          <td className="relative p-0">
            <canvas className="z-0" ref={columnRef}></canvas>
            <canvas
              className="z-10 absolute top-0 left-0"
              ref={columnOverlayRef}
            ></canvas>
          </td>
        </tr>
        <tr className="p-0">
          <td className="relative p-0">
            <canvas className="z-0" ref={rowRef}></canvas>
            <canvas
              className="z-10 absolute top-0 left-0"
              ref={rowOverlayRef}
            ></canvas>
          </td>
          <td className="p-0">
            <canvas className="z-0" ref={cornerRef}></canvas>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
