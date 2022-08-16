import { useEffect, useState, useRef } from "react";
import CandleStickChart from "../components/CandleStickChart";
import http from "http";

export default function Home() {
  const containerRef = useRef(null);
  const windowSize = useWindowSize();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [data, setData] = useState();

  useEffect(() => {
    function callback(response) {
      let data = "";

      //another chunk of data has been received, so append it to `str`
      response.on("data", function (chunk) {
        data += chunk;
      });

      //the whole response has been received, so we just print it out here
      response.on("end", () => {
        setData(JSON.parse(data));
      });
    }

    http.request("http://192.168.1.3/ticker/aapl", callback).end();
  }, []);

  useEffect(() => {
    setSize({
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });
  }, [windowSize]);

  return (
    <div ref={containerRef} className="absolute h-full w-full bg-black">
      <CandleStickChart size={size} data={data} />
    </div>
  );
}

function useWindowSize() {
  // Initialize state with undefined width/height so server and client renders match
  // Learn more here: https://joshwcomeau.com/react/the-perils-of-rehydration/
  const [windowSize, setWindowSize] = useState({
    width: undefined,
    height: undefined,
  });

  useEffect(() => {
    // Handler to call on window resize
    function handleResize() {
      // Set window width/height to state
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Call handler right away so state gets updated with initial window size
    handleResize();

    // Remove event listener on cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, []); // Empty array ensures that effect is only run on mount

  return windowSize;
}
