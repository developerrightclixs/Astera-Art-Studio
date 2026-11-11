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
document.querySelector('#year').textContent = new Date().getFullYear();

// Native dialogs provide keyboard focus containment, Escape and focus restoration.
const bookingDialog = document.querySelector('#booking-dialog');
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

const form = document.querySelector('#booking-form');
if (form) {
const stages = ['service-step', 'details-step', 'review-step'].map(id => document.getElementById(id));
const status = document.querySelector('#form-status');
const dateInput = form.elements.date;
function dateValue(date) { return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-'); }
const today = new Date();
today.setHours(0, 0, 0, 0);
const minimumDate = dateValue(today);
dateInput.min = minimumDate;
let currentStep = 0;
let savedPlan = null;
let calendarYear = today.getFullYear();
let calendarMonth = today.getMonth();
let activeService = '';
const calendarPreferences = new Map(); // Each service keeps its own preferred date.
function selectedService() { return form.querySelector('input[name="service"]:checked')?.value || ''; }
function showStep(index, focus = true) {
  currentStep = index;
  stages.forEach((stage, i) => { stage.hidden = i !== index; stage.disabled = i !== index; });
  document.querySelectorAll('.booking-steps li').forEach((item, i) => {
    item.classList.toggle('active', i === index);
    if (i === index) item.setAttribute('aria-current', 'step');
    else item.removeAttribute('aria-current');
  });
  status.textContent = '';
  if (focus) {
    const heading = stages[index].querySelector('legend');
    heading.tabIndex = -1;
    heading.focus({preventScroll: true});
    bookingDialog.scrollTop = 0;
    if (bookingDialog.tagName !== 'DIALOG') heading.scrollIntoView({block: 'start', behavior: 'smooth'});
  }
}
function validateStage(stage) {
  for (const field of stage.querySelectorAll('input, select, textarea')) {
    if (!field.reportValidity()) return false;
    if (field.required && typeof field.value === 'string' && !field.value.trim()) {
      field.focus();
      status.textContent = 'Please complete all required details.';
      return false;
    }
  }
  return true;
}
function renderCalendar() {
  const title = document.querySelector('#calendar-month');
  const monthDate = new Date(calendarYear, calendarMonth, 1);
  title.textContent = monthDate.toLocaleDateString('en-CA', {month:'long', year:'numeric'});
  document.querySelector('.calendar').setAttribute('aria-label', activeService + ' preferred-date calendar');
  const days = document.querySelector('#calendar-days');
  days.replaceChildren();
  const firstDay = monthDate.getDay();
  const count = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  for (let i = 0; i < firstDay; i++) {
    const space = document.createElement('span');
    space.setAttribute('aria-hidden', 'true');
    days.append(space);
  }
  for (let day = 1; day <= count; day++) {
    const date = new Date(calendarYear, calendarMonth, day);
    const value = dateValue(date);
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = String(day);
    button.dataset.date = value;
    button.disabled = date < today;
    button.setAttribute('aria-label', date.toLocaleDateString('en-CA', {weekday:'long', year:'numeric', month:'long', day:'numeric'}));
    button.setAttribute('aria-pressed', String(value === dateInput.value));
    if (value === minimumDate) button.classList.add('today');
    button.addEventListener('click', () => {
      dateInput.value = value;
      calendarPreferences.set(activeService, value);
      renderCalendar();
      document.querySelector('[data-date="' + value + '"]').focus({preventScroll:true});
    });
    days.append(button);
  }
  document.querySelector('#previous-month').disabled = calendarYear === today.getFullYear() && calendarMonth === today.getMonth();
}
function moveMonth(amount) {
  const next = new Date(calendarYear, calendarMonth + amount, 1);
  calendarYear = next.getFullYear();
  calendarMonth = next.getMonth();
  renderCalendar();
}
document.querySelector('#previous-month').addEventListener('click', () => moveMonth(-1));
document.querySelector('#next-month').addEventListener('click', () => moveMonth(1));
dateInput.addEventListener('change', () => {
  calendarPreferences.set(activeService, dateInput.value);
  if (dateInput.value && dateInput.value >= minimumDate) {
    const [year, month] = dateInput.value.split('-').map(Number);
    calendarYear = year;
    calendarMonth = month - 1;
    renderCalendar();
  }
});
document.querySelectorAll('[data-book]').forEach(button => button.addEventListener('click', () => {
  showStep(0, false); // Service selection is always the first step, even from a service link.
  if (button.dataset.book) {
    const choice = Array.from(form.querySelectorAll('[name="service"]')).find(input => input.value === button.dataset.book);
    if (choice) choice.checked = true;
  }
  openDialog(bookingDialog);
}));
document.querySelector('#to-details').addEventListener('click', () => {
  if (!validateStage(stages[0])) return;
  activeService = selectedService();
  dateInput.value = calendarPreferences.get(activeService) || '';
  const initial = dateInput.value ? new Date(dateInput.value + 'T12:00:00') : today;
  calendarYear = initial.getFullYear();
  calendarMonth = initial.getMonth();
  document.querySelector('#details-title').textContent = activeService === 'Paint Parties' ? 'Plan your paint party' : activeService + ' — date & details';
  renderCalendar();
  showStep(1);
});
document.querySelectorAll('[data-back]').forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.back) - 1)));
document.querySelector('#to-review').addEventListener('click', () => {
  if (!validateStage(stages[1])) return;
  savedPlan = {
    Experience: selectedService(),
    'Preferred date': dateInput.value,
    'Preferred time': form.elements.time.value,
    Name: form.elements.name.value.trim(),
    Email: form.elements.email.value.trim(),
    Phone: form.elements.phone.value.trim(),
    Participants: form.elements.guests.value,
    Notes: form.elements.notes.value.trim() || 'None'
  };
  const summary = document.querySelector('#booking-summary');
  summary.replaceChildren();
  for (const [label, value] of Object.entries(savedPlan)) {
    const term = document.createElement('dt');
    const detail = document.createElement('dd');
    term.textContent = label;
    detail.textContent = value;
    summary.append(term, detail);
  }
  showStep(2);
});
document.querySelector('#save-plan').addEventListener('click', () => {
  if (!savedPlan) return;
  const content = 'COLOURFUL IMAGINATION BY ASTERA ART — PERSONAL BOOKING PLAN\n\nPREVIEW ONLY: This is not a confirmed booking. Nothing has been reserved and no payment collected.\n\n' + Object.entries(savedPlan).map(([label, value]) => label + ': ' + value).join('\n');
  const url = URL.createObjectURL(new Blob([content], {type: 'text/plain;charset=utf-8'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'astera-creative-plan.txt';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  status.textContent = 'Your plan has been downloaded. This is not a confirmed booking.';
});
form.addEventListener('submit', event => {
  event.preventDefault();
  if (currentStep === 0) document.querySelector('#to-details').click();
  else if (currentStep === 1) document.querySelector('#to-review').click();
});
const requestedService = new URLSearchParams(window.location.search).get('service');
if (requestedService) {
  const requestedChoice = Array.from(form.querySelectorAll('[name=service]')).find(input => input.value === requestedService);
  if (requestedChoice) requestedChoice.checked = true;
}
showStep(0, false);
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
