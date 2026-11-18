# Colourful Imagination by Astera Art

HTML/CSS implementation based on the supplied approved PDFs. Open `index.html` in a browser. No build step, framework, package installation, or internet connection is needed.

## Design references

- **H1**: `Colourful Imagination by Astera Art-H1.pdf` is the base: green header/footer, cream background, yellow buttons, serif headings, split hero with overlapping palette, original section treatments, mosaic gallery and mint contact form.
- **H2**: `Colourful Imagination by Astera Art-H2.pdf` supplies the green “A Creative Space For Creative People” container and “Our Process / How It Works” three-step presentation.
- Why Choose Us has been moved before About Us.
- The old age range is replaced by “Fun For All Ages.”
- Services appear once, with the four requested choices.
- The creative philosophy encourages personal expression and freedom rather than reproducing one painting.

## Files

- `index.html`: homepage with semantic, individually labelled sections.
- `about.html`: About page using the shared visual system and approved-reference background information.
- `services.html`: dedicated service overview and process.
- `gallery.html`: full gallery with image viewing.
- `contact.html`: dedicated contact details and email-draft form.
- `booking.html`: Book a Class hub linking to each service's own booking flow.
- `events.html`, `event.html`, `event-checkout.html`: Paint & Parties listing, event page and booking/payment.
- `kids-art-club.html`, `beginner-painting.html`: 3-step booking with age-filtered sessions.
- `private-lessons.html`: registration form, no payment.
- `booking-data.js`: admin-managed booking content (events, sessions, lesson types).
- `style.css`: shared design tokens, layouts, components and responsive styles.
- `script.js`: navigation, the four booking flows, gallery viewer and email draft handoff.
- `assets/`: original image assets extracted from H1; all imagery loads locally.
- `reference/`: PDF renders, screenshots and browser verification helpers; not needed for production.

## Pending client inputs

Hero and gallery images currently match the reference PDF. Replace them with the approved Instagram originals when supplied. Replace the About portrait with the client drawing photograph. About copy uses the reference narrative with the requested creative-freedom direction; final client copy remains pending.

System Georgia and Arial approximate the PDF typography. The PDF uses outlined/Type3 text and does not supply reusable webfont files. The logo is a CSS text approximation; replace it with the client's original logo asset when available. Header phone/email actions replace social links whose destinations have not been supplied.

## Booking methods by service

Book a Class (booking.html) is a hub with one card per service. Each service books differently:

1. **Paint & Parties**: events.html lists events as cards (image, title, Book Now). event.html?id=… is the event page: title header, image on the left, and on the right the date, time, number of people, age bracket, highlights, we provide / you bring, where & when, note and cost, with Book Now at the bottom. event-checkout.html?event=… keeps the selected event's details, collects the guest's details and number of spots, then shows a payment step that can differ per event: `online` (full price), `deposit` (deposit now, balance on the day) or `at-venue` (reserve now, pay at the event). Past events are listed under Past events and can't be booked.
2. **Kids Art Club** (kids-art-club.html): 3 steps. Step 1 is your information. Step 2 shows only the sessions whose age range includes the child's age; each session can have several time slots. Step 3 completes the booking.
3. **Beginner Painting** (beginner-painting.html): the same 3 steps, split into Adults and Kids. Each part has its own sessions.
4. **Private Lessons** (private-lessons.html): a registration form with no payment. The lesson-type dropdown comes from the data file. Submitting opens an email draft to the studio.

**Admin data:** all events, sessions (with age ranges and time slots), prices, payment methods and lesson types are set in `booking-data.js`. The pages never need editing. In WordPress, print the same `window.ASTERA_BOOKING` object from custom post types or ACF fields. The current content is sample data: prices, capacities, age brackets and session times need confirming by the client. The Little Ghost image is cropped from the client's screen photo; replace it with the original artwork.

**Payment:** the payment buttons are placeholders. Nothing is reserved, charged or stored until a provider (e.g. Stripe or Square) is connected during WordPress development.

The contact form opens an email draft in the visitor's mail app. The visitor sends it there. It is not a server-backed contact form.

## WordPress conversion

This is a static prototype, not an installable theme. Preserve the shared HTML classes and CSS when converting:

- `header.php`: shared head/header, `wp_head()`, editable logo and `wp_nav_menu()`.
- `footer.php`: shared footer/dialog markup, `wp_footer()`.
- `front-page.php`: include `template-parts/hero.php`, `benefits.php`, `why-us.php`, `about.php`, `services.php`, `philosophy.php`, `process.php`, `gallery.php`, `contact.php` in the current order.
- `page-about.php` and `page.php`: About content and general pages.
- `functions.php`: enqueue shared CSS/JS, register menus, add theme and responsive-image support.
- `theme.json`: mirror the CSS colour, font and spacing tokens.
- Make text and imagery editable through core blocks/patterns or custom fields; no page-builder dependency is required.
- Move local assets into the Media Library and use WordPress attachment functions for alt text and responsive images.
- Replace static page URLs with WordPress permalinks and use escaped dynamic output.
- Connect a booking provider with a dedicated Paint Parties calendar, actual service availability, capacity, pricing/deposits, secure checkout and confirmations. Enforce booking/payment validation on the server.
- Replace the email-draft form with the chosen WordPress contact form integration.

## Verification

Checked in headless Chrome at real viewport widths of 1440, 768, 390 and 320 pixels: section order, no horizontal overflow, service-first booking, required field validation, calendar selection and month navigation, independent service dates, safe rendering of entered text, modal closing/scroll restoration, gallery expansion/viewing, and menu toggling. About page, local image loading, link targets and unique IDs were also checked. JavaScript passes `node --check script.js`.

Browser checks can be repeated on this Windows machine with `node reference/browser-check.cjs`. This uses the installed Chrome, Node.js built-ins, and a temporary local Chrome profile. The older Python runner supplies the test fixture; Python is not needed by the Node runner.

Screenshots: `reference/full-page-preview.png`, `reference/mobile-preview.png`, `reference/mobile-booking-preview.png`, and `reference/about-preview.png`.

## Separate page update

All six pages share the same navigation, header, footer and stylesheet. Navigation marks the current page. Service links pass a validated service query parameter to booking.html and keep service selection first. The homepage retains the approved section composition while its navigation and booking links lead to separate pages. The booking page replaces the former booking modal.

WordPress page templates can map directly to services.html, gallery.html, contact.html and booking.html. Shared JavaScript initializes booking code only when its form is present.

Verified all six pages at 1440, 768, 390 and 320 pixel widths, with no horizontal overflow or JavaScript exceptions. Checked navigation, links/assets, booking selection and validation, calendar/review, service preselection and gallery Escape handling. Run node reference/browser-check.cjs to repeat the current multipage browser checks.
