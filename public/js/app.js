import apiRequest, { HTTPError } from "./apiRequest.js";

export default class App {
  constructor() {
    this._screenWidth = screen.availWidth;
    this._documentElement = document.documentElement;

    if (this._screenWidth < 768) {
      this._documentElement.setAttribute("data-layout", "compact");
    }
    this._rootFadeElements = document.querySelectorAll(
      ".flex-container > .fade-in"
    );
    this._pages = document.querySelectorAll(".page");
    this._navButtons = document.querySelectorAll(".nav-button");
    document.addEventListener(
      "DOMContentLoaded",
      this._initiateAnimations.bind(this)
    );

    this._lightSwitch = document.querySelector(".light-switch");
    this._lightSwitch.addEventListener("click", this._themeToggle.bind(this));

    this._slideElements = this._navButtons.length * 2 - 1;

    this._messageForm = document.forms.message;
    this._messageForm.addEventListener(
      "submit",
      this._handleMessageSubmit.bind(this)
    );

    this._backButton = document.querySelector(".back");
    this._backButton.addEventListener(
      "click",
      this._handleBackClick.bind(this)
    );

    this._messagesSection = document.querySelector("#messages");
    this._messageList = this._messagesSection.querySelector(".message-list");

    this._loadingOverlay = document.querySelector("#loading-overlay");
  }

  _themeToggle() {
    if (this._documentElement.getAttribute("data-theme") === "dark") {
      this._documentElement.setAttribute("data-theme", "light");
    } else {
      this._documentElement.setAttribute("data-theme", "dark");
    }
  }

  _attachFadeTransition(elements) {
    for (let i = 0; i < elements.length; i++) {
      elements[i].classList.add("animated");
      elements[i].style.animationDelay = `${i * 0.15}s`;
    }
  }

  _initiateFadeAnimation() {
    this._attachFadeTransition(this._rootFadeElements);
    this._pages.forEach((page) => {
      const fadeElements = page.querySelectorAll(".fade-in");
      this._attachFadeTransition(fadeElements);
    });
  }

  _iniitateSlideAnimation() {
    this._navButtons.forEach((button, index) => {
      button.addEventListener("click", this._handleNavClick.bind(this, index));
    });
  }

  _initiateAnimations() {
    this._initiateFadeAnimation();
    this._iniitateSlideAnimation();
  }

  _pageTransition(index) {
    for (let j = 0; j < this._pages.length; j++) {
      this._pages[j].classList.remove("page-visible");
    }
    this._pages[index].classList.add("page-visible");
  }

  _handleNavClick(index, event) {
    this._removeMessageElements();
    this._pageTransition(index);
    event.currentTarget.classList.add("selected");
    this._documentElement.style.setProperty(
      "--selected-slider-clip",
      `inset(0%  ${
        (100 / this._slideElements) * (this._slideElements - (2 * index + 1))
      }% 0% ${(100 / this._slideElements) * (2 * index)}%)`
    );
  }

  _toggleLoadingOverlay() {
    this._loadingOverlay.classList.toggle("hidden");
    this._messageForm.classList.toggle("blur");
  }

  async _handleMessageSubmit(event) {
    event.preventDefault();
    let name = this._messageForm.name.value;
    let email = this._messageForm.email.value;
    let messageText = this._messageForm.message.value;
    if (name || email || messageText) {
      try {
        const { success, message } = await apiRequest("POST", "/message", {
          name,
          email,
          message: messageText,
          timestamp: Date.now()
        });
        if (!success) {
          alert(message);
        }
        this._messageForm.reset();
        this._forceCacheRefresh();
      } catch (error) {
        if (
          error instanceof HTTPError &&
          error.statusCode > 400 &&
          error.statusCode < 502
        ) {
          alert(error.message);
        }
        alert(error);
      }
    }
    await this._getMessages();
    this._pageTransition(2);
  }

  _forceCacheRefresh() {
    sessionStorage.removeItem("mokshlakshmi[dot]com::messages");
  }

  /* Retrieves the list of cached messages and updates cache on miss */
  async _retrieveMessages() {
    this._toggleLoadingOverlay();
    if (sessionStorage.getItem("mokshlakshmi[dot]com::messages")) {
      this._toggleLoadingOverlay();
      return JSON.parse(
        sessionStorage.getItem("mokshlakshmi[dot]com::messages")
      );
    } else {
      try {
        const { success, messages } = await apiRequest("GET", "/messages");
        if (success) {
          this._toggleLoadingOverlay();
          sessionStorage.setItem(
            "mokshlakshmi[dot]com::messages",
            JSON.stringify(messages)
          );
          return messages;
        }
      } catch (error) {
        this._toggleLoadingOverlay();
        if (
          error instanceof HTTPError &&
          error.statusCode > 400 &&
          error.statusCode < 502
        ) {
          alert(error.message);
        }
        alert(error);
      }
    }
  }

  async _getMessages() {
    const messages = await this._retrieveMessages();
    for (let message of messages) {
      this._createMessageElement(message);
    }
  }

  _createMessageElement(rawMessage) {
    const { message, timestamp } = rawMessage;

    let messageContainer = document.createElement("fieldset");
    messageContainer.classList.add("message-container");

    let messageText = document.createElement("span");
    messageText.classList.add("message-text");
    messageText.textContent = message;
    messageContainer.append(messageText);

    if (timestamp) {
      let messageTime = document.createElement("span");
      messageTime.classList.add("message-time");
      messageTime.textContent = new Date(
        Number.parseInt(timestamp)
      ).toLocaleString();
      messageContainer.append(messageTime);
    }

    this._messageList.prepend(messageContainer);
  }

  _removeMessageElements() {
    this._messageContainers =
      this._messagesSection.querySelectorAll(".message-container");
    for (let messageContainer of this._messageContainers) {
      messageContainer.remove();
    }
  }

  _handleBackClick() {
    this._removeMessageElements();
    this._pageTransition(1);
  }
}
