const chatboxInput = document.querySelector(".chatbox-input");
const chatboxSend = document.querySelector(".chatbox-send");
const chatboxMessages = document.querySelector(".chatbox-messages");
const typingIndicator = document.createElement("div");
typingIndicator.className = "typing-indicator";
typingIndicator.textContent = "Typing...";
chatboxMessages.appendChild(typingIndicator);

let typingTimeout;

chatboxSend.addEventListener("click", sendMessage);
chatboxInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendMessage();
  } else {
    showTypingIndicator();
  }
});

async function sendMessage() {
  const message = chatboxInput.value;
  if (message.trim() !== "") {
    displayMessage(message, "user");
    chatboxInput.value = "";
    typingIndicator.classList.remove("visible");
    clearTimeout(typingTimeout);
    setTimeout(() => sendResponse(message), 1000); // Simulate a delay for response
  }
}

async function getApiKey() {
  const response = await fetch("/api/config");
  const config = await response.json();
  return config.META_BLENDERBOT_HUGGINGFACE_API_KEY;
}

async function sendResponse(userMessage) {
  try {
    const API_KEY = await getApiKey();
    const payload = { inputs: userMessage };
    console.log("Sending payload:", JSON.stringify(payload)); // Debugging payload

    const response = await fetch(
      "https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = await response.json();
    console.log("Received response:", JSON.stringify(data)); // Debugging response

    // Extracting the generated text from the first object in the array
    const botMessage =
      data[0]?.generated_text || "I'm not sure how to respond to that.";
    displayMessage(botMessage, "other");
  } catch (error) {
    console.error("Error fetching response:", error);
    displayMessage(
      "Sorry, something went wrong. Please try again later.",
      "other"
    );
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
