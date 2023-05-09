// ==UserScript==
// @name         Neko's Scripts
// @namespace    http://tampermonkey.net/
// @version      0.13.1
// @description  Script for OWOP
// @author       Neko
// @match        https://ourworldofpixels.com/*
// @exclude      https://ourworldofpixels.com/api*
// @run-at       document-start
// @icon         https://www.google.com/s2/favicons?sz=64&domain=ourworldofpixels.com
// @grant        none
// @unwrap
// ==/UserScript==

'use strict';
/*global OWOP*/
const NS = {};
if (window) window.NS = NS;

{
	// Thanks Lapis
	NS.modules = [];
	let originalFunction = Object.defineProperty;
	Object.defineProperty = function (object, property, info) {
		let x = originalFunction(object, property, info);
		if (!object["__esModule"]) return x;
		NS.modules.push(object);
		if (NS.modules.length === 43) Object.defineProperty = originalFunction;
		return x;
	}
	0, 13, 14, 15, 16, 20, 21, 22, 23, 24, 25;
	// Thanks again Lapis
}

{
	let k = EventTarget.prototype.addEventListener;
	EventTarget["_eventlists"] = [];
	EventTarget.prototype.addEventListener = function (r, i, e) {
		if (EventTarget._eventlists) EventTarget._eventlists.push(i);
		return k.bind(this)(...arguments);
	};

	let l = EventTarget.prototype.removeEventListener;
	EventTarget.prototype.removeEventListener = function () {
		return l.bind(this)(...arguments);
	};
}

function install() {
	class Point {
		constructor(x, y) {
			this.x = x;
			this.y = y;
		}
		static distance(p1, p2) {
			if (p1 instanceof Point && p2 instanceof Point) return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
		}
	}

	class BPoint extends Point {
		constructor(x, y) {
			super(x, y);
			this.bottom = false;
			this.right = false;
		}
		static check(bp1, bp2, direction) {
			let p1 = NS.PM.queue[`${bp1.x},${bp1.y}`];
			let p2 = NS.PM.queue[`${bp2.x},${bp2.y}`];
			let d = false;
			if ((!!p1 && !p2) || (!p1 && !!p2)) d = true;
			return bp1[direction] = d;
		}
	}

	class Color {
		static compare(c1, c2) {
			return (c1[0] == c2[0] && c1[1] == c2[1] && c1[2] == c2[2]);
		}
	}

	class Pixel extends Point {
		constructor(x, y, c, o = false) {
			super(x, y);
			this.c = c;
			this.o = o;
			this.placed = false;
		}
		static compare(p1, p2) {
			return (p1.x == p2.x && p1.y == p2.y) && Color.compare(p1.c, p2.c);
		}
	}

	class Action {
		constructor(p1, p2) {
			this.x = p1.x;
			this.y = p1.y;
			this.before_color = p1.c;
			this.after_color = p2.c;
		}
		undo() {
			return this.before_color;
		}
		redo() {
			return this.after_color;
		}
	}

	class PixelManager {
		constructor() {
			this.undoStack = [];
			this.redoStack = [];
			this.actionStack = {};
			this.record = false;
			this.queue = {};
			this.chunkQueueTemp = {};
			this.border = {};
			this.borderCheck = true;
			this.renderBorder = false;
			this.autoMove = false;
			this.whitelist = {};
			this.enabled = true;
			this.extra = {};
			this.extra.placeData = [];
			let p1 = new Point(0, 0);
			for (let y = -47; y < 47; y++) {
				for (let x = -47; x < 47; x++) {
					let p2 = new Point(x, y);
					let d = Point.distance(p1, p2);
					// d = Math.random();
					this.extra.placeData.push([d, p2]);
				}
			}
			this.extra.placeData.sort((a, b) => a[0] - b[0]);
			NS.M14.eventSys.addListener(NS.M13.EVENTS.tick, function () { this.enabled ? this.placePixel() : void 0 }.bind(this));
			NS.M14.eventSys.addListener(NS.M13.EVENTS.net.world.tilesUpdated, function (message) {
				for (let i = 0; i < message.length; i++) {
					let p = message[i];
					let placedColor = [(p.rgb & (255 << 0)) >> 0, (p.rgb & (255 << 8)) >> 8, (p.rgb & (255 << 16)) >> 16];
					if (Object.keys(this.whitelist).includes(`${p.id}`)) this.setPixel(p.x, p.y, placedColor);
					let pixel = this.queue[`${p.x},${p.y}`];
					if (pixel) (this.borderCheck = true, pixel.placed = false, this.chunkQueueTemp[`${Math.floor(p.x / 16)},${Math.floor(p.y / 16)}`] = true, this.updateBorder(p.x, p.y));
				}
			}.bind(this));
			NS.M14.eventSys.addListener(NS.M13.EVENTS.net.world.leave, function () {
				OWOP.sounds.play(OWOP.sounds.launch);
				this.disable();
				// this.border = {};
				console.log(arguments, "leave");
			}.bind(this));
			NS.M14.eventSys.addListener(NS.M13.EVENTS.net.world.join, function () {
				this.enable();
				console.log(arguments, "join");
			}.bind(this));
		}
		moveToNext() {
			if (!this.autoMove) return;
			if (!this.borderCheck) return;
			for (let e in this.chunkQueueTemp) {
				if (this.chunkQueueTemp[e]) {
					let [x, y] = e.split(",");
					for (let i = 0; i < 16; i++) {
						for (let j = 0; j < 16; j++) {
							if (this.queue[`${x * 16 + i},${y * 16 + j}`]?.placed === false) return NS.M20.centerCameraTo(x * 16 + i, y * 16 + j);
						}
					}
					this.chunkQueueTemp[e] = false;
				}
			}
			this.borderCheck = false;
		}
		updateBorder(x, y) {
			let p = this.border[`${x},${y}`];
			if (!p) p = this.border[`${x},${y}`] = new BPoint(x, y);

			let t = this.border[`${x},${y - 1}`];
			let l = this.border[`${x - 1},${y}`];
			let b = this.border[`${x},${y + 1}`];
			let r = this.border[`${x + 1},${y}`];

			if (!t) t = new BPoint(x, y - 1);
			if (!l) l = new BPoint(x - 1, y);
			if (!b) b = new BPoint(x, y + 1);
			if (!r) r = new BPoint(x + 1, y);
			if (BPoint.check(t, p, "bottom") && (t.bottom || t.right)) this.border[`${x},${y - 1}`] = t;
			if (BPoint.check(l, p, "right") && (l.bottom || l.right)) this.border[`${x - 1},${y}`] = l;
			if (BPoint.check(p, b, "bottom") && (b.bottom || b.right)) this.border[`${x},${y + 1}`] = b;
			if (BPoint.check(p, r, "right") && (r.bottom || r.right)) this.border[`${x + 1},${y}`] = r;
		}
		undo() {
			if (!this.enabled) return;
			if (!this.undoStack.length) return;
			let action = this.undoStack.pop();
			for (let e in action) {
				let e2 = action[e];
				if (!this.queue[`${e2.x},${e2.y}`] && (delete action[e], true)) continue;
				this.setPixel(e2.x, e2.y, e2.undo());
				// console.log(e2.x, e2.y, e2.undo());
			}
			if (!Object.keys(action).length) {
				this.undo();
				return;
			}
			this.redoStack.push(action);
		}
		redo() {
			if (!this.enabled) return;
			if (!this.redoStack.length) return;
			let action = this.redoStack.pop();
			for (let e in action) {
				let e2 = action[e];
				if (!this.queue[`${e2.x},${e2.y}`] && (delete action[e], true)) continue;
				this.setPixel(e2.x, e2.y, e2.redo());
				// console.log(e2.x, e2.y, e2.redo());
			}
			if (!Object.keys(action).length) {
				this.redo();
				return;
			}
			this.undoStack.push(action);
		}
		startHistory() {
			this.record = true;
		}
		endHistory() {
			if (!this.record) return;
			this.record = false;
			if (Object.keys(this.actionStack).length) this.undoStack.push(this.actionStack);
			this.actionStack = {};
			this.redoStack = [];
		}
		enable() {
			this.enabled = true;
		}
		disable() {
			this.enabled = false;
		}
		clearQueue() {
			this.queue = {};
			this.chunkQueueTemp = {};
			this.border = {};
		}
		unsetPixel(x, y) {
			let p = new Point(x, y);
			this.deletePixels(p);
			return true;
		}
		deletePixels() {
			for (let i = 0; i < arguments.length; i++) {
				if (Array.isArray(arguments[i])) this.deletePixels(arguments[i]);
				else if (arguments[i] instanceof Point) {
					delete this.queue[`${arguments[i].x},${arguments[i].y}`];
					let x = Math.floor(arguments[i].x / 16);
					let y = Math.floor(arguments[i].y / 16);
					let found = false;
					for (let i = 0; i < 16; i++) {
						for (let j = 0; j < 16; j++) {
							if (this.queue[`${x * 16 + i},${y * 16 + j}`]) {
								found = true;
								break;
							}
						}
						if (found) break;
					}
					if (!found) delete this.chunkQueueTemp[`${x},${y}`];
					this.updateBorder(arguments[i].x, arguments[i].y);
				}
			}
		}
		setPixel(x, y, c, placeOnce = false) { // make checks for all variables coming in to make sure nothing is incorrectly set and c 4th element is either undefined or 255 otherwise drop the set
			if (!this.enabled) {
				OWOP.world.setPixel(x, y, c);
				return;
			}
			if (!Number.isInteger(x) || !Number.isInteger(y)) return false;
			if (!Array.isArray(c) || c.length < 3 || c.length > 4) return false;
			if (c.length == 4) c.pop();
			if (c.find(e => !Number.isInteger(e) || e < 0 || e > 255) !== undefined) return false;
			let p = new Pixel(x, y, c);
			if (placeOnce) p.o = true;
			let xchunk = Math.floor(p.x / 16);
			let ychunk = Math.floor(p.y / 16);
			if (!NS.PM.ignoreProtectedChunks && NS.M0.misc.world.protectedChunks[`${xchunk},${ychunk}`]) return false;
			if (this.record) {
				let stackE = this.actionStack[`${x},${y}`];
				if (!(stackE instanceof Action)) {
					let bp = new Pixel(x, y, this.getPixel(x, y, 1));
					if (bp.c !== p.c) this.actionStack[`${x},${y}`] = new Action(bp, p);
				} else if (stackE.after_color !== c) {
					stackE.after_color = c;
				}
			}
			this.addPixels(p);
			return true;
		}
		getPixel(x, y, a = 1) {
			if (!Number.isInteger(x) || !Number.isInteger(y)) return console.error("There is no inputs in \"getPixel\" on PixelManager instance.");
			// if (!Object.keys(OWOP.world).includes("_getPixel")) return undefined;
			if (a && this.queue[`${x},${y}`]) return this.queue[`${x},${y}`].c;
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
				else if (arguments[i] instanceof Pixel) {
					this.queue[`${arguments[i].x},${arguments[i].y}`] = arguments[i];
					let x = Math.floor(arguments[i].x / 16);
					let y = Math.floor(arguments[i].y / 16);
					this.chunkQueueTemp[`${x},${y}`] = true;
					this.updateBorder(arguments[i].x, arguments[i].y);
					this.borderCheck = true;
				}
			}
		}
		placePixel() {
			let totalPlaced = 0;
			for (let i = 0; i < this.extra.placeData.length; i++) {
				let e = this.extra.placeData[i][1];
				let tX = OWOP.mouse.tileX;
				let tY = OWOP.mouse.tileY;
				let pixel = this.queue[`${tX + e.x},${tY + e.y}`];
				if (!pixel) continue;
				let xchunk = Math.floor(pixel.x / 16);
				let ychunk = Math.floor(pixel.y / 16);
				if (!NS.PM.ignoreProtectedChunks && NS.M0.misc.world.protectedChunks[`${xchunk},${ychunk}`]) continue;
				let xcc = Math.floor(tX / 16) * 16;
				let ycc = Math.floor(tY / 16) * 16;
				if (pixel.x < (xcc - 31) || pixel.y < (ycc - 31) || pixel.x > (xcc + 46) || pixel.y > (ycc + 46)) continue;
				let c = this.getPixel(pixel.x, pixel.y, 0);
				if (!c) continue;
				if (!Color.compare(pixel.c, c)) {
					if (!OWOP.world.setPixel(pixel.x, pixel.y, pixel.c) || (++totalPlaced === 5, pixel.placed = true, false)) return;
				} else if ((pixel.o && this.deletePixels(pixel), pixel.placed = true, true)) continue;
			}
			this.moveToNext();
		}
	}

	const modulo = (i, m) => {
		return i - m * Math.floor(i / m);
	}

	const line = (x1, y1, x2, y2, m, e, plot) => {
		if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) return console.error();
		var dx = Math.abs(x2 - x1), sx = x1 < x2 ? 1 : -1;
		var dy = -Math.abs(y2 - y1), sy = y1 < y2 ? 1 : -1;
		var err = dx + dy, e2;

		if (e?.type == "mousemove") {
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
		return [i];
	}

	NS.modulo = modulo;
	NS.line = line;
	NS.Point = Point;
	NS.Color = Color;
	NS.Pixel = Pixel;
	NS.PixelManager = PixelManager;
	const PM = new PixelManager();
	NS.PM = PM;

	const mkHTML = OWOP.util.mkHTML;

	OWOP.OPM = false;
	if (OWOP.misc) OWOP.OPM = true;
	if (!OWOP.OPM) {
		OWOP.misc = NS.M0.misc;
		OWOP.tool = OWOP.tools;
	}
	if (localStorage.options) {
		let o = JSON.parse(localStorage.options);
		if (o?.enableSounds) OWOP.options.enableSounds = o.enableSounds;
	}

	const windows = {};
	NS.windows = windows;

	if (!NS.localStorage.cursors) {
		let l = NS.localStorage.cursors = {
			cursor: { hotspot: [7, 2] },
			move: { hotspot: [18, 18] },
			pipette: { hotspot: [3, 31] },
			zoom: { hotspot: [22, 13] },
			export: { hotspot: [0, 3] }, // needs better hotspot
			fill: { hotspot: [6, 32] },
			line: { hotspot: [6, 6] },
			paste: { hotspot: [5, 2] }, // this too
			copy: { hotspot: [5, 5] }, // and this
			write: { hotspot: [17, 8] } // fix hotspot
		};

		l.cursor.icon = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAAA00lEQVRYw+3YMQ6DMAwFUPPFhTpCRxaW3qYzQ9f2Nl1YGIGRI8ENShz7W6mEZxwe34kUIXKVoR63+x79TpSGQmlJobTxJYHe8xiGSk4oCgXNwxEoaBvYKOQ0MVHIbew/AwWVDeqaloKCdQFvlAnUNa07Cl5Re6HguSE9UPA+tlaUO8iKMoGmdXFHURKyoJCTxLQuP9OxoGrLeMbnS31H/25zRRmZFpN686ytmLMvpp8yJkYNYmNUoAiMiEil3YBMjHpkbIwKFIFJBkVhivz7cdXf1QFBsW2mhPMCDAAAAABJRU5ErkJggg=="
		l.move.icon = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAABgklEQVRYw+2YvU7EMAzH/055CYZj6IJ0243Q8ZYs9zbcWgErfZtbTkgdGNqOtyM2Ft7imHKK0g/nw4Ui4S1K7Pzi2q4TQEB2m+K82xRnCVskAWOPD6eGfg3IwLw0RwDAvtDJUCQFYyQViiRhJKBIGiYVilICmPNQTKCrEKCYTxCqo+bcIOYACguTvwMk9SsIta2mFDiofaFRd+1lXHdtL8NCbVOKZ3zTPiTwVUzRAwBdlVFz7mFcB1BMBfYB9l3rVvTMhtFViXy1mjSQrXN2TcjabJ3j4/UNt9c3j+9fn09kwwDA9u7+R9PcJMXx4RkAcDW2YG4wOzt7MeR6iRNf2LFNXTHeOZwaUnZAmQkf5ZCNfGF6dcj2FGdMV+Wop+qu9dJ3YRZZGIn71wy1EPa87SnXM5zu0Lyaoub6GZMEdddeAphLDM62kmyuJBq3/wZNHCgkC2OaPDUXTKxO9EWRy6ahojf7VXoMKhZG5LHBhUqBEXuOMVCpMIt8sBK7Z0nd474B40/4pg5xCDEAAAAASUVORK5CYII="
		l.pipette.icon = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAABAUlEQVRYw+3XvQ6CMBQF4FPiCzHQRDu6uPA2zg6u+jYuLI5ogoOPhFOTpnL7Y3ovDj0jIeRLzyEEoKaGTt+auW/NHLpHSUH8a7f3qFYBuZhOawDAa5pIlJLAWIgbCrXhrmYJI7KhHEyosqYUyH14p3X2ybBtKLSb2OkUB/m1+agYhmVDh+sJADAcz8mvevENWcxlHLDf7uDCLCQ1TUkMANyfD3I37KAQxlYWq6jYhnIxfWvmFJz6l5P5GcSJyQZxY7JAEphkkBQmCSSJiYKkMUHQGhgS5H8o3XBisj8d3JhFkF+VJOarMhdjN2MhEhiysrUw5Aml/GGKgHyUNKampkQ+wWnd9v+Wv9QAAAAASUVORK5CYII="
		l.zoom.icon = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAABMUlEQVRYw+3Wuw6CMBQG4L+NL+SIjgyy+CSuujo4u/ISri4wdFQTHFx9CScS1zrVNFCgdzThJCRcGvrlHHooMMWfBfH5svV8yVX3z48LiQrqgtjAiE9M14Q6Y7yVSEyWs5I/33XryFnJVeODYVQQGSFHzkoeBCW/VAdigqIuMBnAblds0hWJ3idU2dHJjG6WqCvQd2acQb7LRPFjQV3LZRNpsggDsimX6QIwXmmm8XzX4fpQiOxQm+zI57olyFnJ02SB3TLr/ckSG0x23AMAiu0B8rXqmxIQAIMYI1AT8zoVAIB7VX3HiGfN1SQgOtsP4oJpgqJs0HQwYqLgW1gTTPBN/hiYTtBYGCVoTMxgY4yNaWVIzs4YGACY9WVG7jExMJ2gZrOLhen9qGNDppjCV3wAmp0jyCb9nC4AAAAASUVORK5CYII="
		l.export.icon = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAABCklEQVRYw+2YMQ6CQBBFP4QL2Ql02mDhadQWg+3iaSzcRrsVO4+k1RCNhB3RHdZkfzUJBW//Z4YBIOjPFAHAcpLfpW54uJmoF0gShgOVULHYbwEAs2kKADhfm5/Xm7ywR0YOKaNxvjZOnTmuKqtDsVRM5JJNLZBrd7iKPz3BUHEPHCILkXkdGc0dryIjKG8iU0bjuKr86jJlNOs9Jtplymi/ugwAirqEbf8SHYzzNLNCiUXGdSruGmAE9209BMr5ClvUJeZpBgA4NZe363q9e1nanC/55ESfnqEiVyB0yC4gAhi97W0wh5uJkjFgvFjyOTBiQFyYtstcPtTcT2hRh7gwzjXGf4MgcT0AtrSSgUtEfWEAAAAASUVORK5CYII="
		l.fill.icon = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAABjUlEQVRYw+2YsW7DIBCGAfWFMhgpZezCkreJVw9Z7bfpwpLRiYSHPlI6XYSviLszWG2lnJQhGJNP//3HQZR6xT8LzZ14OrgHHvv8mvWvAOVg9oLTXBg/DavxcL7sAqU5MOMcVO/86lln7er7EmMTKC2FwSAYqBbKtICBgLRyPMcG2grTCspwJlEwS4wr09dAaUodjmfgnev9lq1EiaeMRJklxufHT8NTCT8N6nq/qY/je3X63jiTQI3cXpSOAVSqlJ8GFc4XdTq4B0cpQ4FgNVKYcQ4/3qlVylAVg0EwDP7xWqgsUO+8GueQbQ+QpjQtLaGMpCRznmkNpUtdHW+OufRhGFz68Jy7JZhSt4bUlWC2KiVOGRg69VPOU62hWB7qnVedtaqzdncokamXGKuhqJZipDCcKEHlTF+lEO7sUiiq4YqAqGqjoDjdnw0Ei5T8U4KC/YxqsCKFtkJxYUignMRSKOkhTewhCVTzE+NWqHRXl16JNHV1phYsHSW23M+KF0Xughhqjz8hXvFn4xvHckf64m/UhgAAAABJRU5ErkJggg=="
		l.line.icon = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAABEUlEQVRYw+2XvRGEIBCFkbEDKzGQxAZITK3E2OBiKzG9hAYuweAqsQYvWofjVOB4GPESHRdmP/cHV8aysrLSqrgydnW70f3z/Sp8bUmATIc+QkFx1wI5jUxO48/zRgjWCAFPWem78AhqnRUciLtSoIbHoX2dFVu0vg/IpaqXXykLrTk4EEHJadzBEFBlzGY7bYhO4662p7e3C1gNDziMd8ooEgRlwlH33VZDi9Z7JOxrIwRbZwWFcrb91dlDYEiooLzb3y+7zqpe7ufWvzUVvKmr2810hoaCdAYSCjY2oKBgQCgoKBACCg4UC5UEKAYqGdARlHmYnkHxlEDkNGSQSxqhs+EN+ZcSBYWaCLKysmL0AfZSsN1jloZVAAAAAElFTkSuQmCC"
		l.paste.icon = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAABQ0lEQVRYw+2Yvw6CMBDGr4QXYpBA2Jx04GmMs3E2Po2DTmwEggOPhFOTUtvSa6/FGC4xacuf/vjuu1IE2CJg1Fk11Vk1Ud6T+cCI/cfYslWARJDj/QIAAM/TlQyM+cBwELHtC8VsU2JSxTSOhUwwMCoAuY19QDlS08Fdns/672HQQmGucwZSTaRLiQ4GGyn2At8JnTy0ZqAUwnghWspu7Qt1/rk6/F7KeDXalH40D9lCpTFg5KWizqpJt3J7ATV9BwAA+6L86vP2rX3Nxpc85QXEQVR9XZu8ykQlVOrICpkegAxIdWOTWkHXIZ1XVIAqJYMrZJrIRaXEVSH+k/0T/dVB6Zf/e9uryl5n4KbvZuPRTL2URmw6yRRa3UP7oiQFsVLItEOkLPVFoMfYMtO+JYQy6E9p6n85dPsh52/7EDBb2MQHK+ObZIdb/JMAAAAASUVORK5CYII="
		l.copy.icon = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAABS0lEQVRYw+2XMQ6CMBSGfwxH8CIOEg2bkx2cOYhxJs6Ggzg74ORGNGXwIt5BpxrAAn3PVzWGPzEpaMLH199CgSFD/iwB5cerSXznXORwLQJxIC4MFYoMpLKUBJKvtySo0JeRaqZRhFJrrCbxvQ8qkIZpGszXW0yjCABQat1rqhNoVxxJMJt4+QJVnTKXToXSf1uVpTUrKktx2+cAgHGiWgFNRj7WEpWlKLXGOFFPEDNml5qbqoGqKQMmBnS6nAEAi9n85diMd8Wxdn4TL53NkIEMiO24bQyg1h8RIHPHNjtNQzZgcUPNO+6z9W5CSndsJmzfvQNIMtR1ISlLIxdD5tPsj0tu+/xZbC8dopqgltrLSv2RUncV+HQ5185/rNR90yhRbJahr05Z2wrNediKAXFAuC/8rA753AaFLq+kP7FRlNp1UOwMGfKXeQBOJJ69p18KUgAAAABJRU5ErkJggg=="
		l.write.icon = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAABTUlEQVRYw+2XPW6DQBCFHyNu4JOktF26oUnrk7hO4TY5CW2abbY0SEvhk3AGp8miMcGEmVmMLPEa/0iGx3xvZsfAqlU2ZdYLvL/tb/zz9/WSLWaobyaFqcxq5vPiAAC+rgAA7nQ2maIU3KOZFKKUZtrSLWOoj8udzh2q4utjNF+zVsjXVWcEAJoQlkcWA2xtd7UhjmsoM23pTNjIgmsIkRWb2tBYR1m6jbS4YiV4duL7JgQ1NrLOntQiC66hzorfabGRBdeYtNhyCy7tNJ59MD59QeO4fF3hsN3dVeyw3d299iVZSXINrv5NfV2hLR38b5g3x6IL9eZYiCokzhA/TP8ohp2FvhAaIgkuTStLz7ZcgmtoOv/3ME0IoiqRZomf44+BqO05Lsnew6d2xJZkDj1aNaZK8luaGkyrpl6DJE+oWVP5SvKSR8eqVVb9AMXs1T0X1uPeAAAAAElFTkSuQmCC"

		localStorage.NS = JSON.stringify(NS.localStorage);
	}

	{
		function holeify(img) {
			let canvas = document.createElement("canvas");
			var shadowcolor = 0xFF3B314D;
			var backgroundcolor = 0xFF5C637E;
			canvas.width = img.width;
			canvas.height = img.height;
			var ctx = canvas.getContext('2d');
			ctx.drawImage(img, 0, 0);
			var idat = ctx.getImageData(0, 0, canvas.width, canvas.height);
			var u32dat = new Uint32Array(idat.data.buffer);
			var clr = (x, y) => {
				return (x < 0 || y < 0 || x >= idat.width || y >= idat.height) ? 0 : u32dat[y * idat.width + x];
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
					if (clr(x, y - 1) === shadowcolor && clr(x - 1, y) === shadowcolor) {
						u32dat[y * idat.width + x] = shadowcolor;
					}
				}
			}
			ctx.putImageData(idat, 0, 0);
			return canvas.toDataURL();
		}

		let iconStyler = document.createElement("style");
		document.getElementById("toole-container").parentElement.appendChild(iconStyler);
		for (let cursor in NS.localStorage.cursors) {
			let cursorURL = NS.localStorage.cursors[cursor].icon;
			// cursorURL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAACeElEQVRYw+2XsWsaYRiHH6VRSyGBEwepi5nsIFToWKUKDoVkyl/QIQhZRMdCJqGj0kUoGRw6FqcIGY4qnI6BBBwiFCqBKzcUDxoieMlgB/NdYtN6Z7yzGfyBy3eIj8/3vu/3HayyQGKvPoyX/ZvexwblfWymLIEMrb1UKFuGQk+PMLT2UqC8Vnb0UReAyOblUqBmAumjLlIgDkClpZhQ0edvx/9ty/zhJACdoWFC+cNJ10zNBJICcbR+FYDXz/wU0il2GrKrNeW1siO2rDM0AKhvZam0FPD1XIHy2ml5YUikkE6RPz0DX8/xkWBpSHSZMFRpKaapL9++YwwOHDU1E0jrV80tE+kMDXYa8j1TTkFZFrUwJKIcqrd1BHx8+YJESXYMynIOhaN7f31WSKdMqJP97FRNLTKnbLe9SGo7MgWVKMmmKSlTxhgcLDSnLA3d3SqAz8WjyfmWqxHK1UhtR0wovVk0obR+9UFQnlkPhfrI5iU7DZn6VpZQrsZ5q4veLP7ze4mSzMl+Fq5i6KMuvwaqx3GgUK7Gz0/vqLQUCumUaenPnLdurerNIlzF8IeT9I7fexYG2ghGxlIgDr4e+dMz6ltZAFRVRcqUZ1qammfBXbR+1ZYp222vHKqo6uSTKMnmv9cvrtEvruEqNrER3DXXxZqhtQlH92zVlOVpLwaj2AopU+Zr/s0E5OZ6IsD1Ude8Q4lxIaa9obVtFbplDemjLtL6GlKmPFUXIv0fRx4czBN7F7TePZh5u8eRLtsIRsYA0vraZOGmjaVA3HEzc9fQ3ZpxC8a+oTsnvpswtl+DROu7DTPXli0DxrYhN7rpQRE1tMoqM/Ibi49haAcCegQAAAAASUVORK5CYII=";

			iconStyler.innerHTML += `#tool-${cursor}:not(.selected) div { background-image: url("${cursorURL}") !important } `
			let img = new Image();
			img.onload = function () {
				iconStyler.innerHTML += `#tool-${cursor}.selected div { background-image: url("${holeify(img)}") !important } `
			}
			img.src = cursorURL;
		}
		if (false) {
			// fixing all the damn cache issues that i hate cause halloween sucks man i dont want to have to do this again for christmas
			iconStyler.innerHTML += `button { border-image: url("https://www.ourworldofpixels.com/img/button.png") 6 repeat; }`;
			iconStyler.innerHTML += `button:active { border-image: url("https://www.ourworldofpixels.com/img/button_pressed.png") 6 repeat; }`;

			iconStyler.innerHTML += `.wincontainer { border-image: url("https://www.ourworldofpixels.com/img/window_in.png") 6 repeat; }`;
			iconStyler.innerHTML += `#windows > div, .winframe, #help { border-image: url("https://www.ourworldofpixels.com/img/window_out.png") 11 repeat; border-image-outset: 4px; }`;

			iconStyler.innerHTML += `body { background-image: url("https://www.ourworldofpixels.com/img/unloaded.png"); }`;

			iconStyler.innerHTML += `#playercount-display, #xy-display, #palette-create, #palette, .framed, .context-menu { border-image: url("https://www.ourworldofpixels.com/img/small_border.png") 5 repeat; }`;

			document.getElementById("help-button").children[0].src = "https://www.ourworldofpixels.com/img/help.png";
		}
	}

	!function () {
		var camera = OWOP.camera; // NS.M20.camera
		var renderer = OWOP.renderer; // NS.M20.renderer
		var GUIWindow = OWOP.windowSys.class.window;
		const isSame = (a, b) => a && b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
		var drawText = (ctx, str, x, y, centered) => {
			ctx.strokeStyle = "#000000";
			ctx.fillStyle = "#FFFFFF";
			ctx.lineWidth = 2.5;
			ctx.globalAlpha = 0.5;
			centered && (x -= ctx.measureText(str).width >> 1);
			ctx.strokeText(str, x, y);
			ctx.globalAlpha = 1;
			ctx.fillText(str, x, y);
		};
		var setColor = (cursor, color) => {
			if (!color) return;
			if (cursor === 1) {
				OWOP.player.selectedColor = color;
			} else if (cursor === 2) {
				OWOP.player.rightSelectedColor = color;
				localStorage.rSC = JSON.stringify(OWOP.player.rightSelectedColor);
			}
		};
		NS.renderPlayer = function (fx, ctx, time) {
			(function (fx, ctx, time) {
				if (!NS.PM.renderPlayerRings) return;
				let e = 5;
				let i = fx.extra.player.x;
				let a = fx.extra.player.y;
				let camx = OWOP.camera.x * 16;
				let camy = OWOP.camera.y * 16;
				let zoom = OWOP.camera.zoom;
				let tool = fx.extra.player.tool;
				let defaultLine = ctx.lineWidth;
				let x = ((i - camx) - tool.offset[0] + tool.cursor.width / 2) * (zoom / 16) | 0;
				let y = ((a - camy) - tool.offset[1] + tool.cursor.height / 2) * (zoom / 16) | 0;
				// this is the old centering, checked the renderer and found how they center
				// let s = ((i / (16 * t) + 0.5) * t - OWOP.camera.x) * OWOP.camera.zoom;
				// let u = ((a / (16 * t) + 0.5) * t - OWOP.camera.y) * OWOP.camera.zoom;
				ctx.globalAlpha = 1;
				// ctx.lineWidth = 16;
				let v = (6 - zoom) / 5;
				let strokeWidth = zoom > 6 ? zoom : 6 + (10 * v);
				let arcRadius = zoom > 6 ? zoom * e : 30 - (22 * v);
				ctx.lineWidth = strokeWidth;
				ctx.beginPath();
				ctx.strokeStyle = "#000000";
				ctx.arc(x, y, arcRadius, 0, Math.PI * 2, false);
				ctx.stroke();
				ctx.closePath();
				// ctx.lineWidth = 15;
				ctx.lineWidth = strokeWidth * 13 / 16;
				ctx.beginPath();
				ctx.strokeStyle = "#FFFFFF";
				ctx.arc(x, y, arcRadius, 0, Math.PI * 2, false);
				ctx.stroke();
				ctx.closePath();
				// ctx.lineWidth = 11;
				ctx.lineWidth = strokeWidth * 9 / 16;
				ctx.beginPath();
				ctx.fillStyle = ctx.strokeStyle = fx.extra.player.htmlRgb;
				//OWOP.camera.zoom === 1 ? (e *= 2) : null;
				ctx.arc(x, y, arcRadius, 0, Math.PI * 2, false);
				//OWOP.camera.zoom === 1 ? ctx.fill() : ctx.stroke();
				ctx.stroke();
				ctx.closePath();
				// var idstr = ;
				// if () {
				// 	var textw = ctx.measureText(idstr).width + (zoom / 2);
	
				// 	ctx.globalAlpha = 1;
				// 	ctx.fillStyle = targetPlayer.clr;
				// 	ctx.fillRect(cx, cy + toolheight, textw, zoom);
				// 	ctx.globalAlpha = 0.2;
				// 	ctx.lineWidth = 3;
				// 	ctx.strokeStyle = "#000000";
				// 	ctx.strokeRect(cx, cy + toolheight, textw, zoom);
				// 	ctx.globalAlpha = 1;
				// 	drawText(ctx, idstr, cx + zoom / 4, cy + fontsize + toolheight + zoom / 8);
				// }
				ctx.lineWidth = defaultLine;
				ctx.globalAlpha = .8;
			})(fx, ctx, time);
			return 1;
		}
		NS.renderBorder = function (fx, ctx, time) {
			(function (fx, ctx, time) {
				if (!NS.PM.renderBorder) return;
				let t = "#00FF00";
				let e = 1;
				let l = NS.M20;
				ctx.globalAlpha = 1;
				ctx.strokeStyle = t || fx.extra.player.htmlRgb;
				// ctx.strokeRect(i, j, l.camera.zoom * e, l.camera.zoom * e);
				let oldWidth = ctx.lineWidth;
				ctx.lineWidth = 5;
				for (let k in NS.PM.border) {
					if (NS.PM.border[k].right || NS.PM.border[k].bottom) {
						let x = NS.PM.border[k].x;
						let y = NS.PM.border[k].y;
						if (Point.distance(new Point(OWOP.mouse.tileX, OWOP.mouse.tileY), new Point(x, y)) > (16 * 25)) continue;
						let i = (Math.floor(x / (e)) * e - l.camera.x) * l.camera.zoom;
						let j = (Math.floor(y / (e)) * e - l.camera.y) * l.camera.zoom;
						ctx.beginPath();
						if (NS.PM.border[k].bottom) {
							ctx.moveTo(i, j + l.camera.zoom);
							ctx.lineTo(i + l.camera.zoom, j + l.camera.zoom);
							ctx.stroke();
						}
						if (NS.PM.border[k].right) {
							ctx.moveTo(i + l.camera.zoom, j);
							ctx.lineTo(i + l.camera.zoom, j + l.camera.zoom);
							ctx.stroke();
						}
					} else delete NS.PM.border[k];
				}
				ctx.lineWidth = oldWidth;
				return 1;
			})(fx, ctx, time);
			return 0;
		}
		// var C = OWOP.require('util/color').colorUtils;
		// var C = NS.colorUtils;

		if (!localStorage.rSC) localStorage.rSC = JSON.stringify([255, 255, 255]);
		OWOP.player.rightSelectedColor = JSON.parse(localStorage.rSC);
		let someRenderer = ((fx, ctx, time, defaultFx) => {
			if (!fx.extra.isLocalPlayer) {
				if (fx.visible) return NS.renderPlayer(fx, ctx, time);
				return defaultFx(fx, ctx, time);
			}
			return NS.renderBorder(fx, ctx, time);
		});
		function setTools() {
			let mouseStyler = document.createElement("style");
			document.getElementById("viewport").appendChild(mouseStyler);
			{
				let i = NS.localStorage.cursors[OWOP.player.tool.id];
				// i = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAACeElEQVRYw+2XsWsaYRiHH6VRSyGBEwepi5nsIFToWKUKDoVkyl/QIQhZRMdCJqGj0kUoGRw6FqcIGY4qnI6BBBwiFCqBKzcUDxoieMlgB/NdYtN6Z7yzGfyBy3eIj8/3vu/3HayyQGKvPoyX/ZvexwblfWymLIEMrb1UKFuGQk+PMLT2UqC8Vnb0UReAyOblUqBmAumjLlIgDkClpZhQ0edvx/9ty/zhJACdoWFC+cNJ10zNBJICcbR+FYDXz/wU0il2GrKrNeW1siO2rDM0AKhvZam0FPD1XIHy2ml5YUikkE6RPz0DX8/xkWBpSHSZMFRpKaapL9++YwwOHDU1E0jrV80tE+kMDXYa8j1TTkFZFrUwJKIcqrd1BHx8+YJESXYMynIOhaN7f31WSKdMqJP97FRNLTKnbLe9SGo7MgWVKMmmKSlTxhgcLDSnLA3d3SqAz8WjyfmWqxHK1UhtR0wovVk0obR+9UFQnlkPhfrI5iU7DZn6VpZQrsZ5q4veLP7ze4mSzMl+Fq5i6KMuvwaqx3GgUK7Gz0/vqLQUCumUaenPnLdurerNIlzF8IeT9I7fexYG2ghGxlIgDr4e+dMz6ltZAFRVRcqUZ1qammfBXbR+1ZYp222vHKqo6uSTKMnmv9cvrtEvruEqNrER3DXXxZqhtQlH92zVlOVpLwaj2AopU+Zr/s0E5OZ6IsD1Ude8Q4lxIaa9obVtFbplDemjLtL6GlKmPFUXIv0fRx4czBN7F7TePZh5u8eRLtsIRsYA0vraZOGmjaVA3HEzc9fQ3ZpxC8a+oTsnvpswtl+DROu7DTPXli0DxrYhN7rpQRE1tMoqM/Ibi49haAcCegQAAAAASUVORK5CYII=";
				if (i) mouseStyler.innerHTML = `#viewport { cursor: url("${i.icon}") ${i.hotspot[0]} ${i.hotspot[1]}, pointer !important; }`;
				else mouseStyler.innerHTML = `#viewport { }`;
			}
			let oldFunction = Object.getOwnPropertyDescriptor(OWOP.player, "tool").set;
			Object.defineProperty(OWOP.player, 'tool', {
				set: function (x) {
					let i = NS.localStorage.cursors[x];
					// i = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAACeElEQVRYw+2XsWsaYRiHH6VRSyGBEwepi5nsIFToWKUKDoVkyl/QIQhZRMdCJqGj0kUoGRw6FqcIGY4qnI6BBBwiFCqBKzcUDxoieMlgB/NdYtN6Z7yzGfyBy3eIj8/3vu/3HayyQGKvPoyX/ZvexwblfWymLIEMrb1UKFuGQk+PMLT2UqC8Vnb0UReAyOblUqBmAumjLlIgDkClpZhQ0edvx/9ty/zhJACdoWFC+cNJ10zNBJICcbR+FYDXz/wU0il2GrKrNeW1siO2rDM0AKhvZam0FPD1XIHy2ml5YUikkE6RPz0DX8/xkWBpSHSZMFRpKaapL9++YwwOHDU1E0jrV80tE+kMDXYa8j1TTkFZFrUwJKIcqrd1BHx8+YJESXYMynIOhaN7f31WSKdMqJP97FRNLTKnbLe9SGo7MgWVKMmmKSlTxhgcLDSnLA3d3SqAz8WjyfmWqxHK1UhtR0wovVk0obR+9UFQnlkPhfrI5iU7DZn6VpZQrsZ5q4veLP7ze4mSzMl+Fq5i6KMuvwaqx3GgUK7Gz0/vqLQUCumUaenPnLdurerNIlzF8IeT9I7fexYG2ghGxlIgDr4e+dMz6ltZAFRVRcqUZ1qammfBXbR+1ZYp222vHKqo6uSTKMnmv9cvrtEvruEqNrER3DXXxZqhtQlH92zVlOVpLwaj2AopU+Zr/s0E5OZ6IsD1Ude8Q4lxIaa9obVtFbplDemjLtL6GlKmPFUXIv0fRx4czBN7F7TePZh5u8eRLtsIRsYA0vraZOGmjaVA3HEzc9fQ3ZpxC8a+oTsnvpswtl+DROu7DTPXli0DxrYhN7rpQRE1tMoqM/Ibi49haAcCegQAAAAASUVORK5CYII=";
					if (i) mouseStyler.innerHTML = `#viewport { cursor: url("${i.icon}") ${i.hotspot[0]} ${i.hotspot[1]}, pointer !important; }`;
					else mouseStyler.innerHTML = `#viewport { }`;
					oldFunction.bind(this)(...arguments);
				}
			});

			function patternSieve(x, y, color) {
				let t = NS.pattern[NS.modulo(x, NS.pattern.x)][NS.modulo(y, NS.pattern.y)];
				return [t.on, NS.patternColors ? t.a : color];
			}

			OWOP.tool.addToolObject(new OWOP.tool.class('Cursor', OWOP.cursors.cursor, null, 1, tool => {
				// render protected chunks
				tool.setFxRenderer((fx, ctx, time) => {
					let defaultFx = OWOP.fx.player.RECT_SELECT_ALIGNED(1);
					if (someRenderer(fx, ctx, time, defaultFx)) return;

					if (tool.extra.state.chunkize) defaultFx = OWOP.fx.player.RECT_SELECT_ALIGNED(16);
					defaultFx(fx, ctx, time);
					return;
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
				// cursor functionality
				tool.extra.state = {
					scalar: "1",
					rainbow: false,
					chunkize: false,
					perfect: false
				};
				tool.extra.lastX;
				tool.extra.lastY;
				tool.extra.last1PX;
				tool.extra.last1PY;
				tool.extra.last2PX;
				tool.extra.last2PY;
				tool.extra.start;
				tool.extra.c = 0;
				tool.setEvent('mousedown mousemove', (mouse, event) => {
					if (mouse.buttons !== 2 && mouse.buttons !== 1) return 3;
					if (tool.extra.lastX == mouse.tileX && tool.extra.lastY == mouse.tileY) return 3;
					if (event?.ctrlKey) return setColor(mouse.buttons, PM.getPixel(mouse.tileX, mouse.tileY));
					let c = mouse.buttons === 1 ? OWOP.player.selectedColor : OWOP.player.rightSelectedColor;
					if (isNaN(tool.extra.lastX) || isNaN(tool.extra.lastY)) {
						tool.extra.lastX = mouse.tileX;
						tool.extra.lastY = mouse.tileY;
						tool.extra.last1PX = mouse.tileX;
						tool.extra.last1PY = mouse.tileY;
						tool.extra.last2PX = mouse.tileX;
						tool.extra.last2PY = mouse.tileY;
						tool.extra.start = true;
					}
					PM.startHistory();
					line(tool.extra.lastX, tool.extra.lastY, mouse.tileX, mouse.tileY, undefined, event, (x, y) => {
						let tempx = x;
						let tempy = y;
						if (tool.extra.state.perfect) {
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
							tempx = tool.extra.last1PX;
							tempy = tool.extra.last1PY;
						}
						let size = Number(tool.extra.state.scalar);
						if (tool.extra.state.chunkize) size = 16;
						let offset = Math.floor(size / 2);
						if (tool.extra.state.chunkize) {
							tempx = Math.floor(tempx / 16) * 16;
							tempy = Math.floor(tempy / 16) * 16;
							offset = 0;
						}
						for (let x1 = 0; x1 < size; x1++) {
							for (let y1 = 0; y1 < size; y1++) {
								if (tool.extra.state.rainbow) {
									let pixel;
									if ((pixel = PM.getPixel(tempx + x1 - offset, tempy + y1 - offset), !pixel)) continue;
									c = mouse.buttons === 1 ? hue((tempx + x1 - offset) - (tempy + y1 - offset), 8) : hue(tool.extra.c++, 8);
									if (Color.compare(pixel, c)) continue;
								}
								PM.setPixel(tempx + x1 - offset, tempy + y1 - offset, c);
								//[Math.round(OWOP.mouse.worldX/16)-0.5, Math.round(OWOP.mouse.worldY/16)-0.5]
							}
						}
						if (tool.extra.state.perfect) {
							tool.extra.last2PX = tool.extra.last1PX;
							tool.extra.last2PY = tool.extra.last1PY;
							tool.extra.last1PX = x;
							tool.extra.last1PY = y;
						}
					});
					tool.extra.lastX = mouse.tileX;
					tool.extra.lastY = mouse.tileY;
					return 3;
				});
				tool.setEvent('mouseup deselect', () => {
					PM.endHistory();
					tool.extra.lastX = undefined;
					tool.extra.lastY = undefined;
					tool.extra.last1PX = undefined;
					tool.extra.last1PY = undefined;
					tool.extra.last2PX = undefined;
					tool.extra.last2PY = undefined;
				});
				// change color positions
				tool.setEvent('keydown', keys => {
					if ((keys["87"] && keys["83"]) || !keys["16"]) return;
					if (keys["87"]) { // w
						let i1 = OWOP.player.paletteIndex;
						let i2 = modulo(i1 - 1, OWOP.player.palette.length);
						if (i2 == OWOP.player.palette.length - 1) {
							OWOP.player.palette.push(OWOP.player.palette.shift());
						} else {
							[OWOP.player.palette[i1], OWOP.player.palette[i2]] = [OWOP.player.palette[i2], OWOP.player.palette[i1]];
						}
						OWOP.player.paletteIndex = i2;
					}
					if (keys["83"]) { // s
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
			OWOP.tool.addToolObject(new OWOP.tool.class('Pipette', OWOP.cursors.pipette, null, 0, tool => {
				tool.extra.state = {};
				tool.setEvent('mousedown mousemove', mouse => {
					var c = PM.getPixel(mouse.tileX, mouse.tileY);
					if (!c) return mouse.buttons;
					switch (mouse.buttons) {
						case 1:
							OWOP.player.selectedColor = c;
							break;
						case 2:
							OWOP.player.rightSelectedColor = c;
							localStorage.rSC = JSON.stringify(OWOP.player.rightSelectedColor);
							break;
					}
					return mouse.buttons;
				});
			}));
			OWOP.tool.addToolObject(new OWOP.tool.class('Export', OWOP.cursors.select, null, 0, tool => {
				tool.extra.state = {
					type: "export",
					rainbow: false,
					chunkize: false
				};
				tool.setFxRenderer((fx, ctx, time) => {
					if (someRenderer(fx, ctx, time, () => 1)) return;

					var x = fx.extra.player.x;
					var y = fx.extra.player.y;
					var fxx = (Math.floor(x / 16) - camera.x) * camera.zoom;
					var fxy = (Math.floor(y / 16) - camera.y) * camera.zoom;
					var oldlinew = ctx.lineWidth;
					ctx.lineWidth = 1;
					if (tool.extra.end) {
						var s = tool.extra.start;
						var e = tool.extra.end;
						var x = s[0];
						var y = s[1];
						var w = e[0];
						var h = e[1];
						if (s[0] > e[0]) [w, x] = [x, w];
						if (s[1] > e[1]) [h, y] = [y, h];
						if (tool.extra.state.chunkize) {
							x = Math.floor(x / 16) * 16;
							y = Math.floor(y / 16) * 16;
							w = Math.floor(w / 16) * 16 + 16;
							h = Math.floor(h / 16) * 16 + 16;
						}
						w = w - x;
						h = h - y;
						x = (x - camera.x) * camera.zoom + 0.5;
						y = (y - camera.y) * camera.zoom + 0.5;

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
						var x = fx.extra.player.x;
						var y = fx.extra.player.y;
						var fxx = Math.floor(x / 16);
						var fxy = Math.floor(y / 16);
						if (tool.extra.state.chunkize) {
							fxx = Math.floor(fxx / 16) * 16;
							fxy = Math.floor(fxy / 16) * 16;
						}
						fxx -= camera.x;
						fxy -= camera.y;
						fxx *= camera.zoom;
						fxy *= camera.zoom;
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
					const isInside = () => {
						var x = s[0];
						var y = s[1];
						var w = e[0];
						var h = e[1];
						if (tool.extra.state.chunkize) {
							x = Math.floor(x / 16) * 16;
							y = Math.floor(y / 16) * 16;
							w = Math.floor(w / 16) * 16 + 16;
							h = Math.floor(h / 16) * 16 + 16;
						}
						return mouse.tileX >= x && mouse.tileX < w && mouse.tileY >= y && mouse.tileY < h;
					}
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
						var x = s[0];
						var y = s[1];
						var w = e[0];
						var h = e[1];
						if (tool.extra.state.chunkize) {
							x = Math.floor(x / 16) * 16;
							y = Math.floor(y / 16) * 16;
							w = Math.floor(w / 16) * 16 + 16;
							h = Math.floor(h / 16) * 16 + 16;
						}
						w -= x;
						h -= y;
						let warn = false;
						switch (tool.extra.state.type) {
							case "export": {
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
													warn = true;
													pix = [255, 255, 255];
												}
											} else {
												pix = tempPix.c;
											}
											d.data[4 * ((i - y) * w + (j - x))] = pix[0];
											d.data[4 * ((i - y) * w + (j - x)) + 1] = pix[1];
											d.data[4 * ((i - y) * w + (j - x)) + 2] = pix[2];
											d.data[4 * ((i - y) * w + (j - x)) + 3] = 255;
										}
									}
									ctx.putImageData(d, 0, 0);
									c.toBlob(onblob);
								})(x, y, w, h, b => {
									var url = URL.createObjectURL(b);
									var img = new Image();
									img.onload = () => {
										if (OWOP.windowSys.windows['Resulting image']) OWOP.windowSys.delWindow(OWOP.windowSys.windows['Resulting image']);
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
							} break;
							case "color": {
								let test = false;
								let totalAdded = 0;
								let limit = 50;
								for (var i = x; i < x + w; i++) {
									for (var j = y; j < y + h; j++) {
										if (totalAdded >= limit) continue;
										var pix = PM.getPixel(i, j);
										if (!pix) continue;
										for (let k = 0; k < OWOP.player.palette.length; k++) {
											var c = OWOP.player.palette[k];
											if (isSame(c, pix)) {
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
							} break;
							case "adder": {
								for (var i = x; i < x + w; i++) {
									for (var j = y; j < y + h; j++) {
										var pix = PM.getPixel(i, j);
										if (pix && !PM.queue[`${i},${j}`]) PM.setPixel(i, j, pix);
									}
								}
							} break;
							case "filler": {
								var pix = OWOP.player.selectedColor;
								PM.startHistory();
								for (var i = x; i < x + w; i++) {
									for (var j = y; j < y + h; j++) {
										PM.setPixel(i, j, pix);
									}
								}
								PM.endHistory();
							} break;
							case "clearer": {
								for (var i = x; i < x + w; i++) {
									for (var j = y; j < y + h; j++) {
										PM.unsetPixel(i, j);
									}
								}
							} break;
						}
						if (warn) console.warn("Well something happened, you probably tried getting an area outside of loaded chunks.");
					}
				});
			}));
			OWOP.tool.addToolObject(new OWOP.tool.class('Fill', OWOP.cursors.fill, null, 1, tool => {
				tool.extra.state = {
					rainbow: false,
					patterns: false,
					checkered: false,
					dither: false,
					dither2: false,
					dither3: false,
					dither4: false,
					dither5: false,
					dither6: false
				}
				tool.extra.usedQueue = {};
				tool.extra.queue = {};
				tool.extra.fillingColor = undefined;
				tool.extra.button = 0;
				tool.extra.checkered = 0;
				const isFillColor = (x, y) => isSame(PM.getPixel(x, y), tool.extra.fillingColor) && (!tool.extra.usedQueue[`${x},${y}`]) && (tool.extra.queue[`${x},${y}`] = { x: x, y: y }, true);

				function tick() {
					let selClr = tool.extra.button === 1 ? OWOP.player.selectedColor : OWOP.player.rightSelectedColor;
					for (let current in tool.extra.queue) {
						current = tool.extra.queue[current];
						let x = current.x;
						let y = current.y;
						if (tool.extra.state.rainbow) selClr = hue(x - y, 8);
						let thisClr = PM.getPixel(x, y);
						if (isSame(thisClr, tool.extra.fillingColor) && !isSame(thisClr, selClr)) {
							if (tool.extra.state.patterns) {
								let pS = patternSieve(x, y, selClr);
								if (pS[0]) PM.setPixel(x, y, pS[1]);
							} else {
								if (tool.extra.state.checkered) {
									let pattern = [
										[1, 0],
										[0, 1]
									];
									if (pattern[modulo(x, 2)][modulo(y, 2)]) PM.setPixel(x, y, selClr);
								} else if (tool.extra.state.dither) {
									let pattern = [
										[1, 0, 1, 0],
										[0, 1, 0, 0],
										[1, 0, 1, 0],
										[0, 0, 0, 1]
									];
									if (pattern[modulo(x, 4)][modulo(y, 4)]) PM.setPixel(x, y, selClr);
								} else if (tool.extra.state.dither2) {
									let pattern = [
										[0, 0],
										[0, 1],
										[0, 0],
										[1, 0]
									];
									if (pattern[modulo(x, 4)][modulo(y, 2)]) PM.setPixel(x, y, selClr);
								} else if (tool.extra.state.dither3) {
									let pattern = [
										[1, 0, 0, 0, 1, 0, 1, 0],
										[0, 1, 0, 1, 0, 1, 0, 0],
										[1, 0, 1, 0, 0, 0, 1, 0],
										[0, 0, 0, 1, 0, 1, 0, 1],
										[1, 0, 1, 0, 1, 0, 0, 0],
										[0, 1, 0, 0, 0, 1, 0, 1],
										[0, 0, 1, 0, 1, 0, 1, 0],
										[0, 1, 0, 1, 0, 0, 0, 1]
									];
									if (pattern[modulo(x, 8)][modulo(y, 8)]) PM.setPixel(x, y, selClr);
								} else if (tool.extra.state.dither4) {
									let pattern = [
										[0, 1, 0, 0],
										[1, 1, 0, 0],
										[0, 0, 1, 1],
										[0, 0, 1, 0]
									];
									if (pattern[modulo(x, 4)][modulo(y, 4)]) PM.setPixel(x, y, selClr);
								} else if (tool.extra.state.dither5) {
									let pattern = [
										[0, 1, 0, 0, 0, 0, 1, 0],
										[1, 1, 0, 0, 0, 0, 1, 1],
										[0, 0, 1, 1, 1, 1, 0, 0],
										[0, 0, 1, 0, 0, 1, 0, 0],
										[0, 0, 1, 0, 0, 1, 0, 0],
										[0, 0, 1, 1, 1, 1, 0, 0],
										[1, 1, 0, 0, 0, 0, 1, 1],
										[0, 1, 0, 0, 0, 0, 1, 0]
									];
									if (pattern[modulo(x, 8)][modulo(y, 8)]) PM.setPixel(x, y, selClr);
								} else if (tool.extra.state.dither6) {
									let pattern = [
										[0, 1, 1, 0, 0],
										[1, 1, 1, 1, 0],
										[1, 0, 1, 0, 0],
										[1, 0, 1, 1, 0],
										[0, 0, 0, 0, 0]
									];
									if (pattern[modulo(x, 5)][modulo(y, 5)]) PM.setPixel(x, y, selClr);
								} else if (tool.extra.state.dither7) {
									let pattern = [
										[1, 1, 1, 0, 1, 1, 1, 0, 1, 0],
										[0, 0, 0, 0, 1, 0, 1, 0, 0, 0],
										[1, 0, 1, 0, 1, 1, 1, 0, 1, 1],
										[1, 0, 0, 0, 0, 0, 0, 0, 1, 0],
										[1, 0, 1, 1, 1, 0, 1, 0, 1, 1],
										[0, 0, 1, 0, 1, 0, 0, 0, 0, 0],
										[1, 0, 1, 1, 1, 0, 1, 1, 1, 0],
										[0, 0, 0, 0, 0, 0, 1, 0, 1, 0],
										[1, 1, 1, 0, 1, 0, 1, 1, 1, 0],
										[1, 0, 1, 0, 0, 0, 0, 0, 0, 0]
									];
									if (pattern[modulo(x, 10)][modulo(y, 10)]) PM.setPixel(x, y, selClr);
								} else if (tool.extra.state.dither8) {
									let pattern = [
										[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
										[0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
										[0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0],
										[0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
										[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
										[0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
										[0, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0],
										[0, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1],
										[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
										[0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
										[0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0],
										[0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0]
									];
									if (pattern[modulo(x, 12)][modulo(y, 12)]) PM.setPixel(x, y, selClr);
								} else {
									PM.setPixel(x, y, selClr);
								}
							}

							let t = isFillColor(x, y - 1);
							let b = isFillColor(x, y + 1);
							let l = isFillColor(x - 1, y);
							let r = isFillColor(x + 1, y);

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
					let defaultFx = OWOP.fx.player.RECT_SELECT_ALIGNED(1);
					if (someRenderer(fx, ctx, time, defaultFx)) return;

					ctx.globalAlpha = 0.8;
					ctx.strokeStyle = rgb(...(tool.extra.button === 1 ? OWOP.player.selectedColor : OWOP.player.rightSelectedColor));
					var z = OWOP.camera.zoom;
					if (!tool.extra.fillingColor) return defaultFx(fx, ctx, time);
					ctx.beginPath();
					for (let current in tool.extra.queue) {
						current = tool.extra.queue[current];
						if (tool.extra.state.rainbow) ctx.strokeStyle = rgb(...hue(current.x - current.y, 8));
						let x = current.x
						let y = current.y;
						// if (tool.extra.state.checkered) {
						//   if ((x + y) - 2 * Math.floor((x + y) / 2) == tool.extra.checkered) ctx.rect((x - OWOP.camera.x) * z, (y - OWOP.camera.y) * z, z, z);
						// } else {
						ctx.rect((x - OWOP.camera.x) * z, (y - OWOP.camera.y) * z, z, z);
						// }
					}
					ctx.stroke();
				});
				tool.setEvent("mousedown", (mouse, event) => {
					if (event.which !== 1 && event.which !== 3) return;
					tool.extra.button = event.which;
					tool.extra.fillingColor = PM.getPixel(mouse.tileX, mouse.tileY);
					tool.extra.queue[`${mouse.tileX},${mouse.tileY}`] = { x: mouse.tileX, y: mouse.tileY };
					tool.extra.checkered = (mouse.tileX + mouse.tileY) - 2 * Math.floor((mouse.tileX + mouse.tileY) / 2);
					PM.startHistory();
					tool.setEvent("tick", tick);
				});
				tool.setEvent("mouseup deselect", mouse => {
					PM.endHistory();
					tool.extra.usedQueue = {};
					tool.extra.queue = {};
					tool.extra.fillingColor = undefined;
					tool.extra.button = 0;
					tool.extra.checkered = 0;
					tool.setEvent("tick", null);
					return mouse && 1 & mouse.buttons;
				});
			}));
			OWOP.tool.addToolObject(new OWOP.tool.class('Line', OWOP.cursors.wand, null, 1, tool => {
				tool.extra.state = {
					rainbow: false,
					gradient: false
				};
				tool.extra.start = undefined;
				tool.extra.end = undefined;
				tool.extra.lineLength = 0;
				tool.extra.c = 0;
				tool.setFxRenderer((fx, ctx, time) => {
					let defaultFx = OWOP.fx.player.RECT_SELECT_ALIGNED(1);
					if (someRenderer(fx, ctx, time, defaultFx)) return;

					ctx.globalAlpha = 0.8;
					ctx.strokeStyle = rgb(...(tool.extra.button === 1 ? OWOP.player.selectedColor : OWOP.player.rightSelectedColor));
					if (tool.extra.state.rainbow) ctx.strokeStyle = rgb(...hue(~~(time / 100), 8));
					if ((!tool.extra.start || !tool.extra.end) && (defaultFx(fx, ctx, time), true)) return;
					tool.extra.lineLength = line(tool.extra.start[0], tool.extra.start[1], tool.extra.end[0], tool.extra.end[1], undefined, undefined, (x, y, i) => {
						ctx.beginPath();
						if (tool.extra.state.rainbow) ctx.strokeStyle = rgb(...hue(~~(time / 100) + i, 8));
						ctx.rect((x - camera.x) * camera.zoom, (y - camera.y) * camera.zoom, camera.zoom, camera.zoom);
						ctx.stroke();
					})[0];
				});
				tool.setEvent('mousedown mouseup', (mouse, event) => {
					if (event.which !== 1 && event.which !== 3) return;
					tool.extra.button = event.which;
					if (event.type === "mousedown" && !tool.extra.start) return tool.extra.start = [mouse.tileX, mouse.tileY];
					if (!tool.extra.start) return;
					tool.extra.end = [mouse.tileX, mouse.tileY];
					if (event.type === "mouseup" && tool.extra.start[0] === tool.extra.end[0] && tool.extra.start[1] === tool.extra.end[1]) return;
					PM.startHistory();
					let sc = PM.getPixel(tool.extra.start[0], tool.extra.start[1]);
					line(tool.extra.start[0], tool.extra.start[1], tool.extra.end[0], tool.extra.end[1], undefined, undefined, (x, y, i) => {
						let c = event.which === 1 ? OWOP.player.selectedColor : OWOP.player.rightSelectedColor;
						if (tool.extra.state.gradient) {
							let divisor = (tool.extra.lineLength - 1);
							let r = sc[0] - ((sc[0] - c[0]) / divisor) * i;
							let g = sc[1] - ((sc[1] - c[1]) / divisor) * i;
							let b = sc[2] - ((sc[2] - c[2]) / divisor) * i;
							c = [~~r, ~~g, ~~b];
							if (i == 0) c = sc;
						} else if (tool.extra.state.rainbow) c = event.which === 1 ? hue(x - y, 8) : hue(tool.extra.c++, 8);
						PM.setPixel(x, y, c);
					});
					PM.endHistory();
					tool.extra.start = undefined;
					tool.extra.end = undefined;
				});
				tool.setEvent('mousemove', mouse => {
					if (tool.extra.start) tool.extra.end = [mouse.tileX, mouse.tileY];
				});
				tool.setEvent('deselect', () => {
					PM.endHistory();
					tool.extra.start = undefined;
					tool.extra.end = undefined;
					tool.extra.c = 0;
				});
			}));
			OWOP.tool.addToolObject(new OWOP.tool.class('Copy', OWOP.cursors.copy, null, 1, tool => {
				tool.extra.state = {
					margin: false
				};
				function shrinkMargin(s, e) {
					// for () {

					// }
					return [s2, e2];
				}
				tool.setFxRenderer((fx, ctx, time) => {
					if (someRenderer(fx, ctx, time, () => 1)) return;

					var x = fx.extra.player.x;
					var y = fx.extra.player.y;
					var fxx = (Math.floor(x / 16) - camera.x) * camera.zoom;
					var fxy = (Math.floor(y / 16) - camera.y) * camera.zoom;
					var oldlinew = ctx.lineWidth;
					ctx.lineWidth = 1;
					if (tool.extra.end) {
						var s = tool.extra.start;
						var e = tool.extra.end;
						var x = s[0];
						var y = s[1];
						var w = e[0];
						var h = e[1];
						if (s[0] > e[0]) [w, x] = [x, w];
						if (s[1] > e[1]) [h, y] = [y, h];
						if (NS.chunkize) {
							x = Math.floor(x / 16) * 16;
							y = Math.floor(y / 16) * 16;
							w = Math.floor(w / 16) * 16 + 16;
							h = Math.floor(h / 16) * 16 + 16;
						}
						w = w - x;
						h = h - y;
						x = (x - camera.x) * camera.zoom + 0.5;
						y = (y - camera.y) * camera.zoom + 0.5;

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
				tool.extra.tempCallback = undefined;

				tool.setEvent('mousedown', (mouse, event) => {
					var s = tool.extra.start;
					var e = tool.extra.end;
					const isInside = () => {
						var x = s[0];
						var y = s[1];
						var w = e[0];
						var h = e[1];
						if (NS.chunkize) {
							x = Math.floor(x / 16) * 16;
							y = Math.floor(y / 16) * 16;
							w = Math.floor(w / 16) * 16 + 16;
							h = Math.floor(h / 16) * 16 + 16;
						}
						return mouse.tileX >= x && mouse.tileX < w && mouse.tileY >= y && mouse.tileY < h;
					}
					if (mouse.buttons === 1 && !tool.extra.end) {
						tool.extra.start = [mouse.tileX, mouse.tileY];
						tool.extra.clicking = true;
						tool.setEvent('mousemove', (mouse, event) => {
							if (tool.extra.start && mouse.buttons === 1) {
								tool.extra.end = [mouse.tileX, mouse.tileY];
								return 1;
							}
						});
						tool.setEvent('mouseup', (mouse, event) => {
							if (!(mouse.buttons & 1)) {
								tool.setEvent('mousemove mouseup', null);
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
							tool.setEvent('mouseup', (mouse, event) => { if (!(mouse.buttons & 1)) tool.setEvent('mousemove mouseup', null) });
						} else {
							tool.extra.start = undefined;
							tool.extra.end = undefined;
						}
					} else if (mouse.buttons === 2 && tool.extra.end && isInside()) {
						tool.extra.start = undefined;
						tool.extra.end = undefined;
						let x = s[0];
						let y = s[1];
						let w = e[0];
						let h = e[1];
						if (tool.extra.state.chunkize) {
							x = Math.floor(x / 16) * 16;
							y = Math.floor(y / 16) * 16;
							w = Math.floor(w / 16) * 16 + 16;
							h = Math.floor(h / 16) * 16 + 16;
						}
						w -= x;
						h -= y;
						let data = [];
						for (let j = 0; j < h; j++) {
							data.push([]);
							for (let i = 0; i < w; i++) {
								let pix = PM.getPixel(x + i, y + j);
								if (pix) data[j].push(pix);
							}
						}
						if (tool.extra.tempCallback) {
							if (tool.extra.tempCallback(data)) {
								tool.extra.tempCallback = undefined;
								OWOP.player.tool = "move";
							}
						} else {
							OWOP.tool.allTools.paste.extra.k = data;
							OWOP.player.tool = "paste";
						}
					}
				});
				tool.setEvent('deselect', () => {
					tool.setEvent('mousemove mouseup', null);
					if (!tool.extra.end) {
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
					}
					tool.extra.tempCallback = undefined;
				});
			}));
			OWOP.tool.addToolObject(new OWOP.tool.class('Paste', OWOP.cursors.paste, null, 1, tool => {
				tool.extra.state = {
					chunkize: false,
					rc: () => tool.extra.renderData(0b00),
					rcc: () => tool.extra.renderData(0b01),
					fh: () => tool.extra.renderData(0b10),
					fv: () => tool.extra.renderData(0b11)
				};
				tool.extra.img = undefined;
				tool.extra.data = undefined;
				tool.extra.renderData = function (type) {
					let transpose3 = function (m) {
						let result = new Array(m[0].length);
						for (let i = 0; i < m[0].length; i++) {
							result[i] = new Array(m.length - 1);
							for (let j = m.length - 1; j > -1; j--) {
								result[i][j] = m[j][i];
							}
						}
						return result;
					};

					let reverseRows = function (m) {
						return m.reverse();
					};

					let reverseCols = function (m) {
						for (let i = 0; i < m.length; i++) {
							m[i].reverse();
						}
						return m;
					};

					let rotateCc = m => transpose3(m).reverse();
					let rotateCw = m => transpose3(m.reverse());
					switch (type) {
						case 0: {
							tool.extra.data = rotateCw(tool.extra.data);
						} break;
						case 1: {
							tool.extra.data = rotateCc(tool.extra.data);
						} break;
						case 2: {
							reverseCols(tool.extra.data);
						} break;
						case 3: {
							reverseRows(tool.extra.data);
						} break;
					}
					((arr, onblob) => {
						let c = document.createElement('canvas');
						let w = arr[0].length;
						let h = arr.length;
						c.width = w;
						c.height = h;
						let ctx = c.getContext('2d');
						let d = ctx.createImageData(w, h);
						for (let j = 0; j < h; j++) {
							for (let i = 0; i < w; i++) {
								let pix = arr[j][i];
								d.data[4 * (j * w + i)] = pix[0];
								d.data[4 * (j * w + i) + 1] = pix[1];
								d.data[4 * (j * w + i) + 2] = pix[2];
								d.data[4 * (j * w + i) + 3] = 255;
							}
						}
						ctx.putImageData(d, 0, 0);
						c.toBlob(onblob);
					})(tool.extra.data, b => {
						let url = URL.createObjectURL(b);
						let img = new Image();
						img.onload = () => tool.extra.img = img;
						img.src = url;
					});
				}
				tool.setFxRenderer((fx, ctx, time) => {
					let defaultFx = OWOP.fx.player.RECT_SELECT_ALIGNED(1);
					if (someRenderer(fx, ctx, time, defaultFx)) return;

					let p9 = OWOP.camera.zoom;
					let pp = OWOP.mouse.tileX;
					let pD = OWOP.mouse.tileY;

					if (tool.extra.state.chunkize) {
						pp = Math.floor(pp / 16) * 16;
						pD = Math.floor(pD / 16) * 16;
					}

					pp -= OWOP.camera.x;
					pD -= OWOP.camera.y;

					// if (p2.length) {
					//   ctx.globalAlpha = 0.8;

					//for (let pS = 0; pS < p2.length; pS++) {
					//    ctx.strokeStyle = C.toHTML(p2[pS][2]);
					//    ctx.strokeRect((p2[pS][0] - OWOP.camera.x) * p9, (p2[pS][1] - OWOP.camera.y) * p9, p9, p9);
					//}

					//   return 0;
					// }
					if (tool.extra.img) {
						ctx.globalAlpha = 0.5 + Math.sin(time / 500) / 4;
						ctx.strokeStyle = '#000000';
						ctx.scale(p9, p9);
						ctx.drawImage(tool.extra.img, pp, pD);
						ctx.scale(1 / p9, 1 / p9);
						ctx.globalAlpha = 0.8;
						ctx.strokeRect(pp * p9, pD * p9, tool.extra.img.width * p9, tool.extra.img.height * p9);
						return 0;
					}
				});
				tool.setEvent('select', () => {
					if (tool.extra.k) {
						if (tool.extra.k instanceof Image) tool.extra.k = NS.getImageData(tool.extra.k);
						tool.extra.data = tool.extra.k;
						tool.extra.renderData();
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
							p8.addEventListener('load', () => {
								tool.extra.data = NS.getImageData(p8);
								tool.extra.renderData();
							});
							p8.src = p7.result;
						});
						p7.readAsDataURL(p6.files[0]);
					});
					p6.click();
				});
				tool.setEvent('mousedown', (mouse, event) => {
					if (!(mouse.buttons & 1)) return;
					if (!tool.extra.data) return;
					let x = mouse.tileX;
					let y = mouse.tileY;
					let data = tool.extra.data;
					let fix = (p6, p7, p8) => Math.floor(p6 * (1 - p8) + p7 * p8);

					if (tool.extra.state.chunkize) {
						x = Math.floor(x / 16) * 16;
						y = Math.floor(y / 16) * 16;
					}
					PM.startHistory();
					for (let j = 0; j < data.length; j++) {
						for (let i = 0; i < data[0].length; i++) {
							let d = data[j][i];
							let color = PM.getPixel(i + x, j + y);
							if (!color) continue;
							let pH = !isNaN(d[3]) ? d[3] / 255 : 1;
							// let pH = 1;
							// color = [fix(color[0], data[pD + 0], pH), fix(color[1], data[pD + 1], pH), fix(color[2], data[pD + 2], pH)];
							color = [fix(color[0], d[0], pH), fix(color[1], d[1], pH), fix(color[2], d[2], pH)];
							// use this when color is checked against being alpha color cause this is stupid
							// var pix = PM.getPixel(i, j);
							// if (!PM.queue[`${i},${j}`]) PM.setPixel(i, j, pix);
							PM.setPixel(i + x, j + y, color);
						}
					}
					PM.endHistory();
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
			OWOP.tool.addToolObject(new OWOP.tool.class('Write', OWOP.cursors.write, null, 1, tool => {
				tool.extra.state = {
					rainbow: false
				};
				tool.extra.text = "";
				tool.extra.newText = {
					data: {
						gap: 1,
						space: 1,
						height: 8,
						bottom: 6
					},
					" ": {
						width: 1,
						height: 8,
						skip: 0,
						text: "00000000"
					},
					"0": {
						width: 3,
						height: 5,
						skip: 1,
						text: "111101101101111"
					},
					"1": {
						width: 3,
						height: 5,
						skip: 1,
						text: "010110010010111"
					},
					"2": {
						width: 3,
						height: 5,
						skip: 1,
						text: "111001111100111"
					},
					"3": {
						width: 3,
						height: 5,
						skip: 1,
						text: "111001111001111"
					},
					"4": {
						width: 3,
						height: 5,
						skip: 1,
						text: "101101111001001"
					},
					"5": {
						width: 3,
						height: 5,
						skip: 1,
						text: "111100111001111"
					},
					"6": {
						width: 3,
						height: 5,
						skip: 1,
						text: "111100111101111"
					},
					"7": {
						width: 3,
						height: 5,
						skip: 1,
						text: "111001001001001"
					},
					"8": {
						width: 3,
						height: 5,
						skip: 1,
						text: "111101111101111"
					},
					"9": {
						width: 3,
						height: 5,
						skip: 1,
						text: "111101111001111"
					},
					a: {
						width: 3,
						height: 3,
						skip: 3,
						text: "011101011"
					},
					b: {
						width: 3,
						height: 6,
						skip: 0,
						text: `100100100110101110`
					},
					c: {
						width: 3,
						height: 3,
						skip: 3,
						text: `011100011`
					},
					d: {
						width: 3,
						height: 5,
						skip: 1,
						text: `001001011101011`
					},
					e: {
						width: 3,
						height: 3,
						skip: 3,
						text: `010110011`
					},
					f: {
						width: 2,
						height: 5,
						skip: 1,
						text: `0110111010`
					},
					g: {
						width: 3,
						height: 5,
						skip: 3,
						text: `011101011001110`
					},
					h: {
						width: 3,
						height: 5,
						skip: 1,
						text: `100100110101101`
					},
					i: {
						width: 1,
						height: 5,
						skip: 1,
						text: `10111`
					},
					j: {
						width: 2,
						height: 7,
						skip: 1,
						text: `01000101010110`
					},
					k: {
						width: 3,
						height: 5,
						skip: 1,
						text: `100100101110101`
					},
					l: {
						width: 2,
						height: 5,
						skip: 1,
						text: `1010101001`
					},
					m: {
						width: 5,
						height: 3,
						skip: 3,
						text: `111101010110101`
					},
					n: {
						width: 3,
						height: 3,
						skip: 3,
						text: `110101101`
					},
					o: {
						width: 3,
						height: 3,
						skip: 3,
						text: `010101010`
					},
					p: {
						width: 3,
						height: 5,
						skip: 3,
						text: `110101110100100`
					},
					q: {
						width: 3,
						height: 5,
						skip: 3,
						text: `011101011001001`
					},
					r: {
						width: 2,
						height: 3,
						skip: 3,
						text: `111010`
					},
					s: {
						width: 3,
						height: 3,
						skip: 3,
						text: `011010110`
					},
					t: {
						width: 2,
						height: 5,
						skip: 1,
						text: `1010111001`
					},
					u: {
						width: 3,
						height: 3,
						skip: 3,
						text: `101101011`
					},
					v: {
						width: 3,
						height: 3,
						skip: 3,
						text: `101101010`
					},
					w: {
						width: 5,
						height: 3,
						skip: 3,
						text: `101011010101010`
					},
					x: {
						width: 3,
						height: 3,
						skip: 3,
						text: `101010101`
					},
					y: {
						width: 3,
						height: 5,
						skip: 3,
						text: `101101011001010`
					},
					z: {
						width: 3,
						height: 3,
						skip: 3,
						text: `110010011`
					}
				}
				/* this is kept here for future use in alternative fonts
				tool.extra.cyrillic = {
					а: {
						width: 5,
						height: 5,
						skip: 2,
						text: `0111010001111111000110001`
					},
					б: {
						width: 5,
						height: 5,
						skip: 2,
						text: `1111110000111101000111110`
					},
					в: {
						width: 5,
						height: 5,
						skip: 2,
						text: `1111010001111101000111110`
					},
					г: {
						width: 5,
						height: 5,
						skip: 2,
						text: `1111110000100001000010000`
					},
					д: {
						width: 5,
						height: 5,
						skip: 2,
						text: `0111001010010101111110001`
					},
					е: {
						width: 5,
						height: 5,
						skip: 2,
						text: `1111110000111111000011111`
					},
					ё: {
						width: 5,
						height: 7,
						skip: 0,
						text: `01010000001111110000111111000011111`
					},
					ж: {
						width: 5,
						height: 5,
						skip: 2,
						text: `1010110101011101010110101`
					},
					з: {
						width: 5,
						height: 5,
						skip: 2,
						text: `0111010001001101000101110`
					},
					и: {
						width: 5,
						height: 5,
						skip: 2,
						text: `1000110011101011100110001`
					},
					й: {
						width: 5,
						height: 7,
						skip: 0,
						text: `01010001001000110011101011100110001`
					},
					к: {
						width: 5,
						height: 5,
						skip: 2,
						text: `1000110010111001001010001`
					},
					л: {
						width: 5,
						height: 5,
						skip: 2,
						text: `0111101001010010100110001`
					},
					м: {
						width: 5,
						height: 5,
						skip: 2,
						text: `1000111011101011000110001`
					},
					н: {
						width: 5,
						height: 5,
						skip: 2,
						text: `1000110001111111000110001`
					},
					о: {
						width: 5,
						height: 5,
						skip: 2,
						text: `0111010001100011000101110`
					},
					п: {
						width: 5,
						height: 5,
						skip: 2,
						text: `1111110001100011000110001`
					},
					р: {
						width: 5,
						height: 5,
						skip: 2,
						text: `1111010001111101000010000`
					},
					с: {
						width: 5,
						height: 5,
						skip: 2,
						text: `0111010001100001000101110`
					},
					т: {
						width: 5,
						height: 5,
						skip: 2,
						text: `1111100100001000010000100`
					},
					у: {
						width: 5,
						height: 5,
						skip: 2,
						text: `1000110001010100010001000`
					},
					ф: {
						width: 5,
						height: 5,
						skip: 2,
						text: `0010001110101010111000100`
					},
					х: {
						width: 5,
						height: 5,
						skip: 2,
						text: `1000101010001000101010001`
					},
					ц: {
						width: 6,
						height: 6,
						skip: 2,
						text: `100010100010100010100010111111000001`
					},
					ч: {
						width: 5,
						height: 5,
						skip: 2,
						text: `1000110001011110000100001`
					},
					ш: {
						width: 5,
						height: 5,
						skip: 2,
						text: `1010110101101011010111111`
					},
					щ: {
						width: 6,
						height: 6,
						skip: 2,
						text: `101010101010101010101010111111000001`
					},
					ъ: {
						width: 4,
						height: 5,
						skip: 2,
						text: `11000100011101010111`
					},
					ы: {
						width: 5,
						height: 5,
						skip: 2,
						text: `1000110001111011010111101`
					},
					ь: {
						width: 3,
						height: 5,
						skip: 2,
						text: `100100111101111`
					},
					э: {
						width: 5,
						height: 5,
						skip: 2,
						text: `0111010001001111000101110`
					},
					ю: {
						width: 5,
						height: 5,
						skip: 2,
						text: `1011110101111011010110111`
					},
					я: {
						width: 5,
						height: 5,
						skip: 2,
						text: `0111110001011111000110001`
					}
				}
				*/
				tool.extra.cyrillic = {
					а: {
						width: 3,
						height: 5,
						skip: 1,
						text: `010101111101101`
					},
					б: {
						width: 3,
						height: 5,
						skip: 1,
						text: `111100111101111`
					},
					в: {
						width: 3,
						height: 5,
						skip: 1,
						text: `110101110101110`
					},
					г: {
						width: 3,
						height: 5,
						skip: 1,
						text: `111100100100100`
					},
					д: {
						width: 5,
						height: 5,
						skip: 1,
						text: `0111001010010101111110001`
					},
					е: {
						width: 3,
						height: 5,
						skip: 1,
						text: `111100111100111`
					},
					ё: {
						width: 3,
						height: 7,
						skip: -1,
						text: `101000111100111100111`
					},
					ж: {
						width: 5,
						height: 5,
						skip: 1,
						text: `1010110101011101010110101`
					},
					з: {
						width: 4,
						height: 5,
						skip: 1,
						text: `01101001001010010110`
					},
					и: {
						width: 4,
						height: 5,
						skip: 1,
						text: `10011001101111011001`
					},
					й: {
						width: 4,
						height: 8,
						skip: -2,
						text: `01000010000010011001101111011001`
					},
					к: {
						width: 3,
						height: 5,
						skip: 1,
						text: `101101110101101`
					},
					л: {
						width: 3,
						height: 5,
						skip: 1,
						text: `010101101101101`
					},
					м: {
						width: 5,
						height: 5,
						skip: 1,
						text: `1000111011101011000110001`
					},
					н: {
						width: 3,
						height: 5,
						skip: 1,
						text: `101101111101101`
					},
					о: {
						width: 3,
						height: 5,
						skip: 1,
						text: `010101101101010`
					},
					п: {
						width: 3,
						height: 5,
						skip: 1,
						text: `111101101101101`
					},
					р: {
						width: 3,
						height: 5,
						skip: 1,
						text: `110101110100100`
					},
					с: {
						width: 3,
						height: 5,
						skip: 1,
						text: `111100100100111`
					},
					т: {
						width: 3,
						height: 5,
						skip: 1,
						text: `111010010010010`
					},
					у: {
						width: 3,
						height: 5,
						skip: 1,
						text: `101101010010100`
					},
					ф: {
						width: 5,
						height: 5,
						skip: 1,
						text: `0010001110101010111000100`
					},
					х: {
						width: 3,
						height: 5,
						skip: 1,
						text: `101101010101101`
					},
					ц: {
						width: 4,
						height: 6,
						skip: 1,
						text: `101010101010101011100011`
					},
					ч: {
						width: 3,
						height: 5,
						skip: 1,
						text: `101101111001001`
					},
					ш: {
						width: 5,
						height: 5,
						skip: 1,
						text: `1010110101101011010111111`
					},
					щ: {
						width: 6,
						height: 6,
						skip: 1,
						text: `101010101010101010101010111110000011`
					},
					ъ: {
						width: 4,
						height: 5,
						skip: 1,
						text: `11000100011101010111`
					},
					ы: {
						width: 5,
						height: 5,
						skip: 1,
						text: `1000110001111011010111101`
					},
					ь: {
						width: 3,
						height: 5,
						skip: 1,
						text: `100100111101111`
					},
					э: {
						width: 4,
						height: 5,
						skip: 1,
						text: `01101001001110010110`
					},
					ю: {
						width: 5,
						height: 5,
						skip: 1,
						text: `1011110101111011010110111`
					},
					я: {
						width: 3,
						height: 5,
						skip: 1,
						text: `011101011101101`
					}
				}
				tool.extra.position = 0;
				tool.extra.start = undefined;
				tool.extra.end = undefined;
				function setText(t, pos, func) {
					let localPos = [...pos];
					let furthestPos = [...pos];
					function setLetter(letter, pos, func) {
						if (letter === "\n") return 1;
						let letterData = tool.extra.newText[letter];
						if (!letterData) letterData = tool.extra.cyrillic[letter];
						if (!letterData) return 0;
						// let data = tool.extra.newText.data;
						for (let x = 0; x < letterData.width; x++) {
							for (let y = 0; y < letterData.height; y++) {
								if (letterData.text[x + y * letterData.width] !== "0") func(pos[0] + x, pos[1] + y + letterData.skip);
							}
						}
						return letterData;
					}
					for (let p5 = 0; p5 < t.length; p5++) {
						let l = setLetter(t[p5].toLocaleLowerCase(), localPos, func);
						if (l === 0) continue;
						if (l === 1) {
							localPos[0] = pos[0];
							localPos[1] = localPos[1] + tool.extra.newText.data.height + 1;
						} else {
							localPos[0] += l.width + tool.extra.newText.data.gap;
						}
						if (localPos[0] > furthestPos[0]) furthestPos[0] = localPos[0];
						if (localPos[1] > furthestPos[1]) furthestPos[1] = localPos[1];
					}
					return furthestPos;
				}
				tool.setFxRenderer((fx, ctx, time) => {
					if (someRenderer(fx, ctx, time, () => 1)) return;

					let camera = OWOP.camera;
					// let x = fx.extra.player.x;
					// let y = fx.extra.player.y;
					// let fxx = (Math.floor(x / 16) - camera.x) * camera.zoom;
					// let fxy = (Math.floor(y / 16) - camera.y) * camera.zoom;
					let oldlinew = ctx.lineWidth;
					ctx.lineWidth = 2;
					let s, e;
					if (!tool.extra.start) {
						s = [OWOP.mouse.tileX, OWOP.mouse.tileY];
						ctx.strokeStyle = "#00FF00";
					} else {
						s = tool.extra.start;
						ctx.strokeStyle = "#FF0000";
					}
					let oldFillstyle = ctx.fillStyle;
					ctx.fillStyle = OWOP.player.htmlRgb;
					let tempEnd = setText(tool.extra.text, [...s], (x, y) => {
						let x1 = (x - camera.x) * camera.zoom + 0.5;
						let y1 = (y - camera.y) * camera.zoom + 0.5;
						ctx.fillStyle = tool.extra.state.rainbow ? rgb(...hue(x - y, 8)) : OWOP.player.htmlRgb;
						ctx.fillRect(x1, y1, camera.zoom, camera.zoom);
					});
					e = [tempEnd[0] + 1, tempEnd[1] + 8]
					if (tool.extra.end) tool.extra.end = e;
					let x = (s[0] - camera.x) * camera.zoom + 0.5;
					let y = (s[1] - camera.y) * camera.zoom + 0.5;
					let w = e[0] - s[0];
					let h = e[1] - s[1];
					ctx.beginPath();
					ctx.rect(x, y, w * camera.zoom, h * camera.zoom);
					ctx.stroke();
					ctx.lineWidth = oldlinew;
					ctx.fillStyle = oldFillstyle;
					return 0;
				});
				tool.setEvent('mousedown', (mouse, event) => {
					var s = tool.extra.start;
					var e = tool.extra.end;
					const isInside = () => mouse.tileX >= s[0] && mouse.tileX < e[0] && mouse.tileY >= s[1] && mouse.tileY < e[1];
					if (mouse.buttons === 1 && !tool.extra.end) {
						tool.extra.start = [mouse.tileX, mouse.tileY];
						tool.extra.end = [mouse.tileX + 1, mouse.tileY + 7];
						tool.setEvent('keydown', (keysDown, event) => {
							if (event.key.length > 1) {
								switch (event.key) {
									case "Enter": {
										tool.extra.text += "\n";
									} break;
									case "Backspace": {
										let t = tool.extra.text.split("");
										t.pop();
										tool.extra.text = t.join("");
									} break;
								}
								return;
							}
							tool.extra.text += event.key;
							return 1;
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
							tool.setEvent('mouseup', () => tool.setEvent('mouseup mousemove', null));
						} else {
							tool.extra.start = undefined;
							tool.extra.end = undefined;
						}
					} else if (mouse.buttons === 2 && tool.extra.end && isInside()) {
						PM.startHistory();
						setText(tool.extra.text, [...tool.extra.start], (x, y) => PM.setPixel(x, y, tool.extra.state.rainbow ? hue(x - y, 8) : OWOP.player.selectedColor));
						PM.endHistory();
						/*
							for (let p9 = 0; p9 < 7; p9++) {
								for (let pp = 0; pp < 7; pp++) {
									let pD = (p9 * 189 + pp + offsetx * 7);
									// console.log(tool.extra.text[pD]);
									// let color = [p8[pD + 0], p8[pD + 1], p8[pD + 2], p8[pD + 3]];
									let c = [OWOP.player.selectedColor, undefined, undefined];
									let pos = [...tool.extra.start];
									pos[0] = pos[0] + pp + p6 * 7;
									pos[1] = pos[1] + p9 + row * 7;
									let color = c[tool.extra.text[pD]];
									if (color) PM.setPixel(...pos, color);
								}
							}
						}
						*/
						return true;
					}
				});
				tool.setEvent('deselect', () => {
					tool.extra.position = 0;
					tool.extra.start = undefined;
					tool.extra.end = undefined;
					// tool.extra.text = "";
					tool.setEvent('keydown mouseup mousemove', null);
				});
				tool.setEvent('keyup', () => 1);
			}));
			if (OWOP?.tool?.allTools?.pipette) OWOP.tool.allTools.pipette.fxRenderer = someRenderer;
			if (OWOP?.tool?.allTools?.move) OWOP.tool.allTools.move.fxRenderer = someRenderer; // make fucking sure the move tool fucking exists gahhhhh
			if (OWOP?.tool?.allTools?.zoom) OWOP.tool.allTools.zoom.fxRenderer = someRenderer;
			OWOP.tool.updateToolbar();
			if (document.domain && !NS.OPM) {
				let r = 0;
				for (let e in OWOP.tool.allTools) {
					e = OWOP.tool.allTools[e];
					if (e.rankRequired < 2) r++;
				}
				document.getElementById("toole-container").style.maxWidth = 40 * Math.ceil(r / 8) + "px";
			}
			makeOptionsWindow();
		}
		function x() {
			setTimeout(() => {
				if (OWOP?.tool !== undefined && OWOP?.player?.tool?.id !== undefined) setTools();
				else setTimeout(x, 1.5e3);
			}, 1.5e3);
		}
		x();
	}();

	// it gets in the way of reading chat, im not trying to be mean to arc.
	((true) && !function () {
		let e = document.querySelector("div[id='arc-widget-container']");
		e ? e.parentElement.removeChild(e) : void 0;
	}());

	// teleport detector
	((false) && !function () {
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
		}, 1e4);
	}());

	// setting style classes
	((true) && !function () {
		let nekoStyles = document.createElement("style");
		nekoStyles.innerHTML = `
			.ns_topbar {
				display: flex;
				flex-direction: row;
				justify-content: space-between;
				justify-content: flex-end;
			}
			.ns_rtelements {
				position: relative !important;
				margin: 0px 10px;
			}
			.ns_container {
				margin: 0px;
				border-radius: 5px;
				background-color: #7e635c;
				box-shadow: inset 3px 2px 0px 0px #4d313b;
			}
			.ns_vertical {
				width: 5px;
			}
			.ns_horizontal {
				height: 5px;
			}
			.ns_xydisplay {
				/* position: relative !important; */
				top: 0px !important;
				left: 0px !important;
			}
			.ns_rSCcontainer {
				display: flex;
				flex-direction: row;
			}
			.ns_playercountDisplay {
				position: relative !important;
				top: 0px !important;
				right: 0px !important;
				margin-left: 10px;
			}
			.ns_dropdown {
				padding: 3px 0px;
				background: #aba389;
			}
			.tabp {
				display: flex;
				justify-content: space-between;
				margin: 1px 0px;
			}
		`;
		document.head.appendChild(nekoStyles);
	}());

	((document.domain && !NS.OPM) && !function () {
		let originalFunction = OWOP.chat.sendModifier;
		NS.privateMessageID = void 0;
		OWOP.chat.sendModifier = function () {
			let command = arguments[0].slice(1).split(' ');
			if (arguments[0].startsWith('/')) {
				switch (command[0]) {
					case "commands":
					case "help": {
						OWOP.chat.local(`Commands: /tp, /whitelist, /msg`);
					} break;
					case "tp": {
						let x, y;
						if (command.length === 3) {
							[x, y] = [Number(command[1]), Number(command[2])];
						}
						if (command.length === 2) {
							if (isNaN(Number(command[1]))) break;
							let p = NS.M0.misc.world.players[command[1]];
							if (!p) {
								OWOP.chat.local(`Player ${command[1]} doesn't exist.`);
								break;
							}
							({ tileX: x, tileY: y } = p);
						}
						if (isNaN(x) || isNaN(y)) {
							NS.teleport.camera = {};
							break;
						}
						if (Math.abs(x) > 0xFFFFFF || Math.abs(y) > 0xFFFFFF) break;
						if (Math.abs(x) < 5e5 && Math.abs(y) < 5e5) {
							NS.teleport.camera = {};
							NS.M20.centerCameraTo(x, y);
							break;
						}
						NS.teleport.camera = { x: x, y: y };
						NS.M20.camera.zoom = 32;
						if (!NS.teleport.teleporting) {
							OWOP.chat.local("Press Esc to cancel teleport OR send \"/tp\" in chat.");
							NS.teleport();
						}
					} break;
					case "chat": {
						// if (isNaN(Number(command[1]))) break;
						if (command[1] === "all") {
							NS.privateMessageID = void 0;
							OWOP.chat.local(`Chat set to Mode: All.`);
						} else if (isNaN(Number(command[1]))) {

						} else {
							OWOP.chat.local(`Chat set to Mode: Private Messaging\nID: ${command[1]}`);
						}
						NS.privateMessageID = Number(command[1]);
						command[0] = "tell";
						arguments[0] = "/" + command.join(" ");
					} break;
					case "pm":
					case "message":
					case "msg": {
						command[0] = "tell";
						arguments[0] = "/" + command.join(" ");
					} break;
					case "wl":
					case "whitelist": {
						if (!command[1]) {
							OWOP.chat.local(`Whitelist: ${Object.keys(PM.whitelist).join(", ")}`);
							console.log(1);
							break;
						}
						// if (!isNaN(Number(command[1]))) [command[1], command[2], command[3]] = ["add", command[1], command[2]];
						// else {
						//   OWOP.chat.local(`Syntax: /whitelist [add/remove] [id] -[super: true/false]-`);
						//   console.log(2);
						//   break;
						// }
						switch (command[1]) {
							case "add": {
								if (isNaN(Number(command[2]))) {
									OWOP.chat.local(`Syntax: /whitelist [add/remove] [id] -[super: true/false]-`);
									console.log(3);
									break;
								}
								if (PM.whitelist[command[2]]) {
									OWOP.chat.local(`Player ${command[2]} is already whitelisted.`);
									console.log(4);
									break;
								}
								if (!Object.keys(NS.M0.playerList).includes(command[2])) {
									OWOP.chat.local(`Player ${command[2]} doesn't exist.`);
									console.log(5);
									break;
								}
								let _super = false;
								if (command[3] === "true") _super = true;
								PM.whitelist[command[2]] = { super: _super };
								OWOP.chat.local(`Player ${command[2]} added to whitelist.`);
								console.log(6);
							} break;
							case "remove": {
								if (isNaN(Number(command[2]))) {
									OWOP.chat.local(`Syntax: /whitelist [add/remove] [id] -[super: true/false]-`);
									console.log(7);
									break;
								}
								if (!PM.whitelist[command[2]]) {
									OWOP.chat.local(`Player ${command[2]} is not on the whitelist.`);
									console.log(8);
									break;
								}
								delete PM.whitelist[command[2]];
								OWOP.chat.local(`Player ${command[2]} removed from whitelist.`);
								console.log(9);
							} break;
							default: {
							}
						}
					} break;
				}
			} else if (NS.privateMessageID) {
				command[0] = "tell";
				arguments[0] = "/" + command.join(" ");
			}
			return originalFunction.bind(this)(...arguments);
		}
		console.log("non opm completed");
	}());

	((true) && !function () {
		let topBar = document.createElement("span");
		OWOP.elements.topBar = topBar;
		let xyDisplay = document.querySelector("#xy-display");
		let fillerSpan = document.createElement("span");
		let rSCcontainer = document.createElement("span");
		let rSCtext = document.createElement("span");
		let rSCspan = document.createElement("span");
		let playerID = document.createElement("span");
		let playercountDisplay = document.querySelector("#playercount-display");
		rSCcontainer.appendChild(rSCtext);
		rSCcontainer.appendChild(rSCspan);
		topBar.appendChild(xyDisplay);
		topBar.appendChild(fillerSpan);
		topBar.appendChild(rSCcontainer);
		topBar.appendChild(playerID);
		topBar.appendChild(playercountDisplay);
		document.body.appendChild(topBar);

		xyDisplay.classList.add("framed");
		rSCcontainer.classList.add("framed");
		playerID.classList.add("framed");
		playercountDisplay.classList.add("framed");

		topBar.classList.add("ns_topbar");
		xyDisplay.classList.add("ns_xydisplay");
		rSCcontainer.classList.add("ns_rtelements");
		rSCcontainer.classList.add("ns_rSCcontainer");
		rSCcontainer.classList.add("whitetext");
		// rSCtext.classList.add("ns_rtelements");
		// rSCspan.classList.add("ns_rtelements");
		playerID.classList.add("ns_rtelements");
		playerID.classList.add("whitetext");
		playercountDisplay.classList.add("ns_playercountDisplay");

		fillerSpan.style.width = "128px";
		fillerSpan.style["margin-right"] = "10px";

		rSCspan.style.width = "40px";
		rSCspan.style.height = "17px";
		rSCspan.style.background = "#FFFFFF";
		if (localStorage.rSC) {
			let arr = JSON.parse(localStorage.rSC);
			rSCspan.style.background = `#${arr[0].toString(16).padStart(2, "0")}${arr[1].toString(16).padStart(2, "0")}${arr[2].toString(16).padStart(2, "0")}`;
		}
		rSCtext.textContent = "Right Color:";
		playerID.textContent = "Your ID: null";

		setInterval(() => {
			let arr = OWOP.player.rightSelectedColor;
			rSCspan.style.background = rgb(...arr);
			playerID.textContent = `Your ID: ${OWOP.player.id}`;
		}, 10);
	}());

	// checking chat, setting window movement, and wasd movement.
	{
		setInterval(() => {
			let k = document.getElementById("chat-messages").children;
			for (let i = 0; i < k.length; i++) {
				let t = k[i].innerHTML;
				let id = OWOP.player.id;
				var hasClass = t.classList !== undefined ? Array.from(t.classList).indexOf('nK') > -1 : false;
				if (!t.match(`(\\[${id}\\]: )|(${id}: )`) && t.match(`${id}`) && !hasClass) k[i].style = "background: #FF404059;";
			}
		}, 100);// change this to mutation observer
		OWOP.windowSys.class.window.prototype.move = (function (t, e) { document.getElementById('windows').appendChild(this.frame); document.getElementById('windows').appendChild(OWOP.windowSys.windows.Tools.frame); return this.opt.immobile || (this.frame.style.transform = "translate(" + t + "px," + e + "px)", this.x = t, this.y = e), this });
		Object.keys(OWOP.windowSys.windows).forEach(e => OWOP.windowSys.windows[e].move = (function (t, e) { document.getElementById('windows').appendChild(this.frame); document.getElementById('windows').appendChild(OWOP.windowSys.windows.Tools.frame); return this.opt.immobile || (this.frame.style.transform = "translate(" + t + "px," + e + "px)", this.x = t, this.y = e), this }));

		if (NS.et) {
			clearInterval(OWOP.misc.tickInterval);
			OWOP.misc.tickIntervalNS = setInterval(O, 1e3 / OWOP.options.tickSpeed);
			function O() {
				NS.M14.eventSys.emit(OWOP.events.tick, t);
				if (null !== OWOP.player.tool && null !== OWOP.misc.world) OWOP.player.tool.call("tick");
				if (OWOP.player.tool == OWOP.tool.allTools.write) return;
				var t = ++OWOP.misc.tick;
				var e = Math.max(Math.min(OWOP.options.movementSpeed, 64), 0);
				var n = 0;
				var r = 0;
				(NS.keysdown[38] || (NS.keysdown[87] && !NS.keysdown[16])) && (r -= e);
				(NS.keysdown[37] || (NS.keysdown[65] && !NS.keysdown[16])) && (n -= e);
				(NS.keysdown[40] || (NS.keysdown[83] && !NS.keysdown[16])) && (r += e);
				(NS.keysdown[39] || (NS.keysdown[68] && !NS.keysdown[16])) && (n += e);
				if (0 !== n || 0 !== r) {
					// OWOP.require("canvas_renderer").moveCameraBy(n, r);
					NS.M20.moveCameraBy(n, r);
					A(null, "mousemove", OWOP.mouse.x, OWOP.mouse.y);
				}
			}
			function A(t, e, n, r) {
				OWOP.mouse.x = n;
				OWOP.mouse.y = r;
				let o = 0;
				if (null !== OWOP.misc.world) OWOP.mouse.validTile = OWOP.misc.world.validMousePos(OWOP.mouse.tileX, OWOP.mouse.tileY);
				if (null !== OWOP.player.tool) o = OWOP.player.tool.call(e, [OWOP.mouse, t]);
				if (F(OWOP.mouse.tileX, OWOP.mouse.tileY)) NS.M21.updateClientFx();
				return o;
			}
			function F(t, e) {
				return (OWOP.misc.lastXYDisplay[0] !== t || OWOP.misc.lastXYDisplay[1] !== e) && (OWOP.misc.lastXYDisplay = [t, e],
					OWOP.options.hexCoords && (t = (t < 0 ? "-" : "") + "0x" + Math.abs(t).toString(16),
						e = (e < 0 ? "-" : "") + "0x" + Math.abs(e).toString(16)),
					OWOP.elements.xyDisplay.innerHTML = "X: " + t + ", Y: " + e,
					!0)
			}
		}
		console.log("all completed");
	}

	// window setup

	function optionmaker(name, inputType, checked, onclick) {
		let current = mkHTML("div");
		current.className = "tabp";
		current.appendChild(mkHTML("p", { innerHTML: name }));
		let button = mkHTML("button");
		button.classList.add("optionButton");
		current.appendChild(button);
		if (inputType === "button") button.innerHTML = checked ? "on" : "off";
		else if (inputType === "select") button.innerHTML = "&nbsp;&nbsp;&nbsp;&nbsp;";
		button.onclick = function () {
			if (inputType === "button") {
				button.classList.toggle("on");
				button.innerHTML = button.classList.contains("on") ? "on" : "off";
			}
			onclick();
		}
		if (checked) button.classList.toggle("on");
		return current;
	}

	// palette saver
	((true) && !function () {
		let windowName = "Palette Saver";
		let options = {
			closeable: false
		}

		function windowFunc(thisWindow) {
			var divwindow = document.createElement("div");
			divwindow.style = "width: 300px; overflow-y: scroll; overflow-x: scroll; max-height: 165px;"
			divwindow.innerHTML = `<input id="pName" type="text" style="max-width: 100px; border: 0px;" placeholder="Name"></input>
        <button id="addPalette" >Save Current Palette</button> <table id="paletteTable" style="overflow-x: hidden; overflow-y: scroll;"></table>`;
			thisWindow.addObj(divwindow);
		}

		var windowClass = OWOP.windowSys.addWindow(new OWOP.windowSys.class.window(windowName, options, windowFunc))
			.move(window.innerWidth / 3, window.innerHeight / 3);
		windows[windowName] = windowClass;
		NS.windows[windowName].frame.style.visibility = "hidden";

		var pName = document.getElementById("pName");

		pName.oninput = () => {
			if (pName.value.length > 25) pName.style.backgroundColor = "rgb(255 148 129)";
			else pName.style.backgroundColor = "rgb(255, 255, 255)";
		}

		document.getElementById("addPalette").onclick = () => {
			if (pName.value.length > 25) return alert("Your max name length is 25 characters.");
			if (pName.value.length == 0) return alert("Invalid Name");

			let paletteJson = localStorage.paletteJson ? JSON.parse(localStorage.paletteJson) : {};
			if (paletteJson[pName.value]) return (pName.value = "", alert("You already have a palette with this name."));
			paletteJson[pName.value] = OWOP.player.palette;
			localStorage.paletteJson = JSON.stringify(paletteJson);

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
				let paletteJson = JSON.parse(localStorage.paletteJson);
				paletteJson[`${pN}`] = OWOP.player.palette;
				localStorage.paletteJson = JSON.stringify(paletteJson);
			}
			document.getElementById(`useB3-${pN}`).onclick = () => {
				if (!confirm(`Are you sure you want to DELETE the palette ${pN}?`)) return;
				let paletteJson = JSON.parse(localStorage.paletteJson);
				document.getElementById(`palette-${pN}`).outerHTML = '';
				document.getElementById(`im-busy${pN}`).outerHTML = '';
				delete paletteJson[pN];
				localStorage.paletteJson = JSON.stringify(paletteJson);
			}

			pName.style.backgroundColor = "rgb(255 255 255)";

			pName.value = "";
		}

		if (localStorage.paletteJson) {

			var gettedJson = JSON.parse(localStorage.paletteJson);
			var obj = Object.keys(gettedJson);
			for (var i = 0; i < obj.length; i++) {
				let pN = obj[i];
				var divPalette = document.createElement("tr");
				divPalette.id = `im-busy${pN}`;
				divPalette.innerHTML = `<td id="palette-${pN}" style="cursor: pointer; padding: 5px; border: 1px solid white; border-radius: 5px; color: white;">${pN}</td> <td id="useT1-${pN}"><button id="useB1-${pN}">Use</button></td> <td id="useT2-${pN}"><button id="useB2-${pN}">Replace</button></td> <td id="useT3-${pN}"><button id="useB3-${pN}">Delete</button></td>`;
				document.getElementById("paletteTable").appendChild(divPalette);
				document.getElementById(`useB1-${pN}`).onclick = () => {
					let paletteJson = JSON.parse(localStorage.paletteJson);
					OWOP.player.palette.splice(0);
					OWOP.player.palette.push(...paletteJson[`${pN}`]);
					OWOP.player.paletteIndex = OWOP.player.paletteIndex;
				}
				document.getElementById(`useB2-${pN}`).onclick = () => {
					if (!confirm(`Are you sure you want to REPLACE the palette ${pN}?`)) return;
					let paletteJson = JSON.parse(localStorage.paletteJson);
					paletteJson[`${pN}`] = OWOP.player.palette;
					localStorage.paletteJson = JSON.stringify(paletteJson);
				}
				document.getElementById(`useB3-${pN}`).onclick = () => {
					if (!confirm(`Are you sure you want to DELETE the palette ${pN}?`)) return;
					let paletteJson = JSON.parse(localStorage.paletteJson);
					document.getElementById(`palette-${pN}`).outerHTML = '';
					document.getElementById(`im-busy${pN}`).outerHTML = '';
					delete paletteJson[pN];
					localStorage.paletteJson = JSON.stringify(paletteJson);
				}
			}
		}
	}());

	// icons
	!function () {
		let windowName = "Icons";
		let options = {
			closeable: false
		}

		function windowFunc(thisWindow) {
			let content = `
				<style>
					.NSspan1 {
						display: flex;
						flex-direction: column;
						max-height: 200px;
						width: 300px;
					}
					.NSspan2 {
						display: flex;
						justify-content: space-between;
						padding: 4px 0px;
					}
					.NSspan3 {
						display: flex;
						background: #0003;
						border-radius: 10px;
						padding: 5px;
					}
					.NSspan4 {
						display: flex;
						flex-direction: column;
						align-items: center;
						width: 75px;
					}
					.NSspan5 {
						display: flex;
						flex-direction: column;
						justify-content: space-evenly;
					}
					.NSspan6 {
						padding: 5px 0px;
					}
					.NSdiv1 {
						background-image: url("https://ourworldofpixels.com/img/toolset.png");
						width: 36px;
						height: 36px;
					}
					/* switch background #aba389 to #8b08bf on halloween */
					/* switch color #7e635c to #fdfbff on halloween */
					.NSdiv2 {
						background: #aba389;
						color: #7e635c;
						border-radius: 6px;
						border: initial;
						padding: 4px;
						text-shadow: 1px 1px #4d313b;
					}
				</style>
				<span class="NSspan1">
					<span class="NSspan2">
						<span class="NSspan3">
							<span class="NSspan4">
								<span class="NSspan6">
									<div class="NSdiv1" style="background-position: 0px 0px;"></div>
								</span>
								<div class="NSdiv2">Cursor</div>
							</span>
							<span class="NSspan5">
								<button class="optionButton" style="max-height: 25px;" onclick="NS.iconSelect('cursor')">Select</button>
								<button class="optionButton" style="max-height: 25px;" onclick="NS.iconPaste('cursor')">Paste</button>
							</span>
						</span>
						<span class="NSspan3">
							<span class="NSspan4">
								<span class="NSspan6">
									<div class="NSdiv1" style="background-position: -36px 0px;"></div>
								</span>
								<div class="NSdiv2">Move</div>
							</span>
							<span class="NSspan5">
								<button class="optionButton" style="max-height: 25px;" onclick="NS.iconSelect('move')">Select</button>
								<button class="optionButton" style="max-height: 25px;" onclick="NS.iconPaste('move')">Paste</button>
							</span>
						</span>
					</span>
					<span class="NSspan2">
						<span class="NSspan3">
							<span class="NSspan4">
								<span class="NSspan6">
									<div class="NSdiv1" style="background-position: 0px -36px;"></div>
								</span>
								<div class="NSdiv2">Pipette</div>
							</span>
							<span class="NSspan5">
								<button class="optionButton" style="max-height: 25px;" onclick="NS.iconSelect('pipette')">Select</button>
								<button class="optionButton" style="max-height: 25px;" onclick="NS.iconPaste('pipette')">Paste</button>
							</span>
						</span>
						<span class="NSspan3">
							<span class="NSspan4">
								<span class="NSspan6">
									<div class="NSdiv1" style="background-position: -36px -72px;"></div>
								</span>
								<div class="NSdiv2">Zoom</div>
							</span>
							<span class="NSspan5">
								<button class="optionButton" style="max-height: 25px;" onclick="NS.iconSelect('zoom')">Select</button>
								<button class="optionButton" style="max-height: 25px;" onclick="NS.iconPaste('zoom')">Paste</button>
							</span>
						</span>
					</span>
					<span class="NSspan2">
						<span class="NSspan3">
							<span class="NSspan4">
								<span class="NSspan6">
									<div class="NSdiv1" style="background-position: -72px 0px;"></div>
								</span>
								<div class="NSdiv2">Select</div>
							</span>
							<span class="NSspan5">
								<button class="optionButton" style="max-height: 25px;" onclick="NS.iconSelect('export')">Select</button>
								<button class="optionButton" style="max-height: 25px;" onclick="NS.iconPaste('export')">Paste</button>
							</span>
						</span>
						<span class="NSspan3">
							<span class="NSspan4">
								<span class="NSspan6">
									<div class="NSdiv1" style="background-position: -36px -36px;"></div>
								</span>
								<div class="NSdiv2">Bucket</div>
							</span>
							<span class="NSspan5">
								<button class="optionButton" style="max-height: 25px;" onclick="NS.iconSelect('fill')">Select</button>
								<button class="optionButton" style="max-height: 25px;" onclick="NS.iconPaste('fill')">Paste</button>
							</span>
						</span>
					</span>
					<span class="NSspan2">
						<span class="NSspan3">
							<span class="NSspan4">
								<span class="NSspan6">
									<div class="NSdiv1" style="background-position: -108px -108px;"></div>
								</span>
								<div class="NSdiv2">Wand</div>
							</span>
							<span class="NSspan5">
								<button class="optionButton" style="max-height: 25px;" onclick="NS.iconSelect('line')">Select</button>
								<button class="optionButton" style="max-height: 25px;" onclick="NS.iconPaste('line')">Paste</button>
							</span>
						</span>
						<span class="NSspan3">
							<span class="NSspan4">
								<span class="NSspan6">
									<div class="NSdiv1" style="background-position: -108px -36px;"></div>
								</span>
							<div class="NSdiv2">Paste</div>
							</span>
							<span class="NSspan5">
								<button class="optionButton" style="max-height: 25px;" onclick="NS.iconSelect('paste')">Select</button>
								<button class="optionButton" style="max-height: 25px;" onclick="NS.iconPaste('paste')">Paste</button>
							</span>
						</span>
					</span>
					<span class="NSspan2">
						<span class="NSspan3">
							<span class="NSspan4">
								<span class="NSspan6">
									<div class="NSdiv1" style="background-position: -108px 0px;"></div>
								</span>
								<div class="NSdiv2">Copy</div>
							</span>
							<span class="NSspan5">
								<button class="optionButton" style="max-height: 25px;" onclick="NS.iconSelect('copy')">Select</button>
								<button class="optionButton" style="max-height: 25px;" onclick="NS.iconPaste('copy')">Paste</button>
							</span>
						</span>
						<span class="NSspan3">
							<span class="NSspan4">
								<span class="NSspan6">
									<div class="NSdiv1" style="background-position: -36px -108px;"></div>
								</span>
								<div class="NSdiv2">Text</div>
							</span>
							<span class="NSspan5">
								<button class="optionButton" style="max-height: 25px;" onclick="NS.iconSelect('write')">Select</button>
								<button class="optionButton" style="max-height: 25px;" onclick="NS.iconPaste('write')">Paste</button>
							</span>
						</span>
					</span>
					<!--
					<span class="NSspan2">
						<span class="NSspan3">
							<span class="NSspan4">
								<span class="NSspan6">
									<div class="NSdiv1" style="background-position: -108px 0px;"></div>
								</span>
								<div class="NSdiv2">Copy</div>
							</span>
							<span class="NSspan5">
								<button class="optionButton" style="max-height: 25px;" onclick="NS.iconSelect('copy')">Select</button>
								<button class="optionButton" style="max-height: 25px;" onclick="NS.iconPaste('copy')">Paste</button>
							</span>
						</span>
						<span class="NSspan3">
							<span class="NSspan4">
								<span class="NSspan6">
									<div class="NSdiv1" style="background-position: -36px -108px;"></div>
								</span>
								<div class="NSdiv2">Text</div>
							</span>
							<span class="NSspan5">
								<button class="optionButton" style="max-height: 25px;" onclick="NS.iconSelect('write')">Select</button>
								<button class="optionButton" style="max-height: 25px;" onclick="NS.iconPaste('write')">Paste</button>
							</span>
						</span>
					</span>
					-->
				</span>
			`;
			thisWindow.container.innerHTML = content;

			NS.iconSelect = function (iconsName) {
				OWOP.tool.allTools.copy.extra.tempCallback = function (data) {
					if (data.length !== 36 || data[0].length !== 36) {
						OWOP.chat.local("The size needs to be (36 by 36).");
						return false;
					}
					NS.localStorage.cursors[iconsName].icon = NS.setImageData(data).toDataURL();
					localStorage.NS = JSON.stringify(NS.localStorage);
					return true;
				}
				OWOP.player.tool = "copy";
			}
			NS.iconPaste = function (iconsName) {
				let offset = [0, 0];
				let icon = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAAA00lEQVRYw+3YMQ6DMAwFUPPFhTpCRxaW3qYzQ9f2Nl1YGIGRI8ENShz7W6mEZxwe34kUIXKVoR63+x79TpSGQmlJobTxJYHe8xiGSk4oCgXNwxEoaBvYKOQ0MVHIbew/AwWVDeqaloKCdQFvlAnUNa07Cl5Re6HguSE9UPA+tlaUO8iKMoGmdXFHURKyoJCTxLQuP9OxoGrLeMbnS31H/25zRRmZFpN686ytmLMvpp8yJkYNYmNUoAiMiEil3YBMjHpkbIwKFIFJBkVhivz7cdXf1QFBsW2mhPMCDAAAAABJRU5ErkJggg==";
				switch (iconsName) {
					case "cursor": {
						icon = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAAA00lEQVRYw+3YMQ6DMAwFUPPFhTpCRxaW3qYzQ9f2Nl1YGIGRI8ENShz7W6mEZxwe34kUIXKVoR63+x79TpSGQmlJobTxJYHe8xiGSk4oCgXNwxEoaBvYKOQ0MVHIbew/AwWVDeqaloKCdQFvlAnUNa07Cl5Re6HguSE9UPA+tlaUO8iKMoGmdXFHURKyoJCTxLQuP9OxoGrLeMbnS31H/25zRRmZFpN686ytmLMvpp8yJkYNYmNUoAiMiEil3YBMjHpkbIwKFIFJBkVhivz7cdXf1QFBsW2mhPMCDAAAAABJRU5ErkJggg==";
					} break;
					case "move": {
						icon = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAABgklEQVRYw+2YvU7EMAzH/055CYZj6IJ0243Q8ZYs9zbcWgErfZtbTkgdGNqOtyM2Ft7imHKK0g/nw4Ui4S1K7Pzi2q4TQEB2m+K82xRnCVskAWOPD6eGfg3IwLw0RwDAvtDJUCQFYyQViiRhJKBIGiYVilICmPNQTKCrEKCYTxCqo+bcIOYACguTvwMk9SsIta2mFDiofaFRd+1lXHdtL8NCbVOKZ3zTPiTwVUzRAwBdlVFz7mFcB1BMBfYB9l3rVvTMhtFViXy1mjSQrXN2TcjabJ3j4/UNt9c3j+9fn09kwwDA9u7+R9PcJMXx4RkAcDW2YG4wOzt7MeR6iRNf2LFNXTHeOZwaUnZAmQkf5ZCNfGF6dcj2FGdMV+Wop+qu9dJ3YRZZGIn71wy1EPa87SnXM5zu0Lyaoub6GZMEdddeAphLDM62kmyuJBq3/wZNHCgkC2OaPDUXTKxO9EWRy6ahojf7VXoMKhZG5LHBhUqBEXuOMVCpMIt8sBK7Z0nd474B40/4pg5xCDEAAAAASUVORK5CYII=";
					} break;
					case "pipette": {
						icon = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAABAUlEQVRYw+3XvQ6CMBQF4FPiCzHQRDu6uPA2zg6u+jYuLI5ogoOPhFOTpnL7Y3ovDj0jIeRLzyEEoKaGTt+auW/NHLpHSUH8a7f3qFYBuZhOawDAa5pIlJLAWIgbCrXhrmYJI7KhHEyosqYUyH14p3X2ybBtKLSb2OkUB/m1+agYhmVDh+sJADAcz8mvevENWcxlHLDf7uDCLCQ1TUkMANyfD3I37KAQxlYWq6jYhnIxfWvmFJz6l5P5GcSJyQZxY7JAEphkkBQmCSSJiYKkMUHQGhgS5H8o3XBisj8d3JhFkF+VJOarMhdjN2MhEhiysrUw5Aml/GGKgHyUNKampkQ+wWnd9v+Wv9QAAAAASUVORK5CYII=";
					} break;
					case "zoom": {
						icon = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAABMUlEQVRYw+3Wuw6CMBQG4L+NL+SIjgyy+CSuujo4u/ISri4wdFQTHFx9CScS1zrVNFCgdzThJCRcGvrlHHooMMWfBfH5svV8yVX3z48LiQrqgtjAiE9M14Q6Y7yVSEyWs5I/33XryFnJVeODYVQQGSFHzkoeBCW/VAdigqIuMBnAblds0hWJ3idU2dHJjG6WqCvQd2acQb7LRPFjQV3LZRNpsggDsimX6QIwXmmm8XzX4fpQiOxQm+zI57olyFnJ02SB3TLr/ckSG0x23AMAiu0B8rXqmxIQAIMYI1AT8zoVAIB7VX3HiGfN1SQgOtsP4oJpgqJs0HQwYqLgW1gTTPBN/hiYTtBYGCVoTMxgY4yNaWVIzs4YGACY9WVG7jExMJ2gZrOLhen9qGNDppjCV3wAmp0jyCb9nC4AAAAASUVORK5CYII=";
					} break;
					case "export": {
						icon = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAABCklEQVRYw+2YMQ6CQBBFP4QL2Ql02mDhadQWg+3iaSzcRrsVO4+k1RCNhB3RHdZkfzUJBW//Z4YBIOjPFAHAcpLfpW54uJmoF0gShgOVULHYbwEAs2kKADhfm5/Xm7ywR0YOKaNxvjZOnTmuKqtDsVRM5JJNLZBrd7iKPz3BUHEPHCILkXkdGc0dryIjKG8iU0bjuKr86jJlNOs9Jtplymi/ugwAirqEbf8SHYzzNLNCiUXGdSruGmAE9209BMr5ClvUJeZpBgA4NZe363q9e1nanC/55ESfnqEiVyB0yC4gAhi97W0wh5uJkjFgvFjyOTBiQFyYtstcPtTcT2hRh7gwzjXGf4MgcT0AtrSSgUtEfWEAAAAASUVORK5CYII=";
					} break;
					case "fill": {
						icon = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAABjUlEQVRYw+2YsW7DIBCGAfWFMhgpZezCkreJVw9Z7bfpwpLRiYSHPlI6XYSviLszWG2lnJQhGJNP//3HQZR6xT8LzZ14OrgHHvv8mvWvAOVg9oLTXBg/DavxcL7sAqU5MOMcVO/86lln7er7EmMTKC2FwSAYqBbKtICBgLRyPMcG2grTCspwJlEwS4wr09dAaUodjmfgnev9lq1EiaeMRJklxufHT8NTCT8N6nq/qY/je3X63jiTQI3cXpSOAVSqlJ8GFc4XdTq4B0cpQ4FgNVKYcQ4/3qlVylAVg0EwDP7xWqgsUO+8GueQbQ+QpjQtLaGMpCRznmkNpUtdHW+OufRhGFz68Jy7JZhSt4bUlWC2KiVOGRg69VPOU62hWB7qnVedtaqzdncokamXGKuhqJZipDCcKEHlTF+lEO7sUiiq4YqAqGqjoDjdnw0Ei5T8U4KC/YxqsCKFtkJxYUignMRSKOkhTewhCVTzE+NWqHRXl16JNHV1phYsHSW23M+KF0Xughhqjz8hXvFn4xvHckf64m/UhgAAAABJRU5ErkJggg==";
					} break;
					case "line": {
						icon = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAABEUlEQVRYw+2XvRGEIBCFkbEDKzGQxAZITK3E2OBiKzG9hAYuweAqsQYvWofjVOB4GPESHRdmP/cHV8aysrLSqrgydnW70f3z/Sp8bUmATIc+QkFx1wI5jUxO48/zRgjWCAFPWem78AhqnRUciLtSoIbHoX2dFVu0vg/IpaqXXykLrTk4EEHJadzBEFBlzGY7bYhO4662p7e3C1gNDziMd8ooEgRlwlH33VZDi9Z7JOxrIwRbZwWFcrb91dlDYEiooLzb3y+7zqpe7ufWvzUVvKmr2810hoaCdAYSCjY2oKBgQCgoKBACCg4UC5UEKAYqGdARlHmYnkHxlEDkNGSQSxqhs+EN+ZcSBYWaCLKysmL0AfZSsN1jloZVAAAAAElFTkSuQmCC";
					} break;
					case "paste": {
						icon = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAABQ0lEQVRYw+2Yvw6CMBDGr4QXYpBA2Jx04GmMs3E2Po2DTmwEggOPhFOTUtvSa6/FGC4xacuf/vjuu1IE2CJg1Fk11Vk1Ud6T+cCI/cfYslWARJDj/QIAAM/TlQyM+cBwELHtC8VsU2JSxTSOhUwwMCoAuY19QDlS08Fdns/672HQQmGucwZSTaRLiQ4GGyn2At8JnTy0ZqAUwnghWspu7Qt1/rk6/F7KeDXalH40D9lCpTFg5KWizqpJt3J7ATV9BwAA+6L86vP2rX3Nxpc85QXEQVR9XZu8ykQlVOrICpkegAxIdWOTWkHXIZ1XVIAqJYMrZJrIRaXEVSH+k/0T/dVB6Zf/e9uryl5n4KbvZuPRTL2URmw6yRRa3UP7oiQFsVLItEOkLPVFoMfYMtO+JYQy6E9p6n85dPsh52/7EDBb2MQHK+ObZIdb/JMAAAAASUVORK5CYII=";
					} break;
					case "copy": {
						icon = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAABS0lEQVRYw+2XMQ6CMBSGfwxH8CIOEg2bkx2cOYhxJs6Ggzg74ORGNGXwIt5BpxrAAn3PVzWGPzEpaMLH199CgSFD/iwB5cerSXznXORwLQJxIC4MFYoMpLKUBJKvtySo0JeRaqZRhFJrrCbxvQ8qkIZpGszXW0yjCABQat1rqhNoVxxJMJt4+QJVnTKXToXSf1uVpTUrKktx2+cAgHGiWgFNRj7WEpWlKLXGOFFPEDNml5qbqoGqKQMmBnS6nAEAi9n85diMd8Wxdn4TL53NkIEMiO24bQyg1h8RIHPHNjtNQzZgcUPNO+6z9W5CSndsJmzfvQNIMtR1ISlLIxdD5tPsj0tu+/xZbC8dopqgltrLSv2RUncV+HQ5185/rNR90yhRbJahr05Z2wrNediKAXFAuC/8rA753AaFLq+kP7FRlNp1UOwMGfKXeQBOJJ69p18KUgAAAABJRU5ErkJggg==";
					} break;
					case "write": {
						icon = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAABTUlEQVRYw+2XPW6DQBCFHyNu4JOktF26oUnrk7hO4TY5CW2abbY0SEvhk3AGp8miMcGEmVmMLPEa/0iGx3xvZsfAqlU2ZdYLvL/tb/zz9/WSLWaobyaFqcxq5vPiAAC+rgAA7nQ2maIU3KOZFKKUZtrSLWOoj8udzh2q4utjNF+zVsjXVWcEAJoQlkcWA2xtd7UhjmsoM23pTNjIgmsIkRWb2tBYR1m6jbS4YiV4duL7JgQ1NrLOntQiC66hzorfabGRBdeYtNhyCy7tNJ59MD59QeO4fF3hsN3dVeyw3d299iVZSXINrv5NfV2hLR38b5g3x6IL9eZYiCokzhA/TP8ohp2FvhAaIgkuTStLz7ZcgmtoOv/3ME0IoiqRZomf44+BqO05Lsnew6d2xJZkDj1aNaZK8luaGkyrpl6DJE+oWVP5SvKSR8eqVVb9AMXs1T0X1uPeAAAAAElFTkSuQmCC";
					} break;
				}
				let img = document.createElement("img");
				img.src = icon;
				img.onload = function () {
					((onblob) => {
						let c1 = document.createElement('canvas');
						let ctx1 = c1.getContext('2d');
						ctx1.drawImage(img, 0, 0);
						let iconImageData = ctx1.getImageData(0, 0, 36, 36);
						let c2 = document.createElement('canvas');
						c2.width = 38;
						c2.height = 38;
						let ctx2 = c2.getContext('2d');
						ctx2.fillStyle = "#000000";
						ctx2.fillRect(0, 0, c2.width, c2.height);
						for (let y = 0; y < 36; y++) {
							for (let x = 0; x < 36; x++) {
								let pix = iconImageData.data[4 * (y * 36 + x) + 3];
								if (pix < 255) {
									iconImageData.data[4 * (y * 36 + x)] = 255;
									iconImageData.data[4 * (y * 36 + x) + 1] = 255;
									iconImageData.data[4 * (y * 36 + x) + 2] = 255;
									iconImageData.data[4 * (y * 36 + x) + 3] = 255;
								}
							}
						}
						ctx2.putImageData(iconImageData, 1, 1);
						c2.toBlob(onblob);
					})(b => {
						let url = URL.createObjectURL(b);
						let image = new Image();
						image.onload = () => {
							OWOP.tool.allTools.paste.extra.k = image;
							OWOP.player.tool = "move";
							OWOP.player.tool = "paste";
						}
						image.src = url;
					});
				}
			}
		}

		var windowClass = OWOP.windowSys.addWindow(new OWOP.windowSys.class.window(windowName, options, windowFunc)
			.move(OWOP.windowSys.windows['Tools'].realw + 15, 34));
		windows[windowName] = windowClass;
		windowClass.frame.style.visibility = "hidden";
	}();

	// assets
	!function () {
		let windowName = "Assets";
		let options = {
			closeable: false
		}

		let G = r => document.getElementById(r);

		function windowFunc(thisWindow) {
			thisWindow.frame.style.width = "500px";
			let innerFrame = document.createElement("div");
			let realAssetsCont = mkHTML("div", {
				id: "real-assets-cont"
			});
			let p = mkHTML("p");
			p.style["margin-block"] = "auto";
			p.style["display"] = "flex";
			p.style["justify-content"] = "space-evenly";

			let button1 = mkHTML("button", {
				id: "NSoptions",
				innerHTML: "Add"
			});

			let button2 = mkHTML("button", {
				id: "NSoptions",
				innerHTML: "Paste"
			});

			let button3 = mkHTML("button", {
				id: "NSoptions",
				innerHTML: "Delete"
			});

			let button4 = mkHTML("button", {
				id: "NSoptions",
				innerHTML: "Reload"
			});

			button1.onclick = async () => {
				OWOP.sounds.play(OWOP.sounds.click);
				let pE = localStorage.MB_Assets;
				if (!pE) pE = [];
				else pE = JSON.parse(pE);
				var _imgTotal = 0;
				{
					var _lsTotal = 0,
						_xLen, _x;
					for (_x in localStorage) {
						if (!localStorage.hasOwnProperty(_x)) {
							continue;
						}
						_xLen = ((localStorage[_x].length + _x.length) * 2);
						_lsTotal += _xLen;
					};
					//console.log("Total = " + (_lsTotal / 1024).toFixed(2) + " KB");
					if ((_lsTotal / 1024) > 3000) return OWOP.chat.local(`Storage limit reached (3MB), remove images to add more.`);
					_imgTotal = _lsTotal;
				}
				{
					var _imageData = await X('image/*');
					var _lsTotal = 0, _x;
					_x = JSON.stringify(_imageData);
					_lsTotal = _x.length * 2;
					//console.log("Total = " + (_lsTotal / 1024).toFixed(2) + " KB");
					if ((_lsTotal / 1024) > 500) {
						if (((_lsTotal + _imgTotal) / 1024) > 3000) return OWOP.chat.local(`Image being added is more than Storage limit (3KB)`);
						if (!confirm(`Are you sure you want to add a image with ${(_lsTotal / 1024).toFixed(2)} KB`)) return;
					}
				}
				pE.push(_imageData);
				localStorage.MB_Assets = JSON.stringify(pE);
				J();
			};

			button2.onclick = () => {
				OWOP.sounds.play(OWOP.sounds.click);
				var img = new Image();
				img.onload = () => {
					OWOP.tool.allTools.paste.extra.k = img;
					OWOP.player.tool = "move";
					OWOP.player.tool = "paste";
				}
				img.src = NS.selectedAsset;
			};

			button3.onclick = () => {
				OWOP.sounds.play(OWOP.sounds.click);
				if (!NS.selectedAssetIndex) return;
				if (confirm("Do you want to delete the selected asset?")) NS.assets.splice(NS.selectedAssetIndex, 1);
				else return;
				localStorage.MB_Assets = JSON.stringify(NS.assets);
				J();
			};

			button4.onclick = () => {
				OWOP.sounds.play(OWOP.sounds.click);
				J();
			};

			let J = () => {
				NS.assets = localStorage.MB_Assets;
				if (!NS.assets) NS.assets = [];
				else NS.assets = JSON.parse(NS.assets);
				let y = G("real-assets-cont");
				y.innerHTML = '';
				for (let p0 in NS.assets) {
					let p1 = new Image();

					p1.onload = () => {
						p1.style.width = '48px';
						p1.style.height = '48px';
						p1.style.border = 'solid 1px';

						p1.onclick = () => {
							for (let p4 in G('real-assets-cont').children) {
								if (typeof G('real-assets-cont').children[p4] !== 'object') break;
								G('real-assets-cont').children[p4].style.border = 'solid 1px';
							}
							if (NS.selectedImg) {
								NS.selectedImg.style.width = '48px';
								NS.selectedImg.style.height = '48px';
							}
							NS.selectedAsset = NS.assets[p0];
							NS.selectedAssetIndex = p0;
							NS.selectedImg = p1;
							p1.style.width = '40px';
							p1.style.height = '40px';
							p1.style.border = 'solid 5px black';
						};

						p1.oncontextmenu = p3 => {
							p3.preventDefault();
							NS.assets.splice(p0, 1);
							localStorage.MB_Assets = JSON.stringify(NS.assets);
							J();
						};

						y.append(p1);
					};

					p1.src = NS.assets[p0];
				}
			};

			let X = (r = '*') => new Promise(Q => {
				let c = document.createElement('input');
				c.type = 'file';
				c.accept = r;

				c.onchange = () => {
					let N = new FileReader();

					N.onloadend = () => {
						Q(N.result);
					};

					N.readAsDataURL(c.files[0]);
				};

				c.onclick = () => void 0;

				c.click();
			});

			button2.addEventListener("click", function () {
				OWOP.sounds.play(OWOP.sounds.click)
			});
			p.appendChild(button1);
			p.appendChild(button2);
			p.appendChild(button3);
			p.appendChild(button4);
			innerFrame.appendChild(p);
			innerFrame.appendChild(realAssetsCont);
			thisWindow.addObj(innerFrame);
		}

		var windowClass = OWOP.windowSys.addWindow(new OWOP.windowSys.class.window(windowName, options, windowFunc)
			.move(window.innerWidth / 3, window.innerHeight / 3));
		windows[windowName] = windowClass;
		windowClass.frame.style.visibility = "hidden";
	}();

	// patterns
	((true) && !function () {
		let windowName = "Patterns";
		let options = {
			closeable: false
		}

		function windowFunc(thisWindow) {
			let content = `
				<span style="display: flex;flex-direction:column;">
					<div class="ns_container">
						<div style="border: 10px #0000 solid;">
							<span class="tabp">
								<p>Columns: </p>
								<input id="patternCol" type="text" style="max-width: 100px; border: 0px;" placeholder="columns" value="8"></input>
							</span>
							<span class="tabp">
								<p>Rows: </p>
								<input id="patternRow" type="text" style="max-width: 100px; border: 0px;" placeholder="rows" value="8"></input>
							</span>
							<span id="patternSpanPatternColors">
							</span>
							<!--
							<span class="tabp">
								<p>Type</p>
								<select class="ns_dropdown" oninput="NS.patternSetting=this.value">
									<option value="default">Default</option>
									<option value="checkered">Checkered</option>
									<option value="1">Pattern 1</option>
									<option value="2">Pattern 2</option>
									<option value="3">Pattern 3</option>
									<option value="4">Pattern 4</option>
									<option value="5">Pattern 5</option>
									<option value="6">Pattern 6</option>
									<option value="7">Pattern 7</option>
									<option value="8">Pattern 8</option>
								</select>
							</span>
							-->
						</div>
					</div>
					<div class="ns_horizontal"></div>
					<div id="nsCanvasContainer" class="nscontainer" style="display: flex;align-content: space-around;">
					</div>
				</span>
			`;
			let container = thisWindow.container;
			container.style = "margin: 0px -5px -5px -5px;";
			container.className = "optionsDiv";
			container.innerHTML = content;

			let canvas = document.createElement("canvas");
			let ctx = canvas.getContext("2d");
			canvas.width = 274;
			canvas.height = 274;
			canvas.textContent = "Your browser does not support the HTML canvas tag.";
			canvas.id = "nsCanvas";
			container.querySelector("#nsCanvasContainer").appendChild(canvas);

			ctx.strokeStyle = "black";
			ctx.lineWidth = 0;

			NS.pattern = [];
			for (let i = 0; i < 16; i++) {
				NS.pattern.push([]);
				for (let j = 0; j < 16; j++) {
					NS.pattern[i].push({ on: false, c: "#000000", a: [0, 0, 0]});
				}
			}

			container.querySelector("#patternSpanPatternColors").appendChild(optionmaker("Colors", "button", NS.patternColors, () => (NS.patternColors = !NS.patternColors, setPatternSize())));

			function fill(color) {
				ctx.fillStyle = color;
			}

			function drawRect(x, y, width, height) {
				ctx.fillRect(x, y, width, height);
			}

			function makeCells(cols, rows) { // x by y, thats why its cols, rows
				canvas.width = Math.min(16, Math.max(8, cols)) * 34 + 2;
				canvas.height = Math.min(16, Math.max(8, rows)) * 34 + 2;
				fill("#000000");
				drawRect(0, 0, canvas.width, canvas.height);
				for (let y = 0; y < Math.max(8, rows); y++) {
					for (let x = 0; x < Math.max(8, cols); x++) {
						fill("#1f1f1f");
						if (x < cols && y < rows) (fill("#ffffff"), drawRect(x * 34 + 2, y * 34 + 2, 32, 32), NS.pattern[x][y].on ? (NS.patternColors ? fill(NS.pattern[x][y].c) : fill("#aba389")) : (fill("#7e635c")));
						drawRect(x * 34 + 3, y * 34 + 3, 30, 30);
					}
				}
			}

			function getMousePos(canvas, evt) {
				var rect = canvas.getBoundingClientRect();
				return {
					x: (evt.clientX - rect.left) / (rect.right - rect.left) * canvas.width,
					y: (evt.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height
				};
			}

			let col = container.querySelector("#patternCol");
			let row = container.querySelector("#patternRow");

			function setPatternSize() {
				if (col.value.length == 0 || row.value.length == 0) return;
				let c = parseInt(col.value);
				let r = parseInt(row.value);
				if (!c || !r) return;
				r = Math.min(16, Math.max(1, r));
				c = Math.min(16, Math.max(1, c));
				col.value = c;
				row.value = r;
				NS.pattern.x = c;
				NS.pattern.y = r;
				makeCells(c, r);
			}

			col.onchange = setPatternSize;
			row.onchange = setPatternSize;

			setPatternSize();

			let mode = false;
			let modeSwitch = false;
			function handleCanvasMouseEvent(event) {
				switch (event.type) {
					case "mousedown": {
						event.preventDefault();
						let { x, y } = getMousePos(canvas, event);
						if (x / 34 >= 16 || y / 34 >= 16) return;
						mode = true;
						let x1 = x % 34;
						let y1 = y % 34;
						if (x1 < 3 || x1 > 32 || y1 < 3 || y1 > 32) return;
						let e = NS.pattern[Math.floor(x / 34)][Math.floor(y / 34)];
						modeSwitch = true;
						if (!NS.patternColors || !(e.on && e.c !== OWOP.player.htmlRgb)) modeSwitch = e.on = !e.on;
						e.c = OWOP.player.htmlRgb;
						e.a = OWOP.player.selectedColor;
						setPatternSize();
					} break;
					case "mousemove": {
						event.preventDefault();
						let { x, y } = getMousePos(canvas, event);
						if (x / 34 >= 16 || y / 34 >= 16) return;
						if (!mode) break;
						let x1 = x % 34;
						let y1 = y % 34;
						if (x1 < 3 || x1 > 32 || y1 < 3 || y1 > 32) return;
						let e = NS.pattern[Math.floor(x / 34)][Math.floor(y / 34)];
						e.on = modeSwitch;
						e.c = OWOP.player.htmlRgb;
						e.a = OWOP.player.selectedColor;
						setPatternSize();
					} break;
					case "mouseup": {
						mode = false;
					} break;
				}
			}

			canvas.addEventListener("mousedown", handleCanvasMouseEvent);
			canvas.addEventListener("mousemove", handleCanvasMouseEvent);
			canvas.addEventListener("mouseup", handleCanvasMouseEvent);

		}

		var windowClass = OWOP.windowSys.addWindow(new OWOP.windowSys.class.window(windowName, options, windowFunc)
			.move(window.innerWidth / 3, window.innerHeight / 3));
		windows[windowName] = windowClass;
		windowClass.frame.style.visibility = "hidden";
	}());

	function makeOptionsWindow() {
		if (OWOP.windowSys.windows['Options']) OWOP.windowSys.delWindow(OWOP.windowSys.windows['Options']);
		let windowName = "Options";
		let options = {
			closeable: false
		}

		function windowFunc(thisWindow) {
			let content = `
				<span>
					<span id="optionsMinimize" style="display: flex;">
					<style>
						p {
							margin-block: auto;
							color: white;
							font-family: Arial;
						}
							.tabcontentleft, .tabcontentright {
							display: none;
							margin-block: auto;
							text-align: center;
						}
						.tabButton, .optionButton {
							border-style: none !important;
							border-image: none !important;
							border: initial;
							border-radius: 6px;
							padding: 5px 8px;
						}
						.optionButton {
							padding: 5px 12px;
						}
						.tabButton {
							margin: 0px 1px;
						}
						button.on {
							background: #9a937b;
						}
					</style>
					<!--dont be a idiot, put the #7e635c back into the styling of background-color when halloween is over
					and put it to #5e038f when halloween happens
					also dont forget to switch button.on up there to #9a937b and switch to #6e009a on halloween
					change box-shadow to #440f58 on halloween and #4d313b when not-->
					<div style="display: flex;margin: 0px;border-radius: 5px;background-color: #7e635c;box-shadow: inset 3px 2px 0px 0px #4d313b;align-content: space-around;">
						<span style="border: 10px #0000 solid;">
							<div class="tab">
								<div style="align-content: center;margin: 0px 0px 5px 0px;display: flex;justify-content: space-between;">
								<button class="tabButton olt on" onclick="NS.switchTabs(event, 'display', 'olt', this)">
									Window Display
								</button>
								<button class="tabButton olt" onclick="NS.switchTabs(event, 'options', 'olt', this)">
									Options
								</button>
								</div>
								<div id="display" class="tabcontentolt" style="display: block;"></div>
								<div id="options" class="tabcontentolt" style="display: none;"></div>
							</div>
						</span>
					</div>
					<div style="width: 5px;"></div>
						<!--dont be a idiot, put the #7e635c back into the styling of background-color when halloween is over
						and put it to #5e038f when halloween happens
						change box-shadow to #440f58 on halloween and #4d313b when not-->
						<div style="display: flex;margin: 0px;border-radius: 5px;background-color: #7e635c;box-shadow: inset 3px 2px 0px 0px #4d313b;align-content: space-around;">
							<span style="border: 10px #0000 solid;">
							<div class="tab">
								<span>
									<div style="align-content: center;margin: 0px 0px 5px 0px;display: flex;justify-content: space-between;">
										<button class="tabButton ort on" onclick="NS.switchTabs(event, 'cursor', 'ort', this)">
											Cursor
										</button>
										<button class="tabButton ort" onclick="NS.switchTabs(event, 'line', 'ort', this)">
											Line
										</button>
										<button class="tabButton ort" onclick="NS.switchTabs(event, 'fill', 'ort', this)">
											Bucket
										</button>
										<button class="tabButton ort" onclick="NS.switchTabs(event, 'export', 'ort', this)">
											Select
										</button>
									</div>
									<div style="align-content: center;margin: 0px 0px 5px 0px;display: flex;justify-content: space-between;">
										<button class="tabButton ort" onclick="NS.switchTabs(event, 'copy', 'ort', this)">
											Copy
										</button>
										<button class="tabButton ort" onclick="NS.switchTabs(event, 'paste', 'ort', this)">
											Paste
										</button>
										<button class="tabButton ort" onclick="NS.switchTabs(event, 'write', 'ort', this)">
											Write
										</button>
										<button class="tabButton ort" onclick="NS.switchTabs(event, 'all', 'ort', this)">
											All
										</button>
									</div>
								</span>
								<div id="cursor" class="tabcontentort" style="display: block;">
									<div class="tabp">
										<p>Scale</p>
										<input type="range" style="margin: 0px 15px;" value="1" min="1" max="16" oninput="OWOP.tool.allTools.cursor.extra.state.scalar = this.value;document.getElementById('cursorspan').innerHTML = this.value;"></input>
										<span style="padding: 4px 0px 5px 0px;" id="cursorspan">1</span>
									</div>
									<div class="tabp">
										<p>Chunkize</p>
										<button class="optionButton switch" onclick="NS.optionbutton(this, 'chunkize')">off</button>
									</div>
									<div class="tabp">
										<p>Rainbow</p>
										<button class="optionButton switch" onclick="NS.optionbutton(this, 'rainbow')">off</button>
									</div>
									<div class="tabp">
										<p>Pixel Perfect</p>
										<button class="optionButton switch" onclick="NS.optionbutton(this, 'perfect')">off</button>
									</div>
								</div>
								<div id="line" class="tabcontentort" style="display: none;">
									<div class="tabp">
										<p>Rainbow</p>
										<button class="optionButton switch" onclick="NS.optionbutton(this, 'rainbow')">off</button>
									</div>
									<div class="tabp">
										<p>Gradient</p>
										<button class="optionButton switch" onclick="NS.optionbutton(this, 'gradient')">off</button>
									</div>
								</div>
								<div id="fill" class="tabcontentort" style="display: none;">
									<div class="tabp">
										<p>Rainbow</p>
										<button class="optionButton switch" onclick="NS.optionbutton(this, 'rainbow')">off</button>
									</div>
									<div class="tabp">
										<p>Enable Patterns</p>
										<button class="optionButton switch" onclick="NS.optionbutton(this, 'patterns')">off</button>
									</div>
									<!--
									<div class="tabp">
										<p>Open Pattern Window</p>
										<button class="optionButton switch" onclick="">off</button>
									</div>
									-->
									<div class="tabp">
										<p>Checkered</p>
										<button class="optionButton switch" onclick="NS.optionbutton(this, 'checkered')">off</button>
									</div>
									<div class="tabp">
										<p>Pattern 1</p>
										<button class="optionButton switch" onclick="NS.optionbutton(this, 'dither')">off</button>
									</div>
									<div class="tabp">
										<p>Pattern 2</p>
										<button class="optionButton switch" onclick="NS.optionbutton(this, 'dither2')">off</button>
									</div>
									<div class="tabp">
										<p>Pattern 3</p>
										<button class="optionButton switch" onclick="NS.optionbutton(this, 'dither3')">off</button>
									</div>
									<div class="tabp">
										<p>Pattern 4</p>
										<button class="optionButton switch" onclick="NS.optionbutton(this, 'dither4')">off</button>
									</div>
									<div class="tabp">
										<p>Pattern 5</p>
										<button class="optionButton switch" onclick="NS.optionbutton(this, 'dither5')">off</button>
									</div>
									<div class="tabp">
										<p>Pattern 6</p>
										<button class="optionButton switch" onclick="NS.optionbutton(this, 'dither6')">off</button>
									</div>
									<div class="tabp">
										<p>Pattern 7</p>
										<button class="optionButton switch" onclick="NS.optionbutton(this, 'dither7')">off</button>
									</div>
									<div class="tabp">
										<p>Pattern 8</p>
										<button class="optionButton switch" onclick="NS.optionbutton(this, 'dither8')">off</button>
									</div>
								</div>
								<div id="export" class="tabcontentort" style="display: none;">
									<div class="tabp">
										<p>Type</p>
										<select class="ns_dropdown" oninput="OWOP.tool.allTools.export.extra.state.type=this.value">
											<option value="export">Export</option>
											<option value="color">Palette Color Adder</option>
											<option value="adder">Queue Adder</option>
											<option value="filler">Queue Filler</option>
											<option value="clearer">Queue Clearer</option>
										</select>
									</div>
									<div class="tabp">
										<p>Chunkize</p>
										<button class="optionButton switch" onclick="NS.optionbutton(this, 'chunkize')">off</button>
									</div>
									<div class="tabp">
										<p>Rainbow</p>
										<button class="optionButton switch" onclick="NS.optionbutton(this, 'rainbow')">off</button>
									</div>
								</div>
								<div id="copy" class="tabcontentort" style="display: none;">
									<!--
									<div class="tabp">
										<p>Shrink Margins</p>
										<button class="optionButton switch" onclick="NS.optionbutton(this, 'margin')">off</button>
									</div>
									-->
								</div>
								<div id="paste" class="tabcontentort" style="display: none;">
									<div class="tabp">
										<p>Chunkize</p>
										<button class="optionButton switch" onclick="NS.optionbutton(this, 'chunkize')">off</button>
									</div>
									<div class="tabp">
										<p>Rotate Clockwise</p>
										<button class="optionButton click" onclick="NS.optionbutton(this, 'rc')">&nbsp;&nbsp;&nbsp;&nbsp;</button>
									</div>
									<div class="tabp">
										<p>Rotate the other way</p>
										<button class="optionButton click" onclick="NS.optionbutton(this, 'rcc')">&nbsp;&nbsp;&nbsp;&nbsp;</button>
									</div>
									<div class="tabp">
										<p>Flip Horizontally</p>
										<button class="optionButton click" onclick="NS.optionbutton(this, 'fh')">&nbsp;&nbsp;&nbsp;&nbsp;</button>
									</div>
									<div class="tabp">
										<p>Flip Vertically</p>
										<button class="optionButton click" onclick="NS.optionbutton(this, 'fv')">&nbsp;&nbsp;&nbsp;&nbsp;</button>
									</div>
								</div>
								<div id="write" class="tabcontentort" style="display: none;">
									<div class="tabp">
										<p>Rainbow</p>
										<button class="optionButton switch" onclick="NS.optionbutton(this, 'rainbow')">off</button>
									</div>
									<!--
									<div class="tabp">
										<p>Font Size</p>
										<button class="optionButton switch" onclick="NS.optionbutton(this, 'gradient')">off</button>
									</div>
									<div class="tabp">
										<p>Font Type</p>
										<button class="optionButton switch" onclick="NS.optionbutton(this, 'gradient')">off</button>
									</div>
									-->
								</div>
								<!--
								<div id="all" class="tabcontentort" style="display: none;">
									<div class="tabp">
										<p>Rainbow</p>
										<button class="optionButton switch" onclick="NS.optionbutton(this, 'rainbow')">off</button>
									</div>
									<div class="tabp">
										<p>Some color stuff</p>
										<button class="optionButton switch" onclick="NS.optionbutton(this, 'gradient')">off</button>
									</div>
								</div>
								-->
							</div>
							</span>
						</div>
					</span>
					<span id="optionsMaximize" style="display: none;">
						<div style="display: flex;margin: 0px;border-radius: 5px;background-color: #7e635c;box-shadow: inset 3px 2px 0px 0px #4d313b;align-content: space-around;">
							<span style="border: 10px #0000 solid;">
							<button class="optionButton" onclick="NS.minimizeOptions(false)">Maximize</button>
							</span>
						</div>
					</span>
				</span>
			`;
			let container = thisWindow.container;
			container.style = "margin: 0px -5px -5px -5px;";
			container.className = "optionsDiv";
			container.innerHTML = content;
			const root = [...container.childNodes].find(e => e.nodeType !== Node.TEXT_NODE);
			let display = root.querySelector("#display");
			for (let w in OWOP.windowSys.windows) {
				w = OWOP.windowSys.windows[w];
				if (w.title === "Options" || w.title === "Resulting image") continue;
				if (w.title !== "Tools") {
					w.move(window.innerWidth / 3, window.innerHeight / 3);
					w.frame.style.visibility = "hidden";
					let b = w.frame.querySelectorAll(".windowCloseButton");
					if (b.length) w.frame.removeChild(b[0]);
				}
				let v = w.frame.style;
				let current = mkHTML("p");
				current.className = "tabp";
				current.appendChild(mkHTML("p", { innerHTML: w.title }));
				let button = mkHTML("button");
				button.classList.add("optionButton");
				current.appendChild(button);
				v.visibility === "visible" || v.visibility === "" ? button.classList.toggle("on") : void 0;
				button.innerHTML = button.classList.contains("on") ? "on" : "off";
				button.onclick = function () {
					button.classList.toggle("on");
					let s = button.classList.contains("on");
					button.innerHTML = s ? "on" : "off";
					v.visibility = s ? "visible" : "hidden";
				}
				display.appendChild(current);
			}
			let options = root.querySelector("#options");

			options.appendChild(optionmaker("Disable PM", "button", !NS.PM.enabled, () => NS.PM.enabled = !NS.PM.enabled));
			options.appendChild(optionmaker("Ignore Protection", "button", NS.PM.ignoreProtectedChunks, () => NS.PM.ignoreProtectedChunks = !NS.PM.ignoreProtectedChunks));
			options.appendChild(optionmaker("Clear PM", "select", void 0, () => NS.PM.clearQueue()));
			options.appendChild(optionmaker("Render PM", "button", NS.PM.renderBorder, () => NS.PM.renderBorder = !NS.PM.renderBorder));
			options.appendChild(optionmaker("Render Rings", "button", NS.PM.renderPlayerRings, () => NS.PM.renderPlayerRings = !NS.PM.renderPlayerRings));
			options.appendChild(optionmaker("AutoFix", "button", NS.PM.autoMove, () => NS.PM.autoMove = !NS.PM.autoMove));
			options.appendChild(optionmaker("Mute", "button", !OWOP.options.enableSounds, () => { OWOP.options.enableSounds = !OWOP.options.enableSounds; localStorage.options = JSON.stringify({ enableSounds: OWOP.options.enableSounds }); }));
			options.appendChild(optionmaker("Undo", "select", void 0, () => PM.undo()));
			options.appendChild(optionmaker("Redo", "select", void 0, () => PM.redo()));
			options.appendChild(optionmaker("Minimize Options", "select", void 0, () => NS.minimizeOptions(true)));

			NS.switchTabs = function (evt, cityName, s, button) {
				var i, tabcontent, tablinks;
				tabcontent = document.getElementsByClassName("tabcontent" + s);
				for (i = 0; i < tabcontent.length; i++) {
					tabcontent[i].style.display = "none";
				}
				tablinks = document.getElementsByClassName(s);
				for (i = 0; i < tablinks.length; i++) {
					tablinks[i].classList.remove("on");
				}
				button.classList.add("on");
				document.getElementById(cityName).style.display = "block";
			}
			NS.optionbutton = function (button, state) {
				let type = "unknown";
				let s = true;
				if (button.classList.contains("switch")) type = "switch";
				if (button.classList.contains("click")) type = "click";
				if (type === "unknown") return;
				let parent1 = button.parentElement;
				let parent2 = parent1.parentElement;
				if (type === "switch") {
					button.classList.toggle("on");
					s = button.classList.contains("on");
					button.innerHTML = s ? "on" : "off";
				}
				let extraState = OWOP.tool.allTools[parent2.id].extra.state;
				if (typeof extraState[state] === "function") {
					if (parent2.className === "tabcontentort" && parent2.id !== "all") extraState[state](s);
				} else {
					if (parent2.className === "tabcontentort" && parent2.id !== "all") extraState[state] = s;
				}
			}
			NS.minimizeOptions = function (minimize) {
				let max = document.getElementById("optionsMaximize");
				let min = document.getElementById("optionsMinimize");
				if (minimize) {
					max.style = "display: flex;";
					min.style = "display: none;";
				} else {
					max.style = "display: none;";
					min.style = "display: flex;";
				}
			}
		}

		var windowClass = OWOP.windowSys.addWindow(new OWOP.windowSys.class.window(windowName, options, windowFunc)
			.move(OWOP.windowSys.windows['Tools'].realw + 15, 34));
		windows[windowName] = windowClass;
		windowClass.frame.style.visibility = "visible";
	}

	{
		// please make a better checking statement
		function x() {
			if (OWOP.OPM && OWOP?.windowSys?.windows?.['Coordinates Saver']) makeOptionsWindow();
			else if (OWOP.OPM) setTimeout(x, 1000);
		}
		// x();
	}
	console.log("windows completed");


	function hue(d, b = 1) {
		let a = 256 / b; // 1   2   4  8  16 32 64 128 256
		//let b = mul; // 256 128 64 32 16 8  4  2   1
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

	var rangeMap = (a, b) => s => {
		const [a1, a2] = a;
		const [b1, b2] = b;
		// Scaling up an order, and then down, to bypass a potential,
		// precision issue with negative numbers.
		return (((((b2 - b1) * (s - a1)) / (a2 - a1)) * 10) + (10 * b1)) / 10;
	};
	var clamp = v => Math.round(Math.max(Math.min(v, 255), 0));
	var degToRad = d => d * (Math.PI / 180);
	var radToDeg = r => r / (Math.PI / 180);

	class RGBRotate {
		constructor(degrees) {
			this.matrix = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
			this.set_hue_rotation(degrees);
		}
		set_hue_rotation(degrees) {
			let cosA = Math.cos(degToRad(degrees));
			let sinA = Math.sin(degToRad(degrees));
			this.matrix[0][0] = cosA + (1 - cosA) / 3;
			this.matrix[0][1] = 1 / 3 * (1 - cosA) - Math.sqrt(1 / 3) * sinA;
			this.matrix[0][2] = 1 / 3 * (1 - cosA) + Math.sqrt(1 / 3) * sinA;
			this.matrix[1][0] = 1 / 3 * (1 - cosA) + Math.sqrt(1 / 3) * sinA;
			this.matrix[1][1] = cosA + 1 / 3 * (1 - cosA);
			this.matrix[1][2] = 1 / 3 * (1 - cosA) - Math.sqrt(1 / 3) * sinA;
			this.matrix[2][0] = 1 / 3 * (1 - cosA) - Math.sqrt(1 / 3) * sinA;
			this.matrix[2][1] = 1 / 3 * (1 - cosA) + Math.sqrt(1 / 3) * sinA;
			this.matrix[2][2] = cosA + 1 / 3 * (1 - cosA);
		}
		apply(r, g, b) {
			let rx = r * this.matrix[0][0] + g * this.matrix[0][1] + b * this.matrix[0][2];
			let gx = r * this.matrix[1][0] + g * this.matrix[1][1] + b * this.matrix[1][2];
			let bx = r * this.matrix[2][0] + g * this.matrix[2][1] + b * this.matrix[2][2];
			return [clamp(rx), clamp(gx), clamp(bx)];
		}
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
			let result = 0;
			rixits = rixits.split('');
			for (let e of rixits) {
				result = (result * 64) + this._Rixits.indexOf(e);
			}
			return result;
		},
		toBigInt: function (rixits) {
			let result = 0n;
			rixits = rixits.split('');
			for (let e of rixits) {
				result = (result * 64n) + BigInt(this._Rixits.indexOf(e));
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

	NS.getImageData = function (image) {
		let c = document.createElement('canvas');
		let ctx = c.getContext('2d');
		if (image instanceof HTMLCanvasElement) {
			c = image;
		} else if (image instanceof Image) {
			c.width = image.width;
			c.height = image.height;
			ctx.drawImage(image, 0, 0);
		}
		else return false;
		let w = c.width
		let h = c.height;
		let d = ctx.getImageData(0, 0, w, h);
		let data = [];
		for (let j = 0; j < h; j++) {
			data.push([]);
			for (let i = 0; i < w; i++) {
				let c = [];
				c.push(d.data[4 * (j * w + i)]);
				c.push(d.data[4 * (j * w + i) + 1]);
				c.push(d.data[4 * (j * w + i) + 2]);
				c.push(d.data[4 * (j * w + i) + 3]);
				data[j].push(c);
			}
		}
		return data;
	}

	NS.setImageData = function (data) {
		let c = document.createElement('canvas');
		let w = data[0].length;
		let h = data.length;
		c.width = w;
		c.height = h;
		let ctx = c.getContext('2d');
		let d = ctx.createImageData(w, h);
		for (let j = 0; j < h; j++) {
			for (let i = 0; i < w; i++) {
				let r = data[j][i][0];
				let g = data[j][i][1];
				let b = data[j][i][2];
				let a = r === 255 && g === 255 && b === 255 ? 0 : 255;
				d.data[4 * (j * w + i)] = r;
				d.data[4 * (j * w + i) + 1] = g;
				d.data[4 * (j * w + i) + 2] = b;
				d.data[4 * (j * w + i) + 3] = a;
			}
		}
		ctx.putImageData(d, 0, 0);
		return c;
	}

	NS.teleport = function () {
		let { x, y } = NS.teleport.camera;
		if (isNaN(x) || isNaN(y)) {
			NS.teleport.camera = {};
			NS.teleport.teleporting = false;
			return;
		}
		let dx = x - NS.M20.camera.x;
		let dy = y - NS.M20.camera.y;
		// let distanceX = Math.abs(dx) < 10000 ? -window.innerWidth / OWOP.camera.zoom / 2 + dx : Math.sign(dx) * 10000;
		// let distanceY = Math.abs(dy) < 10000 ? -window.innerHeight / OWOP.camera.zoom / 2 + dy : Math.sign(dy) * 10000;
		NS.M20.camera.zoom = 32;

		let p = 9952;
		let d = Math.sqrt((x - OWOP.mouse.tileX) ** 2 + (y - OWOP.mouse.tileY) ** 2) * (1 / p);
		let xdirection = (x - OWOP.mouse.tileX) / d;
		let ydirection = (y - OWOP.mouse.tileY) / d;

		let p1 = new Point(x, y);
		let p2 = new Point(OWOP.mouse.tileX, OWOP.mouse.tileY);
		let distance = Point.distance(p1, p2);

		let tempx = Math.min(Math.max(x, -480000), 480000);
		let tempy = Math.min(Math.max(y, -480000), 480000);
		let p3 = new Point(tempx, tempy);

		if (Point.distance(p2, p3) > 100 && Point.distance(p1, p3) < distance) {
			NS.M20.centerCameraTo(tempx, tempy);
			setTimeout(() => NS.teleport(), 250);
			return;
		}

		if (distance < p) {
			if (distance > 100) {
				setTimeout(() => NS.teleport(), 2000);
			} else {
				NS.teleport.camera = {};
				NS.teleport.teleporting = false;
			}
			NS.M20.moveCameraBy(Math.round(-window.innerWidth / OWOP.camera.zoom / 2 + dx), Math.round(-window.innerHeight / OWOP.camera.zoom / 2 + dy));
			return;
		}
		NS.M20.moveCameraBy(Math.round(xdirection), Math.round(ydirection));
		// if (Math.abs(dx) > 1000) {
		//   NS.M20.moveCameraBy(distanceX, 0);
		//   teleported = true;
		// } else if (Math.abs(dy) > 1000) {
		//   NS.M20.moveCameraBy(0, distanceY);
		//   teleported = true;
		// }
		NS.teleport.teleporting = true;
		setTimeout(() => NS.teleport(), 150);
	}

	NS.defaultCursors = {
		"area protect": 1,// selectprotect (no space between)
		copy: 1,
		cursor: 1,
		eraser: 1,// erase
		export: 1,// select
		fill: 1,// bucket*
		line: 1,// wand
		move: 1,
		paste: 1,
		pipette: 1,
		protect: 1,// shield
		write: 1,// text*
		zoom: 1
	};

	NS.teleport.camera = {};
	NS.teleport.teleporting = false;
	NS.rangeMap = rangeMap;
	NS.hue = hue;
	NS.rgb = rgb;
	NS.Base64 = Base64;
	NS.Base256 = Base256;
	NS.clamp = clamp;
	NS.degToRad = degToRad;
	NS.radToDeg = radToDeg;
	NS.RGBRotate = RGBRotate;
	NS.chunkize = false;

	console.log("Neko's Scripts Loaded.");
	console.timeEnd("Neko");
}

function init() {
	if (document.getElementById("load-scr")?.style?.transform) {
		console.time("Neko");
		console.log("Loading Neko's Scripts.");
		if (document.getElementById("dev-chat")) document.getElementById("dev-chat").parentNode.removeChild(document.getElementById("dev-chat")); // im so pissed at devchat for screaming at me every time i press a single letter while typing out something in the console its so annoying. thats why its the first thing i delete when initializing.
		NS.OPM = !!OWOP.misc;
		if (!NS.OPM) {
			NS.localStorage = localStorage.NS ? JSON.parse(localStorage.NS) : {};
			NS.modules.forEach(e => {
				0, 13, 14, 15, 16, 20, 22, 21, 23, 24, 25; // module numbers
				if (e.misc) NS.M0 = e;
				if (e.EVENTS) NS.M13 = e;
				if (e.eventSys) NS.M14 = e;
				if (e.camera) NS.M20 = e;
				if (e.updateClientFx) NS.M21 = e;
			});
			if (!NS.M0 || !NS.M13 || !NS.M14 || !NS.M20 || !NS.M21) {
				// im gonna make a localstorage check to make sure the reload doesnt happen indefinitely, and if the check happens at least 3 times then it will resume code execution without anymore reloads and provide a warning that the script wasnt loaded correctly, for now there wont be anything (this is a pre-release version currently).

				if (!NS.localStorage.reloadCheck) NS.localStorage.reloadCheck = 1;
				if (NS.localStorage.reloadCheck === 3) {
					delete NS.localStorage.reloadCheck;
					localStorage.NS = JSON.stringify(NS.localStorage);
					OWOP.chat.local("Neko's Script was not loaded correctly, please reload the tab.");
				} else {
					NS.localStorage.reloadCheck++;
					localStorage.NS = JSON.stringify(NS.localStorage);
					location.reload();
				}
				return;
			} else {
				delete NS.localStorage.reloadCheck;
				localStorage.NS = JSON.stringify(NS.localStorage);
			}
			NS.keysdown = [];
			NS.extra = {};
			NS.extra.log = false;
			function keydown(event) {
				var e = event.which || event.keyCode;
				if ("TEXTAREA" !== document.activeElement.tagName && "INPUT" !== document.activeElement.tagName) {
					NS.keysdown[e] = !0;
					var n = OWOP.player.tool;
					if (undefined !== OWOP?.world && n?.isEventDefined("keydown") && n?.call("keydown", [NS.keysdown, event])) return !1;
					switch (e) {
						case 80:
							OWOP.player.tool = "pipette";
							break;
						case 77:
						case 81:
							OWOP.player.tool = "move";
							break;
						case 79:
							OWOP.player.tool = "cursor";
							break;
						case 70:
							break;
						case 69:
							//OWOP.player.tool = "neko eraser";
							break;
						case 66:
							//OWOP.player.tool = "fill";
							break;
						case 72:
							// make options window open/close
							// options window will include options to switch the behavior of the tools, the game, and open/close all windows
							break;
						case 71:
							OWOP.renderer.showGrid(!OWOP.renderer.gridShown);
							break;
						case 90:
							if (!event.ctrlKey) break;
							NS.PM.undo(event.shiftKey);
							event.preventDefault();
							break;
						case 89:
							if (!event.ctrlKey) break;
							NS.PM.redo(event.shiftKey);
							event.preventDefault();
							break;
						case 112: // f1
							event.preventDefault();
							break;
						case 107:
						case 187:
							++OWOP.camera.zoom;
							break;
						case 109:
						case 189:
							--OWOP.camera.zoom;
							break;
						case 76:
							NS.extra.log = !NS.extra.log;
							break;
						case 27:
							NS.teleport.camera = {};
							break;
					}
					(NS.extra.log && console.log(event));
				}
			}
			function keyup(event) {
				var e = event.which || event.keyCode;
				if (delete NS.keysdown[e], "INPUT" !== document.activeElement.tagName) {
					var n = OWOP.player.tool;
					if (undefined !== OWOP?.world && n?.isEventDefined("keyup") && n?.call("keyup", [NS.keysdown, event])) return !1;
					switch (event.key) {
						case "Enter":
						case "`":
							document.getElementById("chat-input").focus();
							break;
					}
				}
			}
			let t = EventTarget._eventlists;
			let down = [/Custom color\\nType three values separated by a comma: r,g,b\\n\(\.\.\.or the hex string: #RRGGBB\)\\nYou can add multiple colors at a time separating them with a space\./];
			let up = [/function\(.\)\{var .=.\.which\|\|.\.keyCode;if\(delete .\[.\],"INPUT"!==document\.activeElement\.tagName\){var .=.\.player\.tool;if\(null!==.&&null!==.\.world&&.\.isEventDefined\("keyup"\)&&.\.call\("keyup",\[.,.\]\)\)return!1;13==.\?.\.chatInput\.focus\(\):16==.&&\(.\.player\.tool="cursor"\)}}/];
			NS.etdown = false;
			NS.etup = false;
			NS.et = false;
			if (NS.OPM) {
				up.push('function(t) {\n              var e = t.which || t.keyCode;\n              if (delete b[e], "INPUT" !== document.activeElement.tagName) {\n                  var n = f.player.tool;\n                  if (null !== n && null !== E.world && n.isEventDefined("keyup") && n.call("keyup", [b, t])) return !1;\n                  13 == e ? k.chatInput.focus() : 16 == e && (f.player.tool = "cursor")\n              }\n          }');
				up.push('function(t){var e=t.which||t.keyCode;if(delete b[e],"INPUT"!==document.activeElement.tagName){var n=f.player.tool;if(null!==n&&null!==E.world&&n.isEventDefined("keyup")&&n.call("keyup",[b,t]))return!1;13==e?k.chatInput.focus():16==e&&(f.player.tool="cursor")}}');
			} else {
				up.push('function(e){var t=e.which||e.keyCode;if(delete w[t],"INPUT"!==document.activeElement.tagName){var n=d.player.tool;if(null!==n&&null!==x.world&&n.isEventDefined("keyup")&&n.call("keyup",[w,e]))return!1;13==t?k.chatInput.focus():16==t&&(d.player.tool="cursor")}}');
			}
			for (let e of t) {
				if (NS.etdown !== true) for (let d of down) {
					if ((d instanceof RegExp && d.test(String(e))) || String(e) === d) {
						NS.etdown = true;
						NS.tempdown = e;
						console.log("found down");
					}
					if (NS.etdown === true) break;
				}
				if (NS.etup !== true) for (let u of up) {
					if (String(e) === u) {
						NS.etup = true
						NS.tempup = e;
						console.log("found up");
					}
					if (NS.etup === true) break;
				}
				if (NS.etdown === true && NS.etup === true) break;
			}
			if (NS.etdown !== true) console.warn("down was not found");
			if (NS.etup !== true) console.warn("up was not found");
			if (NS.etdown === true && NS.etup === true) {
				NS.et = true;
				window.removeEventListener("keydown", NS.tempdown);
				window.removeEventListener("keyup", NS.tempup);
				window.addEventListener("keydown", keydown);
				window.addEventListener("keyup", keyup);
			}
			delete EventTarget._eventlists;
			new MutationObserver(function (mutationList, observer) {
				for (const mutation of mutationList) {
					if (mutation.type === 'attributes' && mutation.attributeName === "style" && mutation.target.style.transform) {
						console.log(observer, mutation);
						setTimeout(() => NS.M0.showPlayerList(true), 5e3);
					}
				}
			}).observe(document.getElementById("load-scr"), { attributes: true });
			NS.M0.showPlayerList(true);

			install();
		} else {
			let modal = document.createElement("div");
			modal.id = "notiModal";
			modal.className = "modal";
			let s = document.createElement("style");
			s.innerHTML = `
				.modal {
					position: fixed;
					z-index: 1;
					padding-top: 100px;
					left: 0;
					top: 0;
					width: 100%;
					height: 100%;
					overflow: auto;
					background-color: rgb(0, 0, 0);
					background-color: rgba(0, 0, 0, 0.4);
				}
				.modal-content {
					background-color: #aba389;
					margin: auto;
					padding: 20px;
					width: 80%;
					border-radius: 6px;
					border: 3px solid #7e635c;
				}
			`;
			modal.appendChild(s);
			let mc = document.createElement("div");
			mc.className = "modal-content";
			mc.innerHTML = `
				<p style="font-size: 20px;color: #7e635c;text-shadow: 1px 1px #4d313b;">
				This is a notification telling you that Neko's Scripts can no longer run with OPM 2 enabled
				<br>
				it's unfortunate but as my script keeps updating more features that is present in OPM 2 will appear in my script.
				<br>
				If you want to keep using this script you must disable OPM 2 from tampermonkey.
				<br>
				<a href="https://github.com/NekoNoka/Neko-OWOP-Scripts">Neko's Scripts</a>
				</p>
			`;
			modal.appendChild(mc);
			document.body.appendChild(modal);
			window.onclick = function (event) {
				let notiModal = document.getElementById('notiModal');
				if (event.target == notiModal) notiModal.style.display = "none";
			}
		}
		return;
	}
	setTimeout(init, 1e2);
}

init();
