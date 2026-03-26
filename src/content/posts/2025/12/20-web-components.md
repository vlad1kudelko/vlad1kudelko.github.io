---
title: "Web Components: стандарты браузера — Custom Elements"
description: "Создавайте переиспользуемые компоненты с Web Components: Custom Elements, Shadow DOM, Templates. Изучите нативный стандарт компонентов."
heroImage: "../../../../assets/imgs/2025/12/20-web-components.webp"
pubDate: "2025-12-20"
---

# Web Components: нативные компоненты браузера

Web Components — стандарт для создания переиспользуемых компонентов с инкапсуляцией.

## Custom Elements

### class MyElement extends HTMLElement

```javascript
class MyCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
  
  connectedCallback() {
    this.render();
  }
  
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          padding: 16px;
          border: 1px solid #ddd;
          border-radius: 8px;
        }
        .title {
          font-weight: bold;
          font-size: 1.2em;
        }
      </style>
      <div class="title"><slot name="title">Default Title</slot></div>
      <div class="content"><slot></slot></div>
    `;
  }
}

customElements.define('my-card', MyCard);
```

### Lifecycle callbacks

```javascript
class MyElement extends HTMLElement {
  constructor() {
    super();
    // Создание shadow root
  }
  
  connectedCallback() {
    // Добавлен в DOM
  }
  
  disconnectedCallback() {
    // Удалён из DOM
  }
  
  attributeChangedCallback(name, oldVal, newVal) {
    // Изменение атрибута
  }
  
  static get observedAttributes() {
    return ['title', 'variant'];
  }
}
```

### Observed attributes

```javascript
class MyButton extends HTMLElement {
  static get observedAttributes() {
    return ['disabled', 'variant'];
  }
  
  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'disabled') {
      this.render();
    }
  }
}
```

## Shadow DOM

### Mode: open vs closed

```javascript
// open - можно получить через element.shadowRoot
const shadow = element.attachShadow({ mode: 'open' });

// closed - shadowRoot = null (не рекомендуется)
const shadow = element.attachShadow({ mode: 'closed' });
```

### Styles

```javascript
class MyElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
  
  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        :host([hidden]) {
          display: none;
        }
        :host(.primary) {
          --btn-color: blue;
        }
        ::slotted(*) {
          color: gray;
        }
      </style>
      <button class="btn"><slot></slot></button>
    `;
  }
}
```

## HTML Templates

```html
<template id="my-template">
  <style>
    .card {
      padding: 16px;
      border: 1px solid #ddd;
    }
  </style>
  <div class="card">
    <slot name="header"></slot>
    <slot></slot>
  </div>
</template>

<script>
  class MyCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      const template = document.getElementById('my-template');
      this.shadowRoot.appendChild(template.content.cloneNode(true));
    }
  }
  customElements.define('my-card', MyCard);
</script>
```

## Slots

```html
<my-card>
  <span slot="title">Заголовок</span>
  <p>Контент</p>
</my-card>
```

```javascript
// Доступ к slot
const slot = this.shadowRoot.querySelector('slot');
const assigned = slot.assignedNodes();
```

## Events

```javascript
class MyButton extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
  
  connectedCallback() {
    this.shadowRoot.querySelector('button')
      .addEventListener('click', this._handleClick.bind(this));
  }
  
  _handleClick(e) {
    this.dispatchEvent(new CustomEvent('my-click', {
      bubbles: true,
      composed: true,
      detail: { message: 'clicked' }
    }));
  }
}
```

```javascript
// Listening
document.querySelector('my-button')
  .addEventListener('my-click', (e) => console.log(e.detail));
```

## Properties

```javascript
class MyElement extends HTMLElement {
  static get observedAttributes() {
    return ['count'];
  }
  
  get count() {
    return this.getAttribute('count');
  }
  
  set count(value) {
    this.setAttribute('count', value);
  }
  
  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'count') {
      this.render();
    }
  }
}
```

## Пример: Modal

```javascript
class MyModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
  
  connectedCallback() {
    this.render();
    this._setupEvents();
  }
  
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: none;
        }
        :host([open]) {
          display: flex;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          align-items: center;
          justify-content: center;
        }
        .modal {
          background: white;
          padding: 24px;
          border-radius: 8px;
          min-width: 300px;
        }
        .close {
          float: right;
          cursor: pointer;
        }
      </style>
      <div class="modal">
        <span class="close">&times;</span>
        <slot name="title"></slot>
        <slot></slot>
      </div>
    `;
  }
  
  _setupEvents() {
    this.shadowRoot.querySelector('.close')
      .addEventListener('click', () => {
        this.removeAttribute('open');
      });
  }
  
  static get observedAttributes() {
    return ['open'];
  }
}

customElements.define('my-modal', MyModal);
```

## Использование

```html
<my-modal open>
  <span slot="title">Заголовок модального окна</span>
  <p>Контент модального окна</p>
</my-modal>

<my-button variant="primary">Нажми меня</my-button>
```

## Заключение

Web Components предоставляют стандартный способ создания переиспользуемых компонентов с полной инкапсуляцией.