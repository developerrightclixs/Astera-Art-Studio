'use strict';
/* Vanilla JS enhancements. Booking/provider code is isolated for WordPress replacement. */
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#site-nav');
menuButton.addEventListener('click', () => {
  const expanded = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(expanded));
  navigation.classList.toggle('is-open', expanded);
});
navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  menuButton.setAttribute('aria-expanded', 'false');
  navigation.classList.remove('is-open');
}));
const yearEl = document.querySelector('#year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Native dialogs provide keyboard focus containment, Escape and focus restoration.
const imageDialog = document.querySelector('#image-dialog');
function openDialog(dialog) {
  if (!dialog.open) dialog.showModal();
  document.body.classList.add('dialog-open');
}
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.addEventListener('close', () => {
    if (!document.querySelector('dialog[open]')) document.body.classList.remove('dialog-open');
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
}
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => document.getElementById(button.dataset.close).close()));

/* ==========================================================================
 * Booking flows. All content comes from booking-data.js (window.ASTERA_BOOKING),
 * the stand-in for the WordPress admin. Each flow only runs on its own page.
 *   Paint & Parties : events.html → event.html?id= → event-checkout.html?event=
 *   Kids Art Club / Beginner Painting : 3-step form, sessions filtered by age
 *   Private Lessons : registration form, no payment
 * Payment is a placeholder until a provider (e.g. Stripe/Square) is connected.
 * ========================================================================== */
const BOOKING = window.ASTERA_BOOKING || { events: [], programs: {}, privateLessonTypes: [] };
const STUDIO_EMAIL = 'tptunde100@yahoo.com';
const money = new Intl.NumberFormat('en-CA', { style: 'currency', currency: BOOKING.currency || 'CAD' });

// One age format everywhere: "Ages 4 to 13", or "Ages 18 and up" when there is no upper limit.
function ageRange(min, max) {
  return 'Ages ' + min + (max == null || max >= 100 ? ' and up' : ' to ' + max);
}
function eventAges(event) {
  return ageRange(event.ageMin, event.ageMax) + (event.ageNote ? ' (' + event.ageNote + ')' : '');
}

// Safe DOM builder: text is always set with textContent, never parsed as HTML.
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat()) if (child !== null && child !== undefined && child !== false) node.append(child);
  return node;
}
function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', '#i-' + name);
  svg.append(use);
  return svg;
}
function todayValue() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}
const isPastEvent = event => event.date < todayValue();
const findEvent = id => BOOKING.events.find(event => event.id === id);
const formatDate = (value, options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) => new Date(value + 'T12:00:00').toLocaleDateString('en-CA', options);
function formatTime(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' });
}
const eventTime = event => formatTime(event.startTime) + ' – ' + formatTime(event.endTime);
const priceText = price => price ? money.format(price.amount) + ' ' + price.label : 'Price to be announced';
const eventUrl = event => 'event.html?id=' + encodeURIComponent(event.id);
const checkoutUrl = event => 'event-checkout.html?event=' + encodeURIComponent(event.id);
function paymentSummary(event) {
  if (!event.price) return 'Reserve your spot now — we’ll confirm the cost by email';
  if (event.payment.method === 'deposit') return money.format(event.payment.deposit) + ' deposit online, balance at the event';
  if (event.payment.method === 'at-venue') return 'Reserve online, pay at the event';
  return 'Pay online when you book';
}

// Shared multi-step behaviour for booking forms (fieldsets marked .booking-stage).
function stepper(form) {
  const stages = Array.from(form.querySelectorAll('.booking-stage'));
  const markers = Array.from(form.closest('.booking-page-panel').querySelectorAll('.booking-steps li'));
  const status = form.querySelector('.form-status');
  let current = 0;
  function show(index) {
    current = index;
    stages.forEach((stage, i) => { stage.hidden = i !== index; stage.disabled = i !== index; });
    markers.forEach((item, i) => {
      item.classList.toggle('active', i === index);
      item.classList.toggle('done', i < index);
      if (i === index) item.setAttribute('aria-current', 'step'); else item.removeAttribute('aria-current');
    });
    status.textContent = '';
    const legend = stages[index].querySelector('legend');
    legend.tabIndex = -1;
    legend.focus({ preventScroll: true });
    form.closest('.booking-page-panel').scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  function validate(stage = stages[current]) {
    for (const field of stage.querySelectorAll('input, select, textarea')) {
      if (field.type === 'hidden' || field.closest('[hidden]')) continue;
      if (typeof field.value === 'string' && field.type !== 'radio' && field.value !== field.value.trim()) field.value = field.value.trim();
      if (!field.reportValidity()) return false;
    }
    return true;
  }
  form.addEventListener('submit', event => event.preventDefault());
  return { show, validate, status, get current() { return current; } };
}
function fillSummary(list, rows) {
  list.replaceChildren();
  for (const [label, value] of rows) list.append(el('dt', { text: label }), el('dd', { text: value }));
}

/* ---------- Paint & Parties: listing ---------- */
const eventList = document.querySelector('#event-list');
if (eventList) {
  const sorted = BOOKING.events.slice().sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  const upcoming = sorted.filter(event => !isPastEvent(event));
  const past = sorted.filter(isPastEvent).reverse();
  const card = (event, index) => {
    const ended = isPastEvent(event);
    return el('article', { class: 'event-card' + (ended ? ' is-past' : ''), 'data-aos': 'fade-up', 'data-aos-delay': (index % 3) * 100 },
      el('a', { class: 'event-card-image', href: eventUrl(event), tabindex: '-1', 'aria-hidden': 'true' },
        el('img', { src: event.image, alt: '', loading: 'lazy', width: '600', height: '450' }),
        ended ? el('span', { class: 'event-badge', text: 'Event ended' }) : null),
      el('div', { class: 'event-card-body' },
        el('p', { class: 'event-card-date', text: formatDate(event.date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) + ' · ' + formatTime(event.startTime) }),
        el('h3', {}, el('a', { href: eventUrl(event), text: event.title })),
        el('p', { class: 'event-card-summary', text: event.summary }),
        el('ul', { class: 'event-card-meta' },
          el('li', {}, icon('people'), el('span', { text: eventAges(event) })),
          el('li', {}, icon('pin'), el('span', { text: event.venue.name }))),
        el('div', { class: 'event-card-footer' },
          el('span', { class: 'event-card-price', text: priceText(event.price) }),
          el('a', { class: 'button button-small', href: eventUrl(event), text: ended ? 'View Details' : 'Book Now', 'aria-label': (ended ? 'View details: ' : 'Book now: ') + event.title }))));
  };
  eventList.append(...upcoming.map(card));
  document.querySelector('#event-empty').hidden = upcoming.length > 0;
  if (past.length) {
    document.querySelector('#past-event-list').append(...past.map(card));
    document.querySelector('#past-events').hidden = false;
  }
}

/* ---------- Paint & Parties: event page ---------- */
const eventDetail = document.querySelector('#event-detail');
if (eventDetail) {
  const event = findEvent(new URLSearchParams(location.search).get('id'));
  const crumbs = title => el('nav', { 'aria-label': 'Breadcrumb' }, el('a', { href: 'index.html', text: 'Home' }), el('span', { 'aria-hidden': 'true', text: '/' }), el('a', { href: 'events.html', text: 'Paint & Parties' }), el('span', { 'aria-hidden': 'true', text: '/' }), el('span', { text: title }));
  if (!event) {
    document.title = 'Event not found — Astera Art';
    eventDetail.append(el('section', { class: 'page-banner' }, el('div', { class: 'container' },
      el('p', { class: 'eyebrow', text: 'Paint & Parties' }), el('h1', { text: 'Event not found' }),
      el('p', { text: 'This event may have been removed. Take a look at what’s coming up next.' }),
      el('p', { class: 'banner-action' }, el('a', { class: 'button', href: 'events.html', text: 'See Upcoming Events' })))));
  } else {
    const ended = isPastEvent(event);
    document.title = event.title + ' — Astera Art';
    const checklist = items => el('ul', { class: 'check-list' }, items.map(item => el('li', {}, icon('check'), el('span', { text: item }))));
    const fact = (name, label, value) => el('li', {}, el('span', { class: 'icon-square' }, icon(name)), el('div', {}, el('span', { class: 'fact-label', text: label }), el('b', { text: value })));
    eventDetail.append(
      el('section', { class: 'page-banner event-banner', 'data-aos': 'fade-in' }, el('div', { class: 'container' },
        el('p', { class: 'eyebrow', text: event.series || 'Paint & Parties' }), el('h1', { text: event.title }), crumbs(event.title))),
      el('section', { class: 'event-section' }, el('div', { class: 'container event-layout' },
        el('figure', { class: 'event-image', 'data-aos': 'fade-up' }, el('img', { src: event.image, alt: event.imageAlt || event.title, width: '600', height: '800' })),
        el('div', { class: 'event-info', 'data-aos': 'fade-up', 'data-aos-delay': '100' },
          el('ul', { class: 'event-facts' },
            fact('calendar', 'Date', formatDate(event.date)),
            fact('easel', 'Time', eventTime(event)),
            fact('people', 'Number of people', event.capacity),
            fact('award', 'Age bracket', eventAges(event))),
          event.highlights && event.highlights.length ? el('ul', { class: 'event-highlights' }, event.highlights.map(text => el('li', { text }))) : null,
          event.provide && event.provide.length ? el('div', { class: 'event-block' }, el('h2', { text: 'We provide' }), checklist(event.provide)) : null,
          event.bring && event.bring.length ? el('div', { class: 'event-block' }, el('h2', { text: 'You bring' }), checklist(event.bring)) : null,
          el('dl', { class: 'event-where' },
            el('div', {}, el('dt', {}, icon('pin'), 'Where'), el('dd', {}, el('b', { text: event.venue.name }), el('span', { text: event.venue.address }))),
            el('div', {}, el('dt', {}, icon('calendar'), 'When'), el('dd', {}, el('b', { text: formatDate(event.date) }), el('span', { text: eventTime(event) })))),
          event.note ? el('p', { class: 'event-note' }, el('b', { text: 'Note ' }), event.note) : null,
          el('div', { class: 'event-cost' },
            el('div', {}, el('span', { class: 'fact-label', text: 'Cost' }), el('b', { text: priceText(event.price) }), el('small', { text: paymentSummary(event) })),
            ended
              ? el('p', { class: 'event-ended', text: 'This event has ended. See our upcoming events for the next one.' })
              : el('div', { class: 'event-book' }, el('p', { text: 'Space is limited. Get yours now!' }), el('a', { class: 'button', href: checkoutUrl(event), text: 'Book Now' }))),
          el('a', { class: 'text-link', href: 'events.html', text: '← All events' })))));
  }
}

/* ---------- Paint & Parties: checkout (captures the selected event, then payment) ---------- */
const checkoutForm = document.querySelector('#event-checkout-form');
if (checkoutForm) {
  const event = findEvent(new URLSearchParams(location.search).get('event'));
  const unavailable = reason => {
    checkoutForm.hidden = true;
    document.querySelector('.checkout-layout .booking-steps').hidden = true;
    document.querySelector('#checkout-unavailable-text').textContent = reason;
    document.querySelector('#checkout-unavailable').hidden = false;
  };
  if (event) {
    document.querySelector('#checkout-back').href = eventUrl(event);
    document.title = 'Book: ' + event.title + ' — Astera Art';
    document.querySelector('#checkout-event').append(
      el('img', { src: event.image, alt: '', width: '600', height: '450' }),
      el('div', { class: 'checkout-event-body' },
        el('p', { class: 'eyebrow', text: 'Your selected event' }),
        el('h2', { text: event.title }),
        el('ul', { class: 'event-card-meta' },
          el('li', {}, icon('calendar'), el('span', { text: formatDate(event.date) })),
          el('li', {}, icon('easel'), el('span', { text: eventTime(event) })),
          el('li', {}, icon('pin'), el('span', { text: event.venue.name + ', ' + event.venue.address })),
          el('li', {}, icon('people'), el('span', { text: eventAges(event) }))),
        el('p', { class: 'checkout-price' }, el('b', { text: priceText(event.price) }), el('small', { text: paymentSummary(event) })),
        el('a', { class: 'text-link', href: eventUrl(event), text: 'View event details' })));
  }
  if (!event) unavailable('We couldn’t find that event. It may have been removed.');
  else if (isPastEvent(event)) unavailable('“' + event.title + '” has already taken place.');
  else {
    const steps = stepper(checkoutForm);
    const f = checkoutForm.elements;
    f.event_id.value = event.id;
    f.event_title.value = event.title;
    f.event_date.value = event.date + ' ' + event.startTime;
    f.tickets.max = event.maxPerBooking || 10;
    let order = null;
    checkoutForm.querySelector('[data-next]').addEventListener('click', () => {
      if (!steps.validate()) return;
      const quantity = Number(f.tickets.value);
      const total = event.price ? event.price.amount * quantity : 0;
      const method = event.price ? event.payment.method : 'reserve';
      const dueNow = method === 'online' ? total : method === 'deposit' ? event.payment.deposit : 0;
      order = { quantity, total, method, dueNow };
      fillSummary(document.querySelector('#checkout-summary'), [
        ['Event', event.title],
        ['Date & time', formatDate(event.date) + ', ' + eventTime(event)],
        ['Where', event.venue.name],
        ['Name', f.name.value],
        ['Email', f.email.value],
        ['Phone', f.phone.value],
        ['Spots', String(quantity)],
        ['Total', event.price ? money.format(total) : 'To be announced'],
        ['Due now', money.format(dueNow)]
      ]);
      const title = document.querySelector('#checkout-payment-title');
      const text = document.querySelector('#checkout-payment-text');
      const pay = document.querySelector('#checkout-pay');
      if (method === 'online') {
        title.textContent = 'Pay online';
        text.textContent = 'The full amount of ' + money.format(total) + ' is paid securely online to confirm your spots.';
        pay.textContent = 'Pay ' + money.format(dueNow) + ' Securely';
      } else if (method === 'deposit') {
        title.textContent = 'Pay your deposit';
        text.textContent = 'A ' + money.format(dueNow) + ' deposit secures your booking. The remaining ' + money.format(Math.max(total - dueNow, 0)) + ' is paid on the day.';
        pay.textContent = 'Pay ' + money.format(dueNow) + ' Deposit';
      } else {
        title.textContent = method === 'at-venue' ? 'Pay at the event' : 'Reserve your spot';
        text.textContent = method === 'at-venue'
          ? 'No online payment is needed. Please pay ' + money.format(total) + ' at the event (cash or card).'
          : 'The price for this event will be announced soon. Reserve now and we’ll confirm the cost with you by email.';
        pay.textContent = 'Confirm Reservation';
      }
      steps.show(1);
    });
    checkoutForm.querySelector('[data-prev]').addEventListener('click', () => steps.show(0));
    document.querySelector('#checkout-pay').addEventListener('click', () => {
      if (!order) return;
      steps.status.textContent = order.dueNow > 0
        ? 'Preview only: secure online payment will be connected here during WordPress development. No booking was made and nothing was charged.'
        : 'Preview only: reservations will be saved once the booking system is connected. No booking was made.';
    });
  }
}

/* ---------- Kids Art Club & Beginner Painting: info → age-filtered sessions → complete ---------- */
const classForm = document.querySelector('#class-booking-form');
if (classForm) {
  const program = BOOKING.programs[classForm.dataset.program];
  const steps = stepper(classForm);
  const f = classForm.elements;
  const partChoice = document.querySelector('#part-choice');
  const participantField = classForm.querySelector('[data-field="participant"]');
  let part = program.parts[0];
  let choice = null;
  function applyPart(next) {
    part = next;
    const child = part.kind === 'child';
    participantField.hidden = !child;
    f.participant.required = child;
    classForm.querySelector('[data-label="contact-name"]').textContent = child ? 'Parent / guardian name' : 'Your name';
    classForm.querySelector('[data-label="age"]').textContent = child ? 'Child’s age' : 'Your age';
    f.age.min = part.ageMin;
    f.age.max = part.ageMax;
    f.age.placeholder = ageRange(part.ageMin, part.ageMax);
    checkAgeForPart();
  }
  // With Adults/Kids parts, point people to the right part instead of a bare min/max error.
  function checkAgeForPart() {
    const age = Number(f.age.value);
    let message = '';
    if (program.parts.length > 1 && f.age.value !== '') {
      const better = program.parts.find(p => p !== part && age >= p.ageMin && age <= p.ageMax);
      if (better && (age < part.ageMin || age > part.ageMax)) message = 'Age ' + age + ' is in our ' + better.label + ' classes — please choose “' + better.label + '” above.';
    }
    f.age.setCustomValidity(message);
  }
  f.age.addEventListener('input', checkAgeForPart);
  if (program.parts.length > 1) {
    partChoice.hidden = false;
    partChoice.append(el('p', { class: 'part-choice-label', text: 'Who is this class for?' }),
      el('div', { class: 'part-options', role: 'radiogroup', 'aria-label': 'Who is this class for?' },
        program.parts.map((item, i) => el('label', {},
          el('input', { type: 'radio', name: 'part', value: item.id, checked: i === 0 }),
          el('span', {}, el('b', { text: item.label }), el('small', { text: ageRange(item.ageMin, item.ageMax) }))))));
    partChoice.addEventListener('change', e => { if (e.target.name === 'part') applyPart(program.parts.find(p => p.id === e.target.value)); });
    const requested = new URLSearchParams(location.search).get('for');
    const preset = program.parts.find(p => p.id === requested);
    if (preset) { partChoice.querySelector('[value="' + preset.id + '"]').checked = true; applyPart(preset); }
    else applyPart(part);
  } else applyPart(part);

  const [toSessions, toReview] = classForm.querySelectorAll('[data-next]');
  toSessions.addEventListener('click', () => {
    checkAgeForPart(); // also covers autofilled ages that fired no input event
    if (!steps.validate()) return;
    const age = Number(f.age.value);
    const matches = part.sessions.filter(session => age >= session.ageMin && age <= session.ageMax);
    const list = document.querySelector('#session-list');
    list.replaceChildren();
    document.querySelector('#session-intro').textContent = matches.length
      ? 'Sessions available for age ' + age + (program.parts.length > 1 ? ' (' + part.label + ')' : '') + '. Choose one time slot.'
      : '';
    if (!matches.length) {
      list.append(el('div', { class: 'payment-note' }, el('h3', { text: 'No sessions for this age right now' }),
        el('p', { text: 'We don’t have an open ' + program.name + ' session for age ' + age + ' at the moment. Contact us and we’ll let you know when one opens.' }),
        el('p', {}, el('a', { class: 'text-link', href: 'contact.html', text: 'Contact the studio →' }))));
    }
    for (const session of matches) {
      list.append(el('fieldset', { class: 'session-card' },
        el('legend', {}, el('b', { text: session.title }), el('span', { class: 'session-age', text: ageRange(session.ageMin, session.ageMax) })),
        el('p', { text: session.description }),
        el('p', { class: 'session-meta', text: session.schedule + ' · ' + priceText(session.price) }),
        el('div', { class: 'slot-options' }, session.slots.map(slot => el('label', {},
          el('input', { type: 'radio', name: 'slot', value: session.id + '|' + slot.id, required: true }),
          el('span', { text: slot.label }))))));
    }
    toReview.disabled = !matches.length;
    steps.show(1);
  });
  toReview.addEventListener('click', () => {
    const picked = classForm.querySelector('input[name="slot"]:checked');
    if (!picked) { steps.status.textContent = 'Please choose a time slot to continue.'; return; }
    const [sessionId, slotId] = picked.value.split('|');
    const session = part.sessions.find(s => s.id === sessionId);
    const slot = session.slots.find(s => s.id === slotId);
    choice = { session, slot };
    const child = part.kind === 'child';
    fillSummary(document.querySelector('#class-summary'), [
      ['Class', program.name + (program.parts.length > 1 ? ' — ' + part.label : '')],
      ['Session', session.title],
      ['Time slot', slot.label],
      ['Schedule', session.schedule],
      [child ? 'Participant' : 'Name', (child ? f.participant.value : f.name.value) + ' (age ' + f.age.value + ')'],
      [child ? 'Parent / guardian' : 'Contact', f.name.value],
      ['Email', f.email.value],
      ['Phone', f.phone.value],
      ['Notes', f.notes.value || 'None'],
      ['Price', priceText(session.price)]
    ]);
    document.querySelector('#class-payment-text').textContent = session.price
      ? money.format(session.price.amount) + ' is paid securely online to confirm this place.'
      : 'We’ll confirm the price with you by email.';
    document.querySelector('#complete-class-booking').textContent = session.price ? 'Complete Booking & Pay ' + money.format(session.price.amount) : 'Complete Booking';
    steps.show(2);
  });
  classForm.querySelectorAll('[data-prev]').forEach(button => button.addEventListener('click', () => steps.show(steps.current - 1)));
  document.querySelector('#complete-class-booking').addEventListener('click', () => {
    if (!choice) return;
    steps.status.textContent = 'Preview only: secure payment and booking confirmation will be connected during WordPress development. No booking was made and nothing was charged.';
  });
}

/* ---------- Private Lessons: registration only, no payment ---------- */
const privateForm = document.querySelector('#private-lesson-form');
if (privateForm) {
  const select = privateForm.elements.lessonType;
  for (const type of BOOKING.privateLessonTypes) select.append(el('option', { text: type }));
  const requested = new URLSearchParams(location.search).get('type');
  if (requested && BOOKING.privateLessonTypes.includes(requested)) select.value = requested;
  privateForm.addEventListener('submit', event => {
    event.preventDefault();
    for (const field of privateForm.querySelectorAll('input, select, textarea')) {
      if (typeof field.value === 'string' && field.tagName !== 'SELECT') field.value = field.value.trim();
      if (!field.reportValidity()) return;
    }
    const v = new FormData(privateForm);
    const body = ['Lesson type: ' + v.get('lessonType'), 'Name: ' + v.get('name'), 'Email: ' + v.get('email'), 'Phone: ' + v.get('phone'),
      'Lesson for: ' + v.get('learner'), 'Experience: ' + v.get('level'), 'Preferred days/times: ' + (v.get('availability') || '—'), '', v.get('message') || ''].join('\n');
    window.location.href = 'mailto:' + STUDIO_EMAIL + '?subject=' + encodeURIComponent('Private lesson registration: ' + v.get('lessonType')) + '&body=' + encodeURIComponent(body);
    privateForm.querySelector('.form-status').textContent = 'Your email app has been asked to open a registration draft. Please press send there, or email ' + STUDIO_EMAIL + ' directly.';
  });
}

// Gallery: use only the exact source paths declared in the page.
document.querySelectorAll('[data-image]').forEach(button => button.addEventListener('click', () => {
  const image = document.querySelector('#lightbox-image');
  image.src = button.dataset.image;
  image.alt = button.dataset.caption;
  document.querySelector('#lightbox-caption').textContent = button.dataset.caption;
  openDialog(imageDialog);
}));
const galleryToggle = document.querySelector('#view-gallery');
if (galleryToggle) galleryToggle.addEventListener('click', () => {
  const expanded = galleryToggle.getAttribute('aria-expanded') !== 'true';
  galleryToggle.setAttribute('aria-expanded', String(expanded));
  document.querySelector('#gallery-more').hidden = !expanded;
  galleryToggle.textContent = expanded ? 'Show Less' : 'View All';
});

// Static contact handoff: creates an email draft; no delivery claim or fake submission.
const contactForm = document.querySelector('#contact-form');
if (contactForm) contactForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!contactForm.reportValidity()) return;
  const values = new FormData(contactForm);
  const subject = 'Studio enquiry: ' + values.get('project');
  const body = ['Name: ' + values.get('name'), 'Company: ' + values.get('company'), 'Email: ' + values.get('email'), 'Phone: ' + values.get('phone'), '', values.get('message')].join('\n');
  window.location.href = 'mailto:tptunde100@yahoo.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  document.querySelector('#contact-status').textContent = 'Your email app has been requested. Please send the draft there. You can also email tptunde100@yahoo.com directly.';
});

// Scroll animations (AOS). Skipped for visitors who prefer reduced motion.
if (window.AOS) {
  AOS.init({ duration: 800, easing: 'ease-out-cubic', once: true, offset: 60,
    disable: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches });
  window.addEventListener('load', () => AOS.refresh());
}
