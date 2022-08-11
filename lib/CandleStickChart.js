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
    [rowBar, rowOverlay, columnBar, columnOverlay, cornerButton, overlay, label]
  ) {
    this.barWidth = 50;
    canvas.width = width - this.barWidth;
    canvas.height = height - this.barWidth;
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.width = width - this.barWidth;
    this.height = height - this.barWidth;
    this.bounds = canvas.getBoundingClientRect();

    label.height = this.barWidth;
    label.width = this.width;
    this.label = label;
    this.labelContext = label.getContext("2d");

    overlay.height = this.height;
    overlay.width = this.width;
    this.overlay = overlay;
    this.overlayContext = overlay.getContext("2d");

    rowBar.width = this.width;
    rowBar.height = this.barWidth;
    this.rowBar = rowBar;
    this.rowBarContext = rowBar.getContext("2d");

    rowOverlay.width = this.width;
    rowOverlay.height = this.barWidth;
    this.rowOverlay = rowOverlay;
    this.rowOverlayContext = rowOverlay.getContext("2d");

    rowBar.width = this.width;
    rowBar.height = this.barWidth;
    this.rowBar = rowBar;
    this.rowBarContext = rowBar.getContext("2d");

    columnBar.width = this.barWidth;
    columnBar.height = this.height;
    this.columnBar = columnBar;
    this.columnBarContext = columnBar.getContext("2d");

    columnOverlay.width = this.barWidth;
    columnOverlay.height = this.height;
    this.columnOverlay = columnOverlay;
    this.columnOverlayContext = columnOverlay.getContext("2d");

    cornerButton.height = this.barWidth;
    cornerButton.width = this.barWidth;
    this.corner_button = cornerButton;
    this.corner_button_ctx = rowBar.getContext("2d");

    this.visibleCandles = [];
    this.pastCandles = [];
    this.futureCandles = [];
    this.startingCandles = 260;
    this.candleSpacing = 2;
    this.maxCandles = this.width;
    this.volumeSection = 0.2;
    this.createCandleSticks(data);
    this.margin = 0;

    this.backgroundColor = "#0f172a";
    this.overlayBackgroundColor = "#334454";
    this.lineColor = "#1e293b";
    this.lineWidth = 2;

    this.mouseOverlay = false;
    this.hoverCandle = this.visibleCandles[0];
    this.deltaX = 0;

    this.overlay.addEventListener("mousemove", (e) => {
      if (this.mouseDown) {
        this.pan(e);
      } else {
        this.overlay.style.cursor = "crosshair";
        this.mouseMove(e);
      }
    });
    this.overlay.addEventListener("mouseout", (e) => {
      this.mouseDown = false;
      this.mouseOut(e);
    });
    this.overlay.addEventListener("wheel", (e) => {
      this.zoom(e);
    });
    this.overlay.addEventListener("mousedown", (e) => {
      this.mouseOverlay = false;
      this.clearOverlays();
      this.overlay.style.cursor = "grabbing";
      this.mouseDown = true;
    });
    this.overlay.addEventListener("mouseup", () => {
      this.mouseDown = false;
    });

    this.drawLabelOverlay();
    this.reSize();
    this.draw();
  }

  draw() {
    this.context.lineWidth = this.lineWidth;
    this.context.clearRect(0, 0, this.width, this.height);
    this.createChart();
    this.createGrid();
    this.visibleCandles.map((candle) => this.drawCandleStick(candle));
  }

  reSize() {
    this.labelDayInterval = Infinity;
    this.labelMonthInterval = Infinity;
    this.labelYearInterval = Infinity;

    //format the interval to be somewhat close to an even divisors of 21
    //rounded up, rough approximation of bank days in a month
    const min_cols = Math.round(this.width / 150);
    this.labelDayInterval = this.visibleCandles.length / min_cols;
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

    //Same concept, but with number of months in a year.
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

    this.candleWidth = this.width / this.visibleCandles.length;
    this.findVolumeRange();
  }

  pan(event) {
    const x = event.x - this.bounds.left;
    const y = event.y - this.bounds.top;

    this.deltaX += this.mouseX - x;

    if (this.deltaX > this.candleWidth) {
      this.shiftRight(Math.floor(this.deltaX / this.candleWidth));
      this.deltaX = this.deltaX % this.candleWidth;
    }
    if (this.deltaX < -this.candleWidth) {
      this.shiftLeft(Math.ceil(this.deltaX / this.candleWidth));
      this.deltaX = this.deltaX % this.candleWidth;
    }
    this.reSize();
    this.draw();
    this.mouseX = x;
    this.mouseY = y;
  }
  shiftLeft(n = 1) {
    for (let i = 0; i < Math.abs(n); i++) {
      this.futureCandles.push(this.visibleCandles.shift());
      this.visibleCandles.push(this.pastCandles.pop());
    }
  }
  shiftRight(n = 1) {
    for (let i = 0; i < n; i++) {
      const candle = this.futureCandles.pop();
      if (candle != undefined) {
        this.visibleCandles.unshift(candle);
        this.pastCandles.push(this.visibleCandles.pop());
      }
    }
  }

  zoom(event) {
    event.preventDefault();
    const n = Math.floor(this.visibleCandles.length / 100);
    //deltaY is positive when zooming out
    event.deltaY > 0 ? this.addCandle(n) : this.removeCandle(n);
    this.reSize();
    this.draw();
  }

  addCandle(n = 1) {
    if (this.visibleCandles.length < this.maxCandles) {
      for (let i = 0; i <= n; i++) {
        const e = this.pastCandles.pop();
        if (e != undefined) this.visibleCandles.push(e);
      }
    }
  }

  removeCandle(n = 1) {
    for (let i = 0; i <= n; i++) {
      if (this.visibleCandles.length < 3) return;
      const e = this.visibleCandles.pop();
      if (e != undefined) this.pastCandles.push(e);
    }
  }

  mouseMove(event) {
    event.preventDefault();
    this.mouseX = event.x - this.bounds.left;
    this.mouseY = event.y - this.bounds.top;
    this.drawMouseOverlay();
  }

  drawLabelOverlay() {
    this.labelContext.fillStyle = "white";
    this.labelContext.textAlign = "center";
    this.labelContext.font = "24px Arial";
    this.labelContext.fillText(this.ticker, 45, this.label.height / 2);
  }

  drawCandleOverlay() {
    const difference = this.hoverCandle.close - this.hoverCandle.open;
    this.labelContext.fillStyle = difference > 0 ? "#00ff00" : "#ff0000";
    this.labelContext.textAlign = "left";
    this.labelContext.font = "18px Arial";
    const text = `O: ${this.hoverCandle.open.toFixed(
      2
    )} H: ${this.hoverCandle.high.toFixed(2)} L: ${this.hoverCandle.low.toFixed(
      2
    )} C: ${this.hoverCandle.close.toFixed(2)}`;
    this.labelContext.fillText(text, 100, this.label.height / 2);
  }

  clearCandleOverlay() {
    this.labelContext.clearRect(100, 0, this.label.width, this.label.height);
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
    const [candle, index] = this.xToCandle(this.mouseX);
    const price = this.ytoPrice(this.mouseY);
    this.clearOverlays();
    this.hoverCandle = candle;
    this.clearCandleOverlay();

    this.drawCandleOverlay();

    //draw dotted lines intersecting on the mouse position.
    const x_snap =
      index * this.candleWidth + this.candleWidth / 2 + this.candleSpacing;
    this.overlayContext.beginPath();
    this.overlayContext.lineWidth = 0.5;
    this.overlayContext.strokeStyle = "#ffffff";
    this.overlayContext.setLineDash([5, 5]);
    this.overlayContext.moveTo(0, this.mouseY);
    this.overlayContext.lineTo(this.width, this.mouseY);
    this.overlayContext.stroke();
    this.overlayContext.moveTo(x_snap, 0);
    this.overlayContext.lineTo(x_snap, this.height);
    this.overlayContext.stroke();

    // draw timestamp labels.
    const label_background_width = 90;
    this.rowOverlayContext.fillStyle = this.overlayBackgroundColor;
    this.rowOverlayContext.fillRect(
      this.mouseX - label_background_width / 2,
      0,
      label_background_width,
      this.barWidth
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
    let x = this.mouseX;
    if (this.mouseX > this.width * 0.96) {
      x = this.width * 0.96;
    } else if (this.mouseX < this.width * 0.05) {
      x = this.width * 0.05;
    }

    this.rowOverlayContext.fillText(
      `${weekday} ${day} ${month} '${year}`,
      x,
      this.barWidth / 2
    );

    // draw price labels.
    const label_background_height = 30;
    this.columnOverlayContext.fillStyle = this.overlayBackgroundColor;
    this.columnOverlayContext.fillRect(
      0,
      this.mouseY - label_background_height / 2,
      this.barWidth,
      label_background_height
    );
    this.columnOverlayContext.textAlign = "center";
    this.columnOverlayContext.fillStyle = "white";
    this.columnOverlayContext.font = "12px Arial";

    let y = this.mouseY;
    if (this.mouseY <= this.height * 0.02) {
      y = this.height * 0.02;
    }
    this.columnOverlayContext.fillText(price.toFixed(2), this.barWidth / 2, y);
  }

  mouseOut(event) {
    event.preventDefault();
    this.clearOverlays();
  }

  findVolumeRange() {
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < this.visibleCandles.length; i++) {
      const candle = this.visibleCandles[i];
      min = candle.volume < min ? candle.volume : min;
      max = candle.volume > max ? candle.volume : max;
    }
    this.volumeRange = { min: min, max: max, dif: max - min };
  }
  findPriceRange() {
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < this.visibleCandles.length; i++) {
      const candle = this.visibleCandles[i];
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
    if (index >= this.visibleCandles.length)
      index = this.visibleCandles.length - 1;
    if (index < 0) index = 0;
    const candle = this.visibleCandles[this.visibleCandles.length - 1 - index];
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
      (this.visibleCandles.indexOf(candlestick) + 1) * this.candleWidth -
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

    let ctx = this.rowBar.getContext("2d");
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(0, 0, this.width, 50);

    ctx = this.columnBar.getContext("2d");
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

    for (let i = 0; i < this.visibleCandles.length; i++) {
      d++;
      const candle = this.visibleCandles[i];
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
          this.drawText(this.rowBarContext, text, x, this.barWidth / 2);
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
        this.columnBarContext,
        price.toFixed(2),
        this.barWidth / 2,
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
          this.pastCandles.push(candle);
        } else this.visibleCandles.push(candle);
        i--;
      }
    );

    if (
      this.visibleCandles[0].timestamp < this.visibleCandles.at(-1).timestamp
    ) {
      this.visibleCandles = this.visibleCandles.reverse();
    } else {
      this.pastCandles = this.pastCandles.reverse();
    }
    this.intervalSeconds =
      (this.visibleCandles[0].timestamp -
        this.visibleCandles[this.visibleCandles.length - 1].timestamp) /
      this.visibleCandles.length /
      1000;
  }

  drawCandleStick(candlestick) {
    const { timestamp, open, high, low, close, volume } = candlestick;
    const color = close > open ? "#00cc00" : "#cc0000";
    const volumeColor = close > open ? "#005500" : "#550000";
    const width = this.candleWidth - this.candleSpacing;
    const x = this.candleToX(candlestick) - width / 2;
    const vHigh = this.volumeToCoordinate(volume);
    const vHeight = this.height - vHigh;

    //Draw Volume Bar
    if (width > 2) {
      this.context.beginPath();
      this.context.fillStyle = volumeColor;
      this.context.rect(x, vHigh, width, vHeight);
      this.context.fill();
    } else {
      this.drawLine({ x1: x, y1: vHigh, x2: x, y2: this.height }, volumeColor);
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
