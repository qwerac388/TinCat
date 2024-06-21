const chatboxInput = document.querySelector(".chatbox-input");
const chatboxSend = document.querySelector(".chatbox-send");
const chatboxMessages = document.querySelector(".chatbox-messages");
const typingIndicator = document.createElement("div");
typingIndicator.className = "typing-indicator";
typingIndicator.textContent = "Typing...";
chatboxMessages.appendChild(typingIndicator);

// Pre-defined responses
const responses = [
  "Hi there! Does your cat do any funny tricks?",
  "That's interesting! Do you dress up your cat for holidays?",
  "It was hilarious! Do you have any funny cat stories?",
  "It was great chatting with you! Give your cat a pet from me!",
];

let responseIndex = 0;
let typingTimeout;

chatboxSend.addEventListener("click", sendMessage);
chatboxInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendMessage();
  } else {
    showTypingIndicator();
  }
});

function sendMessage() {
  const message = chatboxInput.value;
  if (message.trim() !== "") {
    displayMessage(message, "user");
    chatboxInput.value = "";
    typingIndicator.classList.remove("visible");
    clearTimeout(typingTimeout);
    setTimeout(sendResponse, 1000); // Simulate a delay for response
  }
}

function sendResponse() {
  if (responseIndex < responses.length) {
    displayMessage(responses[responseIndex], "other");
    responseIndex++;
  } else {
    displayMessage("User is no longer online.", "other");
  }
}

function displayMessage(message, sender) {
  const messageElement = document.createElement("div");
  messageElement.className = "message " + sender;
  messageElement.textContent = message;
  chatboxMessages.insertBefore(messageElement, typingIndicator);
  chatboxMessages.scrollTop = chatboxMessages.scrollHeight;
}

function showTypingIndicator() {
  typingIndicator.classList.add("visible");
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    typingIndicator.classList.remove("visible");
  }, 1000);
}

//Tinder Card

let tinderContainer = document.querySelector(".tinder");
let allCards = document.querySelectorAll(".tinder--card");
let nope = document.getElementById("nope");
let love = document.getElementById("love");

function initCards(card, index) {
  let newCards = document.querySelectorAll(".tinder--card:not(.removed)");

  newCards.forEach(function (card, index) {
    card.style.zIndex = allCards.length - index;
    card.style.transform =
      "scale(" + (20 - index) / 20 + ") translateY(-" + 30 * index + "px)";
  });

  tinderContainer.classList.add("loaded");
}

initCards();

allCards.forEach(function (el) {
  let hammertime = new Hammer(el);

  hammertime.on("pan", function (event) {
    el.classList.add("moving");
  });

  hammertime.on("pan", function (event) {
    if (event.deltaX === 0) return;
    if (event.center.x === 0 && event.center.y === 0) return;

    tinderContainer.classList.toggle("tinder_love", event.deltaX > 0);
    tinderContainer.classList.toggle("tinder_nope", event.deltaX < 0);

    let xMulti = event.deltaX * 0.03;
    let yMulti = event.deltaY / 80;
    let rotate = xMulti * yMulti;

    event.target.style.transform =
      "translate(" +
      event.deltaX +
      "px, " +
      event.deltaY +
      "px) rotate(" +
      rotate +
      "deg)";
  });

  hammertime.on("panend", function (event) {
    el.classList.remove("moving");
    tinderContainer.classList.remove("tinder_love");
    tinderContainer.classList.remove("tinder_nope");

    let moveOutWidth = document.body.clientWidth;
    let keep = Math.abs(event.deltaX) < 80 || Math.abs(event.velocityX) < 0.5;

    event.target.classList.toggle("removed", !keep);

    if (keep) {
      event.target.style.transform = "";
    } else {
      let endX = Math.max(
        Math.abs(event.velocityX) * moveOutWidth,
        moveOutWidth
      );
      let toX = event.deltaX > 0 ? endX : -endX;
      let endY = Math.abs(event.velocityY) * moveOutWidth;
      let toY = event.deltaY > 0 ? endY : -endY;
      let xMulti = event.deltaX * 0.03;
      let yMulti = event.deltaY / 80;
      let rotate = xMulti * yMulti;

      event.target.style.transform =
        "translate(" +
        toX +
        "px, " +
        (toY + event.deltaY) +
        "px) rotate(" +
        rotate +
        "deg)";
      initCards();
    }
  });
});

function createButtonListener(love) {
  return function (event) {
    let cards = document.querySelectorAll(".tinder--card:not(.removed)");
    let moveOutWidth = document.body.clientWidth * 1.5;

    if (!cards.length) return false;

    let card = cards[0];

    card.classList.add("removed");

    if (love) {
      card.style.transform =
        "translate(" + moveOutWidth + "px, -100px) rotate(-30deg)";
    } else {
      card.style.transform =
        "translate(-" + moveOutWidth + "px, -100px) rotate(30deg)";
    }

    initCards();

    event.preventDefault();
  };
}

let nopeListener = createButtonListener(false);
let loveListener = createButtonListener(true);

nope.addEventListener("click", nopeListener);
love.addEventListener("click", loveListener);
