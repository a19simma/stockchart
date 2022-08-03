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
  constructor(
    data,
    canvas,
    { width, height },
    [row_bar, column_bar, corner_button]
  ) {
    canvas.width = width;
    canvas.height = height;
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.width = width;
    this.height = height;

    this.column_size = 150;
    this.n_columns = Math.floor(this.width / this.column_size); // TODO Change later,

    this.row_size = 50;
    this.n_rows = Math.floor(this.width / this.row_size); // to take as argument from parent

    this.bar_width = 50;

    row_bar.width = this.width;
    row_bar.height = this.bar_width;
    this.row_bar = row_bar;
    this.row_bar_ctx = row_bar.getContext("2d");

    column_bar.width = this.bar_width;
    column_bar.height = this.height;
    this.column_bar = column_bar;
    this.column_bar_ctx = column_bar.getContext("2d");

    corner_button.height = this.bar_width;
    corner_button.width = this.bar_width;
    this.corner_button = corner_button;
    this.corner_button_ctx = row_bar.getContext("2d");

    this.candlesticks = [];
    this.maxCandles = 20;
    this.candleWidth = Math.ceil(this.width / this.maxCandles);
    this.volumeSection = 0.2;
    this.candleSpacing = 2;
    this.createCandleSticks(data); // TODO: rewrite to create the arrays directly
    this.visible_candles = this.candlesticks.slice(-this.maxCandles);
    this.past_candles = this.candlesticks.slice(0, -this.maxCandles);
    this.future_candles = [];
    console.log(this.past_candles, this.visible_candles, this.future_candles);

    this.margin = 0;

    this.backgroundColor = "#0f172a";
    this.lineColor = "#1e293b";
    this.lineWidth = 2;

    this.findPriceRange(this.candlesticks.slice(-this.maxCandles));
    this.priceRange.dif = this.priceRange.max - this.priceRange.min;
    this.findDateRange(this.candlesticks.slice(-this.maxCandles));
    this.findVolumeRange(this.candlesticks.slice(-this.maxCandles));

    this.mouseOverlay = false;
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
    this.visible_candles.map((candlestick) =>
      this.drawCandleStick(candlestick)
    );
    if (this.mouseOverlay) this.drawMouseOverlay();
  }

  zoom(e) {
    e.preventDefault();
  }

  mouseMove(event) {
    const bounds = this.canvas.getBoundingClientRect();
    this.mousePos_x = event.clientX - bounds.left;
    this.mousePos_y = event.clientY - bounds.top;
    this.mouseOverlay = true;
    this.draw();
  }

  drawMouseOverlay() {
    const [timestamp, timestamp_index] = this.xToDate(this.mousePos_x);
    const price = this.ytoPrice(this.mousePos_y);

    if (timestamp == undefined) return;

    //draw dotted lines intersecting on the mouse position.
    const x_snap =
      timestamp_index * this.candleWidth +
      this.candleWidth / 2 +
      this.candleSpacing;
    this.context.beginPath();
    this.context.lineWidth = 0.5;
    this.context.strokeStyle = "#ffffff";
    this.context.setLineDash([5, 5]);
    this.context.moveTo(0, this.mousePos_y);
    this.context.lineTo(this.width, this.mousePos_y);
    this.context.stroke();
    this.context.moveTo(x_snap, 0);
    this.context.lineTo(x_snap, this.height);
    this.context.stroke();

    // draw timestamp labels.
    const label_background_width = 80;
    this.row_bar_ctx.fillStyle = this.backgroundColor;
    this.row_bar_ctx.fillRect(
      this.mousePos_x - label_background_width / 2,
      0,
      label_background_width,
      this.bar_width
    );
    this.row_bar_ctx.fillStyle = "white";
    this.row_bar_ctx.textAlign = "center";
    this.row_bar_ctx.font = "12px Arial";
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

    this.row_bar_ctx.fillText(
      `${weekday} ${day} ${month} '${year}`,
      x,
      this.bar_width / 2
    );

    // draw price labels.
    const label_background_height = 25;
    this.column_bar_ctx.fillStyle = this.backgroundColor;
    this.column_bar_ctx.fillRect(
      0,
      this.mousePos_y - label_background_height / 2,
      this.bar_width,
      label_background_height
    );
    this.column_bar_ctx.textAlign = "center";
    this.column_bar_ctx.fillStyle = "white";
    this.column_bar_ctx.font = "12px Arial";

    let y = this.mousePos_y;
    if (this.mousePos_y <= this.height * 0.02) {
      y = this.height * 0.02;
    }
    this.column_bar_ctx.fillText(price.toFixed(2), this.bar_width / 2, y);
  }

  mouseOut() {
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

  ytoPrice(y) {
    const price =
      ((this.height - y) / this.height) * this.priceRange.dif +
      this.priceRange.min;
    return price;
  }

  xToDate(x) {
    const timestamp_index = parseInt(x / this.candleWidth);
    const timestamp = this.timestamps[timestamp_index];
    return [timestamp, timestamp_index];
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
    const timestamp_y =
      (this.timestamps.indexOf(timestamp) + 1) * this.candleWidth -
      this.candleWidth / 2;

    return timestamp_y;
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

    let ctx = this.row_bar.getContext("2d");
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(0, 0, this.width, 50);

    ctx = this.column_bar.getContext("2d");
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(0, 0, 50, this.height);

    ctx = this.corner_button.getContext("2d");
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(0, 0, 50, 50);
  }

  createGrid() {
    let rows = [];
    let columns = [];

    for (let i = 1; i <= this.n_columns; i++) {
      columns.push({
        x1: i * this.column_size,
        y1: 0,
        x2: i * this.column_size,
        y2: this.height,
      });
    }
    for (let i = 1; i <= this.n_rows; i++) {
      rows.push({
        x1: 0,
        y1: i * this.row_size,
        x2: this.width,
        y2: i * this.row_size,
      });
    }
    columns.concat(rows).map((line) => this.drawLine(line, this.lineColor));

    // create sidebar labels
    columns.map((_, index) => {
      const x = (index + 1) * this.column_size;
      const [timestamp, timestamp_index] = this.xToDate(x);
      const month = timestamp.toLocaleString("default", { month: "long" });
      this.drawText(this.row_bar_ctx, month, x, this.bar_width / 2);
    });

    rows.map((_, index) => {
      const y = (index + 1) * this.row_size;
      this.drawText(
        this.column_bar_ctx,
        this.ytoPrice(y).toFixed(2),
        this.bar_width / 2,
        y
      );
    });
  }

  drawLine({ x1, y1, x2, y2 }, color) {
    this.context.beginPath();
    this.context.setLineDash([]);
    this.context.strokeStyle = color;
    this.context.moveTo(x1, y1);
    this.context.lineTo(x2, y2);
    this.context.stroke();
  }

  drawText(ctx, text, x, y) {
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.font = "12px Arial";
    ctx.fillText(text, x, y);
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
    const x = this.dateToCoordinate(timestamp) - this.candleSpacing;
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
