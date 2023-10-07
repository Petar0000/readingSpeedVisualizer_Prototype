# readingSpeedVisualizer_Prototype

**Disclaimer:** This program isn't really ready to be used yet, and the code is messy and janky. I'm just releasing it for anyone who is interested to give it a try. 

**I only tested it with Firefox so far, not sure if it works with other browsers**

## How to use:

1. Go to `https://reader.ttsu.app/` and open some book. Go to the Settings and set the View Mode to Continuous, and the Writing Mode to Horizontal (I don't know what happens in Paginated or Vertical mode, haven't tested it)

2. Copy the contents of `mark_text.js`, open the console of your browser (F12 for example) while you are in the browser tab in which ttsu is opened.

3. **In general it is not a good idea to copypaste stuff into your console if you don't understand what you are pasting**. That being said, if you want to continue, paste the contents of `mark_text.js` into your console and press Enter.

4. At this point the script should be loaded, including the UI at the bottom of the page.

5. You can start the text marker by clicking on some text. If you want to pause the marker you can either click on the text again, or you can press the `toggle_script` button at the bottom.


## Button functionality:

1. toggle_UI: hides/unhides the UI
2. toggle_script: turns the script on/off, meaning that the text marker will be stopped, and also if you click on some text, nothing will happen. **If you want to click on some part of the page, such as the ttsu menu at the top, you need to click this button to disable the script, so it doesn't try to mark what you click**
3. A slider which controls the reading speed from 5k chars per hour, to 100k chars per hour. Note that if you quickly change the speed, or if you go to very low speeds, the text marker may behave in strange ways. 
4. An input box which controls the reading speed. You can input any number you want in here. If you input anything other than a number, weird stuff may happen.
5. marker color
6. text color
7. remove button: erases all markers, and stops any marker currently running

## Notes:

- the node/text parser doesn't mark ruby-tags and other tags, it just skips them

- When reaching the end of a chapter, or some other kind of "obstruction", the marker may stop. In that case click on the next text from which you want to restart the marker.

- **Accuracy:** The main goal of this script is to be accurate over longer periods of time. For example, if you leave the marker running in the background while you switch tabs and do something else, the time measurement in the background will become very inaccurate for a short time. If you go back to your ttsu tab, the script will try to "catch up" by increasing the reading speed such that over some time the amount of text that is marked is the amount of text you would expect to be marked, given the reading speed selected.

- by default the script currently (2023-10-07) counts characters the way ttsu counts characters. This affects the reading speed too. For characters which ttsu ignores, this script will instantly mark them, meaning that they do not add a time delay such as unignored characters. When many ignored characters appear in a text in a row, they will all be marked nearly instantly, so the marker will look like it is moving at a speed much faster than the current reading speed, however in terms of the characters whic ttsu counts as characters, the reading speed is accurate and as intended.