'use strict';
/*
 * Booking content: the stand-in for the admin backend.
 * Everything a studio admin will manage lives here, so the pages never need editing:
 *   - events[]            → Paint & Parties listing + event pages (WordPress: "Event" custom post type)
 *   - programs[...]       → Kids Art Club / Beginner Painting sessions, each limited to an age range
 *   - privateLessonTypes  → the lesson-type dropdown on the Private Lessons form
 * In WordPress, print this same object from PHP (custom post types / ACF fields) as
 * window.ASTERA_BOOKING, and the existing script.js will render it unchanged.
 *
 * SAMPLE CONTENT: prices, capacities, age brackets and session times below are placeholders
 * for the client to confirm. "Little Ghost in the Night" copy comes from the client's reference.
 */
window.ASTERA_BOOKING = {
  currency: 'CAD',

  /* ---------------------------------------------------------------- Paint & Parties events
   * payment.method controls the payment step for each event:
   *   'online'   → full price paid online at booking
   *   'deposit'  → deposit paid online, balance paid at the event (payment.deposit per booking)
   *   'at-venue' → reserve now, pay at the event; no online payment
   * price: null shows "Price to be announced" and allows reservations only.
   */
  events: [
    {
      id: 'little-ghost-in-the-night',
      title: 'Little Ghost in the Night',
      series: 'Paint Nights with Colourful Imagination',
      image: 'assets/events/little-ghost-in-the-night.jpg',
      imageAlt: 'Painting of a glowing white ghost holding a candle on a dark background',
      summary: 'A relaxing, fun night painting a glowing little ghost. No experience necessary.',
      date: '2026-10-29',
      startTime: '18:30',
      endTime: '20:30',
      capacity: 'Up to 24 guests',
      ageMin: 13, ageMax: null,
      maxPerBooking: 8,
      venue: { name: "Kelsey's Original Roadhouse Kitchener", address: '1140 Ottawa St S, Kitchener, N2E 4E2' },
      highlights: [
        'Join us for a relaxing, fun night!',
        'If you like to let your imagination loose and push the limits of your creativity, you are in the right place.',
        'Challenge yourself with this painting — you can do it.',
        'No experience necessary.'
      ],
      provide: ['Step-by-step clear instructions', 'Non-toxic, water-mixable paints and palette', 'A variety of paintbrushes', 'Canvas', 'Protective aprons'],
      bring: ['Your good mood', 'A friend or a whole bunch of them — the more the merrier', 'Or come alone (many people do) and meet like-minded people'],
      note: 'Food and drinks are not included. If you’d like to order food, we recommend arriving 30–60 minutes early, as space at the painting table is limited.',
      price: null,
      payment: { method: 'online' }
    },
    {
      id: 'sunset-canvas-night',
      title: 'Sunset Canvas Night',
      series: 'Paint Nights with Colourful Imagination',
      image: 'assets/client/sunset-canvases.jpg',
      imageAlt: 'Row of finished sunset paintings on easels',
      summary: 'Blend warm skies and silhouettes into your own glowing sunset scene.',
      date: '2026-12-11',
      startTime: '19:00',
      endTime: '21:00',
      capacity: 'Up to 20 guests',
      ageMin: 18, ageMax: null,
      maxPerBooking: 6,
      venue: { name: 'Astera Art Studio', address: '171 Rochefort St., Kitchener, ON, N2R 0N1' },
      highlights: ['An easy-going evening of colour blending and creative freedom.', 'Paint the sunset your way — no two canvases end up the same.', 'No experience necessary.'],
      provide: ['Step-by-step guidance', 'Paints, palette and brushes', '11×14 canvas', 'Protective aprons'],
      bring: ['Your good mood', 'Friends are welcome'],
      note: 'Light refreshments are provided. Please arrive 10 minutes early to find your easel.',
      price: { amount: 45, label: 'per person' },
      payment: { method: 'online' }
    },
    {
      id: 'birthday-paint-party',
      title: 'Birthday Paint Party',
      series: 'Private Party Package',
      image: 'assets/client/party-painting.jpg',
      imageAlt: 'Guests painting together at a party table',
      summary: 'A private, guided painting party for the birthday star and their friends.',
      date: '2026-12-19',
      startTime: '14:00',
      endTime: '16:00',
      capacity: '6 to 12 children',
      ageMin: 5, ageMax: 12,
      maxPerBooking: 12,
      venue: { name: 'Astera Art Studio', address: '171 Rochefort St., Kitchener, ON, N2R 0N1' },
      highlights: ['A two-hour guided painting party in our studio.', 'Each guest takes home their own finished canvas.', 'Theme chosen together with the birthday child.'],
      provide: ['All painting supplies and aprons', 'A guided step-by-step painting', 'Party table set-up and clean-up'],
      bring: ['Cake and snacks (optional)', 'Lots of excitement'],
      note: 'A deposit secures your date. The balance is paid on the day of the party.',
      price: { amount: 30, label: 'per child' },
      payment: { method: 'deposit', deposit: 100 }
    },
    {
      id: 'winter-wonderland-family-paint',
      title: 'Winter Wonderland Family Paint',
      series: 'Paint Nights with Colourful Imagination',
      image: 'assets/client/painting-together.jpg',
      imageAlt: 'Family members painting side by side',
      summary: 'Paint a snowy winter scene side by side with the whole family.',
      date: '2027-01-16',
      startTime: '13:00',
      endTime: '15:00',
      capacity: 'Up to 30 guests',
      ageMin: 6, ageMax: null, ageNote: 'children with an adult',
      maxPerBooking: 6,
      venue: { name: 'Astera Art Studio', address: '171 Rochefort St., Kitchener, ON, N2R 0N1' },
      highlights: ['A relaxed afternoon for families.', 'Simple steps that every age can follow.', 'No experience necessary.'],
      provide: ['All painting supplies', 'Canvas for every painter', 'Protective aprons'],
      bring: ['The whole family'],
      note: 'Spots are reserved online and paid at the studio on the day (cash or card).',
      price: { amount: 35, label: 'per person' },
      payment: { method: 'at-venue' }
    }
  ],

  /* ------------------------------------------------------- Kids Art Club & Beginner Painting
   * Each program has one or more "parts" (Beginner Painting: Adults + Kids).
   * Each session is shown only to participants whose age is within ageMin–ageMax.
   * Ages are always shown as "Ages X to Y"; use ageMax: null (events) or 100+ for "Ages X and up".
   * A session can offer several time slots.
   */
  programs: {
    'kids-art-club': {
      name: 'Kids Art Club',
      parts: [
        {
          id: 'kids', label: 'Kids', kind: 'child', ageMin: 4, ageMax: 17,
          sessions: [
            { id: 'little-artists', title: 'Little Artists', ageMin: 4, ageMax: 6, schedule: 'Weekly · 4-week block · starts Dec 5, 2026', description: 'Playful colour, shapes and sensory crafts for our youngest creators.', price: { amount: 90, label: 'per 4-week block' },
              slots: [{ id: 'la-sat-10', label: 'Saturdays · 10:00 – 11:00 am' }, { id: 'la-sat-1130', label: 'Saturdays · 11:30 am – 12:30 pm' }] },
            { id: 'young-creators', title: 'Young Creators', ageMin: 7, ageMax: 9, schedule: 'Weekly · 4-week block · starts Dec 2, 2026', description: 'Painting, drawing and mixed-media projects that build confidence.', price: { amount: 110, label: 'per 4-week block' },
              slots: [{ id: 'yc-wed-1630', label: 'Wednesdays · 4:30 – 6:00 pm' }, { id: 'yc-sat-13', label: 'Saturdays · 1:00 – 2:30 pm' }] },
            { id: 'junior-studio', title: 'Junior Studio', ageMin: 10, ageMax: 17, schedule: 'Weekly · 4-week block · starts Dec 2, 2026', description: 'Bigger projects, new techniques and plenty of personal expression.', price: { amount: 120, label: 'per 4-week block' },
              slots: [{ id: 'js-wed-1830', label: 'Wednesdays · 6:30 – 8:00 pm' }, { id: 'js-sun-13', label: 'Sundays · 1:00 – 2:30 pm' }] }
          ]
        }
      ]
    },
    'beginner-painting': {
      name: 'Beginner Painting',
      parts: [
        {
          id: 'adults', label: 'Adults', kind: 'adult', ageMin: 18, ageMax: 120,
          sessions: [
            { id: 'acrylic-basics', title: 'Acrylic Basics', ageMin: 18, ageMax: 120, schedule: '3 classes · starts Dec 1, 2026', description: 'Brushes, colour mixing and your first finished canvas.', price: { amount: 120, label: 'for 3 classes' },
              slots: [{ id: 'ab-tue-19', label: 'Tuesdays · 7:00 – 9:00 pm' }, { id: 'ab-sat-14', label: 'Saturdays · 2:00 – 4:00 pm' }] },
            { id: 'colour-composition', title: 'Colour & Composition', ageMin: 18, ageMax: 120, schedule: '3 classes · starts Dec 3, 2026', description: 'Build on the basics with light, colour harmony and layout.', price: { amount: 130, label: 'for 3 classes' },
              slots: [{ id: 'cc-thu-19', label: 'Thursdays · 7:00 – 9:00 pm' }] }
          ]
        },
        {
          id: 'kids', label: 'Kids', kind: 'child', ageMin: 4, ageMax: 17,
          sessions: [
            { id: 'first-brushstrokes', title: 'First Brushstrokes', ageMin: 4, ageMax: 9, schedule: '3 classes · starts Dec 5, 2026', description: 'A gentle, fun first step into painting.', price: { amount: 75, label: 'for 3 classes' },
              slots: [{ id: 'fb-sat-10', label: 'Saturdays · 10:00 – 11:00 am' }] },
            { id: 'painting-foundations', title: 'Painting Foundations', ageMin: 10, ageMax: 17, schedule: '3 classes · starts Dec 2, 2026', description: 'Technique, colour and composition for older kids and teens.', price: { amount: 90, label: 'for 3 classes' },
              slots: [{ id: 'pf-wed-17', label: 'Wednesdays · 5:00 – 6:30 pm' }, { id: 'pf-sun-11', label: 'Sundays · 11:00 am – 12:30 pm' }] }
          ]
        }
      ]
    }
  },

  /* ------------------------------------------------------------- Private Lessons (no payment) */
  privateLessonTypes: [
    'Acrylic painting',
    'Watercolour',
    'Drawing & sketching',
    'Kids one-on-one art lesson',
    'Portfolio preparation',
    'Not sure yet — help me choose'
  ]
};
