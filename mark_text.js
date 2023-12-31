insertUI();

chars_per_hour = document.getElementById("readingSpeedSlider").value * 1000;
milisecondsPerChar = (3600 / chars_per_hour) * 1000;

// updates the character info box every 500ms
setCharactersReadInfoBoxUpdateInterval();

// todo: add option for user to toggle (checkbox or something) whether they want to count every char, or apply the ttsu filter (keep ttsu filter as default)

// total number of characters read, i.e. string.length
raw_total_chars_read = 0;

// total number of characters read, filtered by the ttsu filter regex, i.e. string.filter(isNotJapaneseRegex).length
ttsu_filtered_total_chars_read = 0;

// number of non-filtered characters read since the last time the script was paused (currently done by leftclick, toggle script button, remove markers button)
ttsu_filtered_chars_read_since_last_pause = 0;

startTime = Date.now();
running = false;
paused = false;
uiVisible = true;

textColor = "green";
backgroundColor = "black";

// due to technical limitations of the browser and javascript, perfect precision for the time intervals in which characters get marked is impossible
// to improve the acccuracy of the marking speed over longer periods of time, this function tries to take the actual absolute time elapsed into account, and calculate how many characters should have been read up until this point. Based on the ration ebtween the actual characters that were read since the last pause, and the characters that should have been read since the last pause, the speedup ratio can be used to adjust the marking speed such that the ttsu_filtered_chars_read_since_last_pause get closer to charsThatShouldHaveBeenReadSinceLastPause
function normalizedSpeedupRatio() {
  charsThatShouldHaveBeenReadSinceLastPause = (Date.now() - startTime) / milisecondsPerChar;
  if (ttsu_filtered_chars_read_since_last_pause > 0 && charsThatShouldHaveBeenReadSinceLastPause > 0) {
    speedupRatio = ttsu_filtered_chars_read_since_last_pause / charsThatShouldHaveBeenReadSinceLastPause;
  } else {
    speedupRatio = 1;
  }
  return speedupRatio; // todo: as the speedup ratio asymptotically reaches 1, the rate at which it changes slows down considerably, which may lead to a large number of interval restarts. Ideally the speedup should be biased towards trying to reach 1 quickly, such that it needs fewer steps to get there
}

function nodeTextFullyMarked(node) {
  node.childNodes !== undefined &&
  node.childNodes.length === 2 &&
  node.childNodes[1].textContent === "";
}

// todo: this function is too big, split it into multiple functions with different responsibilities (parsing nodes/text, marking text, etc.)
function markLeafNode(element) {
  if (element.nodeName === "MARK") {
    element = element.parentNode;
  }

  while (nodeTextFullyMarked(element)) {
    element = element.nextElementSibling;
  }

  if (!element.innerHTML.startsWith('<mark class="readingSpeedMarker"')) {
    element.innerHTML =
      '<mark class="readingSpeedMarker" style="color:' + textColor +
      ";background-color:" + backgroundColor +
      '"></mark>' + element.innerHTML;
  }

  markerNode = element.childNodes[0];
  textNode = element.childNodes[1];

  if (textNode === undefined || markerNode === undefined) {
    return;
  }

  intervalStartSpeedRatio = normalizedSpeedupRatio();
  console.log(intervalStartSpeedRatio); // debugging

  charMarkingInterval = setInterval(function () {
    if (running === false) {
      clearInterval(charMarkingInterval);
    } // todo bug: doesn't work for intervals after the first one

    currentSpeedupRatio = normalizedSpeedupRatio();
    // (currentSpeedupRatio > intervalStartSpeedRatio) and (currentSpeedupRatio < intervalStartSpeedRatio) have the effect the speed ratio adjustment prioritizes not restarting the interval if the current speed ratio moves the average overall speed in the correct direction

    if ((currentSpeedupRatio > 1.03 && currentSpeedupRatio > intervalStartSpeedRatio) || (currentSpeedupRatio < 0.97 && currentSpeedupRatio < intervalStartSpeedRatio)) {
      console.log(currentSpeedupRatio); // debugging
      clearInterval(charMarkingInterval);
      markLeafNode(element);
    }

    if (textNode.textContent.length === 0) {
      clearInterval(charMarkingInterval);

      // mark next node
      nextElement = null;

      if (element.nextElementSibling === null) {
        // pause marking when hitting some "obstacle" such as the end of a page, or a transition from one chapter to the next (depending on how the document is constructed)
        clearInterval(charMarkingInterval);
        running = false;
        return;
      } else {
        nextElement = element.nextElementSibling;
      }

      markLeafNode(nextElement);
    }

    // mark char
    nextText = textNode.textContent.substring(1);

    // note: this "if(running)" check is kind of a messy solution and there's probably a race condition here. The only reason why it's done this way right now is such that if the markers are deleted while the marking is still running, it should stop the marking
    if (running) {
      if (nextText.length > 0) {
        // instantly mark characters which are not counted according to the ttsu char filtering rules
        while ( textNode.textContent.length > 0 && textNode.textContent[0].match(isNotJapaneseRegex)) {
          raw_total_chars_read += 1;
          markerNode.textContent =
            markerNode.textContent + textNode.textContent[0];
          textNode.textContent = nextText;
          nextText = textNode.textContent.substring(1);
        }
        // todo: kind of ugly
        if (nextText.length > 0) {
          raw_total_chars_read += 1;
          ttsu_filtered_chars_read_since_last_pause += 1;
          ttsu_filtered_total_chars_read += 1;

          markerNode.textContent = markerNode.textContent + textNode.textContent[0];
          textNode.textContent = nextText;
        }
      } else {
        if (!textNode.textContent[0].match(isNotJapaneseRegex)) {
          raw_total_chars_read += 1;
          ttsu_filtered_chars_read_since_last_pause += 1;
          ttsu_filtered_total_chars_read += 1;
        } else {
          raw_total_chars_read += 1;
        }

        markerNode.textContent = markerNode.textContent + textNode.textContent[0];
        textNode.textContent = "";
      }
    }
  }, milisecondsPerChar * normalizedSpeedupRatio());
}

function markEverything() {
  var elements = document.querySelectorAll(":hover");
  element = elements[elements.length - 1];

  // ignore clicks on UI div
  if (!element.classList.contains("UI_elem")) {
    resetTimeStats();

    if (running) {
      running = false;
      return;
    } else {
      running = true;
    }

    markLeafNode(element);
  }
}

// todo. this is just temporary and for debugging purposes, find a better way to display the UI
function insertUI() {
  // todo: when changing the speed around quickly, especially when going to really slow reading speeds, it kind of stops working, because the setInterval keeps waiting for a while, and I think my speed normalization thingy slows the reading speed down too much in such a case (this is one of the disadvantages of how I changed the reading speed such that it doesn't update often if the 'direction' of speed is good (slowdown/speedup), meaning that it might overshoot in a scenario where you go from a really high speed to a really low speed. It will also maybe overshoot if you go from a really low speed to a really high speed, but it doesn't matter because due to the low interval time, it will get updated soon)

  ui_div = document.createElement("div");

  ui_div.innerHTML =
    '<input class="UI_elem" id="toggle_UI_button" type="button" onclick="toggleUI()" value="toggle_UI" style="background:black;color:grey;position:fixed;bottom:40px"/> <input class="UI_elem" id="script_button" type="button" onclick="toggleScript()" value="toggle_script" style="background:#F0F0F0;position:fixed;bottom:40px;left:80px"/> <input type="text" readOnly id="charsReadInfoBox" value="0 chars read" style="position:fixed;bottom:70px;left:0px; width:190px;height:20px;" class="UI_elem"/> <div id="UI_div" class="UI_elem"><div style="position:fixed;bottom:40px;left:180px" class="slidecontainer UI_elem"><input type="range" min="5" max="100" value="10" class="slider UI_elem" id="readingSpeedSlider" onchange="sliderChangeHandler()"/><input type="text" id="readingSpeedInputBox" value="10000" style="width:100px;height:20px;" class="UI_elem" onchange="inputBoxChangeHandler()"/> <input type="color" class="UI_elem" id="backgroundColorPicker" value="#000000" onchange="backgroundColorChangeHandler()"/> <input type="color" class="UI_elem" id="textColorPicker" value="#008000" onchange="textColorChangeHandler()"/> <input class="UI_elem" type="button" value="remove" style="background:red;" onclick="removeMarkers()"/></div></div>';

  // document.body.innerHTML += breaks ttsu, probably because of https://stackoverflow.com/questions/2305654/innerhtml-vs-appendchildtxtnode/2305677#2305677
  // appendChild works
  document.body.appendChild(ui_div);
}

function inputBoxChangeHandler() {
  document.getElementById("readingSpeedSlider").value = document.getElementById("readingSpeedInputBox").value / 1000;
  updateReadingSpeed();
}

function sliderChangeHandler() {
  document.getElementById("readingSpeedInputBox").value = document.getElementById("readingSpeedSlider").value * 1000;
  updateReadingSpeed();
}

function backgroundColorChangeHandler() {
  backgroundColor = document.getElementById("backgroundColorPicker").value;
  markers = document.getElementsByClassName("readingSpeedMarker");
  updateMarkerColors(markers);
}

function textColorChangeHandler() {
  textColor = document.getElementById("textColorPicker").value;
  markers = document.getElementsByClassName("readingSpeedMarker");
  updateMarkerColors(markers);
}

function updateReadingSpeed() {
  chars_per_hour = document.getElementById("readingSpeedInputBox").value;
  milisecondsPerChar = (3600 / chars_per_hour) * 1000;

  resetTimeStats();
}

function updateMarkerColors(markers) {
  for (let i = 0; i < markers.length; i++) {
    markers[i].style["color"] = textColor;
    markers[i].style["background-color"] = backgroundColor;
  }
}

function updateCharsReadInfoBox() {
  if (uiVisible) {
    document.getElementById("charsReadInfoBox").value = "" + ttsu_filtered_total_chars_read + " chars read";
  }
}

function removeMarkers() {
  // currently removeMarkers interrupts marking
  running = false;
  resetTimeStats();

  // source: https://stackoverflow.com/questions/4232961/remove-a-html-tag-but-keep-the-innerhtml/4232971#4232971
  var b = document.getElementsByClassName("readingSpeedMarker");

  while (b.length) {
    var parent = b[0].parentNode;
    while (b[0].firstChild) {
      parent.insertBefore(b[0].firstChild, b[0]);
    }
    parent.removeChild(b[0]);
  }
}

// todo: add hotkeys for some buttons
function toggleUI() {
  uiVisible = !uiVisible;
  if (uiVisible) {
    setCharactersReadInfoBoxUpdateInterval();
  } else {
    clearCharactersReadInfoBoxUpdateInterval();
  }

  for (let i = 0; i < document.getElementsByClassName("UI_elem").length; i++) {
    if (
      document.getElementsByClassName("UI_elem")[i].id !== "toggle_UI_button"
    ) {
      if (
        document.getElementsByClassName("UI_elem")[i].style.display === "none"
      ) {
        document.getElementsByClassName("UI_elem")[i].style.display = "inline";
      } else {
        document.getElementsByClassName("UI_elem")[i].style.display = "none";
      }
    }
  }
}

function toggleScript() {
  if (paused) {
    paused = false;
    document.body.addEventListener("click", markEverything);
  } else {
    paused = true;
    running = false;
    document.body.removeEventListener("click", markEverything);
  }
}

function resetTimeStats() {
  startTime = Date.now();
  ttsu_filtered_chars_read_since_last_pause = 0;
}

function setCharactersReadInfoBoxUpdateInterval() {
  characterCounterUpdateInterval = setInterval(updateCharsReadInfoBox, 500);
}

function clearCharactersReadInfoBoxUpdateInterval() {
  clearInterval(characterCounterUpdateInterval);
}

document.body.addEventListener("click", markEverything);

////////////////////////////////////////////////////// put this into another file once I make this script into a browser extension
///////////////////////////////////////////////////////

/**
 * @license BSD-3-Clause
 * Copyright (c) 2023, ッツ Reader Authors
 * All rights reserved.
 */

const isNotJapaneseRegex =
  /[^0-9A-Z○◯々-〇〻ぁ-ゖゝ-ゞァ-ヺー０-９Ａ-Ｚｦ-ﾝ\p{Radical}\p{Unified_Ideograph}]+/gimu;

function getTTSUCharacterCount(node) {
  if (!node.textContent) return 0;
  return countUnicodeCharacters(
    node.textContent.replace(isNotJapaneseRegex, "")
  );
}

/**
 * Because '𠮟る'.length = 3
 * Reference: https://dmitripavlutin.com/what-every-javascript-developer-should-know-about-unicode/#length-and-surrogate-pairs
 */
function countUnicodeCharacters(s) {
  return Array.from(s).length;
}
