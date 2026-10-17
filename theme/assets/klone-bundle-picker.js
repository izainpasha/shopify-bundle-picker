/* Presentation adapter for the installed Kaching Bundles component. */
if (!customElements.get('klone-bundle-picker')) {
  customElements.define('klone-bundle-picker', class extends HTMLElement {
    connectedCallback() {
      if (this.initialized) return;
      this.initialized = true;
      this.abort = new AbortController();
      this.count = 5;
      this.slot = 0;
      this.busy = false;
      this.dialog = this.querySelector('dialog');
      this.addButton = this.querySelector('.kb__add');
      this.choices = [...this.querySelectorAll('.kb__choice')];
      this.selections = Array(5).fill(this.choices.find(choice => !choice.disabled));
      this.on('change', event => {
        if (event.target.matches('input[type=radio]')) {
          this.count = Number(event.target.value);
          this.render();
          this.queueSync();
        }
      });
      this.on('click', event => {
        const slot = event.target.closest('[data-slot]');
        if (slot) this.openPicker(Number(slot.dataset.slot), slot);
        const choice = event.target.closest('.kb__choice');
        if (choice && !choice.disabled && !this.choosing) {
          // Show the check briefly so shoppers see what they picked before the dialog closes.
          this.choosing = true;
          this.choices.forEach(item => item.setAttribute('aria-pressed', String(item === choice)));
          this.selections[this.slot] = choice;
          this.render();
          this.queueSync();
          this.chooseTimer = setTimeout(() => {
            this.choosing = false;
            this.dialog.close();
          }, 450);
        }
        if (event.target.closest('.kb__close')) this.dialog.close();
        if (event.target.closest('.kb__add')) this.addToCart();
        if (event.target === this.dialog) {
          const rect = this.dialog.getBoundingClientRect();
          if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) this.dialog.close();
        }
      });
      this.scrollHint = this.querySelector('.kb__scroll-hint');
      this.dialog.addEventListener('scroll', () => this.updateScrollHint(), {signal:this.abort.signal, passive:true});
      this.dialog.addEventListener('close', () => {
        clearTimeout(this.chooseTimer);
        this.choosing = false;
        document.documentElement.style.overflow = this.previousOverflow ?? '';
        this.returnFocus?.focus();
      }, {signal:this.abort.signal});
      this.render();
      this.connectNative();
    }
    disconnectedCallback() {
      this.abort?.abort();
      clearTimeout(this.retryTimer);
      clearTimeout(this.chooseTimer);
      if (this.dialog?.open) {
        this.dialog.close();
        document.documentElement.style.overflow = this.previousOverflow ?? '';
      }
      this.initialized = false;
    }
    on(type, listener) { this.addEventListener(type, listener, {signal:this.abort.signal}); }
    setLabel(text) { this.addButton.querySelector('.kb__add-label').textContent = text; }
    updateScrollHint() {
      const {scrollTop, clientHeight, scrollHeight} = this.dialog;
      this.scrollHint.classList.toggle('is-hidden', scrollTop + clientHeight >= scrollHeight - 60);
    }
    error(message = '') {
      const element = this.querySelector('.kb__error');
      element.textContent = message;
      element.hidden = !message;
    }
    openPicker(slot, trigger) {
      if (this.busy) return;
      this.slot = slot;
      this.returnFocus = trigger;
      this.querySelector('[data-picker-label]').textContent = `SCENT ${slot + 1} OF ${this.count}`;
      this.choices.forEach(choice => choice.setAttribute('aria-pressed', String(choice === this.selections[slot])));
      this.previousOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      this.dialog.showModal();
      this.dialog.scrollTop = 0;
      this.updateScrollHint();
    }
    render() {
      this.querySelectorAll('.kb__offer').forEach(offer => {
        const selected = Number(offer.dataset.count) === this.count;
        offer.classList.toggle('is-selected', selected);
        offer.querySelector('.kb__slots').hidden = !selected;
        offer.querySelector('input').checked = selected;
        offer.querySelectorAll('[data-slot]').forEach(slot => {
          const choice = this.selections[Number(slot.dataset.slot)];
          if (!choice) return;
          slot.querySelector('.kb__slot-copy strong').textContent = choice.dataset.name;
          const inspiration = document.createElement('strong');
          inspiration.textContent = choice.dataset.inspiration;
          slot.querySelector('.kb__slot-copy small').replaceChildren('Smells like ', inspiration);
          const holder = slot.querySelector('.kb__slot-image');
          if (holder.dataset.variant !== choice.dataset.variant) {
            const img = choice.querySelector('img').cloneNode();
            img.width = 42; img.height = 42; img.alt = '';
            holder.replaceChildren(img);
            holder.dataset.variant = choice.dataset.variant;
          }
          slot.setAttribute('aria-label', `Change scent ${Number(slot.dataset.slot) + 1}: ${choice.dataset.name}`);
        });
      });
      this.querySelectorAll('[data-unlock]').forEach(gift => {
        const unlocked = this.count >= Number(gift.dataset.unlock);
        gift.classList.toggle('is-locked', !unlocked);
        gift.querySelector('[data-gift-status]').textContent = unlocked ? '✓ Unlocked' : 'Locked';
      });
      const [lead, rest] = this.count === 5 ? ['All 3 gifts unlocked.', ' Included with your bundle.'] : this.count === 3 ? ['Free shipping unlocked.', ' Choose 1 more bottle to unlock all 3 gifts.'] : ['Choose 1 more bottle', ' to unlock free shipping.'];
      const strong = document.createElement('strong');
      strong.textContent = lead;
      this.querySelector('[data-gift-message]').replaceChildren(strong, rest);
    }
    async connectNative(attempt = 0) {
      if (!this.isConnected) return;
      const section = this.closest('.shopify-section');
      const native = section?.querySelector(`kaching-bundle[product-id="${this.dataset.productId}"] kaching-bundles-block`);
      if (!native || typeof native.items !== 'function' || !native.dealBlock?.dealBars) {
        if (attempt >= 60) {
          this.error('The bundle could not load. Please refresh the page and try again.');
          this.setLabel('Bundle unavailable');
          return;
        }
        this.retryTimer = setTimeout(() => this.connectNative(attempt + 1), 500);
        return;
      }
      this.native = native;
      this.bars = native.dealBlock.dealBars;
      const wrapper = native.closest('kaching-bundle');
      wrapper.classList.add('kb-native');
      wrapper.setAttribute('aria-hidden', 'true');
      wrapper.inert = true;
      // The native form stays mounted for the app's integration, with its CTA hidden.
      section.querySelectorAll('product-form').forEach(form => form.classList.add('kb-native'));
      native.currentVariantId = Number(this.selections[0]?.dataset.variant);
      this.queueSync();
    }
    queueSync() {
      if (!this.native) return;
      this.addButton.disabled = true;
      this.setLabel('Updating bundle…');
      this.syncTask = (this.syncTask || Promise.resolve()).catch(() => {}).then(() => this.syncNative()).catch(error => {
        this.error(error.message);
        this.setLabel('Bundle unavailable');
        this.addButton.disabled = true;
      });
    }
    async waitFor(check, message) {
      for (let index = 0; index < 80; index++) {
        if (!this.isConnected) throw new Error('Bundle disconnected.');
        const result = check();
        if (result) return result;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      throw new Error(message);
    }
    async syncNative() {
      const count = this.count;
      const selections = this.selections.slice(0, count);
      if (selections.some(choice => !choice)) throw new Error('These scents are currently unavailable.');
      const bar = this.bars.find(bar => Number(bar.quantity) === count);
      if (!bar) throw new Error('This offer is currently unavailable.');
      this.native.selectedDealBarId = bar.id;
      const selected = await this.waitFor(() => this.native.querySelector(`[data-deal-bar-id="${bar.id}"].kaching-bundles__bar--selected`), 'The bundle offer could not load.');
      const controls = await this.waitFor(() => {
        const list = [...selected.querySelectorAll('.kaching-bundles__bar-variant-selects')];
        return list.length === count ? list : null;
      }, 'Scent selection is unavailable in this market. Please refresh or contact us.');
      for (let slot = 0; slot < count; slot++) {
        const value = selections[slot].dataset.option;
        const select = controls[slot].querySelector('select');
        if (select) {
          select.value = value;
          select.dispatchEvent(new Event('change', {bubbles:true}));
        } else {
          const dropdown = controls[slot].querySelector('.kaching-bundles__swatch-dropdown');
          if (!dropdown) throw new Error('The scent picker could not connect. Please refresh.');
          if (dropdown.dataset.value !== value) {
            dropdown.querySelector('[role=combobox]').click();
            const option = await this.waitFor(() => [...dropdown.querySelectorAll('[role=option]')].find(option => option.dataset.value === value), 'This scent is currently unavailable.');
            option.click();
          }
        }
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      const expected = selections.map(choice => Number(choice.dataset.variant)).sort().join(',');
      await this.waitFor(() => {
        const ids = this.native.items().filter(item => selections.some(choice => Number(choice.dataset.variant) === Number(item.id))).flatMap(item => Array(item.quantity).fill(Number(item.id)));
        return ids.sort().join(',') === expected;
      }, 'Your scent choices could not be confirmed. Please try again.');
      if (count !== this.count) return;
      const price = this.native.pricing();
      const full = this.native.product.variants.find(v => v.id === Number(selections[0].dataset.variant))?.price * count;
      const currency = window.Shopify?.currency?.active || 'USD';
      const money = cents => new Intl.NumberFormat(document.documentElement.lang || 'en', {style:'currency',currency}).format(cents / 100);
      this.querySelector('[data-total]').textContent = price.discountedPrice.formatted;
      this.querySelector(`[data-count="${count}"] [data-offer-price]`).textContent = price.discountedPrice.formatted;
      const compare = this.querySelector('[data-compare]');
      compare.textContent = money(full);
      compare.hidden = count === 1;
      const savings = this.querySelector('[data-savings]');
      savings.textContent = `You're saving ${money(full - Math.round(price.discountedPrice.amount * 100))}`;
      this.querySelector('[data-savings-tag]').hidden = count === 1;
      this.error();
      this.setLabel('Add to cart');
      this.addButton.disabled = false;
    }
    async addToCart() {
      if (this.busy || this.addButton.disabled || !this.native) return;
      this.busy = true;
      this.addButton.disabled = true;
      this.setLabel('Adding…');
      this.querySelectorAll('input[type=radio],.kb__slot').forEach(input => input.disabled = true);
      this.error();
      let added = false;
      try {
        await this.syncTask;
        const items = this.native.items();
        if (!items.length || !this.native.isItemSelectionValid()) throw new Error('Please choose all your scents.');
        const cart = document.querySelector('cart-drawer');
        const sections = cart?.getSectionsToRender?.().map(section => section.id) || ['cart-drawer', 'cart-icon-bubble'];
        const root = window.Shopify?.routes?.root || '/';
        const response = await fetch(`${root}cart/add.js?kaching_bundles=true`, {
          method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},
          body:JSON.stringify({items,sections,sections_url:location.pathname})
        });
        const data = await response.json();
        if (!response.ok || data.status) throw new Error(data.description || data.message || 'Unable to add your bundle. Please try again.');
        added = true;
        this.native.rotateBundleNonce?.();
        if (cart?.renderContents && data.sections && Object.values(data.sections).every(Boolean)) {
          cart.classList.remove('is-empty');
          cart.setActiveElement?.(this.addButton);
          cart.renderContents(data);
        } else location.assign(`${root}cart`);
      } catch (error) {
        if (added) location.assign(`${window.Shopify?.routes?.root || '/'}cart`);
        else this.error(error.message || 'Unable to add your bundle. Please try again.');
      } finally {
        this.busy = false;
        this.addButton.disabled = false;
        this.setLabel('Add to cart');
        this.querySelectorAll('input[type=radio],.kb__slot').forEach(input => input.disabled = false);
      }
    }
  });
}
