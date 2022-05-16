// ==UserScript==
// @name         Neko's Scripts
// @namespace    http://tampermonkey.net/
// @version      0.9.1.1
// @description  Scripts for opm
// @author       Neko
// @match        https://ourworldofpixels.com/*
// @exclude      https://ourworldofpixels.com/api/*
// @run-at       document-end
// @icon         https://www.google.com/s2/favicons?sz=64&domain=ourworldofpixels.com
// @grant        none
// ==/UserScript==

'use strict';
/*global OWOP*/

function install() {
  "use strict";
  console.time("Neko");
  console.log("Loading Neko's Scripts.");

  class Point {
    constructor(x, y) {
      this.x = x;
      this.y = y;
    }
    static distance(p1, p2) {
      if (p1 instanceof Point && p2 instanceof Point) return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
    }
  }

  class Color {
    constructor(c) {
      this.c = c;
    }
    static compare(c1, c2) {
      return (c1.c[0] == c2.c[0] && c1.c[1] == c2.c[1] && c1.c[2] == c2.c[2]);
    }
  }

  class Pixel extends Point {
    constructor(x, y, c, o = false) {
      super(x, y);
      this.c = new Color(c);
      this.o = o;
    }
    static compare(p1, p2) {
      return (p1.x == p2.x && p1.y == p2.y) && Color.compare(p1.c, p2.c);
    }
  }

  class PixelManager {
    constructor() {
      this.queue = {};
      this.on = true;
      this.extra = {};
      this.extra.placeData = [];
      let p1 = new Point(0, 0);
      for (let y = -47; y < 47; y++) {
        for (let x = -47; x < 47; x++) {
          let p2 = new Point(x, y);
          let d = Point.distance(p1, p2);
          // if (d >= 32) continue;
          this.extra.placeData.push([d, p2]);
        }
      }
      this.extra.placeData.sort((a, b) => {
        return a[0] - b[0];
      });
      setInterval(() => {
        if (this.on) this.placePixel();
      }, 20);
    }
    enable() {
      this.on = true;
    }
    disable() {
      this.on = false;
    }
    clearQueue() {
      this.queue = {};
    }
    unsetPixel(x, y) {
      let p = new Point(x, y);
      this.deletePixels(p);
      return true;
    }
    deletePixels() {
      for (let i = 0; i < arguments.length; i++) {
        if (Array.isArray(arguments[i])) this.deletePixels(arguments[i]);
        else if (arguments[i] instanceof Point) delete this.queue[`${arguments[i].x},${arguments[i].y}`];
      }
    }
    setPixel(x, y, c, placeOnce = false) { // make checks for all variables coming in to make sure nothing is incorrectly set and c 4th element is either undefined or 255 otherwise drop the set
      if (!Number.isInteger(x) || !Number.isInteger(y)) return false;
      if (!Array.isArray(c) || c.length < 3 || c.length > 4) return false;
      if (c.length == 4) c.pop();
      if (c.find(e => !Number.isInteger(e) || e < 0 || e > 255) !== undefined) return false;
      let p = new Pixel(x, y, c);
      if (placeOnce) p.o = true;
      this.addPixels(p);
      return true;
    }
    getPixel(x, y) {
      // if (!Object.keys(OWOP.world).includes("_getPixel")) return undefined;
      try {
        OWOP.world.getPixel;
      } catch (e) {
        return undefined;
      }
      return OWOP.world.getPixel(x, y);
    }
    addPixels() {
      for (let i = 0; i < arguments.length; i++) {
        if (Array.isArray(arguments[i])) this.addPixels(arguments[i]);
        else if (arguments[i] instanceof Pixel) this.queue[`${arguments[i].x},${arguments[i].y}`] = arguments[i];
      }
    }
    placePixel() {
      for (let i = 0; i < this.extra.placeData.length; i++) {
        let e = this.extra.placeData[i][1];
        let tX = OWOP.mouse.tileX;
        let tY = OWOP.mouse.tileY;
        let pixel = this.queue[`${tX + e.x},${tY + e.y}`];
        if (!pixel) continue;
        let xchunk = Math.floor(pixel.x / 16);
        let ychunk = Math.floor(pixel.y / 16);
        if (OWOP.OPM && !OWOP.misc._world) continue;
        if (OWOP.OPM && OWOP.misc._world.protectedChunks[`${xchunk},${ychunk}`] && (this.deletePixels(pixel), true)) continue;
        let xcc = Math.floor(tX / 16) * 16;
        let ycc = Math.floor(tY / 16) * 16;
        if (pixel.x < (xcc - 31) || pixel.y < (ycc - 31) || pixel.x > (xcc + 46) || pixel.y > (ycc + 46)) continue;
        let color = this.getPixel(pixel.x, pixel.y);
        if (!color) continue;
        let c = new Color(color);
        if (!Color.compare(pixel.c, c)) return OWOP.world.setPixel(pixel.x, pixel.y, pixel.c.c);
        else if (pixel.o && this.deletePixels(pixel)) continue;
      }
    }
  }

  const PM = new PixelManager();

  if (window) window.PM = PM;

  const modulo = (i, m) => {
    return i - m * Math.floor(i / m);
  }

  const line = (x1, y1, x2, y2, m, e, plot) => {
    if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) return console.error();
    var dx = Math.abs(x2 - x1), sx = x1 < x2 ? 1 : -1;
    var dy = -Math.abs(y2 - y1), sy = y1 < y2 ? 1 : -1;
    var err = dx + dy, e2;

    if (e && e.type == "mousemove") {
      if (x1 == x2 && y1 == y2) return;
      e2 = 2 * err;
      if (e2 >= dy) { err += dy; x1 += sx; }
      if (e2 <= dx) { err += dx; y1 += sy; }
    }
    var i = 0;
    while (true) {
      plot(x1, y1, i);
      i++;
      if (x1 == x2 && y1 == y2) break;
      e2 = 2 * err;
      if (e2 >= dy) { err += dy; x1 += sx; }
      if (e2 <= dx) { err += dx; y1 += sy; }
    }
  }
  OWOP.OPM = false;
  if (OWOP.misc) OWOP.OPM = true;
  if (!OWOP.OPM) OWOP.tool = OWOP.tools;

  (function () {
    var camera = OWOP.camera;
    var renderer = OWOP.renderer;
    var GUIWindow = OWOP.windowSys.class.window;
    const mkHTML = OWOP.util.mkHTML;
    var drawText = (t, e, n, r, o) => {
      t.strokeStyle = "#000000";
      t.fillStyle = "#FFFFFF";
      t.lineWidth = 2.5;
      t.globalAlpha = 0.5;
      o && (n -= t.measureText(e).width >> 1);
      t.strokeText(e, n, r);
      t.globalAlpha = 1;
      t.fillText(e, n, r);
    };
    var setColor = (cursor, color) => {
      if (!color) return;
      if (cursor === 1) {
        OWOP.player.selectedColor = color;
      } else if (cursor === 2) {
        OWOP.player.rightSelectedColor = color;
        localStorage.setItem("rSC", JSON.stringify(OWOP.player.rightSelectedColor));
      }
    };
    // var C = OWOP.require('util/color').colorUtils;

    if (!localStorage["rSC"]) localStorage.setItem("rSC", JSON.stringify([255, 255, 255]));
    OWOP.player.rightSelectedColor = JSON.parse(localStorage.getItem("rSC"));

    OWOP.tool.addToolObject(new OWOP.tool.class('Cursor', OWOP.cursors.cursor, OWOP.fx.player.RECT_SELECT_ALIGNED(1), OWOP.RANK.USER, tool => {
      // render protected chunks
      // tool.setFxRenderer((fx, ctx, time) => {
      //   return;
      //   if (!fx.extra.isLocalPlayer) return 1;
      //   var x = fx.extra.player.x;
      //   var y = fx.extra.player.y;
      //   var fxx = (Math.floor(x / 16) - camera.x) * camera.zoom;
      //   var fxy = (Math.floor(y / 16) - camera.y) * camera.zoom;
      //   var oldlinew = ctx.lineWidth;
      //   ctx.lineWidth = 1;
      //   if (tool.extra.end) {
      //     var s = tool.extra.start;
      //     var e = tool.extra.end;
      //     var x = (s[0] - camera.x) * camera.zoom + 0.5;
      //     var y = (s[1] - camera.y) * camera.zoom + 0.5;
      //     var w = e[0] - s[0];
      //     var h = e[1] - s[1];
      //     ctx.beginPath();
      //     ctx.rect(x, y, w * camera.zoom, h * camera.zoom);
      //     ctx.globalAlpha = 1;
      //     ctx.strokeStyle = "#FFFFFF";
      //     ctx.stroke();
      //     ctx.setLineDash([3, 4]);
      //     ctx.strokeStyle = "#000000";
      //     ctx.stroke();
      //     ctx.globalAlpha = 0.25 + Math.sin(time / 500) / 4;
      //     ctx.fillStyle = renderer.patterns.unloaded;
      //     ctx.fill();
      //     ctx.setLineDash([]);
      //     var oldfont = ctx.font;
      //     ctx.font = "16px sans-serif";
      //     var txt = `${!tool.extra.clicking ? "Right click to screenshot " : ""}(${Math.abs(w)}x${Math.abs(h)})`;
      //     var txtx = window.innerWidth >> 1;
      //     var txty = window.innerHeight >> 1;
      //     txtx = Math.max(x, Math.min(txtx, x + w * camera.zoom));
      //     txty = Math.max(y, Math.min(txty, y + h * camera.zoom));

      //     drawText(ctx, txt, txtx, txty, true);
      //     ctx.font = oldfont;
      //     ctx.lineWidth = oldlinew;
      //     return 0;
      //   } else {
      //     ctx.beginPath();
      //     ctx.moveTo(0, fxy + 0.5);
      //     ctx.lineTo(window.innerWidth, fxy + 0.5);
      //     ctx.moveTo(fxx + 0.5, 0);
      //     ctx.lineTo(fxx + 0.5, window.innerHeight);

      //     //ctx.lineWidth = 1;
      //     ctx.globalAlpha = 1;
      //     ctx.strokeStyle = "#FFFFFF";
      //     ctx.stroke();
      //     ctx.setLineDash([3]);
      //     ctx.strokeStyle = "#000000";
      //     ctx.stroke();

      //     ctx.setLineDash([]);
      //     ctx.lineWidth = oldlinew;
      //     return 1;
      //   }
      // });
      // cursor functionality
      tool.extra.lastX;
      tool.extra.lastY;
      tool.setEvent('mousedown mousemove', (mouse, event) => {
        if (mouse.buttons !== 2 && mouse.buttons !== 1) return 3;
        if (tool.extra.lastX == mouse.tileX && tool.extra.lastY == mouse.tileY) return 3;
        if (event && event.ctrlKey) return setColor(mouse.buttons, PM.getPixel(mouse.tileX, mouse.tileY));
        let c = mouse.buttons === 1 ? OWOP.player.selectedColor : OWOP.player.rightSelectedColor;
        if (isNaN(tool.extra.lastX) || isNaN(tool.extra.lastY)) {
          tool.extra.lastX = mouse.tileX;
          tool.extra.lastY = mouse.tileY;
        }
        line(tool.extra.lastX, tool.extra.lastY, mouse.tileX, mouse.tileY, undefined, event, (x, y) => PM.setPixel(x, y, c));
        tool.extra.lastX = mouse.tileX;
        tool.extra.lastY = mouse.tileY;
        return 3;
      });
      tool.setEvent('mouseup', () => {
        tool.extra.lastX = undefined;
        tool.extra.lastY = undefined;
      });
      // palette switcher
      tool.setEvent('select', () => {
        if (OWOP.windowSys.windows["Palette Saver"]) return;
        let options = {
          closeable: true,
          moveable: true
        }

        let paletteJson = {}

        function windowFunc(wdw) {
          var divwindow = document.createElement("div");
          divwindow.style = "width: 300px; overflow-y: scroll; overflow-x: scroll; max-height: 165px;"
          divwindow.innerHTML = `<input id="pName" type="text" style="max-width: 100px; border: 0px;" placeholder="Name"></input>
            <button id="addPalette" >Save Current Palette</button> <table id="paletteTable" style="overflow-x: hidden; overflow-y: scroll;"></table>`;
          wdw.addObj(divwindow);
        }

        var windowClass = new OWOP.windowSys.class.window("Palette Saver", options, windowFunc);
        OWOP.windowSys.addWindow(windowClass).move(window.innerHeight / 3, window.innerWidth / 3);

        var pName = document.getElementById("pName");

        pName.oninput = () => {
          if (pName.value.length > 25) pName.style.backgroundColor = "rgb(255 148 129)";
          else pName.style.backgroundColor = "rgb(255, 255, 255)";
        }

        document.getElementById("addPalette").onclick = () => {

          if (pName.value.length > 25) return alert("Your max name length is 25 characters.");
          if (pName.value.length == 0) return alert("Invalid Name");

          if (!localStorage.getItem("paletteJson")) {
            paletteJson[pName.value] = OWOP.player.palette;
            localStorage.setItem("paletteJson", JSON.stringify(paletteJson));
          } else {
            paletteJson = JSON.parse(localStorage.getItem("paletteJson"));
            if (paletteJson[pName.value]) {
              pName.value = "";
              return alert("You already have a palette with this name.");
            }
            paletteJson[pName.value] = OWOP.player.palette;
            localStorage.setItem("paletteJson", JSON.stringify(paletteJson));
          }

          var divPalette = document.createElement("tr");
          let pN = pName.value;
          divPalette.id = `im-busy${pN}`;
          divPalette.innerHTML = `<td id="palette-${pN}" style="cursor: pointer; padding: 5px; border: 1px solid white; border-radius: 5px; color: white;">${pN}</td> <td id="useT1-${pN}"><button id="useB1-${pN}">Use</button></td> <td id="useT2-${pN}"><button id="useB2-${pN}">Replace</button></td> <td id="useT3-${pN}"><button id="useB3-${pN}">Delete</button></td>`;
          document.getElementById("paletteTable").appendChild(divPalette);
          document.getElementById(`useB1-${pN}`).onclick = () => {
            let paletteJson = JSON.parse(localStorage.getItem("paletteJson"));
            OWOP.player.palette.splice(0);
            OWOP.player.palette.push(...paletteJson[pN]);
            OWOP.player.paletteIndex = OWOP.player.paletteIndex;
          }
          document.getElementById(`useB2-${pN}`).onclick = () => {
            if (!confirm(`Are you sure you want to REPLACE the palette ${pN}?`)) return;
            let paletteJson = JSON.parse(localStorage.getItem("paletteJson"));
            paletteJson[`${pN}`] = OWOP.player.palette;
            localStorage.setItem('paletteJson', JSON.stringify(paletteJson));
          }
          document.getElementById(`useB3-${pN}`).onclick = () => {
            if (!confirm(`Are you sure you want to DELETE the palette ${pN}?`)) return;
            let paletteJson = JSON.parse(localStorage.getItem("paletteJson"));
            document.getElementById(`palette-${pN}`).outerHTML = '';
            document.getElementById(`im-busy${pN}`).outerHTML = '';
            delete paletteJson[pN];
            localStorage.setItem('paletteJson', JSON.stringify(paletteJson));
          }

          pName.style.backgroundColor = "rgb(255 255 255)";

          pName.value = "";
        }

        if (localStorage.getItem("paletteJson")) {

          var gettedJson = JSON.parse(localStorage.getItem("paletteJson"));
          var obj = Object.keys(gettedJson);
          for (var i = 0; i < obj.length; i++) {
            let pN = obj[i];
            var divPalette = document.createElement("tr");
            divPalette.id = `im-busy${pN}`;
            divPalette.innerHTML = `<td id="palette-${pN}" style="cursor: pointer; padding: 5px; border: 1px solid white; border-radius: 5px; color: white;">${pN}</td> <td id="useT1-${pN}"><button id="useB1-${pN}">Use</button></td> <td id="useT2-${pN}"><button id="useB2-${pN}">Replace</button></td> <td id="useT3-${pN}"><button id="useB3-${pN}">Delete</button></td>`;
            document.getElementById("paletteTable").appendChild(divPalette);
            document.getElementById(`useB1-${pN}`).onclick = () => {
              let paletteJson = JSON.parse(localStorage.getItem("paletteJson"));
              OWOP.player.palette.splice(0);
              OWOP.player.palette.push(...paletteJson[`${pN}`]);
              OWOP.player.paletteIndex = OWOP.player.paletteIndex;
            }
            document.getElementById(`useB2-${pN}`).onclick = () => {
              if (!confirm(`Are you sure you want to REPLACE the palette ${pN}?`)) return;
              let paletteJson = JSON.parse(localStorage.getItem("paletteJson"));
              paletteJson[`${pN}`] = OWOP.player.palette;
              localStorage.setItem('paletteJson', JSON.stringify(paletteJson));
            }
            document.getElementById(`useB3-${pN}`).onclick = () => {
              if (!confirm(`Are you sure you want to DELETE the palette ${pN}?`)) return;
              let paletteJson = JSON.parse(localStorage.getItem("paletteJson"));
              document.getElementById(`palette-${pN}`).outerHTML = '';
              document.getElementById(`im-busy${pN}`).outerHTML = '';
              delete paletteJson[pN];
              localStorage.setItem('paletteJson', JSON.stringify(paletteJson));
            }
          }
        }
      });
      tool.setEvent('deselect', () => {
        tool.extra.lastX = undefined;
        tool.extra.lastY = undefined;
        // this is annoying when switching tools
        // if (OWOP.windowSys.windows["Palette Saver"]) OWOP.windowSys.windows["Palette Saver"].close();
      });
      // change color positions
      tool.setEvent('keydown', event => {
        if (event["87"] && event["83"]) return;
        if (event["87"]) { // w
          let i1 = OWOP.player.paletteIndex;
          let i2 = modulo(i1 - 1, OWOP.player.palette.length);
          if (i2 == OWOP.player.palette.length - 1) {
            OWOP.player.palette.push(OWOP.player.palette.shift());
          } else {
            [OWOP.player.palette[i1], OWOP.player.palette[i2]] = [OWOP.player.palette[i2], OWOP.player.palette[i1]];
          }
          OWOP.player.paletteIndex = i2;
        }
        if (event["83"]) { // s
          let i1 = OWOP.player.paletteIndex;
          let i2 = modulo(i1 + 1, OWOP.player.palette.length);
          if (i2 === 0) {
            OWOP.player.palette.unshift(OWOP.player.palette.pop());
          } else {
            [OWOP.player.palette[i1], OWOP.player.palette[i2]] = [OWOP.player.palette[i2], OWOP.player.palette[i1]];
          }
          OWOP.player.paletteIndex = i2;
        }
      });
    }));
    OWOP.tool.addToolObject(new OWOP.tool.class('Pipette', OWOP.cursors.pipette, OWOP.fx.player.NONE, OWOP.RANK.NONE, tool => {
      tool.setEvent('mousedown mousemove', mouse => {
        var c = PM.getPixel(mouse.tileX, mouse.tileY);
        if (!c) return mouse.buttons;
        switch (mouse.buttons) {
          case 1:
            OWOP.player.selectedColor = c;
            break;
          case 2:
            OWOP.player.rightSelectedColor = c;
            localStorage.setItem("rSC", JSON.stringify(OWOP.player.rightSelectedColor));
            break;
        }
        return mouse.buttons;
      });
    }));
    OWOP.tool.addToolObject(new OWOP.tool.class('Export', OWOP.cursors.select, OWOP.fx.player.NONE, OWOP.RANK.NONE, tool => {
      tool.setFxRenderer((fx, ctx, time) => {
        if (!fx.extra.isLocalPlayer) return 1;
        var x = fx.extra.player.x;
        var y = fx.extra.player.y;
        var fxx = (Math.floor(x / 16) - camera.x) * camera.zoom;
        var fxy = (Math.floor(y / 16) - camera.y) * camera.zoom;
        var oldlinew = ctx.lineWidth;
        ctx.lineWidth = 1;
        if (tool.extra.end) {
          var s = tool.extra.start;
          var e = tool.extra.end;
          var x = (s[0] - camera.x) * camera.zoom + 0.5;
          var y = (s[1] - camera.y) * camera.zoom + 0.5;
          var w = e[0] - s[0];
          var h = e[1] - s[1];
          ctx.beginPath();
          ctx.rect(x, y, w * camera.zoom, h * camera.zoom);
          ctx.globalAlpha = 1;
          ctx.strokeStyle = "#FFFFFF";
          ctx.stroke();
          ctx.setLineDash([3, 4]);
          ctx.strokeStyle = "#000000";
          ctx.stroke();
          ctx.globalAlpha = 0.25 + Math.sin(time / 500) / 4;
          ctx.fillStyle = renderer.patterns.unloaded;
          ctx.fill();
          ctx.setLineDash([]);
          var oldfont = ctx.font;
          ctx.font = "16px sans-serif";
          var txt = `${!tool.extra.clicking ? "Right click to screenshot " : ""}(${Math.abs(w)}x${Math.abs(h)})`;
          var txtx = window.innerWidth >> 1;
          var txty = window.innerHeight >> 1;
          txtx = Math.max(x, Math.min(txtx, x + w * camera.zoom));
          txty = Math.max(y, Math.min(txty, y + h * camera.zoom));

          drawText(ctx, txt, txtx, txty, true);
          ctx.font = oldfont;
          ctx.lineWidth = oldlinew;
          return 0;
        } else {
          ctx.beginPath();
          ctx.moveTo(0, fxy + 0.5);
          ctx.lineTo(window.innerWidth, fxy + 0.5);
          ctx.moveTo(fxx + 0.5, 0);
          ctx.lineTo(fxx + 0.5, window.innerHeight);

          //ctx.lineWidth = 1;
          ctx.globalAlpha = 1;
          ctx.strokeStyle = "#FFFFFF";
          ctx.stroke();
          ctx.setLineDash([3]);
          ctx.strokeStyle = "#000000";
          ctx.stroke();

          ctx.setLineDash([]);
          ctx.lineWidth = oldlinew;
          return 1;
        }
      });

      tool.extra.start = undefined;
      tool.extra.end = undefined;
      tool.extra.clicking = false;

      tool.setEvent('mousedown', (mouse, event) => {
        var s = tool.extra.start;
        var e = tool.extra.end;
        const isInside = () => mouse.tileX >= s[0] && mouse.tileX < e[0] && mouse.tileY >= s[1] && mouse.tileY < e[1];
        if (mouse.buttons === 1 && !tool.extra.end) {
          tool.extra.start = [mouse.tileX, mouse.tileY];
          tool.extra.clicking = true;
          tool.setEvent('mousemove', (mouse, event) => {
            if (tool.extra.start && mouse.buttons === 1) {
              tool.extra.end = [mouse.tileX, mouse.tileY];
              return 1;
            }
          });
          const finish = () => {
            tool.setEvent('mousemove mouseup deselect', null);
            tool.extra.clicking = false;
            var s = tool.extra.start;
            var e = tool.extra.end;
            if (e) {
              if (s[0] === e[0] || s[1] === e[1]) {
                tool.extra.start = undefined;
                tool.extra.end = undefined;
              }
              if (s[0] > e[0]) {
                var tmp = e[0];
                e[0] = s[0];
                s[0] = tmp;
              }
              if (s[1] > e[1]) {
                var tmp = e[1];
                e[1] = s[1];
                s[1] = tmp;
              }
            }
            renderer.render(renderer.rendertype.FX);
          }
          tool.setEvent('deselect', finish);
          tool.setEvent('mouseup', (mouse, event) => {
            if (!(mouse.buttons & 1)) {
              finish();
            }
          });
        } else if (mouse.buttons === 1 && tool.extra.end) {
          if (isInside()) {
            var offx = mouse.tileX;
            var offy = mouse.tileY;
            tool.setEvent('mousemove', (mouse, event) => {
              var dx = mouse.tileX - offx;
              var dy = mouse.tileY - offy;
              tool.extra.start = [s[0] + dx, s[1] + dy];
              tool.extra.end = [e[0] + dx, e[1] + dy];
            });
            const end = () => {
              tool.setEvent('mouseup deselect mousemove', null);
            }
            tool.setEvent('deselect', end);
            tool.setEvent('mouseup', (mouse, event) => {
              if (!(mouse.buttons & 1)) {
                end();
              }
            });
          } else {
            tool.extra.start = undefined;
            tool.extra.end = undefined;
          }
        } else if (mouse.buttons === 2 && tool.extra.end && isInside()) {
          tool.extra.start = undefined;
          tool.extra.end = undefined;
          ((x, y, w, h, onblob) => {
            var c = document.createElement('canvas');
            c.width = w;
            c.height = h;
            var ctx = c.getContext('2d');
            var d = ctx.createImageData(w, h);
            for (var i = y; i < y + h; i++) {
              for (var j = x; j < x + w; j++) {
                let pix;
                let tempPix = PM.queue[`${j},${i}`];
                if (!tempPix) {
                  if ((pix = PM.getPixel(j, i), !pix)) {
                    console.warn("Well something happened, you probably tried getting an area outside of loaded chunks.");
                    pix = [255, 255, 255];
                  }
                } else {
                  pix = tempPix.c.c;
                }
                d.data[4 * ((i - y) * w + (j - x))] = pix[0];
                d.data[4 * ((i - y) * w + (j - x)) + 1] = pix[1];
                d.data[4 * ((i - y) * w + (j - x)) + 2] = pix[2];
                d.data[4 * ((i - y) * w + (j - x)) + 3] = 255;
              }
            }
            ctx.putImageData(d, 0, 0);
            c.toBlob(onblob);
          })(s[0], s[1], e[0] - s[0], e[1] - s[1], b => {
            var url = URL.createObjectURL(b);
            var img = new Image();
            img.onload = () => {
              OWOP.windowSys.addWindow(new GUIWindow("Resulting image", {
                centerOnce: true,
                closeable: true
              }, win => {
                var props = ['width', 'height'];
                if (img.width > img.height) {
                  props.reverse();
                }
                var r = img[props[0]] / img[props[1]];
                var shownSize = img[props[1]] >= 128 ? 256 : 128;
                img[props[0]] = r * shownSize;
                img[props[1]] = shownSize;
                //win.container.classList.add('centeredChilds');
                //setTooltip(img, "Right click to copy/save!");
                var p1 = document.createElement("p");
                img.style = "display:block; margin-left: auto; margin-right: auto; padding-bottom:15px;";
                p1.appendChild(img);
                //p1.appendChild(document.createElement("br"));
                var closeButton = mkHTML("button", {
                  innerHTML: "CLOSE",
                  style: "width: 100%; height: 30px; margin: auto; padding-left: 10%;",
                  onclick: () => {
                    img.remove();
                    URL.revokeObjectURL(url);
                    win.getWindow().close();
                  }
                });
                var saveButton = mkHTML("button", {
                  innerHTML: "SAVE",
                  style: "width: 100%; height: 30px; margin: auto; padding-left: 10%;"
                });
                saveButton.onclick = () => {
                  var a = document.createElement('a');
                  a.download = `${Base64.fromNumber(Date.now())} OWOP_${OWOP.world.name} at ${s[0]} ${s[1]}.png`;
                  a.href = img.src;
                  a.click();
                }
                var scalar = document.createElement("input");
                scalar.id = "scalar";
                scalar.type = "range";
                scalar.style = "width: 100%; margin: auto;";
                scalar.value = "1";
                scalar.min = "1";
                scalar.max = "10";
                //<p id="scalar-num" style="margin: auto;top: -8px; right: 12px; user-select: none; color: white;">1</p>
                scalar.oninput = () => {
                  // scalarNum.textContent = scalar.value;
                }
                p1.appendChild(saveButton);
                p1.appendChild(closeButton);
                p1.appendChild(scalar);
                var image = win.addObj(p1);
              }));
            }
            img.src = url;
          });
        }
      });
    }));
    // i hate this i hate this i hate this, but it works... and its the best looking one... i couldnt get any other variants i programmed of this to work at all.
    OWOP.tool.addToolObject(new OWOP.tool.class('Fill', OWOP.cursors.fill, OWOP.fx.player.NONE, OWOP.RANK.USER, tool => {
      tool.extra.usedQueue = {};
      tool.extra.queue = {};
      tool.extra.fillingColor = undefined;

      const isSame = (a, b) => a && b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
      const isFillColor = (x, y) => isSame(PM.getPixel(x, y), tool.extra.fillingColor) && (!tool.extra.usedQueue[`${x},${y}`]) && (tool.extra.queue[`${x},${y}`] = { x: x, y: y }, true);

      function tick() {
        var selClr = OWOP.player.selectedColor;
        for (var current in tool.extra.queue) {
          current = tool.extra.queue[current];
          var x = current.x;
          var y = current.y;
          var thisClr = PM.getPixel(x, y);
          if (isSame(thisClr, tool.extra.fillingColor) && !isSame(thisClr, selClr)) {
            PM.setPixel(x, y, selClr);

            var t = isFillColor(x, y - 1);
            var b = isFillColor(x, y + 1);
            var l = isFillColor(x - 1, y);
            var r = isFillColor(x + 1, y);

            t && l && isFillColor(x - 1, y - 1);
            t && r && isFillColor(x + 1, y - 1);
            b && l && isFillColor(x - 1, y + 1);
            b && r && isFillColor(x + 1, y + 1);
          }
          delete tool.extra.queue[`${x},${y}`];
          tool.extra.usedQueue[`${x},${y}`] = true;
        }
      }
      tool.setFxRenderer((fx, ctx, time) => {
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = fx.extra.player.htmlRgb;
        var z = OWOP.camera.zoom;
        if (!tool.extra.fillingColor || !fx.extra.isLocalPlayer) return OWOP.fx.player.RECT_SELECT_ALIGNED(1)(fx, ctx, time);
        ctx.beginPath();
        for (var current in tool.extra.queue) {
          current = tool.extra.queue[current];
          ctx.rect((current.x - OWOP.camera.x) * z, (current.y - OWOP.camera.y) * z, z, z);
        }
        ctx.stroke();
      });
      tool.setEvent("mousedown", mouse => 4 & mouse.buttons || (tool.extra.fillingColor = PM.getPixel(mouse.tileX, mouse.tileY)) && (tool.extra.queue[`${mouse.tileX},${mouse.tileY}`] = { x: mouse.tileX, y: mouse.tileY }, tool.setEvent("tick", tick)));
      tool.setEvent("mouseup deselect", mouse => mouse && 1 & mouse.buttons || (tool.extra.fillingColor = undefined, tool.extra.queue = {}, tool.extra.usedQueue = {}, tool.setEvent("tick", null)));
    }));
    OWOP.tool.addToolObject(new OWOP.tool.class('Line', OWOP.cursors.wand, OWOP.fx.player.NONE, OWOP.RANK.USER, tool => {
      var start = undefined;
      var end = undefined;
      var queue = [];
      var defaultFx = OWOP.fx.player.RECT_SELECT_ALIGNED(1);
      tool.setFxRenderer((fx, ctx, time) => {
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = fx.extra.player.htmlRgb;
        if (!start || !end || !fx.extra.isLocalPlayer) {
          defaultFx(fx, ctx, time);
        } else {
          ctx.beginPath();
          line(start[0], start[1], end[0], end[1], undefined, undefined, (x, y) => {
            ctx.rect((x - camera.x) * camera.zoom, (y - camera.y) * camera.zoom, camera.zoom, camera.zoom);
          });
          ctx.stroke();
        }
      });
      tool.setEvent('mousedown', mouse => {
        if (!(mouse.buttons & 0b100)) {
          queue = [];
          start = [mouse.tileX, mouse.tileY];
          end = [mouse.tileX, mouse.tileY];
        }
      });
      tool.setEvent('mousemove', mouse => {
        if (start) end = [mouse.tileX, mouse.tileY];
      });
      tool.setEvent('mouseup', mouse => {
        if (!(mouse.buttons & 0b11) && !queue.length) {
          end = [mouse.tileX, mouse.tileY];
          if (!start) {
            end = undefined;
            return;
          }
          line(start[0], start[1], end[0], end[1], undefined, undefined, (x, y) => {
            PM.setPixel(x, y, OWOP.player.selectedColor);
          });
          start = undefined;
          end = undefined;
        }
      });
      tool.setEvent('deselect', mouse => {
        start = undefined;
        end = undefined;
      });
    }));
    OWOP.tool.addToolObject(new OWOP.tool.class('Neko Eraser', OWOP.cursors.erase, OWOP.fx.player.RECT_SELECT_ALIGNED(16), OWOP.RANK.USER, tool => {
      tool.setEvent('mousedown mousemove', mouse => {
        if (mouse.buttons !== 2 && mouse.buttons !== 1) return 3;
        let c = mouse.buttons === 1 ? OWOP.player.selectedColor : OWOP.player.rightSelectedColor;
        for (let y = 0; y < 16; y++) {
          for (let x = 0; x < 16; x++) {
            let xchunk = Math.floor(OWOP.mouse.tileX / 16) * 16; // top left corner of the chunk not the chunk number
            let ychunk = Math.floor(OWOP.mouse.tileY / 16) * 16;
            PM.setPixel(xchunk + x, ychunk + y, c);
          }
        }
        return 3;
      });
    }));
    OWOP.tool.addToolObject(new OWOP.tool.class('Neko Foreign Pixel Replacer', OWOP.cursors.erase, OWOP.fx.player.RECT_SELECT_ALIGNED(16), OWOP.RANK.USER, tool => {
      tool.setEvent('mousedown mousemove', mouse => {
        if (mouse.buttons !== 2 && mouse.buttons !== 1) return 3;
        let replacer = new Color(mouse.buttons === 1 ? OWOP.player.selectedColor : OWOP.player.rightSelectedColor);
        for (let y = 0; y < 16; y++) {
          for (let x = 0; x < 16; x++) {
            let xchunk = Math.floor(OWOP.mouse.tileX / 16) * 16; // top left corner of the chunk not the chunk number
            let ychunk = Math.floor(OWOP.mouse.tileY / 16) * 16;
            let a;
            if ((a = new Color(PM.getPixel(xchunk + x, ychunk + y)), !a.c)) continue;
            let test = true;
            for (let p = 0; p < OWOP.player.palette.length; p++) {
              let c = new Color(OWOP.player.palette[p]);
              if (Color.compare(a, c)) {
                test = false;
                break;
              }
            }
            if ((mouse.buttons == 2) && Color.compare(a, replacer)) test = false;
            if (test) PM.setPixel(xchunk + x, ychunk + y, replacer.c);
          }
        }
        return 3;
      });
    }));
    OWOP.tool.addToolObject(new OWOP.tool.class('Pixel Perfect', OWOP.cursors.cursor, OWOP.fx.player.RECT_SELECT_ALIGNED(1), OWOP.RANK.USER, tool => {
      // cursor functionality
      tool.extra.lastX;
      tool.extra.lastY;
      tool.extra.last1PX;
      tool.extra.last1PY;
      tool.extra.last2PX;
      tool.extra.last2PY;
      tool.extra.start;
      tool.setEvent('mousedown mousemove', (mouse, event) => {
        if (mouse.buttons !== 2 && mouse.buttons !== 1) return 3;
        if (tool.extra.lastX == mouse.tileX && tool.extra.lastY == mouse.tileY) return 3;
        if (event && event.ctrlKey) return setColor(mouse.buttons, PM.getPixel(mouse.tileX, mouse.tileY));
        var c = mouse.buttons === 1 ? OWOP.player.selectedColor : OWOP.player.rightSelectedColor;
        if (isNaN(tool.extra.lastX) || isNaN(tool.extra.lastY)) {
          tool.extra.lastX = mouse.tileX;
          tool.extra.lastY = mouse.tileY;
          tool.extra.last1PX = mouse.tileX;
          tool.extra.last1PY = mouse.tileY;
          tool.extra.last2PX = mouse.tileX;
          tool.extra.last2PY = mouse.tileY;
          tool.extra.start = true;
        }
        line(tool.extra.lastX, tool.extra.lastY, mouse.tileX, mouse.tileY, undefined, event, (x, y) => {
          let place = false;
          // check to place
          if (tool.extra.start) {
            tool.extra.start = false;
            place = true;
          } else {
            if (tool.extra.last1PX == x && tool.extra.last1PY == y) {
              tool.extra.last2PX = tool.extra.last1PX;
              tool.extra.last2PY = tool.extra.last1PY;
              tool.extra.last1PX = x;
              tool.extra.last1PY = y;
              return;
            }
          }
          if (!place) {
            for (let x1 = -1; x1 < 2; x1++) {
              for (let y1 = -1; y1 < 2; y1++) {
                if (x1 == 0 && y1 == 0) continue;
                if (tool.extra.last2PX === (x + x1) && tool.extra.last2PY === (y + y1)) {
                  tool.extra.last1PX = x;
                  tool.extra.last1PY = y;
                  return;
                }
              }
            }
          }
          // place the pixel
          PM.setPixel(tool.extra.last1PX, tool.extra.last1PY, c);
          tool.extra.last2PX = tool.extra.last1PX;
          tool.extra.last2PY = tool.extra.last1PY;
          tool.extra.last1PX = x;
          tool.extra.last1PY = y;
        });
        tool.extra.lastX = mouse.tileX;
        tool.extra.lastY = mouse.tileY;
        return 3;
      });
      tool.setEvent('mouseup', mouse => {
        tool.extra.lastX = undefined;
        tool.extra.lastY = undefined;
        tool.extra.last1PX = undefined;
        tool.extra.last1PY = undefined;
        tool.extra.last2PX = undefined;
        tool.extra.last2PY = undefined;
      });
      // palette switcher
      tool.setEvent('select', () => {
        if (OWOP.windowSys.windows["Palette Saver"]) return;
        let options = {
          closeable: true,
          moveable: true
        }

        let paletteJson = {}

        function windowFunc(wdw) {
          var divwindow = document.createElement("div");
          divwindow.style = "width: 300px; overflow-y: scroll; overflow-x: scroll; max-height: 165px;"
          divwindow.innerHTML = `<input id="pName" type="text" style="max-width: 100px; border: 0px;" placeholder="Name"></input>
            <button id="addPalette" >Save Current Palette</button> <table id="paletteTable" style="overflow-x: hidden; overflow-y: scroll;"></table>`;
          wdw.addObj(divwindow);
        }

        var windowClass = new OWOP.windowSys.class.window("Palette Saver", options, windowFunc);
        OWOP.windowSys.addWindow(windowClass).move(window.innerHeight / 3, window.innerWidth / 3);

        var pName = document.getElementById("pName");

        pName.oninput = () => {
          if (pName.value.length > 25) pName.style.backgroundColor = "rgb(255 148 129)";
          else pName.style.backgroundColor = "rgb(255, 255, 255)";
        }

        document.getElementById("addPalette").onclick = () => {

          if (pName.value.length > 25) return alert("Your max name length is 25 characters.");
          if (pName.value.length == 0) return alert("Invalid Name");

          if (!localStorage.getItem("paletteJson")) {
            paletteJson[pName.value] = OWOP.player.palette;
            localStorage.setItem("paletteJson", JSON.stringify(paletteJson));
          } else {
            paletteJson = JSON.parse(localStorage.getItem("paletteJson"));
            if (paletteJson[pName.value]) {
              pName.value = "";
              return alert("You already have a palette with this name.");
            }
            paletteJson[pName.value] = OWOP.player.palette;
            localStorage.setItem("paletteJson", JSON.stringify(paletteJson));
          }

          var divPalette = document.createElement("tr");
          let pN = pName.value;
          divPalette.id = `im-busy${pN}`;
          divPalette.innerHTML = `<td id="palette-${pN}" style="cursor: pointer; padding: 5px; border: 1px solid white; border-radius: 5px; color: white;">${pN}</td> <td id="useT1-${pN}"><button id="useB1-${pN}">Use</button></td> <td id="useT2-${pN}"><button id="useB2-${pN}">Replace</button></td> <td id="useT3-${pN}"><button id="useB3-${pN}">Delete</button></td>`;
          document.getElementById("paletteTable").appendChild(divPalette);
          document.getElementById(`useB1-${pN}`).onclick = () => {
            let paletteJson = JSON.parse(localStorage.getItem("paletteJson"));
            OWOP.player.palette.splice(0);
            OWOP.player.palette.push(...paletteJson[pN]);
            OWOP.player.paletteIndex = OWOP.player.paletteIndex;
          }
          document.getElementById(`useB2-${pN}`).onclick = () => {
            if (!confirm(`Are you sure you want to REPLACE the palette ${pN}?`)) return;
            let paletteJson = JSON.parse(localStorage.getItem("paletteJson"));
            paletteJson[`${pN}`] = OWOP.player.palette;
            localStorage.setItem('paletteJson', JSON.stringify(paletteJson));
          }
          document.getElementById(`useB3-${pN}`).onclick = () => {
            if (!confirm(`Are you sure you want to DELETE the palette ${pN}?`)) return;
            let paletteJson = JSON.parse(localStorage.getItem("paletteJson"));
            document.getElementById(`palette-${pN}`).outerHTML = '';
            document.getElementById(`im-busy${pN}`).outerHTML = '';
            delete paletteJson[pN];
            localStorage.setItem('paletteJson', JSON.stringify(paletteJson));
          }

          pName.style.backgroundColor = "rgb(255 255 255)";

          pName.value = "";
        }

        if (localStorage.getItem("paletteJson")) {

          var gettedJson = JSON.parse(localStorage.getItem("paletteJson"));
          var obj = Object.keys(gettedJson);
          for (var i = 0; i < obj.length; i++) {
            let pN = obj[i];
            var divPalette = document.createElement("tr");
            divPalette.id = `im-busy${pN}`;
            divPalette.innerHTML = `<td id="palette-${pN}" style="cursor: pointer; padding: 5px; border: 1px solid white; border-radius: 5px; color: white;">${pN}</td> <td id="useT1-${pN}"><button id="useB1-${pN}">Use</button></td> <td id="useT2-${pN}"><button id="useB2-${pN}">Replace</button></td> <td id="useT3-${pN}"><button id="useB3-${pN}">Delete</button></td>`;
            document.getElementById("paletteTable").appendChild(divPalette);
            document.getElementById(`useB1-${pN}`).onclick = () => {
              let paletteJson = JSON.parse(localStorage.getItem("paletteJson"));
              OWOP.player.palette.splice(0);
              OWOP.player.palette.push(...paletteJson[`${pN}`]);
              OWOP.player.paletteIndex = OWOP.player.paletteIndex;
            }
            document.getElementById(`useB2-${pN}`).onclick = () => {
              if (!confirm(`Are you sure you want to REPLACE the palette ${pN}?`)) return;
              let paletteJson = JSON.parse(localStorage.getItem("paletteJson"));
              paletteJson[`${pN}`] = OWOP.player.palette;
              localStorage.setItem('paletteJson', JSON.stringify(paletteJson));
            }
            document.getElementById(`useB3-${pN}`).onclick = () => {
              if (!confirm(`Are you sure you want to DELETE the palette ${pN}?`)) return;
              let paletteJson = JSON.parse(localStorage.getItem("paletteJson"));
              document.getElementById(`palette-${pN}`).outerHTML = '';
              document.getElementById(`im-busy${pN}`).outerHTML = '';
              delete paletteJson[pN];
              localStorage.setItem('paletteJson', JSON.stringify(paletteJson));
            }
          }
        }
      });
      tool.setEvent('deselect', () => {
        tool.extra.lastX = undefined;
        tool.extra.lastY = undefined;
        tool.extra.last1PX = undefined;
        tool.extra.last1PY = undefined;
        tool.extra.last2PX = undefined;
        tool.extra.last2PY = undefined;
        // this is annoying when switching tools
        // if (OWOP.windowSys.windows["Palette Saver"]) OWOP.windowSys.windows["Palette Saver"].close();
      });
      // change color positions
      tool.setEvent('keydown', event => {
        if (event["87"] && event["83"]) return;
        if (event["87"]) { // w
          let i1 = OWOP.player.paletteIndex;
          let i2 = modulo(i1 - 1, OWOP.player.palette.length);
          if (i2 == OWOP.player.palette.length - 1) {
            OWOP.player.palette.push(OWOP.player.palette.shift());
          } else {
            [OWOP.player.palette[i1], OWOP.player.palette[i2]] = [OWOP.player.palette[i2], OWOP.player.palette[i1]];
          }
          OWOP.player.paletteIndex = i2;
        }
        if (event["83"]) { // s
          let i1 = OWOP.player.paletteIndex;
          let i2 = modulo(i1 + 1, OWOP.player.palette.length);
          if (i2 === 0) {
            OWOP.player.palette.unshift(OWOP.player.palette.pop());
          } else {
            [OWOP.player.palette[i1], OWOP.player.palette[i2]] = [OWOP.player.palette[i2], OWOP.player.palette[i1]];
          }
          OWOP.player.paletteIndex = i2;
        }
      });
    }));
    OWOP.tool.addToolObject(new OWOP.tool.class('Palette Color Adder', OWOP.cursors.select, OWOP.fx.player.NONE, OWOP.RANK.NONE, tool => {
      tool.setFxRenderer((fx, ctx, time) => {
        if (!fx.extra.isLocalPlayer) return 1;
        var x = fx.extra.player.x;
        var y = fx.extra.player.y;
        var fxx = (Math.floor(x / 16) - camera.x) * camera.zoom;
        var fxy = (Math.floor(y / 16) - camera.y) * camera.zoom;
        var oldlinew = ctx.lineWidth;
        ctx.lineWidth = 1;
        if (tool.extra.end) {
          var s = tool.extra.start;
          var e = tool.extra.end;
          x = (s[0] - camera.x) * camera.zoom + 0.5;
          y = (s[1] - camera.y) * camera.zoom + 0.5;
          var w = e[0] - s[0];
          var h = e[1] - s[1];
          ctx.beginPath();
          ctx.rect(x, y, w * camera.zoom, h * camera.zoom);
          ctx.globalAlpha = 1;
          ctx.strokeStyle = "#FFFFFF";
          ctx.stroke();
          ctx.setLineDash([3, 4]);
          ctx.strokeStyle = "#000000";
          ctx.stroke();
          ctx.globalAlpha = 0.25 + Math.sin(time / 500) / 4;
          ctx.fillStyle = renderer.patterns.unloaded;
          ctx.fill();
          ctx.setLineDash([]);
          var oldfont = ctx.font;
          ctx.font = "16px sans-serif";
          var txt = `${!tool.extra.clicking ? "Right click to copy pixels to palette " : ""}(${Math.abs(w)}x${Math.abs(h)})`;
          var txtx = window.innerWidth >> 1;
          var txty = window.innerHeight >> 1;
          txtx = Math.max(x, Math.min(txtx, x + w * camera.zoom));
          txty = Math.max(y, Math.min(txty, y + h * camera.zoom));

          drawText(ctx, txt, txtx, txty, true);
          ctx.font = oldfont;
          ctx.lineWidth = oldlinew;
          return 0;
        } else {
          ctx.beginPath();
          ctx.moveTo(0, fxy + 0.5);
          ctx.lineTo(window.innerWidth, fxy + 0.5);
          ctx.moveTo(fxx + 0.5, 0);
          ctx.lineTo(fxx + 0.5, window.innerHeight);

          //ctx.lineWidth = 1;
          ctx.globalAlpha = 1;
          ctx.strokeStyle = "#FFFFFF";
          ctx.stroke();
          ctx.setLineDash([3]);
          ctx.strokeStyle = "#000000";
          ctx.stroke();

          ctx.setLineDash([]);
          ctx.lineWidth = oldlinew;
          return 1;
        }
      });

      tool.extra.start = undefined;
      tool.extra.end = undefined;
      tool.extra.clicking = false;

      tool.setEvent('mousedown', (mouse, event) => {
        var s = tool.extra.start;
        var e = tool.extra.end;
        const isInside = () => mouse.tileX >= s[0] && mouse.tileX < e[0] && mouse.tileY >= s[1] && mouse.tileY < e[1];
        if (mouse.buttons === 1 && !tool.extra.end) {
          tool.extra.start = [mouse.tileX, mouse.tileY];
          tool.extra.clicking = true;
          tool.setEvent('mousemove', (mouse, event) => {
            if (tool.extra.start && mouse.buttons === 1) {
              tool.extra.end = [mouse.tileX, mouse.tileY];
              return 1;
            }
          });
          const finish = () => {
            tool.setEvent('mousemove mouseup deselect', null);
            tool.extra.clicking = false;
            var s = tool.extra.start;
            var e = tool.extra.end;
            var tmp = undefined;
            if (e) {
              if (s[0] === e[0] || s[1] === e[1]) {
                tool.extra.start = undefined;
                tool.extra.end = undefined;
              }
              if (s[0] > e[0]) {
                tmp = e[0];
                e[0] = s[0];
                s[0] = tmp;
              }
              if (s[1] > e[1]) {
                tmp = e[1];
                e[1] = s[1];
                s[1] = tmp;
              }
            }
            renderer.render(renderer.rendertype.FX);
          }
          tool.setEvent('deselect', finish);
          tool.setEvent('mouseup', (mouse, event) => {
            if (!(mouse.buttons & 1)) {
              finish();
            }
          });
        } else if (mouse.buttons === 1 && tool.extra.end) {
          if (isInside()) {
            var offx = mouse.tileX;
            var offy = mouse.tileY;
            tool.setEvent('mousemove', (mouse, event) => {
              var dx = mouse.tileX - offx;
              var dy = mouse.tileY - offy;
              tool.extra.start = [s[0] + dx, s[1] + dy];
              tool.extra.end = [e[0] + dx, e[1] + dy];
            });
            const end = () => {
              tool.setEvent('mouseup deselect mousemove', null);
            }
            tool.setEvent('deselect', end);
            tool.setEvent('mouseup', (mouse, event) => {
              if (!(mouse.buttons & 1)) {
                end();
              }
            });
          } else {
            tool.extra.start = undefined;
            tool.extra.end = undefined;
          }
        } else if (mouse.buttons === 2 && tool.extra.end && isInside()) {
          tool.extra.start = undefined;
          tool.extra.end = undefined;
          let test = false;
          // (s[0], s[1], e[0] - s[0], e[1] - s[1])
          let x = s[0];
          let y = s[1];
          let w = e[0] - s[0];
          let h = e[1] - s[1];
          let totalAdded = 0;
          let limit = 50;
          for (var i = x; i < x + w; i++) {
            for (var j = y; j < y + h; j++) {
              if (totalAdded >= limit) continue;
              var pix = PM.getPixel(i, j);
              if (!pix) continue;
              for (let k = 0; k < OWOP.player.palette.length; k++) {
                var c = OWOP.player.palette[k];
                if (c[0] == pix[0] && c[1] == pix[1] && c[2] == pix[2]) {
                  test = true;
                  break;
                }
              }
              if (test) {
                test = false;
                continue;
              }
              OWOP.player.palette.push(pix);
              totalAdded++;
            }
          }
          OWOP.player.paletteIndex = OWOP.player.palette.length - 1;
          if (totalAdded >= limit) OWOP.chat.local(`total colors added limit has been reached (${limit} added)`);
        }
      });
    }));
    OWOP.tool.addToolObject(new OWOP.tool.class('Rainbow Cursor', OWOP.cursors.cursor, OWOP.fx.player.RECT_SELECT_ALIGNED(1), OWOP.RANK.USER, tool => {
      // cursor functionality
      tool.extra.lastX;
      tool.extra.lastY;
      tool.extra.c = 0;
      tool.setEvent('mousedown mousemove', (mouse, event) => {
        if (mouse.buttons !== 2 && mouse.buttons !== 1) return 3;
        if (tool.extra.lastX == mouse.tileX && tool.extra.lastY == mouse.tileY) return 3;
        if (event && event.ctrlKey) return setColor(mouse.buttons, PM.getPixel(mouse.tileX, mouse.tileY));
        if (isNaN(tool.extra.lastX) || isNaN(tool.extra.lastY)) {
          tool.extra.lastX = mouse.tileX;
          tool.extra.lastY = mouse.tileY;
        }
        line(tool.extra.lastX, tool.extra.lastY, mouse.tileX, mouse.tileY, undefined, event, (x, y) => {
          let pixel;
          if ((pixel = new Color(PM.getPixel(x, y)), !pixel.c)) return;
          var color = new Color(mouse.buttons === 1 ? hue(x - y) : hue(tool.extra.c++)); // hue(tool.extra.c++);
          if (!Color.compare(pixel, color)) PM.setPixel(x, y, color.c);
        });
        tool.extra.lastX = mouse.tileX;
        tool.extra.lastY = mouse.tileY;
        return 3;
      });
      tool.setEvent('mouseup deselect', mouse => {
        tool.extra.lastX = undefined;
        tool.extra.lastY = undefined;
      });
    }));
    OWOP.tool.addToolObject(new OWOP.tool.class('Rainbow Line', OWOP.cursors.wand, OWOP.fx.player.NONE, OWOP.RANK.USER, tool => {
      tool.extra.start = undefined;
      tool.extra.end = undefined;
      tool.extra.c = 0;
      var defaultFx = OWOP.fx.player.RECT_SELECT_ALIGNED(1);
      tool.setFxRenderer((fx, ctx, time) => {
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = rgb(...hue(~~(time / 100)));
        if (!tool.extra.start || !tool.extra.end && (defaultFx(fx, ctx, time), true)) return;
        line(tool.extra.start[0], tool.extra.start[1], tool.extra.end[0], tool.extra.end[1], undefined, undefined, (x, y, i) => {
          ctx.beginPath();
          ctx.strokeStyle = rgb(...hue(~~(time / 100) + i));
          ctx.rect((x - camera.x) * camera.zoom, (y - camera.y) * camera.zoom, camera.zoom, camera.zoom);
          ctx.stroke();
        });
      });
      tool.setEvent('mousedown', mouse => {
        if ((mouse.buttons == 3 || mouse.buttons == 4) && (tool.extra.start = undefined, tool.extra.end = undefined, true)) return;
        tool.extra.start = [mouse.tileX, mouse.tileY];
        tool.extra.end = [mouse.tileX, mouse.tileY];
      });
      tool.setEvent('mousemove', mouse => {
        if (tool.extra.start) tool.extra.end = [mouse.tileX, mouse.tileY];
      });
      tool.setEvent('mouseup', (mouse, event) => {
        if (!tool.extra.start) return;
        tool.extra.end = [mouse.tileX, mouse.tileY];
        line(tool.extra.start[0], tool.extra.start[1], tool.extra.end[0], tool.extra.end[1], undefined, undefined, (x, y) => {
          var c = event && event.button == 0 ? hue(x - y) : hue(tool.extra.c++);
          PM.setPixel(x, y, c);
        });
        tool.extra.start = undefined;
        tool.extra.end = undefined;
      });
      tool.setEvent('deselect', mouse => {
        tool.extra.start = undefined;
        tool.extra.end = undefined;
        tool.extra.c = 0;
      });
    }));
    OWOP.tool.addToolObject(new OWOP.tool.class('Rainbow Fill', OWOP.cursors.fill, OWOP.fx.player.NONE, OWOP.RANK.USER, tool => {
      tool.extra.usedQueue = {};
      tool.extra.queue = {};
      tool.extra.fillingColor = undefined;

      const isSame = (a, b) => a && b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
      const isFillColor = (x, y) => isSame(PM.getPixel(x, y), tool.extra.fillingColor) && (!tool.extra.usedQueue[`${x},${y}`]) && (tool.extra.queue[`${x},${y}`] = { x: x, y: y }, true);

      function tick() {
        for (var current in tool.extra.queue) {
          current = tool.extra.queue[current];
          var x = current.x;
          var y = current.y;
          var selClr = hue(x - y);
          var thisClr = PM.getPixel(x, y);
          if (isSame(thisClr, tool.extra.fillingColor) && !isSame(thisClr, selClr)) {
            PM.setPixel(x, y, selClr);

            var t = isFillColor(x, y - 1);
            var b = isFillColor(x, y + 1);
            var l = isFillColor(x - 1, y);
            var r = isFillColor(x + 1, y);

            t && l && isFillColor(x - 1, y - 1);
            t && r && isFillColor(x + 1, y - 1);
            b && l && isFillColor(x - 1, y + 1);
            b && r && isFillColor(x + 1, y + 1);
          }
          delete tool.extra.queue[`${x},${y}`];
          tool.extra.usedQueue[`${x},${y}`] = true;
        }
      }
      tool.setFxRenderer((fx, ctx, time) => {
        ctx.globalAlpha = 0.8;
        var z = OWOP.camera.zoom;
        if (!tool.extra.fillingColor || !fx.extra.isLocalPlayer) return OWOP.fx.player.RECT_SELECT_ALIGNED(1)(fx, ctx, time);
        ctx.beginPath();
        for (var current in tool.extra.queue) {
          current = tool.extra.queue[current];
          ctx.strokeStyle = rgb(...hue(current.x - current.y));
          ctx.rect((current.x - OWOP.camera.x) * z, (current.y - OWOP.camera.y) * z, z, z);
        }
        ctx.stroke();
      });
      tool.setEvent("mousedown", mouse => 4 & mouse.buttons || (tool.extra.fillingColor = PM.getPixel(mouse.tileX, mouse.tileY)) && (tool.extra.queue[`${mouse.tileX},${mouse.tileY}`] = { x: mouse.tileX, y: mouse.tileY }, tool.setEvent("tick", tick)));
      tool.setEvent("mouseup deselect", mouse => mouse && 1 & mouse.buttons || (tool.extra.fillingColor = undefined, tool.extra.queue = {}, tool.extra.usedQueue = {}, tool.setEvent("tick", null)));
    }));
    OWOP.tool.addToolObject(new OWOP.tool.class('Checkered Fill', OWOP.cursors.fill, OWOP.fx.player.NONE, OWOP.RANK.USER, tool => {
      tool.extra.usedQueue = {};
      tool.extra.queue = {};
      tool.extra.fillingColor = undefined;
      tool.extra.checkered = undefined;

      const isSame = (a, b) => a && b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
      const isFillColor = (x, y) => isSame(PM.getPixel(x, y), tool.extra.fillingColor) && (!tool.extra.usedQueue[`${x},${y}`]) && (tool.extra.queue[`${x},${y}`] = { x: x, y: y }, true);

      function tick() {
        var selClr = OWOP.player.selectedColor;
        for (var current in tool.extra.queue) {
          current = tool.extra.queue[current];
          var x = current.x;
          var y = current.y;
          var thisClr = PM.getPixel(x, y);
          if (isSame(thisClr, tool.extra.fillingColor) && !isSame(thisClr, selClr)) {
            if ((x + y) - 2 * Math.floor((x + y) / 2) == tool.extra.checkered) PM.setPixel(x, y, selClr);

            var t = isFillColor(x, y - 1);
            var b = isFillColor(x, y + 1);
            var l = isFillColor(x - 1, y);
            var r = isFillColor(x + 1, y);

            t && l && isFillColor(x - 1, y - 1);
            t && r && isFillColor(x + 1, y - 1);
            b && l && isFillColor(x - 1, y + 1);
            b && r && isFillColor(x + 1, y + 1);
          }
          delete tool.extra.queue[`${x},${y}`];
          tool.extra.usedQueue[`${x},${y}`] = true;
        }
      }
      tool.setFxRenderer((fx, ctx, time) => {
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = fx.extra.player.htmlRgb;
        var z = OWOP.camera.zoom;
        if (!tool.extra.fillingColor || !fx.extra.isLocalPlayer) return OWOP.fx.player.RECT_SELECT_ALIGNED(1)(fx, ctx, time);
        ctx.beginPath();
        for (var current in tool.extra.queue) {
          current = tool.extra.queue[current];
          let x = current.x
          let y = current.y;
          if ((x + y) - 2 * Math.floor((x + y) / 2))
            ctx.rect((x - OWOP.camera.x) * z, (y - OWOP.camera.y) * z, z, z);
        }
        ctx.stroke();
      });
      tool.setEvent("mousedown", mouse => 4 & mouse.buttons || (tool.extra.fillingColor = PM.getPixel(mouse.tileX, mouse.tileY)) && (tool.extra.queue[`${mouse.tileX},${mouse.tileY}`] = { x: mouse.tileX, y: mouse.tileY }, tool.extra.checkered = (mouse.tileX + mouse.tileY) - 2 * Math.floor((mouse.tileX + mouse.tileY) / 2), tool.setEvent("tick", tick)));
      tool.setEvent("mouseup deselect", mouse => mouse && 1 & mouse.buttons || (tool.extra.fillingColor = undefined, tool.extra.checkered = undefined, tool.extra.queue = {}, tool.extra.usedQueue = {}, tool.setEvent("tick", null)));
    }));
    OWOP.tool.addToolObject(new OWOP.tool.class('Gradient Cursor', OWOP.cursors.cursor, OWOP.fx.player.RECT_SELECT_ALIGNED(1), OWOP.RANK.USER, tool => {

    }));
    OWOP.tool.addToolObject(new OWOP.tool.class('Gradient Wand', OWOP.cursors.wand, OWOP.fx.player.NONE, OWOP.RANK.USER, tool => {
      var start = undefined;
      var end = undefined;
      var queue = [];
      var lineLength = 0;
      var defaultFx = OWOP.fx.player.RECT_SELECT_ALIGNED(1);
      tool.setFxRenderer((fx, ctx, time) => {
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = fx.extra.player.htmlRgb;
        var z = camera.zoom;
        if (!start || !end || !fx.extra.isLocalPlayer) {
          defaultFx(fx, ctx, time);
        } else {
          ctx.beginPath();
          lineLength = 0;
          line(start[0], start[1], end[0], end[1], undefined, undefined, (x, y) => {
            lineLength++;
            ctx.rect((x - camera.x) * camera.zoom, (y - camera.y) * camera.zoom, camera.zoom, camera.zoom);
          });
          ctx.stroke();
        }
      });
      function tick() {
        for (var painted = 0; painted < 3 && queue.length; painted++) {
          var current = queue.pop();
          var c = PM.getPixel(current[0], current[1]);
          if ((c[0] != current[2][0] || c[1] != current[2][1] || c[2] != current[2][2]) && !OWOP.world.setPixel(current[0], current[1], current[2])) {
            queue.push(current);
            break;
          }
        }
        if (!queue.length) {
          start = undefined;
          end = undefined;
          tool.setEvent('tick', null);
          return;
        }
      }
      tool.setEvent('mousedown', mouse => {
        if (!(mouse.buttons & 0b100)) {
          queue = [];
          tool.setEvent('tick', null);
          start = [mouse.tileX, mouse.tileY];
          end = [mouse.tileX, mouse.tileY];
        }
      });
      tool.setEvent('mousemove', mouse => {
        if (!queue.length) {
          end = [mouse.tileX, mouse.tileY];
        }
      });
      tool.setEvent('mouseup', mouse => {
        if (!(mouse.buttons & 0b11) && !queue.length) {
          end = [mouse.tileX, mouse.tileY];
          if (!start) {
            end = undefined;
            return;
          }
          if (OWOP.player.rank == OWOP.RANK.ADMIN) {
          } else {
            let sc = PM.getPixel(start[0], start[1]);
            let pc = mouse.buttons === 2 ? OWOP.player.rightSelectedColor : OWOP.player.selectedColor;
            line(start[0], start[1], end[0], end[1], undefined, undefined, (x, y, i) => {
              let divisor = (lineLength - 1);
              let r = sc[0] - ((sc[0] - pc[0]) / divisor) * i;
              let g = sc[1] - ((sc[1] - pc[1]) / divisor) * i;
              let b = sc[2] - ((sc[2] - pc[2]) / divisor) * i;
              let color = [~~r, ~~g, ~~b];
              if (i == 0) color = sc;
              if (i == divisor) color = pc;
              queue.push([x, y, color]);
            });
            tool.setEvent('tick', tick);
          }
        }
      });
      tool.setEvent('deselect', mouse => {
        queue = [];
        start = undefined;
        end = undefined;
        tool.setEvent('tick', null);
      });
    }));
    OWOP.tool.addToolObject(new OWOP.tool.class('Gradient Fill', OWOP.cursors.fill, OWOP.fx.player.NONE, OWOP.RANK.USER, tool => {

    }));
    OWOP.tool.addToolObject(new OWOP.tool.class('Queue Adder', OWOP.cursors.select, OWOP.fx.player.NONE, OWOP.RANK.USER, tool => {
      tool.setFxRenderer((fx, ctx, time) => {
        if (!fx.extra.isLocalPlayer) return 1;
        var x = fx.extra.player.x;
        var y = fx.extra.player.y;
        var fxx = (Math.floor(x / 16) - camera.x) * camera.zoom;
        var fxy = (Math.floor(y / 16) - camera.y) * camera.zoom;
        var oldlinew = ctx.lineWidth;
        ctx.lineWidth = 1;
        if (tool.extra.end) {
          var s = tool.extra.start;
          var e = tool.extra.end;
          x = (s[0] - camera.x) * camera.zoom + 0.5;
          y = (s[1] - camera.y) * camera.zoom + 0.5;
          var w = e[0] - s[0];
          var h = e[1] - s[1];
          ctx.beginPath();
          ctx.rect(x, y, w * camera.zoom, h * camera.zoom);
          ctx.globalAlpha = 1;
          ctx.strokeStyle = "#FFFFFF";
          ctx.stroke();
          ctx.setLineDash([3, 4]);
          ctx.strokeStyle = "#000000";
          ctx.stroke();
          ctx.globalAlpha = 0.25 + Math.sin(time / 500) / 4;
          ctx.fillStyle = renderer.patterns.unloaded;
          ctx.fill();
          ctx.setLineDash([]);
          var oldfont = ctx.font;
          ctx.font = "16px sans-serif";
          var txt = `${!tool.extra.clicking ? "Right click " : ""}(${Math.abs(w)}x${Math.abs(h)})`;
          var txtx = window.innerWidth >> 1;
          var txty = window.innerHeight >> 1;
          txtx = Math.max(x, Math.min(txtx, x + w * camera.zoom));
          txty = Math.max(y, Math.min(txty, y + h * camera.zoom));

          drawText(ctx, txt, txtx, txty, true);
          ctx.font = oldfont;
          ctx.lineWidth = oldlinew;
          return 0;
        } else {
          ctx.beginPath();
          ctx.moveTo(0, fxy + 0.5);
          ctx.lineTo(window.innerWidth, fxy + 0.5);
          ctx.moveTo(fxx + 0.5, 0);
          ctx.lineTo(fxx + 0.5, window.innerHeight);

          //ctx.lineWidth = 1;
          ctx.globalAlpha = 1;
          ctx.strokeStyle = "#FFFFFF";
          ctx.stroke();
          ctx.setLineDash([3]);
          ctx.strokeStyle = "#000000";
          ctx.stroke();

          ctx.setLineDash([]);
          ctx.lineWidth = oldlinew;
          return 1;
        }
      });

      tool.extra.start = undefined;
      tool.extra.end = undefined;
      tool.extra.clicking = false;

      tool.setEvent('mousedown', (mouse, event) => {
        var s = tool.extra.start;
        var e = tool.extra.end;
        const isInside = () => mouse.tileX >= s[0] && mouse.tileX < e[0] && mouse.tileY >= s[1] && mouse.tileY < e[1];
        if (mouse.buttons === 1 && !tool.extra.end) {
          tool.extra.start = [mouse.tileX, mouse.tileY];
          tool.extra.clicking = true;
          tool.setEvent('mousemove', (mouse, event) => {
            if (tool.extra.start && mouse.buttons === 1) {
              tool.extra.end = [mouse.tileX, mouse.tileY];
              return 1;
            }
          });
          const finish = () => {
            tool.setEvent('mousemove mouseup deselect', null);
            tool.extra.clicking = false;
            var s = tool.extra.start;
            var e = tool.extra.end;
            var tmp = undefined;
            if (e) {
              if (s[0] === e[0] || s[1] === e[1]) {
                tool.extra.start = undefined;
                tool.extra.end = undefined;
              }
              if (s[0] > e[0]) {
                tmp = e[0];
                e[0] = s[0];
                s[0] = tmp;
              }
              if (s[1] > e[1]) {
                tmp = e[1];
                e[1] = s[1];
                s[1] = tmp;
              }
            }
            renderer.render(renderer.rendertype.FX);
          }
          tool.setEvent('deselect', finish);
          tool.setEvent('mouseup', (mouse, event) => {
            if (!(mouse.buttons & 1)) {
              finish();
            }
          });
        } else if (mouse.buttons === 1 && tool.extra.end) {
          if (isInside()) {
            var offx = mouse.tileX;
            var offy = mouse.tileY;
            tool.setEvent('mousemove', (mouse, event) => {
              var dx = mouse.tileX - offx;
              var dy = mouse.tileY - offy;
              tool.extra.start = [s[0] + dx, s[1] + dy];
              tool.extra.end = [e[0] + dx, e[1] + dy];
            });
            const end = () => {
              tool.setEvent('mouseup deselect mousemove', null);
            }
            tool.setEvent('deselect', end);
            tool.setEvent('mouseup', (mouse, event) => {
              if (!(mouse.buttons & 1)) {
                end();
              }
            });
          } else {
            tool.extra.start = undefined;
            tool.extra.end = undefined;
          }
        } else if (mouse.buttons === 2 && tool.extra.end && isInside()) {
          tool.extra.start = undefined;
          tool.extra.end = undefined;
          let x = s[0];
          let y = s[1];
          let w = e[0] - s[0];
          let h = e[1] - s[1];
          for (var i = x; i < x + w; i++) {
            for (var j = y; j < y + h; j++) {
              var pix = PM.getPixel(i, j);
              if (pix && !PM.queue[`${i},${j}`]) PM.setPixel(i, j, pix);
            }
          }
        }
      });
    }));
    OWOP.tool.addToolObject(new OWOP.tool.class('Queue Filler', OWOP.cursors.select, OWOP.fx.player.NONE, OWOP.RANK.USER, tool => {
      tool.setFxRenderer((fx, ctx, time) => {
        if (!fx.extra.isLocalPlayer) return 1;
        var x = fx.extra.player.x;
        var y = fx.extra.player.y;
        var fxx = (Math.floor(x / 16) - camera.x) * camera.zoom;
        var fxy = (Math.floor(y / 16) - camera.y) * camera.zoom;
        var oldlinew = ctx.lineWidth;
        ctx.lineWidth = 1;
        if (tool.extra.end) {
          var s = tool.extra.start;
          var e = tool.extra.end;
          x = (s[0] - camera.x) * camera.zoom + 0.5;
          y = (s[1] - camera.y) * camera.zoom + 0.5;
          var w = e[0] - s[0];
          var h = e[1] - s[1];
          ctx.beginPath();
          ctx.rect(x, y, w * camera.zoom, h * camera.zoom);
          ctx.globalAlpha = 1;
          ctx.strokeStyle = "#FFFFFF";
          ctx.stroke();
          ctx.setLineDash([3, 4]);
          ctx.strokeStyle = "#000000";
          ctx.stroke();
          ctx.globalAlpha = 0.25 + Math.sin(time / 500) / 4;
          ctx.fillStyle = renderer.patterns.unloaded;
          ctx.fill();
          ctx.setLineDash([]);
          var oldfont = ctx.font;
          ctx.font = "16px sans-serif";
          var txt = `${!tool.extra.clicking ? "Right click " : ""}(${Math.abs(w)}x${Math.abs(h)})`;
          var txtx = window.innerWidth >> 1;
          var txty = window.innerHeight >> 1;
          txtx = Math.max(x, Math.min(txtx, x + w * camera.zoom));
          txty = Math.max(y, Math.min(txty, y + h * camera.zoom));

          drawText(ctx, txt, txtx, txty, true);
          ctx.font = oldfont;
          ctx.lineWidth = oldlinew;
          return 0;
        } else {
          ctx.beginPath();
          ctx.moveTo(0, fxy + 0.5);
          ctx.lineTo(window.innerWidth, fxy + 0.5);
          ctx.moveTo(fxx + 0.5, 0);
          ctx.lineTo(fxx + 0.5, window.innerHeight);

          //ctx.lineWidth = 1;
          ctx.globalAlpha = 1;
          ctx.strokeStyle = "#FFFFFF";
          ctx.stroke();
          ctx.setLineDash([3]);
          ctx.strokeStyle = "#000000";
          ctx.stroke();

          ctx.setLineDash([]);
          ctx.lineWidth = oldlinew;
          return 1;
        }
      });

      tool.extra.start = undefined;
      tool.extra.end = undefined;
      tool.extra.clicking = false;

      tool.setEvent('mousedown', (mouse, event) => {
        var s = tool.extra.start;
        var e = tool.extra.end;
        const isInside = () => mouse.tileX >= s[0] && mouse.tileX < e[0] && mouse.tileY >= s[1] && mouse.tileY < e[1];
        if (mouse.buttons === 1 && !tool.extra.end) {
          tool.extra.start = [mouse.tileX, mouse.tileY];
          tool.extra.clicking = true;
          tool.setEvent('mousemove', (mouse, event) => {
            if (tool.extra.start && mouse.buttons === 1) {
              tool.extra.end = [mouse.tileX, mouse.tileY];
              return 1;
            }
          });
          const finish = () => {
            tool.setEvent('mousemove mouseup deselect', null);
            tool.extra.clicking = false;
            var s = tool.extra.start;
            var e = tool.extra.end;
            var tmp = undefined;
            if (e) {
              if (s[0] === e[0] || s[1] === e[1]) {
                tool.extra.start = undefined;
                tool.extra.end = undefined;
              }
              if (s[0] > e[0]) {
                tmp = e[0];
                e[0] = s[0];
                s[0] = tmp;
              }
              if (s[1] > e[1]) {
                tmp = e[1];
                e[1] = s[1];
                s[1] = tmp;
              }
            }
            renderer.render(renderer.rendertype.FX);
          }
          tool.setEvent('deselect', finish);
          tool.setEvent('mouseup', (mouse, event) => {
            if (!(mouse.buttons & 1)) {
              finish();
            }
          });
        } else if (mouse.buttons === 1 && tool.extra.end) {
          if (isInside()) {
            var offx = mouse.tileX;
            var offy = mouse.tileY;
            tool.setEvent('mousemove', (mouse, event) => {
              var dx = mouse.tileX - offx;
              var dy = mouse.tileY - offy;
              tool.extra.start = [s[0] + dx, s[1] + dy];
              tool.extra.end = [e[0] + dx, e[1] + dy];
            });
            const end = () => {
              tool.setEvent('mouseup deselect mousemove', null);
            }
            tool.setEvent('deselect', end);
            tool.setEvent('mouseup', (mouse, event) => {
              if (!(mouse.buttons & 1)) {
                end();
              }
            });
          } else {
            tool.extra.start = undefined;
            tool.extra.end = undefined;
          }
        } else if (mouse.buttons === 2 && tool.extra.end && isInside()) {
          tool.extra.start = undefined;
          tool.extra.end = undefined;
          let x = s[0];
          let y = s[1];
          let w = e[0] - s[0];
          let h = e[1] - s[1];
          var pix = OWOP.player.selectedColor;
          for (var i = x; i < x + w; i++) {
            for (var j = y; j < y + h; j++) {
              PM.setPixel(i, j, pix);
            }
          }
        }
      });
    }));
    OWOP.tool.addToolObject(new OWOP.tool.class('Queue Clearer', OWOP.cursors.select, OWOP.fx.player.NONE, OWOP.RANK.USER, tool => {
      tool.setFxRenderer((fx, ctx, time) => {
        if (!fx.extra.isLocalPlayer) return 1;
        var x = fx.extra.player.x;
        var y = fx.extra.player.y;
        var fxx = (Math.floor(x / 16) - camera.x) * camera.zoom;
        var fxy = (Math.floor(y / 16) - camera.y) * camera.zoom;
        var oldlinew = ctx.lineWidth;
        ctx.lineWidth = 1;
        if (tool.extra.end) {
          var s = tool.extra.start;
          var e = tool.extra.end;
          x = (s[0] - camera.x) * camera.zoom + 0.5;
          y = (s[1] - camera.y) * camera.zoom + 0.5;
          var w = e[0] - s[0];
          var h = e[1] - s[1];
          ctx.beginPath();
          ctx.rect(x, y, w * camera.zoom, h * camera.zoom);
          ctx.globalAlpha = 1;
          ctx.strokeStyle = "#FFFFFF";
          ctx.stroke();
          ctx.setLineDash([3, 4]);
          ctx.strokeStyle = "#000000";
          ctx.stroke();
          ctx.globalAlpha = 0.25 + Math.sin(time / 500) / 4;
          ctx.fillStyle = renderer.patterns.unloaded;
          ctx.fill();
          ctx.setLineDash([]);
          var oldfont = ctx.font;
          ctx.font = "16px sans-serif";
          var txt = `${!tool.extra.clicking ? "Right click " : ""}(${Math.abs(w)}x${Math.abs(h)})`;
          var txtx = window.innerWidth >> 1;
          var txty = window.innerHeight >> 1;
          txtx = Math.max(x, Math.min(txtx, x + w * camera.zoom));
          txty = Math.max(y, Math.min(txty, y + h * camera.zoom));

          drawText(ctx, txt, txtx, txty, true);
          ctx.font = oldfont;
          ctx.lineWidth = oldlinew;
          return 0;
        } else {
          ctx.beginPath();
          ctx.moveTo(0, fxy + 0.5);
          ctx.lineTo(window.innerWidth, fxy + 0.5);
          ctx.moveTo(fxx + 0.5, 0);
          ctx.lineTo(fxx + 0.5, window.innerHeight);

          //ctx.lineWidth = 1;
          ctx.globalAlpha = 1;
          ctx.strokeStyle = "#FFFFFF";
          ctx.stroke();
          ctx.setLineDash([3]);
          ctx.strokeStyle = "#000000";
          ctx.stroke();

          ctx.setLineDash([]);
          ctx.lineWidth = oldlinew;
          return 1;
        }
      });

      tool.extra.start = undefined;
      tool.extra.end = undefined;
      tool.extra.clicking = false;

      tool.setEvent('mousedown', (mouse, event) => {
        var s = tool.extra.start;
        var e = tool.extra.end;
        const isInside = () => mouse.tileX >= s[0] && mouse.tileX < e[0] && mouse.tileY >= s[1] && mouse.tileY < e[1];
        if (mouse.buttons === 1 && !tool.extra.end) {
          tool.extra.start = [mouse.tileX, mouse.tileY];
          tool.extra.clicking = true;
          tool.setEvent('mousemove', (mouse, event) => {
            if (tool.extra.start && mouse.buttons === 1) {
              tool.extra.end = [mouse.tileX, mouse.tileY];
              return 1;
            }
          });
          const finish = () => {
            tool.setEvent('mousemove mouseup deselect', null);
            tool.extra.clicking = false;
            var s = tool.extra.start;
            var e = tool.extra.end;
            var tmp = undefined;
            if (e) {
              if (s[0] === e[0] || s[1] === e[1]) {
                tool.extra.start = undefined;
                tool.extra.end = undefined;
              }
              if (s[0] > e[0]) {
                tmp = e[0];
                e[0] = s[0];
                s[0] = tmp;
              }
              if (s[1] > e[1]) {
                tmp = e[1];
                e[1] = s[1];
                s[1] = tmp;
              }
            }
            renderer.render(renderer.rendertype.FX);
          }
          tool.setEvent('deselect', finish);
          tool.setEvent('mouseup', (mouse, event) => {
            if (!(mouse.buttons & 1)) {
              finish();
            }
          });
        } else if (mouse.buttons === 1 && tool.extra.end) {
          if (isInside()) {
            var offx = mouse.tileX;
            var offy = mouse.tileY;
            tool.setEvent('mousemove', (mouse, event) => {
              var dx = mouse.tileX - offx;
              var dy = mouse.tileY - offy;
              tool.extra.start = [s[0] + dx, s[1] + dy];
              tool.extra.end = [e[0] + dx, e[1] + dy];
            });
            const end = () => {
              tool.setEvent('mouseup deselect mousemove', null);
            }
            tool.setEvent('deselect', end);
            tool.setEvent('mouseup', (mouse, event) => {
              if (!(mouse.buttons & 1)) {
                end();
              }
            });
          } else {
            tool.extra.start = undefined;
            tool.extra.end = undefined;
          }
        } else if (mouse.buttons === 2 && tool.extra.end && isInside()) {
          tool.extra.start = undefined;
          tool.extra.end = undefined;
          let x = s[0];
          let y = s[1];
          let w = e[0] - s[0];
          let h = e[1] - s[1];
          for (var i = x; i < x + w; i++) {
            for (var j = y; j < y + h; j++) {
              PM.unsetPixel(i, j);
            }
          }
        }
      });
    }));
    OWOP.tool.addToolObject(new OWOP.tool.class('Paste', OWOP.cursors.paste, OWOP.fx.player.NONE, OWOP.RANK.USER, tool => {
      let c = document.createElement('canvas');
      c.width = 0;
      c.height = 0;
      let p1 = c.getContext('2d');
      tool.setFxRenderer((fx, ctx, time) => {
        let p9 = OWOP.camera.zoom;
        let pp = fx.extra.player.x;
        let pD = fx.extra.player.y;
        let pw = Math.floor(pp / 16) - OWOP.camera.x;
        let pH = Math.floor(pD / 16) - OWOP.camera.y;

        // if (p2.length) {
        //   ctx.globalAlpha = 0.8;

        //for (let pS = 0; pS < p2.length; pS++) {
        //    ctx.strokeStyle = C.toHTML(p2[pS][2]);
        //    ctx.strokeRect((p2[pS][0] - OWOP.camera.x) * p9, (p2[pS][1] - OWOP.camera.y) * p9, p9, p9);
        //}

        //   return 0;
        // }

        if (fx.extra.isLocalPlayer && c.width && c.height) {
          ctx.globalAlpha = 0.5 + Math.sin(time / 500) / 4;
          ctx.strokeStyle = '#000000';
          ctx.scale(p9, p9);
          ctx.drawImage(c, pw, pH);
          ctx.scale(1 / p9, 1 / p9);
          ctx.globalAlpha = 0.8;
          ctx.strokeRect(pw * p9, pH * p9, c.width * p9, c.height * p9);
          return 0;
        }
      });

      tool.setEvent('select', () => {
        if (tool.extra.k) {
          c.width = tool.extra.k.width;
          c.height = tool.extra.k.height;
          p1.drawImage(tool.extra.k, 0, 0);
          delete tool.extra.k;
          return;
        }
        let p6 = document.createElement('input');
        p6.type = 'file';
        p6.accept = 'image/*';
        p6.addEventListener('change', () => {
          if (!p6.files || !p6.files[0]) return;
          let p7 = new FileReader();
          p7.addEventListener('load', () => {
            let p8 = new Image();
            p8.src = p7.result;
            p8.addEventListener('load', () => {
              c.width = p8.width;
              c.height = p8.height;
              p1.drawImage(p8, 0, 0);
            });
          });
          p7.readAsDataURL(p6.files[0]);
        });
        p6.click();
      });
      tool.setEvent('mousedown', (mouse, event) => {
        if (!(mouse.buttons & 1)) return;
        let x = mouse.tileX;
        let y = mouse.tileY;
        let data = p1.getImageData(0, 0, c.width, c.height).data;
        let fix = (p6, p7, p8) => Math.floor(p6 * (1 - p8) + p7 * p8);

        for (let j = 0; j < c.height; j++) {
          for (let i = 0; i < c.width; i++) {
            let pD = (j * c.width + i) * 4;
            let color = PM.getPixel(i + x, j + y);
            if (!color) continue;
            let pH = data[pD + 3] / 255;
            color = [fix(color[0], data[pD + 0], pH), fix(color[1], data[pD + 1], pH), fix(color[2], data[pD + 2], pH)];
            // use this when color is checked against being alpha color cause this is stupid
            // var pix = PM.getPixel(i, j);
            // if (!PM.queue[`${i},${j}`]) PM.setPixel(i, j, pix);
            PM.setPixel(i + x, j + y, color);
          }
        }
      });
      tool.setEvent('mousemove', (mouse, event) => {
        if (!OWOP.OPM) return;
        if (mouse.buttons !== 0) {
          ((x, y, startX, startY) => {
            OWOP.require("canvas_renderer").moveCameraBy((startX - x) / 16, (startY - y) / 16);
          })(mouse.worldX, mouse.worldY, mouse.mouseDownWorldX, mouse.mouseDownWorldY);
          return mouse.buttons;
        }
      });
    }));
    OWOP.tool.addToolObject(new OWOP.tool.class('Copy', OWOP.cursors.copy, OWOP.fx.player.NONE, OWOP.RANK.USER, tool => {
      tool.setFxRenderer((fx, ctx, time) => {
        if (!fx.extra.isLocalPlayer) return 1;
        var x = fx.extra.player.x;
        var y = fx.extra.player.y;
        var fxx = (Math.floor(x / 16) - camera.x) * camera.zoom;
        var fxy = (Math.floor(y / 16) - camera.y) * camera.zoom;
        var oldlinew = ctx.lineWidth;
        ctx.lineWidth = 1;
        if (tool.extra.end) {
          var s = tool.extra.start;
          var e = tool.extra.end;
          var x = (s[0] - camera.x) * camera.zoom + 0.5;
          var y = (s[1] - camera.y) * camera.zoom + 0.5;
          var w = e[0] - s[0];
          var h = e[1] - s[1];
          ctx.beginPath();
          ctx.rect(x, y, w * camera.zoom, h * camera.zoom);
          ctx.globalAlpha = 1;
          ctx.strokeStyle = "#FFFFFF";
          ctx.stroke();
          ctx.setLineDash([3, 4]);
          ctx.strokeStyle = "#000000";
          ctx.stroke();
          ctx.globalAlpha = 0.25 + Math.sin(time / 500) / 4;
          ctx.fillStyle = renderer.patterns.unloaded;
          ctx.fill();
          ctx.setLineDash([]);
          var oldfont = ctx.font;
          ctx.font = "16px sans-serif";
          var txt = `${!tool.extra.clicking ? "Right click to copy area " : ""}(${Math.abs(w)}x${Math.abs(h)})`;
          var txtx = window.innerWidth >> 1;
          var txty = window.innerHeight >> 1;
          txtx = Math.max(x, Math.min(txtx, x + w * camera.zoom));
          txty = Math.max(y, Math.min(txty, y + h * camera.zoom));

          drawText(ctx, txt, txtx, txty, true);
          ctx.font = oldfont;
          ctx.lineWidth = oldlinew;
          return 0;
        } else {
          ctx.beginPath();
          ctx.moveTo(0, fxy + 0.5);
          ctx.lineTo(window.innerWidth, fxy + 0.5);
          ctx.moveTo(fxx + 0.5, 0);
          ctx.lineTo(fxx + 0.5, window.innerHeight);

          //ctx.lineWidth = 1;
          ctx.globalAlpha = 1;
          ctx.strokeStyle = "#FFFFFF";
          ctx.stroke();
          ctx.setLineDash([3]);
          ctx.strokeStyle = "#000000";
          ctx.stroke();

          ctx.setLineDash([]);
          ctx.lineWidth = oldlinew;
          return 1;
        }
      });

      tool.extra.start = undefined;
      tool.extra.end = undefined;
      tool.extra.clicking = false;

      tool.setEvent('mousedown', (mouse, event) => {
        var s = tool.extra.start;
        var e = tool.extra.end;
        const isInside = () => mouse.tileX >= s[0] && mouse.tileX < e[0] && mouse.tileY >= s[1] && mouse.tileY < e[1];
        if (mouse.buttons === 1 && !tool.extra.end) {
          tool.extra.start = [mouse.tileX, mouse.tileY];
          tool.extra.clicking = true;
          tool.setEvent('mousemove', (mouse, event) => {
            if (tool.extra.start && mouse.buttons === 1) {
              tool.extra.end = [mouse.tileX, mouse.tileY];
              return 1;
            }
          });
          const finish = () => {
            tool.setEvent('mousemove mouseup deselect', null);
            tool.extra.clicking = false;
            var s = tool.extra.start;
            var e = tool.extra.end;
            if (e) {
              if (s[0] === e[0] || s[1] === e[1]) {
                tool.extra.start = undefined;
                tool.extra.end = undefined;
              }
              if (s[0] > e[0]) {
                var tmp = e[0];
                e[0] = s[0];
                s[0] = tmp;
              }
              if (s[1] > e[1]) {
                var tmp = e[1];
                e[1] = s[1];
                s[1] = tmp;
              }
            }
            renderer.render(renderer.rendertype.FX);
          }
          tool.setEvent('deselect', finish);
          tool.setEvent('mouseup', (mouse, event) => {
            if (!(mouse.buttons & 1)) {
              finish();
            }
          });
        } else if (mouse.buttons === 1 && tool.extra.end) {
          if (isInside()) {
            var offx = mouse.tileX;
            var offy = mouse.tileY;
            tool.setEvent('mousemove', (mouse, event) => {
              var dx = mouse.tileX - offx;
              var dy = mouse.tileY - offy;
              tool.extra.start = [s[0] + dx, s[1] + dy];
              tool.extra.end = [e[0] + dx, e[1] + dy];
            });
            const end = () => {
              tool.setEvent('mouseup deselect mousemove', null);
            }
            tool.setEvent('deselect', end);
            tool.setEvent('mouseup', (mouse, event) => {
              if (!(mouse.buttons & 1)) {
                end();
              }
            });
          } else {
            tool.extra.start = undefined;
            tool.extra.end = undefined;
          }
        } else if (mouse.buttons === 2 && tool.extra.end && isInside()) {
          tool.extra.start = undefined;
          tool.extra.end = undefined;
          ((x, y, w, h, onblob) => {
            var c = document.createElement('canvas');
            c.width = w;
            c.height = h;
            var ctx = c.getContext('2d');
            var d = ctx.createImageData(w, h);
            for (var i = y; i < y + h; i++) {
              for (var j = x; j < x + w; j++) {
                let pix;
                if ((pix = PM.getPixel(j, i), !pix)) {
                  console.warn("Well something happened, you probably tried getting an area outside of loaded chunks.");
                  pix = [255, 255, 255];
                }
                d.data[4 * ((i - y) * w + (j - x))] = pix[0];
                d.data[4 * ((i - y) * w + (j - x)) + 1] = pix[1];
                d.data[4 * ((i - y) * w + (j - x)) + 2] = pix[2];
                d.data[4 * ((i - y) * w + (j - x)) + 3] = 255;
              }
            }
            ctx.putImageData(d, 0, 0);
            c.toBlob(onblob);
          })(s[0], s[1], e[0] - s[0], e[1] - s[1], b => {
            var url = URL.createObjectURL(b);
            var img = new Image();
            img.onload = () => {
              OWOP.tool.allTools.paste.extra.k = img;
              OWOP.player.tool = "paste";
            }
            img.src = url;
          });
        }
      });
    }));
    OWOP.tool.addToolObject(new OWOP.tool.class('Write', OWOP.cursors.write, OWOP.fx.player.NONE, OWOP.RANK.USER, tool => {
      tool.text = "211111211111122111112111111211111111111111211111111121111111111222211111121111112222111211111121112111112111111221111121111112211111111111111112111111211111111111112111111211111111112222222110001110000111100011100001110000011000001110000110121011000001222210110111011012222101110110111011100011100001111000111000011110000110000011012101101210110101011011101101210110000012222222101110110111011011101101110110111111011111101111110111011110111222210110110111012222100100110011011011101101110110111011011101101111111101111012101101110110101011101011101110111110112222222100000110000111012111101210110000011000001101000110000012210122111210110001121012222101010110101011012101100001110101011000011110001122101221012101110101110101012110112110101121101122222222101110110111011011101101110110111111011111101110110111011110111101110110110111011111101110110110011011101101111210110111011101111110122101221011101210101210101011101011211011211011112222222101210110000111100011100001110000011012222110001110121011000001110001110111011000001101210110111011100011101222211001011012101100001122101221100011211011211010111011101221012210000012222222111211111111122111112111111211111111112222211111211121111111111211111211121111111111111211111121112111112111222221111111112111111111222111222111112221112221111121112111221112211111112222222111111111211111111111111111111111111111111111111112222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222100011001210001100011010110001100011000110001100012222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222101011101211101111011010110111101111110110101101012222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222101012101210001100011000110001100012210110001100012222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222101011101110111111011110111101101012210110101111012222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222100011000110001100012210110001100012210110001100012222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222111111111111111111112211111111111112211111111111112222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222";
      tool.extra.position = 0;
      tool.extra.start = undefined;
      tool.extra.end = undefined;
      tool.extra.textArea = undefined;
      tool.setFxRenderer((fx, ctx, time) => {
        var camera = OWOP.camera;
        if (!fx.extra.isLocalPlayer) return 1;
        var x = fx.extra.player.x;
        var y = fx.extra.player.y;
        var fxx = (Math.floor(x / 16) - camera.x) * camera.zoom;
        var fxy = (Math.floor(y / 16) - camera.y) * camera.zoom;
        var oldlinew = ctx.lineWidth;
        ctx.lineWidth = 5;

        var s = tool.extra.start || [OWOP.mouse.tileX, OWOP.mouse.tileY];
        var e = tool.extra.end || [OWOP.mouse.tileX + 1, OWOP.mouse.tileY + 7];
        var x = (s[0] - camera.x) * camera.zoom + 0.5;
        var y = (s[1] - camera.y) * camera.zoom + 0.5;
        var w = e[0] - s[0];
        var h = e[1] - s[1];
        ctx.beginPath();
        ctx.rect(x, y, w * camera.zoom, h * camera.zoom);
        // ctx.globalAlpha = 1;
        ctx.strokeStyle = "#000000";
        ctx.stroke();
        if (Math.floor(time / 750) % 2) {
          ctx.beginPath();
          ctx.moveTo(x + 0.30 * camera.zoom, y + 0.5 * camera.zoom);
          ctx.lineTo(x + 0.30 * camera.zoom, y + 6.5 * camera.zoom);
          ctx.stroke();
        }
        let width = 0;
        let height = 0;

        // if (tool.extra.textArea) console.log(tool.extra.textArea.value);
        // if () {

        // }
        // for (let p9 = 0; p9 < 182; p9++) {
        //   for (let pp = 0; pp < 14; pp++) {
        //     let pD = (p9 * 14 + pp);
        //     let color = [p8[pD + 0], p8[pD + 1], p8[pD + 2], p8[pD + 3]];
        //     if (p8[pD+3] === 0) arr.push(2);
        //     else if (p8[pD + 0] == 0) arr.push(1);
        //     else arr.push(0);
        //   }
        // }
        // ctx.setLineDash([3, 4]);
        // ctx.strokeStyle = "#000000";
        // ctx.stroke();
        // ctx.globalAlpha = 0.25 + Math.sin(time / 500) / 4;
        // ctx.fillStyle = renderer.patterns.unloaded;
        // ctx.fill();
        // ctx.setLineDash([]);
        // var oldfont = ctx.font;
        // ctx.font = "16px sans-serif";
        // var txt = `${!tool.extra.clicking ? "Right click to screenshot " : ""}(${Math.abs(w)}x${Math.abs(h)})`;
        // var txtx = window.innerWidth >> 1;
        // var txty = window.innerHeight >> 1;
        // txtx = Math.max(x, Math.min(txtx, x + w * camera.zoom));
        // txty = Math.max(y, Math.min(txty, y + h * camera.zoom));

        // drawText(ctx, txt, txtx, txty, true);
        // ctx.font = oldfont;
        ctx.lineWidth = oldlinew;
        return 0;
        var camera = OWOP.camera;
        if (!fx.extra.isLocalPlayer) return 1;
        var x = fx.extra.player.x;
        var y = fx.extra.player.y;
        var fxx = (Math.floor(x / 16) - camera.x) * camera.zoom;
        var fxy = (Math.floor(y / 16) - camera.y) * camera.zoom;
        var oldlinew = ctx.lineWidth;
        ctx.lineWidth = 1;
        if (tool.extra.end) {
          var s = tool.extra.start;
          var e = tool.extra.end;
          var x = (s[0] - camera.x) * camera.zoom + 0.5;
          var y = (s[1] - camera.y) * camera.zoom + 0.5;
          var w = e[0] - s[0];
          var h = e[1] - s[1];
          ctx.beginPath();
          ctx.rect(x, y, w * camera.zoom, h * camera.zoom);
          ctx.globalAlpha = 1;
          ctx.strokeStyle = "#FFFFFF";
          ctx.stroke();
          ctx.setLineDash([3, 4]);
          ctx.strokeStyle = "#000000";
          ctx.stroke();
          ctx.globalAlpha = 0.25 + Math.sin(time / 500) / 4;
          ctx.fillStyle = renderer.patterns.unloaded;
          ctx.fill();
          ctx.setLineDash([]);
          var oldfont = ctx.font;
          ctx.font = "16px sans-serif";
          var txt = `${!tool.extra.clicking ? "Right click to screenshot " : ""}(${Math.abs(w)}x${Math.abs(h)})`;
          var txtx = window.innerWidth >> 1;
          var txty = window.innerHeight >> 1;
          txtx = Math.max(x, Math.min(txtx, x + w * camera.zoom));
          txty = Math.max(y, Math.min(txty, y + h * camera.zoom));

          drawText(ctx, txt, txtx, txty, true);
          ctx.font = oldfont;
          ctx.lineWidth = oldlinew;
          return 0;
        } else {
          ctx.beginPath();
          ctx.moveTo(0, fxy + 0.5);
          ctx.lineTo(window.innerWidth, fxy + 0.5);
          ctx.moveTo(fxx + 0.5, 0);
          ctx.lineTo(fxx + 0.5, window.innerHeight);

          //ctx.lineWidth = 1;
          ctx.globalAlpha = 1;
          ctx.strokeStyle = "#FFFFFF";
          ctx.stroke();
          ctx.setLineDash([3]);
          ctx.strokeStyle = "#000000";
          ctx.stroke();

          ctx.setLineDash([]);
          ctx.lineWidth = oldlinew;
          return 1;
        }
      });
      tool.setEvent('mousedown', (mouse, event) => {
        if (mouse.buttons === 1) {
          tool.extra.start = [mouse.tileX, mouse.tileY];
          tool.extra.end = [mouse.tileX + 1, mouse.tileY + 7];
          let temp = "";
          if (OWOP.windowSys.windows["Text Input"]) {
            temp = OWOP.windowSys.windows['Text Input'].elements[0].value;
            OWOP.windowSys.windows["Text Input"].close();
          }
          OWOP.windowSys.addWindow(new OWOP.windowSys.class.window('Text Input', {
            'closeable': true
          }, window => {
            let textArea = document.createElement('textarea');
            textArea.id = 'text-tool-input';
            textArea.width = '500px';
            textArea.hight = '500px';
            textArea.value = temp;
            // let newTextArea = document.createElement('div');
            // newTextArea.id = 'text-tool-input';
            // newTextArea.width = '500px';
            // newTextArea.height = '500px';
            // newTextArea.innerHTML = "hi";
            // newTextArea.contentEditable = "true";

            tool.extra.textArea = textArea;
            window.addObj(textArea);
            textArea.focus();
            textArea.select();
          }).move(window.innerWidth - 258, 400));
          let t = "hi";
          let _map = { " ": 26, a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7, i: 8, j: 9, k: 10, l: 11, m: 12, n: 13, o: 14, p: 15, q: 16, r: 17, s: 18, t: 19, u: 20, v: 21, w: 22, x: 23, y: 24, z: 25 };
          for (let p5 = 0; p5 < t.length; p5++) {
            let offsetx = _map[t[p5].toLowerCase()];
            if (!offsetx) {
              // if (!isNaN(t[p5]))
            }
            for (let p9 = 0; p9 < 7; p9++) {
              for (let pp = 0; pp < 7; pp++) {
                let pD = (p9 * 189 + pp + offsetx * 7);
                // console.log(tool.text[pD]);
                // let color = [p8[pD + 0], p8[pD + 1], p8[pD + 2], p8[pD + 3]];
                let c = [[0, 0, 0], false, false];
                let pos = [...tool.extra.start];
                pos[0] = pos[0] + pp + p5 * 7;
                pos[1] = pos[1] + p9;
                let color = c[tool.text[pD]];
                if (color) PM.setPixel(...pos, color, true);
              }
            }
          }
        }
        return;
        if (0) { } else if (mouse.buttons === 1 && tool.extra.end) {
          if (isInside()) {
            var offx = mouse.tileX;
            var offy = mouse.tileY;
            tool.setEvent('mousemove', (mouse, event) => {
              var dx = mouse.tileX - offx;
              var dy = mouse.tileY - offy;
              tool.extra.start = [s[0] + dx, s[1] + dy];
              tool.extra.end = [e[0] + dx, e[1] + dy];
            });
            const end = () => {
              tool.setEvent('mouseup deselect mousemove', null);
            };
            tool.setEvent('deselect', end);
            tool.setEvent('mouseup', (mouse, event) => {
              if (!(mouse.buttons & 1)) {
                end();
              }
            });
          } else {
            tool.extra.start = undefined;
            tool.extra.end = undefined;
          }
        } else if (mouse.buttons === 2 && tool.extra.end && isInside()) {
          tool.extra.start = undefined;
          tool.extra.end = undefined;
          var cvs = dlarea(s[0], s[1], e[0] - s[0], e[1] - s[1], b => {
            var url = URL.createObjectURL(b);
            var img = new Image();
            var saveButton = undefined;
            img.onload = () => {
              OWOP.windowSys.addWindow(new GUIWindow("Resulting image", {
                centerOnce: true,
                closeable: true
              }, function (win) {
                var props = ['width', 'height'];
                if (img.width > img.height) {
                  props.reverse();
                }
                var r = img[props[0]] / img[props[1]];
                var shownSize = img[props[1]] >= 128 ? 256 : 128;
                img[props[0]] = r * shownSize;
                img[props[1]] = shownSize;
                //win.container.classList.add('centeredChilds');
                //setTooltip(img, "Right click to copy/save!");
                var p1 = document.createElement("p");
                img.style = "display:block; margin-left: auto; margin-right: auto; padding-bottom:15px;";
                p1.appendChild(img);
                //p1.appendChild(document.createElement("br"));
                var closeButton = mkHTML("button", {
                  innerHTML: "CLOSE",
                  style: "width: 100%; height: 30px; margin: auto; padding-left: 10%; ",
                  onclick: function () {
                    img.remove();
                    URL.revokeObjectURL(url);
                    win.getWindow().close();
                  }
                });
                var saveButton = mkHTML("button", {
                  innerHTML: "SAVE",
                  style: "width: 100%; height: 30px; margin: auto; padding-left: 10%; padding-bottom:10px;"
                });
                saveButton.onclick = function () {
                  var a = document.createElement('a');
                  a.download = `${Base64.fromNumber(Date.now())} OWOP_${OWOP.world.name} at ${s[0]} ${s[1]}.png`;
                  a.href = img.src;
                  a.click();
                }
                p1.appendChild(saveButton);
                p1.appendChild(closeButton);
                var image = win.addObj(p1);
              }));
            };
            img.src = url;
          });
        }
      });
      tool.setEvent('mousemove', (mouse, event) => {
        function move(x, y, startX, startY) {
          cR.moveCameraBy((startX - x) / 16, (startY - y) / 16);
        }
        if (mouse.buttons & 0b1) {
          move(mouse.worldX, mouse.worldY, mouse.mouseDownWorldX, mouse.mouseDownWorldY);
          return mouse.buttons;
        }
      });
      tool.setEvent('deselect', () => {
        tool.extra.position = 0;
        tool.extra.start = undefined;
        tool.extra.end = undefined;
        if (OWOP.windowSys.windows["Text Input"]) OWOP.windowSys.windows["Text Input"].close();
      });
    }));
    delete OWOP.tool.allTools["gradient cursor"];
    delete OWOP.tool.allTools["gradient fill"];
    OWOP.tool.updateToolbar();
  })();

  function hue(d) {
    let a = 32; // 1   2   4  8  16 32 64 128 256
    let b = 8; // 256 128 64 32 16 8  4  2   1
    d = Math.floor(d);
    // d = d % (b * 6); m_{F}\left(a,b\right)=a-b\operatorname{floor}\left(\frac{a}{b}\right)
    d = (Math.abs(Math.floor(d / (b * 6)) * ((b * 6))) + (d % (b * 6))) % (b * 6);
    // d = d - (b * 6) * ~~(d/(b * 6));
    let nD = Math.floor(Math.abs(d / b));
    let output;
    if (nD < 1) {
      output = [255, 0, (d % b) * a];
    } else if (nD < 2) {
      output = [255 - ((d % b) * a), 0, 255];
    } else if (nD < 3) {
      output = [0, (d % b) * a, 255];
    } else if (nD < 4) {
      output = [0, 255, 255 - ((d % b) * a)];
    } else if (nD < 5) {
      output = [(d % b) * a, 255, 0];
    } else if (nD < 6) {
      output = [255, 255 - ((d % b) * a), 0];
    }
    // console.log(d);
    // console.log(nD);
    // console.log(output);
    return output;
  }

  function rgb(r, g, b) {
    return "#" + [r, g, b].map(v => {
      return ('0' +
        Math.min(Math.max(parseInt(v), 0), 255)
          .toString(16)
      ).slice(-2);
    }).join('');
  }

  const Base64 = {
    // sourced from https://stackoverflow.com/questions/6213227/fastest-way-to-convert-a-number-to-radix-64-in-javascript
    // coded by https://stackoverflow.com/users/520997/reb-cabin

    _Rixits:
      //   0       8       16      24      32      40      48      56     63
      //   v       v       v       v       v       v       v       v      v
      "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+/",
    // You have the freedom, here, to choose the glyphs you want for
    // representing your base-64 numbers. The ASCII encoding guys usually
    // choose a set of glyphs beginning with ABCD..., but, looking at
    // your update #2, I deduce that you want glyphs beginning with
    // 0123..., which is a fine choice and aligns the first ten numbers
    // in base 64 with the first ten numbers in decimal.

    // This cannot handle negative numbers and only works on the
    //     integer part, discarding the fractional part.
    // Doing better means deciding on whether you're just representing
    // the subset of javascript numbers of twos-complement 32-bit integers
    // or going with base-64 representations for the bit pattern of the
    // underlying IEEE floating-point number, or representing the mantissae
    // and exponents separately, or some other possibility. For now, bail
    fromBigInt: function (bigint) {
      if (typeof bigint !== "bigint")
        throw "The input is not valid";

      var rixit; // like 'digit', only in some non-decimal radix
      var residual = bigint;
      var result = '';
      while (true) {
        rixit = residual % 64n;
        result = this._Rixits.charAt(Number(rixit)) + result;
        residual = residual / 64n;

        if (residual == 0n)
          break;
      }
      return result;
    },
    fromNumber: function (number) {
      if (isNaN(Number(number)) || number === null ||
        number === Number.POSITIVE_INFINITY)
        throw "The input is not valid";
      if (number < 0)
        throw "Can't represent negative numbers now";

      var rixit; // like 'digit', only in some non-decimal radix
      var residual = Math.floor(number);
      var result = '';
      while (true) {
        rixit = residual % 64;
        result = this._Rixits.charAt(rixit) + result;
        residual = Math.floor(residual / 64);

        if (residual == 0)
          break;
      }
      return result;
    },

    toNumber: function (rixits) {
      var result = 0;
      rixits = rixits.split('');
      for (var e = 0; e < rixits.length; e++) {
        result = (result * 64) + this._Rixits.indexOf(rixits[e]);
      }
      return result;
    },
    toBigInt: function (rixits) {
      var result = 0n;
      rixits = rixits.split('');
      for (var e = 0; e < rixits.length; e++) {
        result = (result * 64n) + BigInt(this._Rixits.indexOf(rixits[e]));
      }
      return result;
    }
  }
  const Base256 = {
    // sourced from https://stackoverflow.com/questions/6213227/fastest-way-to-convert-a-number-to-radix-64-in-javascript
    // coded by https://stackoverflow.com/users/520997/reb-cabin
    // modified by NekoNoka
    _Rixits:
      //   0       8       16      24      32      40      48      56     63
      //   v       v       v       v       v       v       v       v      v
      "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖÙÚÛÜÝÞßàáâãäåçèéêëìíîïðñòóôõöùúûüýþÿĀāĂăĄąĆćĈĉĊċČčĎďĐđĒēĔĕĖėĘęĚěĜĝĞğĠġĢģĤĥĦħĨĩĪīĬĭĮįİĲĳĴĵĶķĸĹĺĻļĽľĿŀŁłŃńŅņŇňŉŊŋŌōŎŏŐőŔŕŖŗŘřŚśŜŝŞşŠšŢţŤťŦŧŨũŪūŬŭŮůŰűŲųŴŵŶŷŸŹźŻżŽžǞǟǠǡǦǧǨǩǪǫǬǭ",
    // You have the freedom, here, to choose the glyphs you want for
    // representing your base-64 numbers. The ASCII encoding guys usually
    // choose a set of glyphs beginning with ABCD..., but, looking at
    // your update #2, I deduce that you want glyphs beginning with
    // 0123..., which is a fine choice and aligns the first ten numbers
    // in base 64 with the first ten numbers in decimal.

    // This cannot handle negative numbers and only works on the
    //     integer part, discarding the fractional part.
    // Doing better means deciding on whether you're just representing
    // the subset of javascript numbers of twos-complement 32-bit integers
    // or going with base-64 representations for the bit pattern of the
    // underlying IEEE floating-point number, or representing the mantissae
    // and exponents separately, or some other possibility. For now, bail
    fromBigInt: function (bigint) {
      if (typeof bigint !== "bigint")
        throw "The input is not valid";
      if (bigint < 0)
        throw "Can't represent negative numbers now";

      var rixit; // like 'digit', only in some non-decimal radix
      var residual = bigint;
      var result = '';
      var l = BigInt(this._Rixits.length);
      while (true) {
        rixit = residual % l;
        result = this._Rixits.charAt(Number(rixit)) + result;
        residual = residual / l;

        if (residual == 0n)
          break;
      }
      return result;
    },
    fromNumber: function (number) {
      if (isNaN(Number(number)) || number === null ||
        number === Number.POSITIVE_INFINITY)
        throw "The input is not valid";
      if (number < 0)
        throw "Can't represent negative numbers now";

      var rixit; // like 'digit', only in some non-decimal radix
      var residual = Math.floor(number);
      var result = '';
      while (true) {
        rixit = residual % 256;
        // console.log("rixit : " + rixit);
        // console.log("result before : " + result);
        result = this._Rixits.charAt(rixit) + result;
        // console.log("result after : " + result);
        // console.log("residual before : " + residual);
        residual = Math.floor(residual / 256);
        // console.log("residual after : " + residual);

        if (residual == 0)
          break;
      }
      return result;
    },
    toNumber: function (rixits) {
      var result = 0;
      // console.log("rixits : " + rixits);
      // console.log("rixits.split('') : " + rixits.split(''));
      rixits = rixits.split('');
      for (var e = 0; e < rixits.length; e++) {
        // console.log("_Rixits.indexOf(" + rixits[e] + ") : " +
        // this._Rixits.indexOf(rixits[e]));
        // console.log("result before : " + result);
        result = (result * 256) + this._Rixits.indexOf(rixits[e]);
        // console.log("result after : " + result);
      }
      return result;
    },
    toBigInt: function (rixits) {
      var result = 0n;
      rixits = rixits.split('');
      for (var e = 0; e < rixits.length; e++) {
        result = (result * 256n) + BigInt(this._Rixits.indexOf(rixits[e]));
      }
      return result;
    }
  }

  {
    setInterval(() => {
      let k = document.getElementById("chat-messages").children;
      for (let i = 0; i < k.length; i++) {
        let t = k[i].innerHTML;
        let id = OWOP.player.id;
        var hasClass = t.classList !== undefined ? Array.from(t.classList).indexOf('nK') > -1 : false;
        if (!t.match(`(\\[${id}\\]: )|(${id}: )`) && t.match(`${id}`) && !hasClass) k[i].style = "background: #FF404059;";
      }
    }, 100);
    OWOP.windowSys.class.window.prototype.move = (function (t, e) { document.getElementById('windows').appendChild(this.frame); document.getElementById('windows').appendChild(OWOP.windowSys.windows.Tools.frame); return this.opt.immobile || (this.frame.style.transform = "translate(" + t + "px," + e + "px)", this.x = t, this.y = e), this });
    Object.keys(OWOP.windowSys.windows).forEach(e => OWOP.windowSys.windows[e].move = (function (t, e) { document.getElementById('windows').appendChild(this.frame); document.getElementById('windows').appendChild(OWOP.windowSys.windows.Tools.frame); return this.opt.immobile || (this.frame.style.transform = "translate(" + t + "px," + e + "px)", this.x = t, this.y = e), this }));

    const toolSetURL = `data:image/png;base64,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`

    var cursors = {
      set: new Image(),

      // start of default cursors
      cursor: { imgpos: [0, 0], hotspot: [0, 0] },
      move: { imgpos: [1, 0], hotspot: [18, 18] },
      pipette: { imgpos: [0, 1], hotspot: [0, 28] },
      erase: { imgpos: [0, 2], hotspot: [4, 26] },
      zoom: { imgpos: [1, 2], hotspot: [19, 10] },
      fill: { imgpos: [1, 1], hotspot: [3, 29] },
      brush: { imgpos: [0, 3], hotspot: [0, 26] },
      export: { imgpos: [2, 0], hotspot: [0, 0] }, // needs better hotspot
      selectprotect: { imgpos: [4, 0], hotspot: [0, 0] },
      copy: { imgpos: [3, 0], hotspot: [0, 0] }, // and this
      paste: { imgpos: [3, 1], hotspot: [0, 0] }, // this too
      cut: { imgpos: [3, 2], hotspot: [11, 5] },
      line: { imgpos: [3, 3], hotspot: [0, 0] },
      shield: { imgpos: [2, 3], hotspot: [18, 18] },
      kick: { imgpos: [2, 1], hotspot: [3, 6] },
      ban: { imgpos: [3, 0], hotspot: [10, 4] },
      write: { imgpos: [1, 3], hotspot: [10, 4] }, // fix hotspot
      // end of the default cursors

      // start of neko cursors
      "neko eraser": { imgpos: [0, 2], hotspot: [4, 26] },
      "neko foreign pixel replacer": { imgpos: [4, 1], hotspot: [4, 26] },
      "pixel perfect": { imgpos: [0, 3], hotspot: [0, 26] },
      "palette color adder": { imgpos: [0, 5], hotspot: [0, 0] },
      "rainbow cursor": { imgpos: [4, 4], hotspot: [0, 26] },
      "rainbow line": { imgpos: [4, 3], hotspot: [0, 0] },
      "rainbow fill": { imgpos: [4, 2], hotspot: [3, 29] },
      "checkered fill": { imgpos: [0, 4], hotspot: [3, 29] },
      "gradient wand": { imgpos: [4, 5], hotspot: [0, 0] },
      "queue adder": { imgpos: [1, 5], hotspot: [0, 0] },
      "queue filler": { imgpos: [2, 5], hotspot: [0, 0] },
      "queue clearer": { imgpos: [3, 5], hotspot: [0, 0] },
      // end of the neko cursors
    };

    function reduce(canvas) { /* Removes unused space from the image */
      var nw = canvas.width;
      var nh = canvas.height;
      var ctx = canvas.getContext('2d');
      var idat = ctx.getImageData(0, 0, canvas.width, canvas.height);
      var u32dat = new Uint32Array(idat.data.buffer);
      var xoff = 0;
      var yoff = 0;
      for (var y = 0, x, i = 0; y < idat.height; y++) {
        for (x = idat.width; x--; i += u32dat[y * idat.width + x]);
        if (i) { break; }
        yoff++;
      }
      for (var x = 0, y, i = 0; x < idat.width; x++) {
        for (y = nh; y--; i += u32dat[y * idat.width + x]);
        if (i) { break; }
        xoff++;
      }
      for (var y = idat.height, x, i = 0; y--;) {
        for (x = idat.width; x--; i += u32dat[y * idat.width + x]);
        if (i) { break; }
        nh--;
      }
      for (var x = idat.width, y, i = 0; x--;) {
        for (y = nh; y--; i += u32dat[y * idat.width + x]);
        if (i) { break; }
        nw--;
      }
      canvas.width = nw;
      canvas.height = nh;
      ctx.putImageData(idat, -xoff, -yoff);
    }

    function shadow(canvas, img) {
      /* Make a bigger image so the shadow doesn't get cut */
      canvas.width = 2 + img.width + 6;
      canvas.height = 2 + img.height + 6;
      var ctx = canvas.getContext('2d');
      ctx.shadowColor = '#000000';
      ctx.globalAlpha = 0.5; /* The shadow is too dark so we draw it transparent */
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.drawImage(img, 2, 2);
      ctx.globalAlpha = 1;
      ctx.shadowColor = 'rgba(0, 0, 0, 0)'; /* disables the shadow */
      ctx.drawImage(img, 2, 2);
    }

    /* makes a hole with the shape of the image */
    function popOut(canvas, img) {
      var shadowcolor = 0xFF3B314D;
      var backgroundcolor = 0xFF5C637E;
      canvas.width = img.width;
      canvas.height = img.height;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      var idat = ctx.getImageData(0, 0, canvas.width, canvas.height);
      var u32dat = new Uint32Array(idat.data.buffer);
      var clr = (x, y) => {
        return (x < 0 || y < 0 || x >= idat.width || y >= idat.height) ? 0
          : u32dat[y * idat.width + x];
      };
      for (var i = u32dat.length; i--;) {
        if (u32dat[i] !== 0) {
          u32dat[i] = backgroundcolor;
        }
      }
      for (var y = idat.height; y--;) {
        for (var x = idat.width; x--;) {
          if (clr(x, y) === backgroundcolor && (!clr(x, y - 1) || !clr(x - 1, y)) && !clr(x - 1, y - 1)) {
            u32dat[y * idat.width + x] = shadowcolor;
          }
        }
      }
      for (var y = idat.height; y--;) {
        for (var x = idat.width; x--;) {
          if (clr(x, y - 1) === shadowcolor
            && clr(x - 1, y) === shadowcolor) {
            u32dat[y * idat.width + x] = shadowcolor;
          }
        }
      }
      ctx.putImageData(idat, 0, 0);
    }

    var toolcss = (() => {
      var style = document.createElement('style');
      style.appendChild(document.createTextNode(''));
      document.head.appendChild(style);
      return style.sheet;
    })();

    function load() {
      cursors.set.onload = () => {
        var set = cursors.set;
        var slotcanvas = document.createElement('canvas');
        popOut(slotcanvas, set);
        var j = Object.keys(cursors).length - 1 + 1; /* +1 slotset to blob url */
        for (var tool in cursors) {
          if (tool === 'set') continue;
          cursors[tool].name = tool;
          tool = cursors[tool];
          var original = document.createElement('canvas');
          var i = tool.img = {
            shadowed: document.createElement('canvas'),
            shadowblob: undefined
          };
          original.width = original.height = 36;
          original.getContext('2d').drawImage(set,
            tool.imgpos[0] * 36,
            tool.imgpos[1] * 36,
            36, 36, 0, 0, 36, 36
          );
          // reduce(original);
          // shadow(i.shadowed, original);
          // tool.hotspot[0] += 2;
          // tool.hotspot[1] += 2; /* Check shadow() for explanation */

          /* Blob-ify images */
          original.toBlob(function (blob) {
            this.img.shadowblob = URL.createObjectURL(blob);
            toolcss.insertRule(`button[id='tool-${this.name}'] div {background-image: url(${this.img.shadowblob}) !important;background-position: 0 0 !important; background-repeat: no-repeat;}`);
          }.bind(tool));
        }
        for (let tool in cursors) {
          if (tool === "set") continue;
          tool = cursors[tool];
          var background = document.createElement('canvas');
          background.width = background.height = 36;
          background.getContext('2d').drawImage(slotcanvas,
            tool.imgpos[0] * 36,
            tool.imgpos[1] * 36,
            36, 36, 0, 0, 36, 36
          );
          background.toBlob(blob => {
            tool.imgbg = URL.createObjectURL(blob);
            toolcss.insertRule(`button[id='tool-${tool.name}'].selected div {background-image: url(${tool.imgbg}) !important;background-position: 0 0 !important;}`);
          });
        }
      }
      cursors.set.src = toolSetURL;
    }

    load();
  }

  if (document.domain && OWOP.OPM) {
    let element1 = document.createElement("span");
    element1.className = "top-bar";
    element1.style.float = "right";
    element1.style.width = "34px";
    element1.style.height = "17px";
    element1.style.background = "#FFFFFF";
    if (localStorage.rSC) {
      let arr = JSON.parse(localStorage.rSC);
      element1.style.background = `#${arr[0].toString(16).padStart(2, "0")}${arr[1].toString(16).padStart(2, "0")}${arr[2].toString(16).padStart(2, "0")}`;
    }
    let element2 = document.createElement("span");
    element2.className = "top-bar";
    element2.style.float = "right";
    element2.textContent = "Right Color:";
    let element3 = document.createElement("span");
    element3.className = "top-bar";
    element3.style.float = "right";
    element3.textContent = "Your ID: null";
    OWOP.elements.topBar.appendChild(element1);
    OWOP.elements.topBar.appendChild(element2);
    OWOP.elements.topBar.appendChild(element3);
    document.getElementById("playercount-display").style.marginRight = "45px";
    setInterval(() => {
      let arr = OWOP.player.rightSelectedColor;
      element1.style.background = rgb(...arr);
      element3.textContent = `Your ID:${OWOP.player.id}`;
    }, 10);

    // teleport detector
    OWOP.playerList = {};
    function tick() {
      let players = OWOP.require("main").playerList;
      let playersFixed = {};
      playersFixed[OWOP.player.id] = {
        id: OWOP.player.id,
        x: OWOP.mouse.tileX,
        y: OWOP.mouse.tileY
      };
      for (let player in players) {
        let n = players[player].childNodes;
        playersFixed[n[0].innerHTML] = {
          id: ~~n[0].innerHTML,
          x: ~~n[1].innerHTML,
          y: ~~n[2].innerHTML
        }
      }
      players = playersFixed;
      // check if the local copy has a disconnected player
      for (let p1 in OWOP.playerList) {
        let test = false;
        for (let p2 in players) {
          if (p1 === p2) {
            test = true;
            break;
          }
        }
        if (!test) {
          delete OWOP.playerList[p1];
          //OWOP.chat.local(`${p1} has left.`);
        }
      }
      // check if the main copy has new players
      for (let p1 in players) {
        let test = false;
        for (let p2 in OWOP.playerList) {
          if (p1 === p2) {
            test = true;
            break;
          }
        }
        if (!test) {
          let p = players[p1];
          OWOP.playerList[p.id] = {
            id: p.id,
            x: p.x,
            y: p.y
          }
          //OWOP.chat.local(`${p1} has joined.`);
        }
      }
      // check for a teleport
      var banlist = [];
      for (let player in players) {
        let p1 = OWOP.playerList[player];
        let p2 = players[player];

        if (Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2) > 2000) {
          //console.log("someone teleported", p2.id,  p2.x, p2.y);
          p1.tp = !isNaN(p1.tp) ? p1.tp + 1 : 1;
          //if (!p1.ban && p1.tp < 10) OWOP.chat.local(`${player} Teleported from ${p1.x} ${p1.y} to ${p2.x} ${p2.y}`);
        }
        p1.x = p2.x;
        p1.y = p2.y;
      }
      return players;
    }
    setInterval(tick, 10);
    setInterval(() => {
      for (let player in OWOP.playerList) {
        let p1 = OWOP.playerList[player];
        if (p1.tp >= 10) p1.ban = true;
        p1.tp = 0;
      }
    }, 10 * 1000);


    // it gets in the way of reading chat, im not trying to be mean to arc.
    { let e = document.querySelector("div[id='arc-widget-container']"); e ? e.parentElement.removeChild(e) : void 0; }
  }
  if (document.domain && !OWOP.OPM) {
    let r = 0;
    for (let e in OWOP.tool.allTools) {
      e = OWOP.tool.allTools[e];
      if (e.rankRequired < 2) r++;
    }
    document.getElementById("toole-container").style.maxWidth = 40 * Math.ceil(r / 8) + "px";
  }
  console.timeEnd("Neko");
  console.log("Neko's Scripts Loaded.");
}

function init() {
  let x = document.getElementById("load-scr");
  if (x && x.style.transform) {
    install();
  } else {
    setTimeout(init, 100);
  }
}

init();
