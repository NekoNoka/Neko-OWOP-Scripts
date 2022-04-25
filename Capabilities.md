## General changes

* A program was made inside the script to queue any pixel you place to be auto fixed anytime it's changed by someone else, it's called PM within this repo.
* Every tool capable of placing pixels is automatically using PM unless otherwise specified.

## Tool changes

* Cursor tool was changed so the right click color can change by ctrl + right clicking while on the cursor.
* Any time you click on the cursor tool the palette saver window will open up.
* Using w and s while selecting the cursor tool will move the colors in the palette bar.
* Export tool was changed to include a save button which names the image you're saving.
* Paste tool was added.
* Copy tool was added.
* Eraser tool was added.
* Foreign pixel remover tool will replace any pixel (that is not in your palette) with the color currently selected (right click color if you're right clicking).
* Pixel Perfect Tool makes your drawing smoother by not placing doubles.

## UI changes

* Top bar on the right side moved over so it's no longer behind the palette bar.
* The palette saver window is exactly as it sounds, it saves the right hand side palette and it can restore previously saved palettes.
* Any time you move a window it will automatically go in front of every other window (but it will always go behind the tools window).
* Right click color is on the top bar as a square color.
* The player ID is on the top bar.

## Unintended Behaviors

* Ctrl + z currently can't work because PM will replace it, will attempt to fix the issue in the future.
