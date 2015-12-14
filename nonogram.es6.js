'use strict';

const sum = array => array.reduce((a, b) => a + b, 0);
const deepCopy = object => JSON.parse(JSON.stringify(object));
const typeOf = something => Object.prototype.toString.call(something);
const eekwall = (object1, object2) => object1.toString() === object2.toString();

const FILLED = true;
const EMPTY = false;
const UNSET = undefined;
const TEMPORARILY_FILLED = 1;
const TEMPORARILY_EMPTY = -1;
const INCONSTANT = null;
const VOID = -Infinity;

class Nonogram {
  constructor() {
    this.filledColor = '#999';
    this.emptyColor = '#fff';
    this.unsetColor = '#ccc';
    this.fontColor = '#999';
    this.correctColor = '#0cf';
    this.wrongColor = '#f69';
    this.meshColor = '#999';
    this.width = 300;
  }

  getSingleLine(direction, i) {
    let g = [];
    if (direction === 'row') {
      for (let j = 0; j < this.n; j++) {
        g[j] = this.grid[i][j];
      }
    } else if (direction === 'col') {
      for (let j = 0; j < this.m; j++) {
        g[j] = this.grid[j][i];
      }
    }
    return g;
  }
  getHints(direction, i) {
    return deepCopy(this[`${direction}Hints`][i]);
  }
  calculateHints(direction, i) {
    let hints = [];
    let line = this.getSingleLine(direction, i);
    line.reduce((lastIsFilled, cell) => {
      if (cell === FILLED) {
        lastIsFilled ? hints[hints.length - 1] += 1 : hints.push(1);
      }
      return cell === FILLED;
    }, false);
    return hints;
  }
  checkCorrectness(direction, i) {
    return this.calculateHints(direction, i).toString() === this[`${direction}Hints`][i].toString();
  }

  getLocation(x, y) {
    let w = this.canvas.width;
    let h = this.canvas.height;
    let w23 = w * 2 / 3;
    let h23 = h * 2 / 3;
    let d = w23 / (this.n + 1);

    if (x < 0 || x >= w || y < 0 || y >= h) {
      return 'outside';
    }
    if (0 <= x && x <= w23 && 0 <= y && y < h23) {
      if (d / 2 <= x && x < w23 - d / 2 && d / 2 <= y && y < h23 - d / 2) {
        return 'grid';
      } else {
        return 'limbo';
      }
    }
    if (w23 <= x && x < w && h23 <= y && y < h) {
      return 'controller';
    }
    return 'hints';
  }

  print() {
    if (this.canvas) {
      this.printGrid();
      this.printHints();
      this.printController();
    }
  }
  printGrid() {
    let ctx = this.canvas.getContext('2d');
    let w = this.canvas.width;
    let h = this.canvas.height;
    let d = w * 2 / 3 / (this.n + 1);

    ctx.fillStyle = this.emptyColor;
    ctx.fillRect(-1, -1, w * 2 / 3 + 1, h * 2 / 3 + 1);
    if (this.meshed) {
      this.printMesh();
    }
    ctx.save();
    ctx.translate(d / 2, d / 2);
    for (let i = 0; i < this.m; i++) {
      for (let j = 0; j < this.n; j++) {
        ctx.save();
        ctx.translate(d * j, d * i);
        switch (this.grid[i][j]) {
          case UNSET:
            ctx.fillStyle = this.unsetColor;
            ctx.fillRect(d * 0.05, d * 0.05, d * 0.9, d * 0.9);
            break;
          case FILLED:
            ctx.fillStyle = this.filledColor;
            ctx.fillRect(-d * 0.05, -d * 0.05, d * 1.1, d * 1.1);
            break;
          case VOID:
            ctx.strokeStyle = this.wrongColor;
            ctx.lineWidth = d / 15;
            ctx.beginPath();
            ctx.moveTo(d * 0.3, d * 0.3);
            ctx.lineTo(d * 0.7, d * 0.7);
            ctx.moveTo(d * 0.3, d * 0.7);
            ctx.lineTo(d * 0.7, d * 0.3);
            ctx.stroke();
            break;
        }
        ctx.restore();
      }
    }
    ctx.restore();
  }
  printMesh() {
    let ctx = this.canvas.getContext('2d');
    let d = this.canvas.width * 2 / 3 / (this.n + 1);

    ctx.save();
    ctx.translate(d / 2, d / 2);
    ctx.beginPath();
    for (let i = 1; i < this.m; i++) {
      ctx.moveTo(0, i * d);
      ctx.lineTo(this.n * d, i * d);
      if (i % 5 === 0) {
        ctx.moveTo(0, i * d - 1);
        ctx.lineTo(this.n * d, i * d - 1);
        ctx.moveTo(0, i * d + 1);
        ctx.lineTo(this.n * d, i * d + 1);
      }
    }
    for (let j = 1; j < this.n; j++) {
      ctx.moveTo(j * d, 0);
      ctx.lineTo(j * d, this.m * d);
      if (j % 5 === 0) {
        ctx.moveTo(j * d - 1, 0);
        ctx.lineTo(j * d - 1, this.m * d);
        ctx.moveTo(j * d + 1, 0);
        ctx.lineTo(j * d + 1, this.m * d);
      }
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = this.meshColor;
    ctx.stroke();
    ctx.closePath();
    ctx.restore();
  }
  printHints() {
    let ctx = this.canvas.getContext('2d');
    let w = this.canvas.width;
    let h = this.canvas.height;
    let d = w * 2 / 3 / (this.n + 1);

    ctx.fillStyle = this.emptyColor;
    ctx.fillRect(w * 2 / 3 - 1, -1, w * 3 + 1, h * 2 / 3 + 1);
    ctx.fillRect(-1, h * 2 / 3 - 1, w * 2 / 3 + 1, h / 3 + 1);
    ctx.save();
    ctx.translate(d / 2, d / 2);
    let color;
    for (let i = 0; i < this.m; i++) {
      color = this.fontColor;
      if (this.rowHints[i].isCorrect) {
        color = this.correctColor;
      } else if (this.rowHints[i].isWrong) {
        color = this.wrongColor;
      }
      for (let j = 0; j < this.rowHints[i].length; j++) {
        printSingleHint.call(this, 'row', i, j, color);
      }
      if (this.rowHints[i].length === 0) {
        printSingleHint.call(this, 'row', i, 0, color);
      }
    }
    for (let j = 0; j < this.n; j++) {
      color = this.fontColor;
      if (this.colHints[j].isCorrect) {
        color = this.correctColor;
      } else if (this.colHints[j].isWrong) {
        color = this.wrongColor;
      }
      for (let i = 0; i < this.colHints[j].length; i++) {
        printSingleHint.call(this, 'col', j, i, color);
      }
      if (this.colHints[j].length === 0) {
        printSingleHint.call(this, 'col', j, 0, color);
      }
    }
    ctx.restore();

    function printSingleHint(direction, i, j, color) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = d + 'pt monospace';
      ctx.fillStyle = color;
      if (direction === 'row') {
        ctx.fillText(this.rowHints[i][j] || 0,
          w * 2 / 3 + d * j, d * (i + 0.5), d * 0.8);
      } else if (direction === 'col') {
        ctx.fillText(this.colHints[i][j] || 0,
          d * (i + 0.5), h * 2 / 3 + d * j, d * 0.8);
      }
    }
  }
  printController() {
    return;
  }
}

class NonogramAuto extends Nonogram {
  constructor(rowHints, colHints, canvasId, width) {
    super();
    this.demoMode = true;
    this.delay = 50;
    this.rowHints = deepCopy(rowHints);
    this.colHints = deepCopy(colHints);
    this.m = rowHints.length;
    this.n = colHints.length;
    this.grid = new Array(this.m);
    for (let i = 0; i < this.m; i++) {
      this.grid[i] = new Array(this.n);
    }
    for (let i = 0; i < this.m; i++) {
      this.rowHints[i].isWrong = true;
    }
    for (let j = 0; j < this.n; j++) {
      this.colHints[j].isWrong = true;
    }

    let canvas = document.getElementById(canvasId);
    if (!canvas || canvas.hasAttribute('occupied')) {
      return;
    }

    this.canvas = canvas;
    this.canvas.width = width || this.width;
    this.canvas.height = this.canvas.width * (this.m + 1) / (this.n + 1);
    this.canvas.nonogram = this;
    this.canvas.addEventListener('click', this.click);
  }

  click(e) {
    if (this.hasAttribute('occupied')) {
      return;
    }

    const self = this.nonogram;
    let d = this.width * 2 / 3 / (self.n + 1);
    let x = e.clientX - this.getBoundingClientRect().left;
    let y = e.clientY - this.getBoundingClientRect().top;
    if (self.getLocation(x, y) === 'grid') {
      let i = Math.floor(y / d - 0.5);
      let j = Math.floor(x / d - 0.5);
      if (self.grid[i][j] === UNSET) {
        self.grid[i][j] = FILLED;
        self.solve();
      }
    } else if (self.getLocation(x, y) === 'controller') {
      self.grid = new Array(self.m);
      for (let i = 0; i < self.m; i++) {
        self.grid[i] = new Array(self.n);
      }
      for (let i = 0; i < self.m; i++) {
        self.rowHints[i].isWrong = true;
      }
      for (let j = 0; j < self.n; j++) {
        self.colHints[j].isWrong = true;
      }

      self.solve();
    }
  }
  solve() {
    if (this.canvas) {
      this.canvas.setAttribute('occupied', '');
    } else {
      this.demoMode = false;
    }
    scan.call(this);

    function scan() {
      do {
        updateScanner.call(this);
      }
      while (!this[`${this.scanner.direction}Hints`][this.scanner.i].isWrong && this.linesToChange);

      if (this.demoMode) {
        this.print();
      }

      if (this.linesToChange) {
        this.linePass = undefined;
        this.solveSingleLine();
        if (!this.linePass) {
          this.scanner.error = true;
          if (this.canvas) {
            this.canvas.removeAttribute('occupied');
            this.print();
          }
          return;
        }
        if (this.demoMode) {
          setTimeout(scan.bind(this), this.delay);
        } else {
          return scan.call(this);
        }
      } else {
        this.scanner = undefined;
        if (this.canvas) {
          this.canvas.removeAttribute('occupied');
          this.print();
        }
      }
    }

    function updateScanner() {
      if (this.scanner === undefined) {
        this.scanner = {
          'direction': 'row',
          'i': 0,
        };
        this.linesToChange = this.m + this.n;
      } else {
        this.scanner.error = undefined;
        this.scanner.i += 1;
        if (this[`${this.scanner.direction}Hints`][this.scanner.i] === undefined) {
          this.scanner.direction = (this.scanner.direction === 'row') ? 'col' : 'row';
          this.scanner.i = 0;
        }
        this.linesToChange -= 1;
      }
    }
  }
  solveSingleLine(direction = this.scanner.direction, i = this.scanner.i) {
    this.line = this.getSingleLine(direction, i);
    let finished = this.line.every(cell => cell !== UNSET);
    if (!finished) {
      this.hints = this.getHints(direction, i);
      this.blanks = [];
      this.getAllSituations(this.line.length - sum(this.hints) - this.hints.length + 1);

      let changed = this.line.some(cell => cell === TEMPORARILY_FILLED || cell === TEMPORARILY_EMPTY);
      if (changed) {
        this.linesToChange = this.m + this.n;
      }
      this.setBackToGrid(direction, i);
    }
    if (this.checkCorrectness(direction, i)) {
      this[`${direction}Hints`][i].isWrong = undefined;
      if (finished) {
        this.linePass = true;
      }
    }
  }
  getAllSituations(max, array = [], index = 0) {
    if (index === this.hints.length) {
      for (let i = 0; i < this.hints.length; i++) {
        this.blanks[i] = array[i] + (i ? 1 : 0);
      }
      return this.mergeSituation();
    }

    for (let i = 0; i <= max; i++) {
      array[index] = i;
      this.getAllSituations(max - array[index], array, index + 1);
    }
  }
  mergeSituation() {
    let status = [];
    for (let i = 0; i < this.hints.length; i++) {
      status = status.concat(new Array(this.blanks[i]).fill(EMPTY));
      status = status.concat(new Array(this.hints[i]).fill(FILLED));
    }
    status = status.concat(new Array(this.line.length - status.length).fill(EMPTY));

    let improper = status.some((cell, i) => (cell === EMPTY && this.line[i] === FILLED) || (cell === FILLED && this.line[i] === EMPTY));
    if (improper) {
      return;
    }

    this.linePass = true;
    status.forEach((cell, i) => {
      if (cell === FILLED) {
        if (this.line[i] === TEMPORARILY_EMPTY) {
          this.line[i] = INCONSTANT;
        } else if (this.line[i] === UNSET) {
          this.line[i] = TEMPORARILY_FILLED;
        }
      } else if (cell === EMPTY) {
        if (this.line[i] === TEMPORARILY_FILLED) {
          this.line[i] = INCONSTANT;
        } else if (this.line[i] === UNSET) {
          this.line[i] = TEMPORARILY_EMPTY;
        }
      }
    });
  }
  setBackToGrid(direction, i) {
    if (direction === 'row') {
      this.line.forEach((cell, j) => {
        this.grid[i][j] = this.convertCellValue(cell);
      });
    } else if (direction === 'col') {
      this.line.forEach((cell, j) => {
        this.grid[j][i] = this.convertCellValue(cell);
      });
    }
  }
  convertCellValue(value) {
    switch (value) {
      case TEMPORARILY_FILLED:
        return FILLED;
      case TEMPORARILY_EMPTY:
        return EMPTY;
      case INCONSTANT:
        return UNSET;
      default:
        return value;
    }
  }

  print() {
    if (this.canvas) {
      this.printGrid();
      this.printHints();
      this.printController();
      this.printScanner();
    }
  }
  printController() {
    let ctx = this.canvas.getContext('2d');
    let w = this.canvas.width;
    let h = this.canvas.height;
    let controllerSize = Math.min(w, h) / 4;
    let filledColor = this.filledColor;

    ctx.fillStyle = this.emptyColor;
    ctx.fillRect(w * 2 / 3 - 1, h * 2 / 3 - 1, w / 3 + 1, h / 3 + 1);
    if (this.canvas.hasAttribute('occupied')) {
      return;
    }

    ctx.save();
    ctx.translate(w * 0.7, h * 0.7);
    ctx.drawImage(getCycle(), 0, 0);
    ctx.restore();

    function getCycle() {
      let cycle = document.createElement('canvas');
      let borderWidth = controllerSize / 10;
      cycle.width = controllerSize;
      cycle.height = controllerSize;

      let ctx = cycle.getContext('2d');
      ctx.translate(controllerSize / 2, controllerSize / 2);
      ctx.arc(0, 0, controllerSize / 2 - borderWidth / 2, Math.PI * 3 / 2, Math.PI * 5.1 / 4);
      ctx.lineWidth = borderWidth;
      ctx.strokeStyle = filledColor;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-(controllerSize / 2 + borderWidth) * Math.SQRT1_2, - (controllerSize / 2 + borderWidth) * Math.SQRT1_2);
      ctx.lineTo(-(controllerSize / 2 - borderWidth * 2) * Math.SQRT1_2, - (controllerSize / 2 + borderWidth) * Math.SQRT1_2);
      ctx.lineTo(-(controllerSize / 2 - borderWidth * 2) * Math.SQRT1_2, - (controllerSize / 2 - borderWidth * 2) * Math.SQRT1_2);
      ctx.closePath();
      ctx.fillStyle = filledColor;
      ctx.fill();

      return cycle;
    }
  }
  printScanner() {
    if (this.scanner === undefined) {
      return;
    }

    let ctx = this.canvas.getContext('2d');
    let w = this.canvas.width;
    let h = this.canvas.height;
    let d = w * 2 / 3 / (this.n + 1);

    ctx.save();
    ctx.translate(d / 2, d / 2);
    if (this.scanner.error) {
      ctx.fillStyle = this.wrongColor;
    } else {
      ctx.fillStyle = this.correctColor;
    }
    ctx.globalAlpha = 0.5;
    if (this.scanner.direction === 'row') {
      ctx.fillRect(0, d * this.scanner.i, w, d);
    } else if (this.scanner.direction === 'col') {
      ctx.fillRect(d * this.scanner.i, 0, d, h);
    }
    ctx.restore();
  }
}

class NonogramEdit extends Nonogram {
  constructor(m, n, canvasId, width, thresholdOrGrid) {
    super();
    this.fontColor = '#f69';
    this.filledColor = '#f69';
    this.hintChange = new Event('hintchange');
    this.m = m;
    this.n = n;
    this.threshold = 0.5;
    if (typeOf(thresholdOrGrid) === '[object Array]') {
      this.grid = deepCopy(thresholdOrGrid);
    } else {
      if (typeOf(thresholdOrGrid) === '[object Number]') {
        this.threshold = thresholdOrGrid;
      }
      this.grid = new Array(this.m);
      for (let i = 0; i < this.m; i++) {
        this.grid[i] = new Array(this.n);
        for (let j = 0; j < this.n; j++) {
          this.grid[i][j] = (Math.random() < this.threshold) ? FILLED : EMPTY;
        }
      }
    }
    this.rowHints = new Array(m);
    this.colHints = new Array(n);
    for (let i = 0; i < this.m; i++) {
      this.rowHints[i] = this.calculateHints('row', i);
    }
    for (let j = 0; j < this.n; j++) {
      this.colHints[j] = this.calculateHints('col', j);
    }
    let canvas = document.getElementById(canvasId);
    if (!canvas || canvas.hasAttribute('occupied')) {
      return;
    }

    this.canvas = canvas;
    this.canvas.width = width || this.width;
    this.canvas.height = this.canvas.width * (this.m + 1) / (this.n + 1);
    this.canvas.nonogram = this;
    this.canvas.addEventListener('click', this.click);
  }

  click(e) {
    const self = this.nonogram;
    let d = this.width * 2 / 3 / (self.n + 1);
    let x = e.clientX - this.getBoundingClientRect().left;
    let y = e.clientY - this.getBoundingClientRect().top;
    if (self.getLocation(x, y) === 'grid') {
      let i = Math.floor(y / d - 0.5);
      let j = Math.floor(x / d - 0.5);
      self.switchCell(i, j);
    } else if (self.getLocation(x, y) === 'controller') {
      self.refresh();
    }
  }
  switchCell(i, j) {
    this.grid[i][j] = (this.grid[i][j] === FILLED) ? EMPTY : FILLED;
    this.rowHints[i] = this.calculateHints('row', i);
    this.colHints[j] = this.calculateHints('col', j);
    this.print();
    this.canvas.dispatchEvent(this.hintChange);
  }
  refresh() {
    for (let i = 0; i < this.m; i++) {
      for (let j = 0; j < this.n; j++) {
        this.grid[i][j] = (Math.random() < this.threshold) ? FILLED : EMPTY;
      }
    }
    for (let i = 0; i < this.m; i++) {
      this.rowHints[i] = this.calculateHints('row', i);
    }
    for (let j = 0; j < this.n; j++) {
      this.colHints[j] = this.calculateHints('col', j);
    }
    this.canvas.dispatchEvent(this.hintChange);
    this.print();
  }
  printController() {
    let ctx = this.canvas.getContext('2d');
    let w = this.canvas.width;
    let h = this.canvas.height;
    let controllerSize = Math.min(w, h) / 4;
    let filledColor = this.filledColor;

    ctx.fillStyle = this.emptyColor;
    ctx.fillRect(w * 2 / 3 - 1, h * 2 / 3 - 1, w / 3 + 1, h / 3 + 1);
    ctx.save();
    ctx.translate(w * 0.7, h * 0.7);
    ctx.drawImage(getCycle(), 0, 0);
    ctx.restore();

    function getCycle() {
      let cycle = document.createElement('canvas');
      let borderWidth = controllerSize / 10;
      cycle.width = controllerSize;
      cycle.height = controllerSize;

      let ctx = cycle.getContext('2d');
      ctx.translate(controllerSize / 2, controllerSize / 2);
      ctx.arc(0, 0, controllerSize / 2 - borderWidth / 2, Math.PI * 3 / 2, Math.PI * 5.1 / 4);
      ctx.lineWidth = borderWidth;
      ctx.strokeStyle = filledColor;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-(controllerSize / 2 + borderWidth) * Math.SQRT1_2, - (controllerSize / 2 + borderWidth) * Math.SQRT1_2);
      ctx.lineTo(-(controllerSize / 2 - borderWidth * 2) * Math.SQRT1_2, - (controllerSize / 2 - borderWidth * 2) * Math.SQRT1_2);
      ctx.lineTo(-(controllerSize / 2 - borderWidth * 2) * Math.SQRT1_2, - (controllerSize / 2 + borderWidth) * Math.SQRT1_2);
      ctx.closePath();
      ctx.fillStyle = filledColor;
      ctx.fill();

      return cycle;
    }
  }
}

class NonogramPlay extends Nonogram {
  constructor(rowHints, colHints, canvasId, width) {
    super();
    this.filledColor = '#0cf';
    this.rowHints = deepCopy(rowHints);
    this.colHints = deepCopy(colHints);
    this.m = rowHints.length;
    this.n = colHints.length;
    this.grid = new Array(this.m);
    for (let i = 0; i < this.m; i++) {
      this.grid[i] = new Array(this.n).fill(EMPTY);
    }
    for (let i = 0; i < this.m; i++) {
      this.rowHints[i].isCorrect = this.checkCorrectness('row', i) ? true : undefined;
    }
    for (let j = 0; j < this.n; j++) {
      this.colHints[j].isCorrect = this.checkCorrectness('col', j) ? true : undefined;
    }
    let canvas = document.getElementById(canvasId);
    if (!canvas || canvas.hasAttribute('occupied')) {
      return;
    }

    this.canvas = canvas;
    this.canvas.width = width || this.width;
    this.canvas.height = this.canvas.width * (this.m + 1) / (this.n + 1);
    this.canvas.nonogram = this;
    this.canvas.addEventListener('mousedown', this.mousedown);
    this.canvas.addEventListener('mousemove', this.mousemove);
    this.canvas.addEventListener('mouseup', this.brushUp);
    this.canvas.addEventListener('mouseleave', this.brushUp);

    this.meshed = true;
    this.brushMode = 'color';
    this.draw = {};
  }

  mousedown(e) {
    const self = this.nonogram;
    let x = e.clientX - this.getBoundingClientRect().left;
    let y = e.clientY - this.getBoundingClientRect().top;
    let d = this.width * 2 / 3 / (self.n + 1);
    if (self.getLocation(x, y) === 'controller') {
      self.switchBrushMode();
    } else if (self.getLocation(x, y) === 'grid') {
      self.draw.firstI = Math.floor(y / d - 0.5);
      self.draw.firstJ = Math.floor(x / d - 0.5);
      let cell = self.grid[self.draw.firstI][self.draw.firstJ];
      if (self.brushMode === 'color' && cell !== VOID) {
        self.draw.mode = (cell === FILLED) ? 'empty' : 'fill';
        self.isPressed = true;
        self.switchCell(self.draw.firstI, self.draw.firstJ);
      } else if (self.brushMode === 'void' && cell !== FILLED) {
        self.draw.mode = (cell === VOID) ? 'empty' : 'fill';
        self.isPressed = true;
        self.switchCell(self.draw.firstI, self.draw.firstJ);
      }
      self.draw.lastI = self.draw.firstI;
      self.draw.lastJ = self.draw.firstJ;
    }
  }
  mousemove(e) {
    let self = this.nonogram;
    if (self.isPressed) {
      let x = e.clientX - this.getBoundingClientRect().left;
      let y = e.clientY - this.getBoundingClientRect().top;
      let d = this.width * 2 / 3 / (self.n + 1);
      if (self.getLocation(x, y) === 'grid') {
        let i = Math.floor(y / d - 0.5);
        let j = Math.floor(x / d - 0.5);
        if (i != self.draw.lastI || j != self.draw.lastJ) {
          if (self.draw.direction === undefined) {
            if (i === self.draw.firstI) {
              self.draw.direction = 'row';
            } else if (j === self.draw.firstJ) {
              self.draw.direction = 'col';
            }
          } else if ((self.draw.direction === 'row' && i === self.draw.firstI)
            || (self.draw.direction === 'col' && j === self.draw.firstJ)) {
            self.switchCell(i, j);
            self.draw.lastI = i;
            self.draw.lastJ = j;
          }
        }
      }
    }
  }
  switchBrushMode() {
    this.brushMode = (this.brushMode === 'void') ? 'color' : 'void';
    this.printController();
  }
  brushUp() {
    let self = this.nonogram;
    self.isPressed = undefined;
    self.draw.direction = undefined;
    self.draw.mode = undefined;
  }
  switchCell(i, j) {
    if (this.brushMode === 'color' && this.grid[i][j] !== VOID) {
      this.grid[i][j] = (this.draw.mode === 'fill') ? FILLED : EMPTY;
      this.rowHints[i].isCorrect = eekwall(this.calculateHints('row', i), this.rowHints[i]) ? true : undefined;
      this.colHints[j].isCorrect = eekwall(this.calculateHints('col', j), this.colHints[j]) ? true : undefined;
      this.print();
      let finished = this.rowHints.every(singleRow => singleRow.isCorrect)
        && this.colHints.every(singleCol => singleCol.isCorrect);
      if (finished) {
        this.congratulate();
      }
    } else if (this.brushMode === 'void' && this.grid[i][j] !== FILLED) {
      this.grid[i][j] = (this.draw.mode === 'fill') ? VOID : EMPTY;
      this.print();
    }
  }

  printController() {
    let ctx = this.canvas.getContext('2d');
    let w = this.canvas.width;
    let h = this.canvas.height;
    let controllerSize = Math.min(w, h) / 4;
    let outerSize = controllerSize * 3 / 4;
    let offset = controllerSize / 4;
    let borderWidth = controllerSize / 20;
    let innerSize = outerSize - 2 * borderWidth;

    ctx.fillStyle = this.emptyColor;
    ctx.fillRect(w * 2 / 3 - 1, h * 2 / 3 - 1, w / 3 + 1, h / 3 + 1);
    ctx.save();
    ctx.translate(w * 0.7, h * 0.7);
    if (this.brushMode === 'color') {
      printVoidBrush.call(this);
      printColorBrush.call(this);
    } else if (this.brushMode === 'void') {
      printColorBrush.call(this);
      printVoidBrush.call(this);
    }
    ctx.restore();

    function printColorBrush() {
      ctx.save();
      ctx.translate(offset, 0);
      ctx.fillStyle = this.meshColor;
      ctx.fillRect(0, 0, outerSize, outerSize);
      ctx.fillStyle = this.filledColor;
      ctx.fillRect(borderWidth, borderWidth, innerSize, innerSize);
      ctx.restore();
    }

    function printVoidBrush() {
      ctx.save();
      ctx.translate(0, offset);
      ctx.fillStyle = this.meshColor;
      ctx.fillRect(0, 0, outerSize, outerSize);
      ctx.fillStyle = this.emptyColor;
      ctx.fillRect(borderWidth, borderWidth, innerSize, innerSize);
      ctx.strokeStyle = this.wrongColor;
      ctx.lineWidth = borderWidth;
      ctx.beginPath();
      ctx.moveTo(outerSize * 0.3, outerSize * 0.3);
      ctx.lineTo(outerSize * 0.7, outerSize * 0.7);
      ctx.moveTo(outerSize * 0.3, outerSize * 0.7);
      ctx.lineTo(outerSize * 0.7, outerSize * 0.3);
      ctx.stroke();
      ctx.restore();
    }
  }

  congratulate() {
    if (!this.canvas) {
      return;
    }

    this.canvas.removeEventListener('mousedown', this.mousedown);
    this.canvas.removeEventListener('mousemove', this.mousemove);
    this.canvas.removeEventListener('mouseup', this.brushUp);
    this.canvas.removeEventListener('mouseleave', this.brushUp);

    let ctx = this.canvas.getContext('2d');
    let w = this.canvas.width;
    let h = this.canvas.height;
    let controllerSize = Math.min(w, h) / 4;

    let background = ctx.getImageData(0, 0, w, h);
    let t = 0;
    let tick = getTick();

    fadeTickIn();

    function fadeTickIn() {
      ctx.save();
      ctx.putImageData(background, 0, 0);
      t += 0.03;
      ctx.globalAlpha = f(t);
      ctx.fillStyle = '#fff';
      ctx.fillRect(w * 2 / 3, h * 2 / 3, w / 3, h / 3);
      ctx.drawImage(tick,
        w * 0.7 - (1 - f(t)) * controllerSize / 2,
        h * 0.7 - (1 - f(t)) * controllerSize / 2,
        (2 - f(t)) * controllerSize,
        (2 - f(t)) * controllerSize);
      if (t <= 1) {
        requestAnimationFrame(fadeTickIn);
      }
      ctx.restore();
    }

    function getTick() {
      let size = controllerSize * 2;
      let borderWidth = size / 10;
      let tick = document.createElement('canvas');
      tick.width = size;
      tick.height = size;

      let ctx = tick.getContext('2d');
      ctx.translate(size / 3, size * 5 / 6);
      ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = '#0c6';
      ctx.fillRect(0, 0, borderWidth, -size * Math.SQRT2 / 3);
      ctx.fillRect(0, 0, size * Math.SQRT2 * 2 / 3, -borderWidth);

      return tick;
    }

    function f(t) {
      return 1 + Math.pow(t - 1, 3);
    }
  }
}

export {NonogramAuto, NonogramEdit, NonogramPlay};