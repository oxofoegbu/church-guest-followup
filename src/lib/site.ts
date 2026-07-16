// Run 30 — Grace Life Center public website ("the well").
// Single source of truth for the site's identity, NAP, and structured data.
// The footer, per-route metadata, sitemap, and JSON-LD all read from here so
// the name/address/times stay byte-identical everywhere (a hard SEO rule).

export const SITE = {
  name: 'Grace Life Center',
  nameLead: 'Grace Life ', // wordmark: lead + accent
  nameAccent: 'Center',
  denom: 'Charismatic Renewal Ministries',
  legalName: 'Grace Life Center Charismatic Renewal Ministries',

  // Canonical apex. The site is served here (apex → /home host rewrite);
  // every marketing route also resolves on this host.
  url: 'https://gracelifecenter.com',

  // NAP (name/address/phone) — keep identical to Google Business Profile
  // and every directory citation. Phone + public email are still TO CONFIRM.
  street: '8730 Cherry Lane, Suite A5',
  city: 'Laurel',
  region: 'MD',
  regionName: 'Maryland',
  postal: '20707',
  country: 'US',

  // Contact + entity signals — filled as they're confirmed (SEO punch-list
  // Track C). EMPTY string / empty array = OMITTED from the JSON-LD (a wrong
  // value is worse than none). Each lights up the moment it's set here — no
  // other change needed. `geo` is read off the Google Business Profile pin.
  email: 'hello@gracelifecenter.com', // public inbox (already shown on /contact)
  telephone: '+1-301-690-9060',        // church main line (Grasshopper) — schema.org / canonical
  telephoneDisplay: '(301) 690-9060',  // human-readable form shown on the site
  telephoneHref: 'tel:+13016909060',   // tap-to-call link
  geo: { lat: '', lng: '' },           // e.g. lat '39.0912', lng '-76.8446'
  sameAs: [] as readonly string[],     // ['https://facebook.com/…','https://instagram.com/…','https://youtube.com/@…']

  // Brand assets in /public — for logo/image structured data.
  logo: '/logo-full.png',
  ogImage: '/site/social-og.jpg',

  serviceDay: 'Sunday',
  serviceDayPlural: 'Sundays',
  serviceTime: '10:00 AM',
  serviceOpensISO: '10:00', // 24h, for OpeningHoursSpecification

  // Towns we serve — named naturally for local search (brief §7.4).
  areaServed: ['Laurel', 'Columbia', 'Bowie', 'Beltsville', 'Savage', 'Jessup', 'Fort Meade'],
} as const;

// Marketing routes. `exists: false` routes arrive in Runs B/C — kept here so
// the header/footer/sitemap read one list. Only `exists` routes go in the map.
export const ROUTES = {
  home: '/',
  imNew: '/im-new',
  journey: '/journey',
  teaching: '/teaching',
  about: '/about',
  gatherings: '/gatherings',
  prayer: '/prayer',
  give: '/give',
  contact: '/contact',
  // Existing track landing pages (already live).
  begin: '/begin',
  become: '/become',
  discipler: '/discipler',
  leaders: '/leaders',
} as const;

// Church / PlaceOfWorship + Organization JSON-LD for the homepage.
// Contact/geo/social are driven by the SITE fields above (blank = omitted),
// until confirmed — publishing wrong values is worse than omitting them.
export function churchJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['Church', 'PlaceOfWorship'],
        '@id': `${SITE.url}/#church`,
        name: SITE.name,
        alternateName: SITE.legalName,
        url: SITE.url,
        description:
          'A people in Laurel, Maryland learning to be with Jesus, become like Jesus, and carry heaven wherever they go — a well, not a fence. Come and see on a Sunday, or begin the journey online, anywhere.',
        slogan: 'A well, not a fence.',
        logo: `${SITE.url}${SITE.logo}`,
        image: `${SITE.url}${SITE.ogImage}`,
        ...(SITE.email ? { email: SITE.email } : {}),
        ...(SITE.telephone ? { telephone: SITE.telephone } : {}),
        ...(SITE.geo.lat && SITE.geo.lng
          ? { geo: { '@type': 'GeoCoordinates', latitude: SITE.geo.lat, longitude: SITE.geo.lng } }
          : {}),
        ...(SITE.sameAs.length > 0 ? { sameAs: SITE.sameAs } : {}),
        address: {
          '@type': 'PostalAddress',
          streetAddress: SITE.street,
          addressLocality: SITE.city,
          addressRegion: SITE.region,
          postalCode: SITE.postal,
          addressCountry: SITE.country,
        },
        openingHoursSpecification: [
          {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: 'https://schema.org/Sunday',
            opens: SITE.serviceOpensISO,
            name: 'Sunday Gathering',
          },
        ],
        areaServed: SITE.areaServed.map((n) => ({
          '@type': 'City',
          name: `${n}, Maryland`,
        })),
        parentOrganization: {
          '@type': 'Organization',
          '@id': `${SITE.url}/#crm`,
          name: SITE.denom,
        },
      },
      {
        '@type': 'Organization',
        '@id': `${SITE.url}/#crm`,
        name: SITE.denom,
        description:
          'Charismatic Renewal Ministries — a movement born of a 1980 prophetic call to prepare people for a Great Harvest. Grace Life Center is its congregation in Laurel, Maryland.',
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE.url}/#website`,
        url: SITE.url,
        name: SITE.name,
        publisher: { '@id': `${SITE.url}/#church` },
        inLanguage: 'en-US',
      },
    ],
  };
}
