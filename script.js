/* =========================================================
   Корзина товарів (дані зберігаються в localStorage,
   тому доступні і на index.html, і на basket.html)
   ========================================================= */
const CART_KEY = 'sportCart';

/* ---------- Робота зі сховищем ---------- */
function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}

/* Кількість НАЙМЕНУВАНЬ у корзині (а не штук) */
function updateCartCount() {
  const el = document.getElementById('cartCount');
  if (el) el.textContent = getCart().length;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/* ---------- Модальні вікна ---------- */
function closeModal() {
  const m = document.querySelector('.overlay');
  if (m) m.remove();
}

/*
  showModal({ message, content, buttons: [{text, secondary, onClick}] })
  content — вже готовий DOM-елемент (необов'язково)
*/
function showModal({ message, content, buttons }) {
  closeModal();

  const overlay = document.createElement('div');
  overlay.className = 'overlay';

  const modal = document.createElement('div');
  modal.className = 'modal';

  const p = document.createElement('p');
  p.textContent = message;
  modal.appendChild(p);

  if (content) modal.appendChild(content);

  const btnBox = document.createElement('div');
  btnBox.className = 'modal-buttons';
  buttons.forEach(b => {
    const btn = document.createElement('button');
    btn.className = 'btn' + (b.secondary ? ' btn-secondary' : '');
    btn.textContent = b.text;
    btn.addEventListener('click', b.onClick || closeModal);
    btnBox.appendChild(btn);
  });
  modal.appendChild(btnBox);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

/* Лічильник з кнопками − / + */
function createQtyControl(value, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'qty';

  const minus = document.createElement('button');
  minus.type = 'button';
  minus.textContent = '−';

  const input = document.createElement('input');
  input.type = 'number';
  input.min = 1;
  input.max = 99;
  input.value = value;

  const plus = document.createElement('button');
  plus.type = 'button';
  plus.textContent = '+';

  function set(v) {
    v = parseInt(v, 10);
    if (isNaN(v) || v < 1) v = 1;
    if (v > 99) v = 99;
    input.value = v;
    if (onChange) onChange(v);
  }

  minus.addEventListener('click', () => set(parseInt(input.value, 10) - 1));
  plus.addEventListener('click', () => set(parseInt(input.value, 10) + 1));
  input.addEventListener('change', () => set(input.value));

  wrap.append(minus, input, plus);
  wrap.getValue = () => {
    set(input.value);
    return parseInt(input.value, 10);
  };
  return wrap;
}

/* ---------- Іконка корзини ---------- */
function initCartIcon() {
  const link = document.getElementById('cartLink');
  if (!link) return;

  link.addEventListener('click', e => {
    if (getCart().length === 0) {
      e.preventDefault();
      showModal({
        message: 'Корзина пуста',
        buttons: [{ text: 'Ок' }]
      });
    }
    /* інакше спрацює звичайний перехід на basket.html */
  });
}

/* ---------- Сторінка зі списком товарів ---------- */
function addToCart(product, qty) {
  const cart = getCart();
  const existing = cart.find(item => item.id === product.id);
  if (existing) {
    existing.qty = Math.min(99, existing.qty + qty);
  } else {
    cart.push({ id: product.id, name: product.name, price: product.price, qty: qty });
  }
  saveCart(cart);
}

function initProductsPage() {
  const buttons = document.querySelectorAll('.add-btn');
  if (!buttons.length) return;

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.card');
      const product = {
        id: card.dataset.id,
        name: card.dataset.name,
        price: parseFloat(card.dataset.price)
      };

      /* 1-е вікно: вибір кількості */
      const qtyControl = createQtyControl(1);
      showModal({
        message: 'Вкажіть кількість:',
        content: qtyControl,
        buttons: [{
          text: 'Додати до корзини',
          onClick: () => {
            addToCart(product, qtyControl.getValue());

            /* 2-е вікно: товар додано */
            showModal({
              message: 'Товар додано',
              buttons: [
                { text: 'Перейти у корзину', onClick: () => { window.location.href = 'basket.html'; } },
                { text: 'Повернутись до покупок', secondary: true }
              ]
            });
          }
        }]
      });
    });
  });
}

/* ---------- Сторінка корзини ---------- */
function formatMoney(n) {
  return n.toFixed(2);
}

function renderBasket() {
  const box = document.getElementById('basketContent');
  if (!box) return;

  const cart = getCart();

  if (cart.length === 0) {
    box.innerHTML = '<p class="empty-text">Корзина пуста</p>';
    return;
  }

  let total = 0;
  let rows = '';
  cart.forEach((item, i) => {
    const sum = item.price * item.qty;
    total += sum;
    rows += `
      <tr data-id="${escapeHtml(item.id)}">
        <td>${i + 1}.</td>
        <td>${escapeHtml(item.name)}</td>
        <td class="num">${formatMoney(item.price)}</td>
        <td class="qty-cell"></td>
        <td class="num">${formatMoney(sum)}</td>
        <td><span class="remove">(видалити)</span></td>
      </tr>`;
  });

  box.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>№</th>
          <th>Назва товару</th>
          <th class="num">Ціна за од.</th>
          <th>К-сть</th>
          <th class="num">Сума:</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="4" class="total-label">Разом до оплати:</td>
          <td class="num">${formatMoney(total)} грн.</td>
          <td></td>
        </tr>
      </tfoot>
    </table>`;

  /* Зміна кількості */
  box.querySelectorAll('tbody tr').forEach(tr => {
    const id = tr.dataset.id;
    const item = cart.find(c => c.id === id);
    const ctrl = createQtyControl(item.qty, newQty => {
      item.qty = newQty;
      saveCart(cart);
      renderBasket();
    });
    tr.querySelector('.qty-cell').appendChild(ctrl);

    /* Видалення товару */
    tr.querySelector('.remove').addEventListener('click', () => {
      saveCart(cart.filter(c => c.id !== id));
      renderBasket();
    });
  });
}

function initBasketPage() {
  const pay = document.getElementById('payLink');
  if (!pay) return;

  renderBasket();

  pay.addEventListener('click', e => {
    e.preventDefault();
    if (getCart().length === 0) {
      showModal({ message: 'Корзина пуста', buttons: [{ text: 'Ок' }] });
      return;
    }
    showModal({
      message: 'Дякуємо за замовлення!',
      buttons: [{
        text: 'Ок',
        onClick: () => {
          saveCart([]);
          window.location.href = 'index.html';
        }
      }]
    });
  });
}

/* ---------- Запуск ---------- */
document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
  initCartIcon();
  initProductsPage();
  initBasketPage();
});
