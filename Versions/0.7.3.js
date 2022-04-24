// ==UserScript==
// @name         Neko's Scripts
// @namespace    http://tampermonkey.net/
// @version      0.7.3
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
  console.log("Loading Neko's Scripts.");
  //#region Pixel Manager
  class Point {
    #x;
    #y;
    constructor(x, y) {
      this.#x = x;
      this.#y = y;
    }
    get x() {
      return this.#x;
    }
    get y() {
      return this.#y;
    }
    static distance(p1, p2) {
      if (p1 instanceof Point && p2 instanceof Point) {
        return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
      }
    }
  }

  class Pixel extends Point {
    #c;
    constructor(x, y, c) {
      super(x, y);
      this.#c = c;
    }
    get c() {
      return this.#c;
    }
    static compare(p1, p2) {
      return p1.x == p2.x && p1.y == p2.y && (p1.c[0] == p2.c[0] && p1.c[1] == p2.c[1] && p1.c[2] == p2.c[2]);
    }
  }

  class PixelManager {
    constructor() {
      this.queue = {};
      this.on = true;
      this.extra = {};
      this.extra.placeData = [];
      let p1 = new Point(0, 0);
      for (let y = -40; y < 40; y++) {
        for (let x = -40; x < 40; x++) {
          let p2 = new Point(x, y);
          let d = Point.distance(p1, p2);
          if (d > 32) continue;
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
    }
    deletePixels() {
      for (let i = 0; i < arguments.length; i++) {
        if (Array.isArray(arguments[i])) this.deletePixels(arguments[i]);
        else if (arguments[i] instanceof Point) delete this.queue[`${arguments[i].x},${arguments[i].y}`];
      }
    }
    setPixel(x, y, c) {
      let p = new Pixel(x, y, c);
      this.addPixels(p);
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
        let p1 = new Point(tX + e.x, tY + e.y);
        // if (Point.distance(p1, p2) > 32) continue; // originally needed but fixed in constructor
        p1 = this.queue[`${p1.x},${p1.y}`];
        if (!p1) continue;
        let xchunk = Math.floor(p1.x / 16);
        let ychunk = Math.floor(p1.y / 16);
        if (!OWOP.misc._world) continue;
        if (OWOP.misc._world.protectedChunks[`${xchunk},${ychunk}`]) {
          this.unsetPixel(p1.x, p1.y);
          continue;
        }
        let color = OWOP.world.getPixel(p1.x, p1.y);
        if (!color) continue;
        let p2 = new Pixel(p1.x, p1.y, color);
        if (!Pixel.compare(p1, p2)) return OWOP.world.setPixel(p1.x, p1.y, p1.c);
      }
      return;
    }
  }
  //#endregion
  const PM = new PixelManager();

  window.PM = PM;

  const modulo = (i, m) => {
    return i - m * Math.floor(i / m);
  }

  (function () {
    // const tool = typeof OPM !== "undefined" ? OWOP.tool : OWOP.tools; // i dont know if i want backwards compatibility to normal owop i might stay fully on opm
    const misc = OWOP.misc;
    const windowSys = OWOP.windowSys;
    const GUIWindow = OWOP.require("windowsys").GUIWindow;
    const { setTooltip, mkHTML } = OWOP.require("util/misc");
    OWOP.player.buttonPressedDown = [];
    let camera = OWOP.camera;
    let drawText = OWOP.require("canvas_renderer").drawText;
    let renderer = OWOP.require("canvas_renderer").renderer;
    // let C = OWOP.require('util/color').colorUtils;

    const addCursor = (n, t) => {
      OWOP.tool.addToolObject(new OWOP.tool.class(n, OWOP.cursors.brush, OWOP.fx.player.RECT_SELECT_ALIGNED(1), OWOP.RANK.USER, t));
    }
    const addFill = (n, t) => {
      OWOP.tool.addToolObject(new OWOP.tool.class(n, OWOP.cursors.fill, OWOP.fx.player.NONE, OWOP.RANK.USER, t));
    }
    const addChunker = (n, t) => {
      OWOP.tool.addToolObject(new OWOP.tool.class(n, OWOP.cursors.erase, OWOP.fx.player.RECT_SELECT_ALIGNED(16), OWOP.RANK.USER, t));
    }
    const addWand = (n, t) => {
      OWOP.tool.addToolObject(new OWOP.tool.class(n, OWOP.cursors.wand, OWOP.fx.player.NONE, OWOP.RANK.USER, t));
    }

    if (!localStorage["rSC"]) localStorage.setItem("rSC", JSON.stringify([255, 255, 255]));
    OWOP.player.rightSelectedColor = JSON.parse(localStorage.getItem("rSC"));

    addCursor('Cursor', tool => {
      // cursor functionality
      tool.extra.lastX;
      tool.extra.lastY;
      tool.setEvent('mousedown mousemove', (mouse, event) => {
        var usedButtons = 0b11;
        let line = (x1, y1, x2, y2, size, plot) => {
          var dx = Math.abs(x2 - x1), sx = x1 < x2 ? 1 : -1;
          var dy = -Math.abs(y2 - y1), sy = y1 < y2 ? 1 : -1;
          var err = dx + dy, e2;

          if (event && event.type == "mousemove") {
            if (x1 == x2 && y1 == y2) return;
            e2 = 2 * err;
            if (e2 >= dy) { err += dy; x1 += sx; }
            if (e2 <= dx) { err += dx; y1 += sy; }
          }
          while (true) {
            plot(x1, y1);
            if (x1 == x2 && y1 == y2) break;
            e2 = 2 * err;
            if (e2 >= dy) { err += dy; x1 += sx; }
            if (e2 <= dx) { err += dx; y1 += sy; }
          }
        }

        var color = mouse.buttons === 2 ? OWOP.player.rightSelectedColor : OWOP.player.selectedColor;
        switch (mouse.buttons) {
          case 2:
            if (event && event.ctrlKey) {
              var c = OWOP.world.getPixel(mouse.tileX, mouse.tileY);
              if (c) OWOP.player.rightSelectedColor = c;
              localStorage.setItem("rSC", JSON.stringify(OWOP.player.rightSelectedColor));
              break;
            }
          // falls through
          case 1:
            if (event && event.ctrlKey) {
              var c = OWOP.world.getPixel(mouse.tileX, mouse.tileY);
              OWOP.player.selectedColor = c;
              break;
            } else {
              if (!tool.extra.lastX || !tool.extra.lastY) {
                tool.extra.lastX = mouse.tileX;
                tool.extra.lastY = mouse.tileY;
              }
              line(tool.extra.lastX, tool.extra.lastY, mouse.tileX, mouse.tileY, 1, (x, y) => {
                var pixel = OWOP.world.getPixel(x, y);
                if (pixel !== null && !(color[0] === pixel[0] && color[1] === pixel[1] && color[2] === pixel[2])) {
                  PM.setPixel(x, y, color);
                }
              });
              tool.extra.lastX = mouse.tileX;
              tool.extra.lastY = mouse.tileY;
            } break;
          case 4:
            // since this is effectively the same as ctrl left click its disabled
            /*
            if (event && event.ctrlKey) {
              usedButtons |= 0b100;
              var c = OWOP.world.getPixel(mouse.tileX, mouse.tileY);
              if (c) {
                OWOP.player.selectedColor = c;
              }
            }
            */
            break;
        }
        return usedButtons;
      });
      tool.setEvent('mouseup', mouse => {
        tool.extra.lastX = null;
        tool.extra.lastY = null;
      });
      // palette switcher
      tool.setEvent('select', function () {
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

        document.getElementById("addPalette").onclick = function () {

          if (pName.value.length > 25) return alert("Your max name length is 25 characters.");
          if (pName.value.length == 0) return alert("Invalid Name");

          if (!localStorage.getItem("paletteJson")) {
            paletteJson[pName.value] = OWOP.player.palette;
            localStorage.setItem("paletteJson", JSON.stringify(paletteJson));
          } else {
            paletteJson = JSON.parse(localStorage.getItem("paletteJson"));
            if (paletteJson[pName.value]) {
              pName.value = "";
              return alert("You already have a coordinate with this name.");
            }
            paletteJson[pName.value] = OWOP.player.palette;
            localStorage.setItem("paletteJson", JSON.stringify(paletteJson));
          }

          var divPalette = document.createElement("tr");
          let pN = pName.value;
          divPalette.id = `im-busy${pN}`;
          divPalette.innerHTML = `<td id="coord-${pN}" style="cursor: pointer; padding: 5px; border: 1px solid white; border-radius: 5px; color: white;">${pN}</td> <td id="useT1-${pN}"><button id="useB1-${pN}">Use</button></td> <td id="useT2-${pN}"><button id="useB2-${pN}">Replace</button></td> <td id="useT3-${pN}"><button id="useB3-${pN}">Delete</button></td>`;
          document.getElementById("paletteTable").appendChild(divPalette);
          document.getElementById(`useB1-${pN}`).onclick = function () {
            let paletteJson = JSON.parse(localStorage.getItem("paletteJson"));
            OWOP.player.palette.splice(0);
            OWOP.player.palette.push(...paletteJson[pN]);
            OWOP.player.paletteIndex = OWOP.player.paletteIndex;
          }
          document.getElementById(`useB2-${pN}`).onclick = function () {
            if (!confirm(`Are you sure you want to REPLACE the palette ${pN}?`)) return;
            let paletteJson = JSON.parse(localStorage.getItem("paletteJson"));
            paletteJson[`${pN}`] = OWOP.player.palette;
            localStorage.setItem('paletteJson', JSON.stringify(paletteJson));
          }
          document.getElementById(`useB3-${pN}`).onclick = function () {
            if (!confirm(`Are you sure you want to DELETE the palette ${pN}?`)) return;
            let paletteJson = JSON.parse(localStorage.getItem("paletteJson"));
            document.getElementById(`coord-${pN}`).outerHTML = '';
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
            divPalette.innerHTML = `<td id="coord-${pN}" style="cursor: pointer; padding: 5px; border: 1px solid white; border-radius: 5px; color: white;">${pN}</td> <td id="useT1-${pN}"><button id="useB1-${pN}">Use</button></td> <td id="useT2-${pN}"><button id="useB2-${pN}">Replace</button></td> <td id="useT3-${pN}"><button id="useB3-${pN}">Delete</button></td>`;
            document.getElementById("paletteTable").appendChild(divPalette);
            document.getElementById(`useB1-${pN}`).onclick = function () {
              let paletteJson = JSON.parse(localStorage.getItem("paletteJson"));
              OWOP.player.palette.splice(0);
              OWOP.player.palette.push(...paletteJson[`${pN}`]);
              OWOP.player.paletteIndex = OWOP.player.paletteIndex;
            }
            document.getElementById(`useB2-${pN}`).onclick = function () {
              if (!confirm(`Are you sure you want to REPLACE the palette ${pN}?`)) return;
              let paletteJson = JSON.parse(localStorage.getItem("paletteJson"));
              paletteJson[`${pN}`] = OWOP.player.palette;
              localStorage.setItem('paletteJson', JSON.stringify(paletteJson));
            }
            document.getElementById(`useB3-${pN}`).onclick = function () {
              if (!confirm(`Are you sure you want to DELETE the palette ${pN}?`)) return;
              let paletteJson = JSON.parse(localStorage.getItem("paletteJson"));
              document.getElementById(`coord-${pN}`).outerHTML = '';
              document.getElementById(`im-busy${pN}`).outerHTML = '';
              delete paletteJson[pN];
              localStorage.setItem('paletteJson', JSON.stringify(paletteJson));
            }
          }
        }
      });
      tool.setEvent('deselect', function () {
        tool.extra.lastX = null;
        tool.extra.lastY = null;
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
    });
    /*
    addTool('Pipette', tool => {
      var color = mouse.buttons === 2 ? OWOP.player.rightSelectedColor : OWOP.player.selectedColor;
      switch (mouse.buttons) {
        case 2:
          var c = OWOP.world.getPixel(mouse.tileX, mouse.tileY);
          if (c) OWOP.player.rightSelectedColor = c;
          localStorage.setItem("rSC", JSON.stringify(OWOP.player.rightSelectedColor));
          break;
        // falls through
        case 1:
          var c = OWOP.world.getPixel(mouse.tileX, mouse.tileY);
          OWOP.player.selectedColor = c;
          break;
      }
      return usedButtons;
      tool.setEvent('mousedown mousemove', (mouse, event) => {
        if (mouse.buttons !== 0 && !(mouse.buttons & 0b100)) {
          var color = OWOP.world.getPixel(mouse.tileX, mouse.tileY);
          if (color) {
            OWOP.player.selectedColor = color;
          }
          return mouse.buttons;
        }
      });
    });
    */
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

      function dlarea(x, y, w, h, onblob) {
        var c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        var ctx = c.getContext('2d');
        var d = ctx.createImageData(w, h);
        for (var i = y; i < y + h; i++) {
          for (var j = x; j < x + w; j++) {
            var pix = misc.world.getPixel(j, i);
            if (!pix) continue;
            d.data[4 * ((i - y) * w + (j - x))] = pix[0];
            d.data[4 * ((i - y) * w + (j - x)) + 1] = pix[1];
            d.data[4 * ((i - y) * w + (j - x)) + 2] = pix[2];
            d.data[4 * ((i - y) * w + (j - x)) + 3] = 255;
          }
        }
        ctx.putImageData(d, 0, 0);
        c.toBlob(onblob);
      }

      tool.extra.start = null;
      tool.extra.end = null;
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
                tool.extra.start = null;
                tool.extra.end = null;
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
            tool.extra.start = null;
            tool.extra.end = null;
          }
        } else if (mouse.buttons === 2 && tool.extra.end && isInside()) {
          tool.extra.start = null;
          tool.extra.end = null;
          var cvs = dlarea(s[0], s[1], e[0] - s[0], e[1] - s[1], b => {
            var url = URL.createObjectURL(b);
            var img = new Image();
            var saveButton = null;
            img.onload = () => {
              windowSys.addWindow(new GUIWindow("Resulting image", {
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
            }
            img.src = url;
          });
        }
      });
    }));
    addChunker('Neko Eraser', tool => {
      function tick() {
        // for (let _$ = 0; _$ < 10; _$++) {
        let player = OWOP.player;
        let mouse = OWOP.mouse;
        let xchunk, ychunk;
        let a;
        let test = false;
        let xoffset, yoffset;
        let replacer = OWOP.player.buttonPressedDown[OWOP.player.buttonPressedDown.length - 1] == 2 ? player.rightSelectedColor : player.selectedColor;
        for (let y = 0; y < 16; y++) {
          for (let x = 0; x < 16; x++) {
            xchunk = Math.floor(mouse.tileX / 16) * 16; // top left corner of the chunk not the chunk number
            ychunk = Math.floor(mouse.tileY / 16) * 16;
            PM.setPixel(xchunk + x, ychunk + y, replacer);
            // a = OWOP.world.getPixel(xchunk + x, ychunk + y);
            // if (!(a[0] == replacer[0] && a[1] == replacer[1] && a[2] == replacer[2])) {
            //   xoffset = x;
            //   yoffset = y;
            //   test = true;
            //   break;
            // }
          }
          // if (test) break;
        }
        // if (!test) return false;
        // OWOP.world.setPixel(xchunk + xoffset, ychunk + yoffset, replacer);
        // }
      }
      tool.setEvent('mousedown', function (a0, a1) {
        OWOP.player.buttonPressedDown.indexOf(a1.button) === -1 ? OWOP.player.buttonPressedDown.push(a1.button) : null;
        tool.setEvent('tick', tick);
      });
      tool.setEvent('mouseup', function (a0, a1) {
        function isSame(t, e) {
          return t === e;
        }
        OWOP.player.buttonPressedDown = OWOP.player.buttonPressedDown.filter(e => !isSame(a1.button, e));
        OWOP.player.buttonPressedDown.length ? null : tool.setEvent('tick', null);
      });
      tool.setEvent('deselect', function (a0, a1) {
        OWOP.player.buttonPressedDown = [];
        tool.setEvent('tick', null);
      });
      tool.setEvent('keydown', function () {
        //console.log(arguments);
      });
    });
    addChunker('Neko Foreign Pixel Replacer', tool => {
      function tick() {
        for (let _$ = 0; _$ < 10; _$++) {
          let player = OWOP.player;
          let mouse = OWOP.mouse;
          let xchunk, ychunk;
          let a;
          let test = true;
          let xoffset, yoffset;
          let palette = player.palette;
          let bClick = OWOP.player.buttonPressedDown[OWOP.player.buttonPressedDown.length - 1];
          let replacer = bClick == 2 ? player.rightSelectedColor : player.selectedColor;
          for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
              xchunk = Math.floor(mouse.tileX / 16) * 16; // top left corner of the chunk not the chunk number
              ychunk = Math.floor(mouse.tileY / 16) * 16;
              a = OWOP.world.getPixel(xchunk + x, ychunk + y);
              test = true;
              for (let p = 0; p < palette.length; p++) {
                if ((a[0] == palette[p][0] && a[1] == palette[p][1] && a[2] == palette[p][2])) {
                  test = false;
                  break;
                }
              }
              if ((bClick == 2) && (a[0] == player.rightSelectedColor[0] && a[1] == player.rightSelectedColor[1] && a[2] == player.rightSelectedColor[2])) test = false;
              if (test) {
                xoffset = x;
                yoffset = y;
                break;
              }
            }
            if (test) break;
          }

          if (!test) return false;
          PM.setPixel(xchunk + xoffset, ychunk + yoffset, replacer);
        }
      }
      tool.setEvent('mousedown', function (a0, a1) {
        OWOP.player.buttonPressedDown.indexOf(a1.button) === -1 ? OWOP.player.buttonPressedDown.push(a1.button) : null;
        tool.setEvent('tick', tick);
      });
      tool.setEvent('mouseup', function (a0, a1) {
        function isSame(t, e) {
          return t === e;
        }
        OWOP.player.buttonPressedDown = OWOP.player.buttonPressedDown.filter(e => !isSame(a1.button, e));
        OWOP.player.buttonPressedDown.length ? null : tool.setEvent('tick', null);
      });
      tool.setEvent('deselect', function (a0, a1) {
        OWOP.player.buttonPressedDown = [];
        tool.setEvent('tick', null);
      });
      tool.setEvent('keydown', function () {
        //console.log(arguments);
      });
    });
    addCursor("Pixel Perfect", tool => {
      // cursor functionality
      tool.extra.lastX;
      tool.extra.lastY;
      tool.extra.last1PX;
      tool.extra.last1PY;
      tool.extra.last2PX;
      tool.extra.last2PY;
      tool.extra.start;
      tool.setEvent('mousedown mousemove', (mouse, event) => {
        var usedButtons = 0b11;
        let line = (x1, y1, x2, y2, size, plot) => {
          var dx = Math.abs(x2 - x1), sx = x1 < x2 ? 1 : -1;
          var dy = -Math.abs(y2 - y1), sy = y1 < y2 ? 1 : -1;
          var err = dx + dy, e2;

          if (event.type == "mousemove") {
            if (x1 == x2 && y1 == y2) return;
            e2 = 2 * err;
            if (e2 >= dy) { err += dy; x1 += sx; }
            if (e2 <= dx) { err += dx; y1 += sy; }
          }
          while (true) {
            plot(x1, y1);
            if (x1 == x2 && y1 == y2) break;
            e2 = 2 * err;
            if (e2 >= dy) { err += dy; x1 += sx; }
            if (e2 <= dx) { err += dx; y1 += sy; }
          }
        }
        const check = (x, y) => {
          if (tool.extra.last2PX == x && tool.extra.last2PY == y) return true;
          return false;
        }

        var color = mouse.buttons === 2 ? OWOP.player.rightSelectedColor : OWOP.player.selectedColor;
        switch (mouse.buttons) {
          case 2:
            if (event && event.ctrlKey) {
              var c = OWOP.world.getPixel(mouse.tileX, mouse.tileY);
              if (c) OWOP.player.rightSelectedColor = c;
              localStorage.setItem("rSC", JSON.stringify(OWOP.player.rightSelectedColor));
              break;
            }
          // falls through
          case 1:
            if (event && event.ctrlKey) {
              var c = OWOP.world.getPixel(mouse.tileX, mouse.tileY);
              OWOP.player.selectedColor = c;
              break;
            } else {
              if (!tool.extra.lastX || !tool.extra.lastY) {
                tool.extra.lastX = mouse.tileX;
                tool.extra.lastY = mouse.tileY;
                tool.extra.last1PX = mouse.tileX;
                tool.extra.last1PY = mouse.tileY;
                tool.extra.last2PX = mouse.tileX;
                tool.extra.last2PY = mouse.tileY;
                tool.extra.start = true;
              }
              line(tool.extra.lastX, tool.extra.lastY, mouse.tileX, mouse.tileY, 1, (x, y) => {
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
                      if (check(x + x1, y + y1)) {
                        tool.extra.last1PX = x;
                        tool.extra.last1PY = y;
                        return;
                      }
                    }
                  }
                }
                // place the pixel
                var pixel = OWOP.world.getPixel(tool.extra.last1PX, tool.extra.last1PY);
                if (pixel !== null) {
                  PM.setPixel(tool.extra.last1PX, tool.extra.last1PY, color);
                  tool.extra.last2PX = tool.extra.last1PX;
                  tool.extra.last2PY = tool.extra.last1PY;
                  tool.extra.last1PX = x;
                  tool.extra.last1PY = y;
                }
              });
              tool.extra.lastX = mouse.tileX;
              tool.extra.lastY = mouse.tileY;
            } break;
          case 4:
            // since this is effectively the same as ctrl left click its disabled
            /*
            if (event && event.ctrlKey) {
              usedButtons |= 0b100;
              var c = OWOP.world.getPixel(mouse.tileX, mouse.tileY);
              if (c) {
                OWOP.player.selectedColor = c;
              }
            }
            */
            break;
        }
        return usedButtons;
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
      tool.setEvent('select', function () {
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

        document.getElementById("addPalette").onclick = function () {

          if (pName.value.length > 25) return alert("Your max name length is 25 characters.");
          if (pName.value.length == 0) return alert("Invalid Name");

          if (!localStorage.getItem("paletteJson")) {
            paletteJson[pName.value] = OWOP.player.palette;
            localStorage.setItem("paletteJson", JSON.stringify(paletteJson));
          } else {
            paletteJson = JSON.parse(localStorage.getItem("paletteJson"));
            if (paletteJson[pName.value]) {
              pName.value = "";
              return alert("You already have a coordinate with this name.");
            }
            paletteJson[pName.value] = OWOP.player.palette;
            localStorage.setItem("paletteJson", JSON.stringify(paletteJson));
          }

          var divPalette = document.createElement("tr");
          let pN = pName.value;
          divPalette.id = `im-busy${pN}`;
          divPalette.innerHTML = `<td id="coord-${pN}" style="cursor: pointer; padding: 5px; border: 1px solid white; border-radius: 5px; color: white;">${pN}</td> <td id="useT1-${pN}"><button id="useB1-${pN}">Use</button></td> <td id="useT2-${pN}"><button id="useB2-${pN}">Replace</button></td> <td id="useT3-${pN}"><button id="useB3-${pN}">Delete</button></td>`;
          document.getElementById("paletteTable").appendChild(divPalette);
          document.getElementById(`useB1-${pN}`).onclick = function () {
            let paletteJson = JSON.parse(localStorage.getItem("paletteJson"));
            OWOP.player.palette.splice(0);
            OWOP.player.palette.push(...paletteJson[pN]);
            OWOP.player.paletteIndex = OWOP.player.paletteIndex;
          }
          document.getElementById(`useB2-${pN}`).onclick = function () {
            if (!confirm(`Are you sure you want to REPLACE the palette ${pN}?`)) return;
            let paletteJson = JSON.parse(localStorage.getItem("paletteJson"));
            paletteJson[`${pN}`] = OWOP.player.palette;
            localStorage.setItem('paletteJson', JSON.stringify(paletteJson));
          }
          document.getElementById(`useB3-${pN}`).onclick = function () {
            if (!confirm(`Are you sure you want to DELETE the palette ${pN}?`)) return;
            let paletteJson = JSON.parse(localStorage.getItem("paletteJson"));
            document.getElementById(`coord-${pN}`).outerHTML = '';
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
            divPalette.innerHTML = `<td id="coord-${pN}" style="cursor: pointer; padding: 5px; border: 1px solid white; border-radius: 5px; color: white;">${pN}</td> <td id="useT1-${pN}"><button id="useB1-${pN}">Use</button></td> <td id="useT2-${pN}"><button id="useB2-${pN}">Replace</button></td> <td id="useT3-${pN}"><button id="useB3-${pN}">Delete</button></td>`;
            document.getElementById("paletteTable").appendChild(divPalette);
            document.getElementById(`useB1-${pN}`).onclick = function () {
              let paletteJson = JSON.parse(localStorage.getItem("paletteJson"));
              OWOP.player.palette.splice(0);
              OWOP.player.palette.push(...paletteJson[`${pN}`]);
              OWOP.player.paletteIndex = OWOP.player.paletteIndex;
            }
            document.getElementById(`useB2-${pN}`).onclick = function () {
              if (!confirm(`Are you sure you want to REPLACE the palette ${pN}?`)) return;
              let paletteJson = JSON.parse(localStorage.getItem("paletteJson"));
              paletteJson[`${pN}`] = OWOP.player.palette;
              localStorage.setItem('paletteJson', JSON.stringify(paletteJson));
            }
            document.getElementById(`useB3-${pN}`).onclick = function () {
              if (!confirm(`Are you sure you want to DELETE the palette ${pN}?`)) return;
              let paletteJson = JSON.parse(localStorage.getItem("paletteJson"));
              document.getElementById(`coord-${pN}`).outerHTML = '';
              document.getElementById(`im-busy${pN}`).outerHTML = '';
              delete paletteJson[pN];
              localStorage.setItem('paletteJson', JSON.stringify(paletteJson));
            }
          }
        }
      });
      tool.setEvent('deselect', function () {
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
    });
    OWOP.tool.addToolObject(new OWOP.tool.class('Neko Area Protector', OWOP.cursors.selectprotect, OWOP.fx.player.NONE, OWOP.RANK.USER, tool => {
      const setPixel = OWOP.world.setPixel; // x, y, [r,g,b], ???;
      const getPixel = OWOP.world.getPixel; // x, y, [r,g,b], ???;
      const player = OWOP.player;
      const mouse = OWOP.mouse;

      let y = null;

      tool.setEvent('select', function () {
        console.log("select");
        console.log(arguments);
      });
      tool.setEvent('deselect', function () {
        console.log("deselect");
        console.log(arguments);
      });
      function windowFunc(wdw) {
        var divwindow = document.createElement("div")
        divwindow.style = "width: 395px; overflow-y: scroll; overflow-x: hidden; max-height: 150px;"
        divwindow.innerHTML = `<input id="cName" type="text" style="max-width: 100px; border: 0px;"  placeholder="Name"></input> <input id="cX" style="border: 0px; max-width: 60px;" type="number" placeholder="X"></input> <input id="cY" style="max-width: 60px; border: 0px;" type="number" placeholder="Y"></input>
          <button id="addCoord" >Add</button> <table id="coordTable" style="overflow-x: hidden; overflow-y: scroll;"> <tr> 
          <th style="padding: 5px; font-weight: 100; font-family: Arial; text-align: left; color: white;">Name</th> <th style="padding: 5px; font-weight: 100; font-family: Arial; text-align: left; color: white;">X</th> <th style="padding: 5px; font-weight: 100; font-family: Arial; text-align: left; color: white;">Y</th>
         </tr> </table>`
        wdw.addObj(divwindow)
      }
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

      // function dlarea(x, y, w, h, onblob) {
      //   var c = document.createElement('canvas');
      //   c.width = w;
      //   c.height = h;
      //   var ctx = c.getContext('2d');
      //   var d = ctx.createImageData(w, h);
      //   for (var i = y; i < y + h; i++) {
      //     for (var j = x; j < x + w; j++) {
      //       var pix = misc.world.getPixel(j, i);
      //       if (!pix) continue;
      //       d.data[4 * ((i - y) * w + (j - x))] = pix[0];
      //       d.data[4 * ((i - y) * w + (j - x)) + 1] = pix[1];
      //       d.data[4 * ((i - y) * w + (j - x)) + 2] = pix[2];
      //       d.data[4 * ((i - y) * w + (j - x)) + 3] = 255;
      //     }
      //   }
      //   ctx.putImageData(d, 0, 0);
      //   c.toBlob(onblob);
      // }

      tool.extra.start = null;
      tool.extra.end = null;
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
                tool.extra.start = null;
                tool.extra.end = null;
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
            tool.extra.start = null;
            tool.extra.end = null;
          }
        } else if (mouse.buttons === 2 && tool.extra.end && isInside()) {
          tool.extra.start = null;
          tool.extra.end = null;
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
              var pix = OWOP.world.getPixel(i, j);
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
    addCursor('Rainbow Cursor SC', tool => {
      // cursor functionality
      tool.extra.lastX;
      tool.extra.lastY;
      tool.extra.c = 0;
      tool.setEvent('mousedown mousemove', (mouse, event) => {
        var usedButtons = 0b11;
        let line = (x1, y1, x2, y2, size, plot) => {
          var dx = Math.abs(x2 - x1), sx = x1 < x2 ? 1 : -1;
          var dy = -Math.abs(y2 - y1), sy = y1 < y2 ? 1 : -1;
          var err = dx + dy, e2;

          if (event.type == "mousemove") {
            if (x1 == x2 && y1 == y2) return;
            e2 = 2 * err;
            if (e2 >= dy) { err += dy; x1 += sx; }
            if (e2 <= dx) { err += dx; y1 += sy; }
          }
          while (true) {
            plot(x1, y1);
            if (x1 == x2 && y1 == y2) break;
            e2 = 2 * err;
            if (e2 >= dy) { err += dy; x1 += sx; }
            if (e2 <= dx) { err += dx; y1 += sy; }
          }
        }

        switch (mouse.buttons) {
          case 2:
          case 1:
            if (tool.extra.lastX == mouse.tileX && tool.extra.lastY == mouse.tileY) break;
            if (!tool.extra.lastX || !tool.extra.lastY) {
              tool.extra.lastX = mouse.tileX;
              tool.extra.lastY = mouse.tileY;
            }
            line(tool.extra.lastX, tool.extra.lastY, mouse.tileX, mouse.tileY, 1, (x, y) => {
              var pixel = OWOP.world.getPixel(x, y);
              var color = hue(x - y); // hue(tool.extra.c++);
              if (pixel !== null && !(color[0] === pixel[0] && color[1] === pixel[1] && color[2] === pixel[2])) {
                OWOP.world.setPixel(x, y, color);
              }
            });
            tool.extra.lastX = mouse.tileX;
            tool.extra.lastY = mouse.tileY;
            break;
          case 4:
            if (event && event.ctrlKey) {
              usedButtons |= 0b100;
              var c = OWOP.world.getPixel(mouse.tileX, mouse.tileY);
              if (c) {
                OWOP.player.selectedColor = c;
              }
            }
            break;
        }
        return usedButtons;
      });
      tool.setEvent('mouseup deselect', mouse => {
        tool.extra.lastX = null;
        tool.extra.lastY = null;
      });
    });
    addCursor('Rainbow Cursor', tool => {
      // cursor functionality
      tool.extra.lastX;
      tool.extra.lastY;
      tool.extra.c = 0;
      tool.setEvent('mousedown mousemove', (mouse, event) => {
        var usedButtons = 0b11;
        let line = (x1, y1, x2, y2, size, plot) => {
          var dx = Math.abs(x2 - x1), sx = x1 < x2 ? 1 : -1;
          var dy = -Math.abs(y2 - y1), sy = y1 < y2 ? 1 : -1;
          var err = dx + dy, e2;

          if (event.type == "mousemove") {
            if (x1 == x2 && y1 == y2) return;
            e2 = 2 * err;
            if (e2 >= dy) { err += dy; x1 += sx; }
            if (e2 <= dx) { err += dx; y1 += sy; }
          }
          while (true) {
            plot(x1, y1);
            if (x1 == x2 && y1 == y2) break;
            e2 = 2 * err;
            if (e2 >= dy) { err += dy; x1 += sx; }
            if (e2 <= dx) { err += dx; y1 += sy; }
          }
        }

        switch (mouse.buttons) {
          case 2:
          case 1:
            if (tool.extra.lastX == mouse.tileX && tool.extra.lastY == mouse.tileY) break;
            if (!tool.extra.lastX || !tool.extra.lastY) {
              tool.extra.lastX = mouse.tileX;
              tool.extra.lastY = mouse.tileY;
            }
            line(tool.extra.lastX, tool.extra.lastY, mouse.tileX, mouse.tileY, 1, (x, y) => {
              var pixel = OWOP.world.getPixel(x, y);
              var color = hue(tool.extra.c++); // hue(tool.extra.c++);
              if (pixel !== null && !(color[0] === pixel[0] && color[1] === pixel[1] && color[2] === pixel[2])) {
                OWOP.world.setPixel(x, y, color);
              }
            });
            tool.extra.lastX = mouse.tileX;
            tool.extra.lastY = mouse.tileY;
            break;
          case 4:
            if (event && event.ctrlKey) {
              usedButtons |= 0b100;
              var c = OWOP.world.getPixel(mouse.tileX, mouse.tileY);
              if (c) {
                OWOP.player.selectedColor = c;
              }
            }
            break;
        }
        return usedButtons;
      });
      tool.setEvent('mouseup deselect', mouse => {
        tool.extra.lastX = null;
        tool.extra.lastY = null;
      });
    });
    addWand('Rainbow Line SC', tool => {
      var start = null;
      var end = null;
      var queue = [];
      tool.c = 0;
      function line(x1, y1, x2, y2, plot) {
        var dx = Math.abs(x2 - x1), sx = x1 < x2 ? 1 : -1;
        var dy = -Math.abs(y2 - y1), sy = y1 < y2 ? 1 : -1;
        var err = dx + dy, e2;

        while (true) {
          plot(x1, y1);
          if (x1 == x2 && y1 == y2) break;
          e2 = 2 * err;
          if (e2 >= dy) { err += dy; x1 += sx; }
          if (e2 <= dx) { err += dx; y1 += sy; }
        }
      }
      var defaultFx = OWOP.fx.player.RECT_SELECT_ALIGNED(1);
      tool.setFxRenderer((fx, ctx, time) => {
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = fx.extra.player.htmlRgb;
        if (!start || !end || !fx.extra.isLocalPlayer) {
          defaultFx(fx, ctx, time);
        } else {
          ctx.beginPath();
          line(start[0], start[1], end[0], end[1], (x, y) => {
            ctx.rect((x - camera.x) * camera.zoom, (y - camera.y) * camera.zoom, camera.zoom, camera.zoom);
          });
          ctx.stroke();
        }
      });
      function tick() {
        for (var painted = 0; painted < 3 && queue.length; painted++) {
          var current = queue.pop();
          var c = OWOP.world.getPixel(current[0], current[1]);
          var pc = current[2];
          if ((c[0] != pc[0] || c[1] != pc[1] || c[2] != pc[2]) && !OWOP.world.setPixel(current[0], current[1], current[2])) {
            queue.push(current);
            break;
          }
        }
        if (!queue.length) {
          start = null;
          end = null;
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
            end = null;
            return;
          }
          if (OWOP.player.rank == OWOP.RANK.ADMIN) {
            line(start[0], start[1], end[0], end[1], (x, y) => {
              var pixel = OWOP.world.getPixel(x, y);
              var color = hue(x - y);
              if (pixel !== null && !(color[0] === pixel[0] && color[1] === pixel[1] && color[2] === pixel[2])) {
                OWOP.world.setPixel(x, y, color);
              }
            });
            start = null;
            end = null;
          } else {
            line(start[0], start[1], end[0], end[1], (x, y) => {
              var pixel = OWOP.world.getPixel(x, y);
              var color = hue(x - y);
              if (pixel !== null && !(color[0] === pixel[0] && color[1] === pixel[1] && color[2] === pixel[2])) {
                queue.push([x, y, color]);
              }
            });
            tool.setEvent('tick', tick);
          }
        }
      });
      tool.setEvent('deselect', mouse => {
        queue = [];
        start = null;
        end = null;
        tool.setEvent('tick', null);
      });
    });
    addWand('Rainbow Line', tool => {
      var start = null;
      var end = null;
      var queue = [];
      tool.c = 0;
      function line(x1, y1, x2, y2, plot) {
        var dx = Math.abs(x2 - x1), sx = x1 < x2 ? 1 : -1;
        var dy = -Math.abs(y2 - y1), sy = y1 < y2 ? 1 : -1;
        var err = dx + dy, e2;

        while (true) {
          plot(x1, y1);
          if (x1 == x2 && y1 == y2) break;
          e2 = 2 * err;
          if (e2 >= dy) { err += dy; x1 += sx; }
          if (e2 <= dx) { err += dx; y1 += sy; }
        }
      }
      var defaultFx = OWOP.fx.player.RECT_SELECT_ALIGNED(1);
      tool.setFxRenderer((fx, ctx, time) => {
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = fx.extra.player.htmlRgb;
        if (!start || !end || !fx.extra.isLocalPlayer) {
          defaultFx(fx, ctx, time);
        } else {
          ctx.beginPath();
          line(start[0], start[1], end[0], end[1], (x, y) => {
            ctx.rect((x - camera.x) * camera.zoom, (y - camera.y) * camera.zoom, camera.zoom, camera.zoom);
          });
          ctx.stroke();
        }
      });
      function tick() {
        for (var painted = 0; painted < 3 && queue.length; painted++) {
          var current = queue.pop();
          var c = OWOP.world.getPixel(current[0], current[1]);
          var pc = current[2];
          if ((c[0] != pc[0] || c[1] != pc[1] || c[2] != pc[2]) && !OWOP.world.setPixel(current[0], current[1], current[2])) {
            queue.push(current);
            break;
          }
        }
        if (!queue.length) {
          start = null;
          end = null;
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
            end = null;
            return;
          }
          if (OWOP.player.rank == OWOP.RANK.ADMIN) {
            line(start[0], start[1], end[0], end[1], (x, y) => {
              var pixel = OWOP.world.getPixel(x, y);
              var color = hue(x - y);
              if (pixel !== null && !(color[0] === pixel[0] && color[1] === pixel[1] && color[2] === pixel[2])) {
                OWOP.world.setPixel(x, y, color);
              }
            });
            start = null;
            end = null;
          } else {
            line(start[0], start[1], end[0], end[1], (x, y) => {
              var pixel = OWOP.world.getPixel(x, y);
              var color = hue(tool.c++);
              if (pixel !== null && !(color[0] === pixel[0] && color[1] === pixel[1] && color[2] === pixel[2])) {
                queue.push([x, y, color]);
              }
            });
            tool.setEvent('tick', tick);
          }
        }
      });
      tool.setEvent('deselect', mouse => {
        queue = [];
        start = null;
        end = null;
        tool.setEvent('tick', null);
      });
    });
    addFill('Rainbow Fill SC', tool => {
      tool.extra.tickAmount = 9;
      var queue = [];
      var fillingColor = null;
      var defaultFx = OWOP.fx.player.RECT_SELECT_ALIGNED(1);
      tool.setFxRenderer((fx, ctx, time) => {
        ctx.globalAlpha = 0.8;
        var z = camera.zoom;
        if (!fillingColor || !fx.extra.isLocalPlayer) {
          defaultFx(fx, ctx, time);
        } else {
          ctx.beginPath();
          for (var i = 0; i < queue.length; i++) {
            let x = queue[i][0] - camera.x;
            let y = queue[i][1] - camera.y;
            //ctx.strokeStyle = rgb(...hue(x - y)); // this really lags
            ctx.strokeStyle = fx.extra.player.htmlRgb
            ctx.stroke();
            ctx.rect(x * z, y * z, z, z);
          }
        }
      });
      function tick() {
        const eq = (a, b) => a && b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
        const check = (x, y) => {
          if (eq(OWOP.world.getPixel(x, y), fillingColor)) {
            queue.unshift([x, y]);
            return true;
          }
          return false;
        }

        if (!queue.length || !fillingColor) {
          return;
        }

        var tickAmount = tool.extra.tickAmount;

        for (var painted = 0; painted < tickAmount && queue.length; painted++) {
          var current = queue.pop();
          var x = current[0];
          var y = current[1];
          var selClr = hue(x - y);
          var thisClr = OWOP.world.getPixel(x, y);
          if (eq(thisClr, fillingColor) && !eq(thisClr, selClr)) {
            if (!OWOP.world.setPixel(x, y, selClr)) {
              queue.push(current);
              break;
            }

            // diamond check first
            var top = check(x, y - 1);
            var bottom = check(x, y + 1);
            var left = check(x - 1, y);
            var right = check(x + 1, y);

            // if corners are not closed by parts of the diamond, then they can be accessed
            if (top && left) {
              check(x - 1, y - 1);
            }
            if (top && right) {
              check(x + 1, y - 1);
            }
            if (bottom && left) {
              check(x - 1, y + 1);
            }
            if (bottom && right) {
              check(x + 1, y + 1);
            }

            // Shape diamond, infra not like
            /*check(x    , y - 1);
            check(x - 1, y    );
            check(x + 1, y    );
            check(x    , y + 1);*/
          }
        }
      }
      tool.setEvent('mousedown', mouse => {
        if (!(mouse.buttons & 0b100)) {
          fillingColor = OWOP.world.getPixel(mouse.tileX, mouse.tileY);
          if (fillingColor) {
            queue.push([mouse.tileX, mouse.tileY]);
            tool.setEvent('tick', tick);
          }
        }
      });
      tool.setEvent('mouseup deselect', mouse => {
        if (!mouse || !(mouse.buttons & 0b1)) {
          fillingColor = null;
          queue = [];
          tool.setEvent('tick', null);
        }
      });
    });
    addFill('Checkered Fill', tool => {
      tool.extra.tickAmount = 9;
      tool.extra.queue = [];
      tool.extra.usedQueue = {};
      tool.extra.fillingColor = null;
      tool.setFxRenderer((fx, ctx, time) => {
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = fx.extra.player.htmlRgb;
        var z = camera.zoom;
        if (!tool.extra.fillingColor || !fx.extra.isLocalPlayer) {
          OWOP.fx.player.RECT_SELECT_ALIGNED(1)(fx, ctx, time);
        } else {
          ctx.beginPath();
          for (var i = 0; i < tool.extra.queue.length; i++) {
            OWOP.eee = tool.extra.queue.length;
            ctx.rect((tool.extra.queue[i][0] - camera.x) * z, (tool.extra.queue[i][1] - camera.y) * z, z, z);
          }
          ctx.stroke();
        }
      });
      function tick(t) {
        const eq = (a, b) => a && b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
        const check = (x, y) => {
          if (tool.extra.usedQueue[`${x},${y}`]) return false;
          if (eq(OWOP.world.getPixel(x, y), tool.extra.fillingColor)) {
            tool.extra.queue.unshift([x, y]);
            return true;
          }
          return false;
        }

        if (!tool.extra.queue.length || !tool.extra.fillingColor) {
          return;
        }

        var selClr = OWOP.player.selectedColor;
        var tickAmount = tool.extra.tickAmount * 2;
        for (var painted = 0; painted < tickAmount && tool.extra.queue.length; painted++) {
          var current = tool.extra.queue[tool.extra.queue.length - 1];
          var x = current[0];
          var y = current[1];
          if (tool.extra.usedQueue[`${x},${y}`]) {
            tool.extra.queue.pop();
            tickAmount++;
            continue;
          }
          let xchunk = Math.floor(x / 16);
          let ychunk = Math.floor(y / 16);
          if (OWOP.misc._world.protectedChunks[`${xchunk},${ychunk}`]) {
            tool.extra.usedQueue[`${x},${y}`] = true;
            tool.extra.queue.pop();
            tickAmount++;
            continue;
          }
          var thisClr = OWOP.world.getPixel(x, y);
          if (eq(thisClr, tool.extra.fillingColor) && !eq(thisClr, selClr)) {
            if ((x + y) - 2 * Math.floor((x + y) / 2) == t) {
              if (OWOP.world.setPixel(x, y, selClr)) {
                tool.extra.usedQueue[`${x},${y}`] = true;
                tool.extra.queue.pop();
              } else {
                break;
              }
            } else {
              tool.extra.usedQueue[`${x},${y}`] = true;
              tool.extra.queue.pop();
              tickAmount++;
            }

            // diamond check first
            var top = check(x, y - 1);
            var bottom = check(x, y + 1);
            var left = check(x - 1, y);
            var right = check(x + 1, y);

            // if corners are not closed by parts of the diamond, then they can be accessed
            if (top && left) {
              check(x - 1, y - 1);
            }
            if (top && right) {
              check(x + 1, y - 1);
            }
            if (bottom && left) {
              check(x - 1, y + 1);
            }
            if (bottom && right) {
              check(x + 1, y + 1);
            }

            // Shape diamond, infra not like
            /*check(x    , y - 1);
            check(x - 1, y    );
            check(x + 1, y    );
            check(x    , y + 1);*/
          }
        }
      }
      tool.setEvent('mousedown', mouse => {
        if (!(mouse.buttons & 0b100)) {
          tool.extra.fillingColor = OWOP.world.getPixel(mouse.tileX, mouse.tileY);
          if (tool.extra.fillingColor) {
            tool.extra.queue.push([mouse.tileX, mouse.tileY]);
            let t = (mouse.tileX + mouse.tileY) - 2 * Math.floor((mouse.tileX + mouse.tileY) / 2);
            tool.setEvent('tick', () => tick(t));
          }
        }
      });
      tool.setEvent('mouseup deselect', mouse => {
        if (!mouse || !(mouse.buttons & 0b1)) {
          tool.extra.fillingColor = null;
          tool.extra.queue = [];
          tool.extra.usedQueue = {};
          tool.setEvent('tick', null);
        }
      });
    });
    addCursor('Gradient Cursor', tool => {

    });
    addWand('Gradient Wand', tool => {
      var start = null;
      var end = null;
      var queue = [];
      var lineLength = 0;
      function line(x1, y1, x2, y2, plot) {
        var dx = Math.abs(x2 - x1), sx = x1 < x2 ? 1 : -1;
        var dy = -Math.abs(y2 - y1), sy = y1 < y2 ? 1 : -1;
        var err = dx + dy, e2;
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
          line(start[0], start[1], end[0], end[1], (x, y) => {
            lineLength++;
            ctx.rect((x - camera.x) * camera.zoom, (y - camera.y) * camera.zoom, camera.zoom, camera.zoom);
          });
          ctx.stroke();
        }
      });
      function tick() {
        for (var painted = 0; painted < 3 && queue.length; painted++) {
          var current = queue.pop();
          var c = OWOP.world.getPixel(current[0], current[1]);
          if ((c[0] != current[2][0] || c[1] != current[2][1] || c[2] != current[2][2]) && !OWOP.world.setPixel(current[0], current[1], current[2])) {
            queue.push(current);
            break;
          }
        }
        if (!queue.length) {
          start = null;
          end = null;
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
            end = null;
            return;
          }
          if (OWOP.player.rank == OWOP.RANK.ADMIN) {
            return console.log("y u an admin...");
            line(start[0], start[1], end[0], end[1], (x, y) => {
              OWOP.world.setPixel(x, y, player.selectedColor);
            });
            start = null;
            end = null;
          } else {
            let sc = OWOP.world.getPixel(start[0], start[1]);
            let pc = mouse.buttons === 2 ? OWOP.player.rightSelectedColor : OWOP.player.selectedColor;
            line(start[0], start[1], end[0], end[1], (x, y, i) => {
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
        start = null;
        end = null;
        tool.setEvent('tick', null);
      });
    });
    addFill('Gradient Fill', tool => {

    });
    OWOP.tool.addToolObject(new OWOP.tool.class('Queue Adder', OWOP.cursors.select, OWOP.fx.player.NONE, OWOP.RANK.NONE, tool => {
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

      // function dlarea(x, y, w, h, onblob) {
      //   var c = document.createElement('canvas');
      //   c.width = w;
      //   c.height = h;
      //   var ctx = c.getContext('2d');
      //   var d = ctx.createImageData(w, h);
      //   for (var i = y; i < y + h; i++) {
      //     for (var j = x; j < x + w; j++) {
      //       var pix = misc.world.getPixel(j, i);
      //       if (!pix) continue;
      //       d.data[4 * ((i - y) * w + (j - x))] = pix[0];
      //       d.data[4 * ((i - y) * w + (j - x)) + 1] = pix[1];
      //       d.data[4 * ((i - y) * w + (j - x)) + 2] = pix[2];
      //       d.data[4 * ((i - y) * w + (j - x)) + 3] = 255;
      //     }
      //   }
      //   ctx.putImageData(d, 0, 0);
      //   c.toBlob(onblob);
      // }

      tool.extra.start = null;
      tool.extra.end = null;
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
                tool.extra.start = null;
                tool.extra.end = null;
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
            tool.extra.start = null;
            tool.extra.end = null;
          }
        } else if (mouse.buttons === 2 && tool.extra.end && isInside()) {
          tool.extra.start = null;
          tool.extra.end = null;
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
              var pix = OWOP.world.getPixel(i, j);
              PM.setPixel(i, j, pix);
              // if (totalAdded >= limit) continue;
              // var pix = OWOP.world.getPixel(i, j);
              // if (!pix) continue;
              // for (let k = 0; k < OWOP.player.palette.length; k++) {
              //   var c = OWOP.player.palette[k];
              //   if (c[0] == pix[0] && c[1] == pix[1] && c[2] == pix[2]) {
              //     test = true;
              //     break;
              //   }
              // }
              // if (test) {
              //   test = false;
              //   continue;
              // }
              // OWOP.player.palette.push(pix);
              // totalAdded++;
            }
          }
        }
      });
    }));
    OWOP.tool.addToolObject(new OWOP.tool.class('Queue Filler', OWOP.cursors.select, OWOP.fx.player.NONE, OWOP.RANK.NONE, tool => {
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

      // function dlarea(x, y, w, h, onblob) {
      //   var c = document.createElement('canvas');
      //   c.width = w;
      //   c.height = h;
      //   var ctx = c.getContext('2d');
      //   var d = ctx.createImageData(w, h);
      //   for (var i = y; i < y + h; i++) {
      //     for (var j = x; j < x + w; j++) {
      //       var pix = misc.world.getPixel(j, i);
      //       if (!pix) continue;
      //       d.data[4 * ((i - y) * w + (j - x))] = pix[0];
      //       d.data[4 * ((i - y) * w + (j - x)) + 1] = pix[1];
      //       d.data[4 * ((i - y) * w + (j - x)) + 2] = pix[2];
      //       d.data[4 * ((i - y) * w + (j - x)) + 3] = 255;
      //     }
      //   }
      //   ctx.putImageData(d, 0, 0);
      //   c.toBlob(onblob);
      // }

      tool.extra.start = null;
      tool.extra.end = null;
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
                tool.extra.start = null;
                tool.extra.end = null;
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
            tool.extra.start = null;
            tool.extra.end = null;
          }
        } else if (mouse.buttons === 2 && tool.extra.end && isInside()) {
          tool.extra.start = null;
          tool.extra.end = null;
          let test = false;
          // (s[0], s[1], e[0] - s[0], e[1] - s[1])
          let x = s[0];
          let y = s[1];
          let w = e[0] - s[0];
          let h = e[1] - s[1];
          let totalAdded = 0;
          let limit = 50;
          var pix = OWOP.player.selectedColor;
          for (var i = x; i < x + w; i++) {
            for (var j = y; j < y + h; j++) {
              // var pix = OWOP.world.getPixel(i, j);
              PM.setPixel(i, j, pix);
              // if (totalAdded >= limit) continue;
              // var pix = OWOP.world.getPixel(i, j);
              // if (!pix) continue;
              // for (let k = 0; k < OWOP.player.palette.length; k++) {
              //   var c = OWOP.player.palette[k];
              //   if (c[0] == pix[0] && c[1] == pix[1] && c[2] == pix[2]) {
              //     test = true;
              //     break;
              //   }
              // }
              // if (test) {
              //   test = false;
              //   continue;
              // }
              // OWOP.player.palette.push(pix);
              // totalAdded++;
            }
          }
        }
      });
    }));
    OWOP.tool.addToolObject(new OWOP.tool.class('Queue Clearer', OWOP.cursors.select, OWOP.fx.player.NONE, OWOP.RANK.NONE, tool => {
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

      // function dlarea(x, y, w, h, onblob) {
      //   var c = document.createElement('canvas');
      //   c.width = w;
      //   c.height = h;
      //   var ctx = c.getContext('2d');
      //   var d = ctx.createImageData(w, h);
      //   for (var i = y; i < y + h; i++) {
      //     for (var j = x; j < x + w; j++) {
      //       var pix = misc.world.getPixel(j, i);
      //       if (!pix) continue;
      //       d.data[4 * ((i - y) * w + (j - x))] = pix[0];
      //       d.data[4 * ((i - y) * w + (j - x)) + 1] = pix[1];
      //       d.data[4 * ((i - y) * w + (j - x)) + 2] = pix[2];
      //       d.data[4 * ((i - y) * w + (j - x)) + 3] = 255;
      //     }
      //   }
      //   ctx.putImageData(d, 0, 0);
      //   c.toBlob(onblob);
      // }

      tool.extra.start = null;
      tool.extra.end = null;
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
                tool.extra.start = null;
                tool.extra.end = null;
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
            tool.extra.start = null;
            tool.extra.end = null;
          }
        } else if (mouse.buttons === 2 && tool.extra.end && isInside()) {
          tool.extra.start = null;
          tool.extra.end = null;
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
              var pix = OWOP.world.getPixel(i, j);
              PM.unsetPixel(i, j);
              // if (totalAdded >= limit) continue;
              // var pix = OWOP.world.getPixel(i, j);
              // if (!pix) continue;
              // for (let k = 0; k < OWOP.player.palette.length; k++) {
              //   var c = OWOP.player.palette[k];
              //   if (c[0] == pix[0] && c[1] == pix[1] && c[2] == pix[2]) {
              //     test = true;
              //     break;
              //   }
              // }
              // if (test) {
              //   test = false;
              //   continue;
              // }
              // OWOP.player.palette.push(pix);
              // totalAdded++;
            }
          }
        }
      });
    }));
    OWOP.tool.addToolObject(new OWOP.tool.class('Paste', OWOP.cursors.paste, OWOP.fx.player.NONE, OWOP.RANK.USER, tool => {
      let p0 = document.createElement('canvas');
      let cM = OWOP.require("canvas_renderer");
      p0.width = 0;
      p0.height = 0;
      let p1 = p0.getContext('2d');
      let p2 = [];
      tool.setFxRenderer(function (p6, p7, p8) {
        let p9 = OWOP.camera.zoom;
        let pp = p6.extra.player.x;
        let pD = p6.extra.player.y;
        let pw = Math.floor(pp / 16) - OWOP.camera.x;
        let pH = Math.floor(pD / 16) - OWOP.camera.y;

        // if (p2.length) {
        //   p7.globalAlpha = 0.8;

        //for (let pS = 0; pS < p2.length; pS++) {
        //    p7.strokeStyle = C.toHTML(p2[pS][2]);
        //    p7.strokeRect((p2[pS][0] - OWOP.camera.x) * p9, (p2[pS][1] - OWOP.camera.y) * p9, p9, p9);
        //}

        //   return 0;
        // }

        if (p6.extra.isLocalPlayer && p0.width && p0.height) {
          p7.globalAlpha = 0.5 + Math.sin(p8 / 500) / 4;
          p7.strokeStyle = '#000000';
          p7.scale(p9, p9);
          p7.drawImage(p0, pw, pH);
          p7.scale(1 / p9, 1 / p9);
          p7.globalAlpha = 0.8;
          p7.strokeRect(pw * p9, pH * p9, p0.width * p9, p0.height * p9);
          return 0;
        }
      });

      function p4(p6, p7, p8) {
        return p6 * (1 - p8) + p7 * p8;
      }

      function p5(p6, p7) {
        let p8 = p1.getImageData(0, 0, p0.width, p0.height).data;

        for (let p9 = 0; p9 < p0.height; p9++) {
          for (let pp = 0; pp < p0.width; pp++) {
            let pD = (p9 * p0.width + pp) * 4;
            let pw = OWOP.world.getPixel(pp + p6, p9 + p7);
            if (!pw) continue;
            let pH = p8[pD + 3] / 255;
            let color = [p4(pw[0], p8[pD + 0], pH), p4(pw[1], p8[pD + 1], pH), p4(pw[2], p8[pD + 2], pH)];
            // if (color[0] === pw[0] && color[1] === pw[1] && color[2] === pw[2]) continue;
            // p2.push([pp + p6, p9 + p7, color]);
            PM.setPixel(pp + p6, p9 + p7, color);
          }
        }
      }

      tool.setEvent('select', function () {
        let p6 = document.createElement('input');
        p6.type = 'file';
        p6.accept = 'image/*';
        p6.addEventListener('change', function () {
          if (!p6.files || !p6.files[0]) return;
          let p7 = new FileReader();
          p7.addEventListener('load', function () {
            let p8 = new Image();
            p8.src = p7.result;
            p8.addEventListener('load', function () {
              p0.width = p8.width;
              p0.height = p8.height;
              p1.drawImage(p8, 0, 0);
            });
          });
          p7.readAsDataURL(p6.files[0]);
        });
        p6.click();
      });
      tool.setEvent('mousedown', function (mouse) {
        if (mouse.buttons & 1) p5(mouse.tileX, mouse.tileY);
      });
      function move(x, y, startX, startY) {
        cM.moveCameraBy((startX - x) / 16, (startY - y) / 16);
      }
      tool.setEvent('mousemove', (mouse, event) => {
        if (mouse.buttons !== 0) {
          move(mouse.worldX, mouse.worldY, mouse.mouseDownWorldX, mouse.mouseDownWorldY);
          return mouse.buttons;
        }
      });
      tool.setEvent('scroll', (mouse, event, rawEvent) => {
        if (!rawEvent.ctrlKey) {
          var dx = Math.max(-500, Math.min(event.spinX * 16, 500));
          var dy = Math.max(-500, Math.min(event.spinY * 16, 500));
          var pxAmount = OWOP.camera.zoom//Math.max(camera.zoom, 2);
          cM.moveCameraBy(dx / pxAmount, dy / pxAmount);
          return true;
        }
      });
    }));
    delete OWOP.tool.allTools["neko area protector"];
    delete OWOP.tool.allTools["Gradient Cursor"];
    delete OWOP.tool.allTools["Gradient Fill"];
    OWOP.tool.updateToolbar();

    // teleport detector
    OWOP.playerList = {};
    function tick() {
      let players = OWOP.require("main").playerList;
      let playersFixed = {};
      playersFixed[OWOP.player.id] = {
        id: OWOP.player.id,
        x: OWOP.mouse.tileX,
        y: OWOP.mouse.tileY,
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
      for (let player in players) {
        let p1 = OWOP.playerList[player];
        let p2 = players[player];

        if (Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2) > 2000) {
          //console.log("someone teleported", p2.id,  p2.x, p2.y);
          //OWOP.chat.local(`${player} Teleported from ${p1.x} ${p1.y} to ${p2.x} ${p2.y}`);
        }
        p1.x = p2.x;
        p1.y = p2.y;
      }
      return players;
    }
    setInterval(tick, 10);

    setInterval(() => {
      let k = document.getElementById("chat-messages").children;
      for (let i = 0; i < k.length; i++) {
        let t = k[i].innerHTML;
        let id = OWOP.player.id;
        if (!t.match(`(\\[${id}\\]: )|(${id}: )`) && !!t.match(`${id}`)) k[i].style = "background: #FF404059;";
      }
    }, 100);
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
    return "#" + [r, g, b].map(function (v) {
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
        // console.log("rixit : " + rixit);
        // console.log("result before : " + result);
        result = this._Rixits.charAt(rixit) + result;
        // console.log("result after : " + result);
        // console.log("residual before : " + residual);
        residual = Math.floor(residual / 64);
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
        result = (result * 64) + this._Rixits.indexOf(rixits[e]);
        // console.log("result after : " + result);
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
    }
  }

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
    element1.style.background = `#${arr[0].toString(16).padStart(2, "0")}${arr[1].toString(16).padStart(2, "0")}${arr[2].toString(16).padStart(2, "0")}`;
    element3.textContent = `Your ID:${OWOP.player.id}`;
  }, 10);
  setInterval(() => {
    let k = document.getElementById("chat-messages").children;
    for (let i = 0; i < k.length; i++) {
      let t = k[i].innerHTML;
      let id = OWOP.player.id;
      if (!t.match(`(\\[${id}\\]: )|(${id}: )`) && !!t.match(`${id}`)) k[i].style = "background: #FF404059;";
    }
  }, 100);
  OWOP.windowSys.class.window.prototype.move = (function (t, e) { document.getElementById('windows').appendChild(this.frame); document.getElementById('windows').appendChild(OWOP.windowSys.windows.Tools.frame); return this.opt.immobile || (this.frame.style.transform = "translate(" + t + "px," + e + "px)", this.x = t, this.y = e), this }); Object.keys(OWOP.windowSys.windows).forEach(e => OWOP.windowSys.windows[e].move = (function (t, e) { document.getElementById('windows').appendChild(this.frame); document.getElementById('windows').appendChild(OWOP.windowSys.windows.Tools.frame); return this.opt.immobile || (this.frame.style.transform = "translate(" + t + "px," + e + "px)", this.x = t, this.y = e), this }));

  console.log("Neko's Scripts Loaded.");
}
setTimeout(install, 10 * 1000);
