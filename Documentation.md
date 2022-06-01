# Neko Script Documentation

This documentation will only include parts of the website thats been either fully created by the script or partially affected, anything made outside the scope of the script will not be here.

## General Information

PM stands for Pixel manager it manages the placements of pixels.

A new color has been added to the right click button on the mouse called right click color, this is a useful feature when you want to "delete" colors as a background color without having to use pipette tool or ctrl + left click to switch the left click color, this also means ctrl + right click or right clicking while using the pipette tool changes the right click color.

## Options Window
### Left side _Display_

A list of all the windows able to be enabled/disabled so screen space doesn't get clogged up with windows.

* Palette Saver

A window containing saved palettes you can quickly switch to.

* Text Input

Window for using the text tool.

* Assets

A window containing quickly accessible images to paste without having to search files for a image you use often.

### Left side _Options_

A list of options.

* Disable PM

Stops the Pixel Manager from continuously placing pixels, however once turned back on it will continue placing, while disabled it will not add additional placements of pixels into the queue.

* Clear PM

Clears the queue of the Pixel Manager, clearing completely deletes all information of pixels you place in the queue and cannot be retrieved.

* Mute

Mutes the tab.

* Minimize Options

Minimizes the options window, this is useful if the options window itself is taking up too much of the screen and you want to make it smaller, while minimized the options window will include a small button that you can click to reopen the window. 

### Right side _Cursor_

* Rainbow

(Left Click) Rainbow color _bounded_
(Right Click) Rainbow color _unbounded_

* Pixel Perfect

See [Aseprite Pixel Perfect](https://github.com/aseprite/aseprite/issues/744)

### Right side _Line_

You may single click instead of dragging.

* Rainbow

(Left Click) Rainbow color _bounded_
(Right Click) Rainbow color _unbounded_

* Gradient

Makes a gradient of color along the path of the line tool using the selected color as the end point and the pixel on the canvas you started at as the start point.

### Right side _Fill_

* Rainbow
* Checkered
* Dither
* Dither 2
* Dither 3

### Right side _Select_

* Rainbow
* Chunkize

## Palette Saver Window

### Top Bar

* Input box

Text input for name of new palette.

* Save Current Palette button

Creates a new Palette in the bottom section.

### Bottom section

* Name of Palette
* Use Button

Deletes palette thats currently being used on the right side of the screen and replaces with the palette saved that you selected.

* Replace Button

Deletes saved palette in the palette saver and replaces with the palette currently being used on the right side of the screen.

* Delete Button

Deletes the saved palette in the palette saver.

## Text Input Window
### Text Box

Its a box you put text in for the text tool.
(Theres a small weirdness with the enter key where you must click on the canvas with the text tool before typing in the text box so the enter key doesnt switch to the chat menu, will attempt to make a better iteration in a newer version)

## Assets Window

Before being able to use the assets you must press Reload then click on a saved image in the bottom section.

Theres a limit to adding images to the assets window since the images are saved in local storage on the website, the limit was arbitrarily set at 3 megabytes and a confirmation popup will appear if adding a image above 500 kilobytes. Images will not be added if limit is reached and there will be a warning in the chat window.

### Add

Adds a Image to the assets window.

### Paste

It will switch your tool to the paste tool while setting the image being pasted to the currently selected image.

### Delete

A prompt will appear asking to confirm deleting the currently selected image.

### Reload

A button to reload the images in the bottom section.

### Bottom Image Section

An area containing all saved images in the assets window.

## Cursor

Using Shift + W or Shift + S while having the cursor tool selected will move the selected color up (w) or down (s) along the color palette on the right side.

## Line

You may single click start and end points without needing to hold down left click the whole time, this is useful if you don't like hand cramps.

(When single clicking only the second click will register which color is used)

## Fill / Bucket

Old visualization has been replaced by a ever expanding outline.

## Select / Export

Functionalities will be switched via options window.

Default functionality is the export tool.

## Copy

Select an area to copy, it will switch to the paste tool when area is selected to paste back into the canvas.

## Paste

If selected normally will open up your default file browser to select an image to paste.
If switched to via alternative tools / windows then it will paste the selection or image from that alternative source.

> This documentation is a work in progress any suggestions sent via issues on [github](https://github.com/NekoNoka/Neko-OWOP-Scripts/issues) is highly appreciated.
