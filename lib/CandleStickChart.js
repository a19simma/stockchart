class CandleStick {
  constructor(timestamp, open, close, high, low, volume) {
    this.timestamp = timestamp;
    this.open = open;
    this.close = close;
    this.high = high;
    this.low = low;
    this.volume = volume;
  }
}

export class CandleStickChart {
  constructor(data, canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.width = parseInt(this.canvas.width);
    this.height = parseInt(this.canvas.height);
    this.columns = Math.floor(this.width / 150); // TO-DO Change later,
    this.rows = Math.floor(this.width / 50); // to take as argument from parent

    this.candlesticks = [];
    this.maxCandles = 100;
    this.candleWidth = Math.ceil(this.width / this.maxCandles);
    this.volumeSection = 0.2;
    this.candleSpacing = 2;
    this.createCandleSticks(data);

    this.margin = 0;

    this.lineColor = "#1e293b";
    this.lineWidth = 2;

    this.findPriceRange(this.candlesticks.slice(-this.maxCandles));
    this.priceRange.dif = this.priceRange.max - this.priceRange.min;
    this.findDateRange(this.candlesticks.slice(-this.maxCandles));
    this.findVolumeRange(this.candlesticks.slice(-this.maxCandles));

    this.canvas.style.cursor = "crosshair";
    this.canvas.addEventListener("mousemove", (e) => {
      this.mouseMove(e);
    });
    this.canvas.addEventListener("mouseout", (e) => {
      this.mouseOut(e);
    });

    this.draw();
  }

  draw() {
    this.context.lineWidth = this.lineWidth;
    this.createChart();
    this.createGrid();
    this.candlesticks
      .slice(-this.maxCandles)
      .map((candlestick) => this.drawCandleStick(candlestick));
    if (this.mouseOverlay) this.drawMouseOverlay();
  }

  mouseMove(event) {
    const bounds = this.canvas.getBoundingClientRect();
    this.mousePos_x = event.clientX - bounds.left;
    this.mousePos_y = event.clientY - bounds.top;
    this.mouseOverlay = true;
    this.draw();
  }

  drawMouseOverlay() {
    const { timestamp, price } = this.coordinatetoPriceDate(
      this.mousePos_x,
      this.mousePos_y
    );
    //draw dotted lines intersecting on the mouse position.
    this.context.beginPath();
    this.context.lineWidth = 0.5;
    this.context.strokeStyle = "#ffffff";
    this.context.setLineDash([5, 5]);
    this.context.moveTo(0, this.mousePos_y);
    this.context.lineTo(this.width, this.mousePos_y);
    this.context.stroke();
    this.context.moveTo(this.mousePos_x, 0);
    this.context.lineTo(this.mousePos_x, this.height);
    this.context.stroke();

    // draw price and timestamp labels.
    this.context.fillStyle = "white";
    this.context.textAlign = "center";
    this.context.font = "12px Arial";
    const weekday = timestamp.toLocaleString("default", { weekday: "short" });
    const day = timestamp.toLocaleString("default", { day: "numeric" });
    const month = timestamp.toLocaleString("default", { month: "short" });
    const year = timestamp.toLocaleString("default", { year: "2-digit" });
    let x = this.mousePos_x;
    if (this.mousePos_x > this.width * 0.96) {
      x = this.width * 0.96;
    } else if (this.mousePos_x < this.width * 0.05) {
      x = this.width * 0.05;
    }
    this.context.fillText(
      `${weekday} ${day} ${month} '${year}`,
      x,
      this.height - 10
    );

    let y = this.mousePos_y + 3;
    if (this.mousePos_y >= this.height * 0.97 + 3) {
      y = this.height * 0.97 + 3;
    } else if (this.mousePos_y <= this.height * 0.02 + 3) {
      y = this.height * 0.02 + 3;
    }
    this.context.fillText(price.toFixed(2), this.width - 20, y);
  }

  mouseOut(e) {
    this.mouseOverlay = false;
    this.draw();
  }

  findVolumeRange(candlesticks) {
    let min = Infinity;
    let max = -Infinity;
    candlesticks.reduce((_, current) => {
      min = current.volume < min ? current.volume : min;
      max = current.volume > max ? current.volume : max;
    });

    this.volumeRange = { min: min, max: max };
  }
  findPriceRange(candlesticks) {
    let min = Infinity;
    candlesticks.reduce((_, current) => {
      min = current.low < min ? current.low : min;
    });
    let max = -Infinity;
    candlesticks.reduce((_, current) => {
      max = current.high > max ? current.high : max;
    });
    this.priceRange = { min: min * 0.95, max: max * 1.05 };
  }

  findDateRange(candlesticks) {
    this.timestamps = [];
    candlesticks.map((candlestick) =>
      this.timestamps.push(candlestick.timestamp)
    );
  }

  coordinatetoPriceDate(x, y) {
    const price =
      ((this.height - y) / this.height) * this.priceRange.dif +
      this.priceRange.min;
    const timestamp_pos = parseInt(x / this.candleWidth);
    const timestamp = this.timestamps[timestamp_pos];

    return { timestamp: timestamp, price: price };
  }

  priceToCoordinate(price) {
    return (
      this.height -
      ((price - this.priceRange.min) /
        (this.priceRange.max - this.priceRange.min)) *
        this.height
    );
  }

  dateToCoordinate(timestamp) {
    const timestamp_fraction =
      (this.timestamps.indexOf(timestamp) + 1) / this.timestamps.length;

    return timestamp_fraction * (this.width - 5);
  }

  volumeToCoordinate(volume) {
    const zeroOffset = this.height * 0.03;
    const height = this.height * this.volumeSection - zeroOffset;
    return (
      this.height -
      ((volume - this.volumeRange.min) /
        (this.volumeRange.max - this.volumeRange.min)) *
        height -
      zeroOffset
    );
  }

  createChart() {
    this.context.fillStyle = "#0f172a";
    this.context.fillRect(0, 0, this.width, this.height);
    this.context.fillStyle = "white";
    this.context.font = "24px Arial";
    this.context.fillText(this.ticker, this.width / 20, this.height / 30);
  }

  createGrid() {
    let gridLines = [];
    const xSize = this.width / this.columns;
    const ySize = this.height / this.rows;

    for (let i = 1; i < this.columns; i++) {
      gridLines.push({ x1: i * xSize, y1: 0, x2: i * xSize, y2: this.height });
    }
    for (let i = 1; i < this.rows; i++) {
      gridLines.push({ x1: 0, y1: i * ySize, x2: this.width, y2: i * ySize });
    }
    gridLines.map((line) => this.drawLine(line, this.lineColor));
  }

  drawLine({ x1, y1, x2, y2 }, color) {
    this.context.beginPath();
    this.context.setLineDash([]);
    this.context.strokeStyle = color;
    this.context.moveTo(x1, y1);
    this.context.lineTo(x2, y2);
    this.context.stroke();
  }

  createCandleSticks(data) {
    const ticker = Object.keys(data)[0];
    this.ticker = ticker;

    Object.entries(data[ticker]).map(
      ([timestamp, { close, high, low, open, volume }]) =>
        this.candlesticks.push(
          new CandleStick(new Date(timestamp), open, close, high, low, volume)
        )
    );
  }

  drawCandleStick(candlestick) {
    const { timestamp, open, high, low, close, volume } = candlestick;
    const color = close > open ? "#00cc00" : "#cc0000";
    const volumeColor = close > open ? "#005500" : "#550000";
    const width = this.candleWidth - this.candleSpacing;
    const x = this.dateToCoordinate(timestamp) - width * 0.5 - 1;
    const v_high = this.volumeToCoordinate(volume);
    const v_height = this.height - v_high;

    //Draw Volume Bar
    this.context.beginPath();
    this.context.fillStyle = volumeColor;
    this.context.rect(x - 1, v_high, width + this.candleSpacing - 1, v_height);
    this.context.fill();

    const y_high =
      close > open
        ? this.priceToCoordinate(close)
        : this.priceToCoordinate(open);

    const y_length = Math.abs(
      this.priceToCoordinate(open) - this.priceToCoordinate(close)
    );

    //Draw Candle
    this.context.beginPath();
    this.context.fillStyle = color;
    this.context.rect(x, y_high, width, Math.ceil(y_length));
    this.context.fill();

    //Draw Wick
    this.drawLine(
      {
        x1: x + width * 0.5,
        y1: this.priceToCoordinate(high),
        x2: x + width * 0.5,
        y2: this.priceToCoordinate(low),
      },
      color
    );
  }
}
