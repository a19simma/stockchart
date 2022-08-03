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

    this.visible_candles = [];
    this.past_candles = [];
    this.future_candles = [];
    this.startingCandles = 400;
    this.volumeSection = 0.2;
    this.candleSpacing = 2;
    this.createCandleSticks(data);
    this.margin = 0;

    this.backgroundColor = "#0f172a";
    this.lineColor = "#1e293b";
    this.lineWidth = 2;

    this.mouseOverlay = false;
    this.canvas.style.cursor = "crosshair";
    this.canvas.addEventListener("mousemove", (e) => {
      this.mouseMove(e);
    });
    this.canvas.addEventListener("mouseout", (e) => {
      this.mouseOut(e);
    });
    this.canvas.addEventListener("wheel", (e) => this.zoom(e));

    this.reSize();
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

  reSize() {
    this.candleWidth = this.width / this.visible_candles.length;
    this.n_columns = this.visible_candles.length / 20;
    this.column_size = this.width / this.n_columns;
    this.n_rows = 10;
    this.row_size = this.height / this.n_rows;
    this.findPriceRange();
    this.findVolumeRange();
  }

  zoom(e) {
    e.preventDefault();
    //deltaY is positive when zooming out
    e.deltaY > 0 ? this.addCandle() : this.removeCandle();
    this.reSize();
    this.draw();
    /* console.log(this.visible_candles); */
  }

  addCandle() {
    const e = this.past_candles.pop();
    if (e != undefined) this.visible_candles.push(e);
  }

  removeCandle() {
    if (this.visible_candles.length < 3) return;
    const e = this.visible_candles.pop();
    if (e != undefined) this.past_candles.push(e);
  }

  mouseMove(event) {
    const bounds = this.canvas.getBoundingClientRect();
    this.mousePos_x = event.clientX - bounds.left;
    this.mousePos_y = event.clientY - bounds.top;
    this.mouseOverlay = true;
    this.draw();
  }

  drawMouseOverlay() {
    const [candle, index] = this.xToCandle(this.mousePos_x);
    const price = this.ytoPrice(this.mousePos_y);

    //draw dotted lines intersecting on the mouse position.
    const x_snap =
      // TODO adjust to center on candles
      index * this.candleWidth + this.candleWidth / 2 + this.candleSpacing;
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
    const label_background_width = 90;
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
    const weekday = candle.timestamp.toLocaleString("default", {
      weekday: "short",
    });
    const day = candle.timestamp.toLocaleString("default", { day: "numeric" });
    const month = candle.timestamp.toLocaleString("default", {
      month: "short",
    });
    const year = candle.timestamp.toLocaleString("default", {
      year: "2-digit",
    });
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

  findVolumeRange() {
    let min = Infinity;
    let max = -Infinity;
    this.visible_candles.reduce((_, current) => {
      min = current.volume < min ? current.volume : min;
      max = current.volume > max ? current.volume : max;
    });

    this.volumeRange = { min: min, max: max };
  }
  findPriceRange() {
    let min = Infinity;
    this.visible_candles.reduce((_, current) => {
      min = current.low < min ? current.low : min;
    });
    let max = -Infinity;
    this.visible_candles.reduce((_, current) => {
      max = current.high > max ? current.high : max;
    });
    max *= 1.03;
    min *= 0.97;
    this.priceRange = { min: min, max: max, dif: max - min };
  }

  ytoPrice(y) {
    const price =
      ((this.height - y) / this.height) * this.priceRange.dif +
      this.priceRange.min;
    return price;
  }

  xToCandle(x) {
    let index = Math.round(x / this.candleWidth);
    if (index >= this.visible_candles.length)
      index = this.visible_candles.length - 1;
    const candle =
      this.visible_candles[this.visible_candles.length - 1 - index];
    if (candle == undefined) {
      console.log(candle, index, x);
      return [new Date(), index];
    }
    return [candle, index];
  }

  priceToCoordinate(price) {
    return (
      this.height -
      ((price - this.priceRange.min) /
        (this.priceRange.max - this.priceRange.min)) *
        this.height
    );
  }

  dateToCoordinate(candlestick) {
    const timestamp_y =
      (this.visible_candles.indexOf(candlestick) + 1) * this.candleWidth -
      this.candleWidth / 2;

    return this.width - timestamp_y;
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
      const x = i * this.column_size - this.column_size / 2;
      columns.push({
        x1: x,
        y1: 0,
        x2: x,
        y2: this.height,
      });
    }

    for (let i = 1; i <= this.n_rows; i++) {
      const y = i * this.row_size - this.row_size / 2;
      rows.push({
        x1: 0,
        y1: y,
        x2: this.width,
        y2: y,
      });
    }
    columns.concat(rows).map((line) => this.drawLine(line, this.lineColor));

    // create sidebar labels
    columns.map((column, index) => {
      const x = column.x1;
      const [candle, c_index] = this.xToCandle(x);
      const month = candle.timestamp.toLocaleString("default", {
        month: "long",
      });
      this.drawText(this.row_bar_ctx, month, x, this.bar_width / 2);
    });

    rows.map((row, index) => {
      const y = row.y1;
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

    let i = Object.entries(data[ticker]).length;

    Object.entries(data[ticker]).map(
      ([timestamp, { close, high, low, open, volume }]) => {
        const candle = new CandleStick(
          new Date(timestamp),
          open,
          close,
          high,
          low,
          volume
        );
        if (i > this.startingCandles) {
          this.past_candles.push(candle);
        } else this.visible_candles.push(candle);
        i--;
      }
    );

    if (
      this.visible_candles[0].timestamp < this.visible_candles.at(-1).timestamp
    ) {
      this.visible_candles = this.visible_candles.reverse();
    } else {
      this.past_candles = this.past_candles.reverse();
    }
  }

  drawCandleStick(candlestick) {
    const { timestamp, open, high, low, close, volume } = candlestick;
    const color = close > open ? "#00cc00" : "#cc0000";
    const volumeColor = close > open ? "#005500" : "#550000";
    const width = this.candleWidth - this.candleSpacing;
    const x = this.dateToCoordinate(candlestick) - this.candleSpacing;
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
