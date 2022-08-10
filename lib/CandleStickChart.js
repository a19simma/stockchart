class CandleStick {
  constructor(
    timestamp,
    open,
    close,
    high,
    low,
    volume,
    firstOfMonth,
    firstOfYear
  ) {
    this.timestamp = timestamp;
    this.open = open;
    this.close = close;
    this.high = high;
    this.low = low;
    this.volume = volume;
    this.firstOfMonth = firstOfMonth;
    this.firstOfYear = firstOfYear;
  }
}

export class CandleStickChart {
  constructor(
    data,
    canvas,
    { width, height },
    [row_bar, rowOverlay, column_bar, columnOverlay, corner_button, overlay]
  ) {
    this.bar_width = 50;
    canvas.width = width - this.bar_width;
    canvas.height = height - this.bar_width;
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.width = width - this.bar_width;
    this.height = height - this.bar_width;

    overlay.height = this.height;
    overlay.width = this.width;
    this.overlay = overlay;
    this.overlayContext = overlay.getContext("2d");

    row_bar.width = this.width;
    row_bar.height = this.bar_width;
    this.row_bar = row_bar;
    this.row_bar_ctx = row_bar.getContext("2d");

    rowOverlay.width = this.width;
    rowOverlay.height = this.bar_width;
    this.rowOverlay = rowOverlay;
    this.rowOverlayContext = rowOverlay.getContext("2d");

    row_bar.width = this.width;
    row_bar.height = this.bar_width;
    this.row_bar = row_bar;
    this.row_bar_ctx = row_bar.getContext("2d");

    column_bar.width = this.bar_width;
    column_bar.height = this.height;
    this.column_bar = column_bar;
    this.column_bar_ctx = column_bar.getContext("2d");

    columnOverlay.width = this.bar_width;
    columnOverlay.height = this.height;
    this.columnOverlay = columnOverlay;
    this.columnOverlayContext = columnOverlay.getContext("2d");

    corner_button.height = this.bar_width;
    corner_button.width = this.bar_width;
    this.corner_button = corner_button;
    this.corner_button_ctx = row_bar.getContext("2d");

    this.visible_candles = [];
    this.past_candles = [];
    this.future_candles = [];
    this.startingCandles = 260;
    this.candleSpacing = 2;
    this.maxCandles = 1040;
    this.volumeSection = 0.2;
    this.createCandleSticks(data);
    this.margin = 0;

    this.backgroundColor = "#0f172a";
    this.overlayBackgroundColor = "#334454";
    this.lineColor = "#1e293b";
    this.lineWidth = 2;

    this.mouseOverlay = false;
    this.overlay.style.cursor = "crosshair";

    this.overlay.addEventListener("mousemove", (e) => {
      this.mouseMove(e);
    });
    this.overlay.addEventListener("mouseout", (e) => {
      this.mouseOut(e);
    });
    this.overlay.addEventListener("wheel", (e) => {
      this.zoom(e);
    });

    this.reSize();
    this.draw();
  }

  draw() {
    this.context.lineWidth = this.lineWidth;
    this.context.clearRect(0, 0, this.width, this.height);
    this.createChart();
    this.createGrid();
    this.visible_candles.map((candle) => this.drawCandleStick(candle));
  }

  reSize() {
    this.labelDayInterval = Infinity;
    this.labelMonthInterval = Infinity;
    this.labelYearInterval = Infinity;

    const min_cols = Math.round(this.width / 150);
    this.labelDayInterval = this.visible_candles.length / min_cols;
    if (this.labelDayInterval < 21) {
      switch (true) {
        case this.labelDayInterval > 12:
          this.labelDayInterval = 11;
          break;
        case this.labelDayInterval > 6:
          this.labelDayInterval = 6;
          break;
        default:
          break;
      }
    }
    this.labelMonthInterval = Math.floor(this.labelDayInterval / 21);
    if (this.labelMonthInterval >= 1 && this.labelMonthInterval < 11) {
      this.labelDayInterval = Infinity;
      switch (true) {
        case this.labelMonthInterval > 6:
          this.labelMonthInterval = 6;
          break;
        case this.labelMonthInterval > 3:
          this.labelMonthInterval = 3;
          break;
        default:
          break;
      }
    }

    this.labelYearInterval = Math.floor(this.labelMonthInterval / 11);

    if (this.labelYearInterval >= 1) {
      this.labelDayInterval = Infinity;
      this.labelMonthInterval = Infinity;
    }

    const min_rows = Math.round(this.height / 50);
    this.findPriceRange();
    let priceInterval = this.priceRange.dif / min_rows;
    if (priceInterval > 1) this.priceInterval = Math.ceil(priceInterval);
    else if (priceInterval >= 0.1)
      this.priceInterval = Number(priceInterval.toFixed(1));

    this.candleWidth = this.width / this.visible_candles.length;
    this.findVolumeRange();
  }

  zoom(event) {
    event.preventDefault();
    const n = Math.floor(this.visible_candles.length / 200);
    //deltaY is positive when zooming out
    event.deltaY > 0 ? this.addCandle(n) : this.removeCandle(n);
    this.reSize();
    this.draw();
  }

  addCandle(n = 1) {
    if (this.visible_candles.length < this.maxCandles) {
      for (let i = 0; i <= n; i++) {
        const e = this.past_candles.pop();
        if (e != undefined) this.visible_candles.push(e);
      }
    }
  }

  removeCandle(n = 1) {
    for (let i = 0; i <= n; i++) {
      if (this.visible_candles.length < 3) return;
      const e = this.visible_candles.pop();
      if (e != undefined) this.past_candles.push(e);
    }
  }

  mouseMove(event) {
    event.preventDefault();
    const bounds = this.canvas.getBoundingClientRect();
    this.mousePos_x = event.x - bounds.left;
    this.mousePos_y = event.y - bounds.top;
    this.drawMouseOverlay();
  }

  clearOverlays() {
    this.overlayContext.clearRect(
      0,
      0,
      this.overlay.width,
      this.overlay.height
    );
    this.rowOverlayContext.clearRect(
      0,
      0,
      this.rowOverlay.width,
      this.rowOverlay.height
    );
    this.columnOverlayContext.clearRect(
      0,
      0,
      this.columnOverlay.width,
      this.columnOverlay.height
    );
  }

  drawMouseOverlay() {
    const [candle, index] = this.xToCandle(this.mousePos_x);
    const price = this.ytoPrice(this.mousePos_y);
    this.clearOverlays();

    //draw dotted lines intersecting on the mouse position.
    const x_snap =
      index * this.candleWidth + this.candleWidth / 2 + this.candleSpacing;
    this.overlayContext.beginPath();
    this.overlayContext.lineWidth = 0.5;
    this.overlayContext.strokeStyle = "#ffffff";
    this.overlayContext.setLineDash([5, 5]);
    this.overlayContext.moveTo(0, this.mousePos_y);
    this.overlayContext.lineTo(this.width, this.mousePos_y);
    this.overlayContext.stroke();
    this.overlayContext.moveTo(x_snap, 0);
    this.overlayContext.lineTo(x_snap, this.height);
    this.overlayContext.stroke();

    // draw timestamp labels.
    const label_background_width = 90;
    this.rowOverlayContext.fillStyle = this.overlayBackgroundColor;
    this.rowOverlayContext.fillRect(
      this.mousePos_x - label_background_width / 2,
      0,
      label_background_width,
      this.bar_width
    );
    this.rowOverlayContext.fillStyle = "white";
    this.rowOverlayContext.textAlign = "center";
    this.rowOverlayContext.font = "12px Arial";
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

    this.rowOverlayContext.fillText(
      `${weekday} ${day} ${month} '${year}`,
      x,
      this.bar_width / 2
    );

    // draw price labels.
    const label_background_height = 30;
    this.columnOverlayContext.fillStyle = this.overlayBackgroundColor;
    this.columnOverlayContext.fillRect(
      0,
      this.mousePos_y - label_background_height / 2,
      this.bar_width,
      label_background_height
    );
    this.columnOverlayContext.textAlign = "center";
    this.columnOverlayContext.fillStyle = "white";
    this.columnOverlayContext.font = "12px Arial";

    let y = this.mousePos_y;
    if (this.mousePos_y <= this.height * 0.02) {
      y = this.height * 0.02;
    }
    this.columnOverlayContext.fillText(price.toFixed(2), this.bar_width / 2, y);
  }

  mouseOut(event) {
    event.preventDefault();
    this.clearOverlays();
    this.mouseOverlay = false;
  }

  findVolumeRange() {
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < this.visible_candles.length; i++) {
      const candle = this.visible_candles[i];
      min = candle.volume < min ? candle.volume : min;
      max = candle.volume > max ? candle.volume : max;
    }
    this.volumeRange = { min: min, max: max, dif: max - min };
  }
  findPriceRange() {
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < this.visible_candles.length; i++) {
      const candle = this.visible_candles[i];
      min = candle.low < min ? candle.low : min;
      max = candle.high > max ? candle.high : max;
    }
    const dif = max - min;
    const offset = dif * 0.1;
    this.priceRange = {
      min: min - offset,
      max: max + offset,
      dif: dif + 2 * offset,
    };
  }

  ytoPrice(y) {
    const price =
      ((this.height - y) / this.height) * this.priceRange.dif +
      this.priceRange.min;
    return price;
  }

  xToCandle(x) {
    let index = Math.floor(x / this.candleWidth);
    if (index >= this.visible_candles.length)
      index = this.visible_candles.length - 1;
    if (index < 0) index = 0;
    const candle =
      this.visible_candles[this.visible_candles.length - 1 - index];
    if (candle == undefined) {
      return [new Date(), index];
    }
    return [candle, index];
  }

  priceToY(price) {
    return (
      this.height -
      ((price - this.priceRange.min) /
        (this.priceRange.max - this.priceRange.min)) *
        this.height
    );
  }

  candleToX(candlestick) {
    const timestamp_y =
      (this.visible_candles.indexOf(candlestick) + 1) * this.candleWidth -
      this.candleWidth / 2;

    return this.width - timestamp_y;
  }

  volumeToCoordinate(volume) {
    const zeroOffset = 10;
    const height = this.height * this.volumeSection;
    let y =
      this.height -
      ((volume - this.volumeRange.min) /
        (this.volumeRange.max - this.volumeRange.min)) *
        height -
      zeroOffset;
    if (y < 10) y = 100;
    if (y < this.height - height) y = this.height - height;
    return y;
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
    // Vertical gridlines and date labels in sidebar
    let d = 0;
    let m = 0;
    let y = 0;

    for (let i = 0; i < this.visible_candles.length; i++) {
      d++;
      const candle = this.visible_candles[i];
      if (candle.firstOfMonth) m++;
      if (candle.firstOfYear) {
        m++;
        y++;
      }
      if (
        d > this.labelDayInterval ||
        m >= this.labelMonthInterval ||
        y > this.labelYearInterval
      ) {
        let text;
        if (d > this.labelDayInterval) {
          text = candle.timestamp.toLocaleString("default", {
            day: "numeric",
          });
          d = 0;
        }
        if (candle.firstOfMonth) {
          m++;
          if (m > this.labelMonthInterval) {
            text = candle.timestamp.toLocaleString("default", {
              month: "long",
            });
            m = 0;
            d = 0;
          }
        }
        if (candle.firstOfYear) {
          y++;
          if (y > this.labelYearInterval) {
            text = candle.timestamp.toLocaleString("default", {
              year: "numeric",
            });
            d = 0;
            m = 0;
            y = 0;
          }
        }
        if (text != undefined) {
          const x = this.candleToX(candle);
          this.drawLine(
            {
              x1: x,
              y1: 0,
              x2: x,
              y2: this.height,
            },
            this.lineColor
          );
          this.drawText(this.row_bar_ctx, text, x, this.bar_width / 2);
        }
      }
    }
    //Horizontal gridlines and sidebar labels
    Math.round(this.priceRange.min);
    let price = Math.round(this.priceRange.min);

    while (price <= this.priceRange.max) {
      const y = this.priceToY(price);
      this.drawLine(
        {
          x1: 0,
          y1: y,
          x2: this.width,
          y2: y,
        },
        this.lineColor
      );

      this.drawText(
        this.column_bar_ctx,
        price.toFixed(2),
        this.bar_width / 2,
        y
      );
      price += this.priceInterval;
    }
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
    let prev_month;
    let prev_year;

    Object.entries(data[ticker]).map(
      ([timestamp, { close, high, low, open, volume }]) => {
        const date = new Date(timestamp);
        const month = date.getMonth();
        const year = date.getFullYear();
        const candle = new CandleStick(
          date,
          open,
          close,
          high,
          low,
          volume,
          month != prev_month ? true : false,
          year != prev_year ? true : false
        );
        prev_month = month;
        prev_year = year;

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
    this.intervalSeconds =
      (this.visible_candles[0].timestamp -
        this.visible_candles[this.visible_candles.length - 1].timestamp) /
      this.visible_candles.length /
      1000;
  }

  drawCandleStick(candlestick) {
    const { timestamp, open, high, low, close, volume } = candlestick;
    const color = close > open ? "#00cc00" : "#cc0000";
    const volumeColor = close > open ? "#005500" : "#550000";
    const width = this.candleWidth - this.candleSpacing;
    const x = this.candleToX(candlestick) - width / 2;
    const v_high = this.volumeToCoordinate(volume);
    const v_height = this.height - v_high;

    //Draw Volume Bar
    if (width > 2) {
      this.context.beginPath();
      this.context.fillStyle = volumeColor;
      this.context.rect(x, v_high, width, v_height);
      this.context.fill();
    } else {
      this.drawLine({ x1: x, y1: v_high, x2: x, y2: this.height }, volumeColor);
    }
    const y_high = close > open ? this.priceToY(close) : this.priceToY(open);

    const y_length = Math.abs(this.priceToY(open) - this.priceToY(close));

    //Draw Candle
    if (width > 2) {
      this.context.beginPath();
      this.context.fillStyle = color;
      this.context.rect(x, y_high, width, Math.ceil(y_length));
      this.context.fill();
    }

    //Draw Wick
    this.drawLine(
      {
        x1: x + width * 0.5,
        y1: this.priceToY(high) + 0.25,
        x2: x + width * 0.5,
        y2: this.priceToY(low) - 0.25,
      },
      color
    );
  }
}
