/**
 * Google Maps adapter for the locator block: loads the Maps JavaScript API and
 * provides the map (pins, clusters, search radius), address lookup and location
 * suggestions. Everything Google-specific lives here, so the map provider can
 * be swapped without touching the list and filters in locator.js.
 *
 * The API key needs the Maps JavaScript API, Places API (New) and Geocoding API
 * enabled, and should be restricted to the site's domains (HTTP referrers).
 */
import { loadScript } from '../../scripts/aem.js';

const CLUSTERER = '/deps/markerclusterer/markerclusterer.min.js';
const CALLBACK = 'locatorGoogleMapsReady';
const SELECT_ZOOM = 15;
const MAX_FIT_ZOOM = 14;
const PIN_PATH = 'M11 0C4.9 0 0 4.9 0 11c0 8.2 11 16 11 16s11-7.8 11-16C22 4.9 17.1 0 11 0z';
const PIN = `<svg viewBox="0 0 22 27" aria-hidden="true" focusable="false"><path d="${PIN_PATH}"/><circle cx="11" cy="11" r="4.5"/></svg>`;

// muted grey map like the 3M Schweiz locator; used when no map ID is set
// (with a map ID, the style comes from the map's cloud styling instead)
const STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#f0f0f0' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6b6b6b' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#c9c9c9' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#e1e1e1' }] },
  { featureType: 'road.local', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#d5dce2' }] },
];

const authListeners = new Set();
let mapsPromise;

/**
 * Loads the Maps JavaScript API once per page.
 * @param {{ key: string, language?: string, region?: string }} options
 * @returns {Promise<object>} the `google.maps` namespace
 */
export function loadGoogleMaps({ key, language, region }) {
  if (!mapsPromise) {
    mapsPromise = new Promise((resolve, reject) => {
      window[CALLBACK] = () => resolve(window.google.maps);
      // Google calls this when the key is invalid or not allowed for this site
      window.gm_authFailure = () => authListeners.forEach((fn) => fn());
      const params = new URLSearchParams({
        key, v: 'weekly', loading: 'async', callback: CALLBACK,
      });
      if (language) params.set('language', language);
      if (region) params.set('region', region.toUpperCase());
      loadScript(`https://maps.googleapis.com/maps/api/js?${params}`).catch(reject);
    });
    mapsPromise.catch(() => { mapsPromise = null; });
  }
  return mapsPromise;
}

/** Looks up a ZIP, city or address. Resolves to { lat, lon } or null. */
export async function geocodeAddress(maps, query, { country } = {}) {
  const { Geocoder } = await maps.importLibrary('geocoding');
  try {
    const { results } = await new Geocoder().geocode({
      address: query,
      ...(country ? { componentRestrictions: { country } } : {}),
    });
    // with a country restriction, unknown places come back as the whole country
    const hit = results.find((r) => !r.types?.includes('country'));
    const location = hit?.geometry?.location;
    return location ? { lat: location.lat(), lon: location.lng() } : null;
  } catch (e) {
    if (e.code === 'ZERO_RESULTS') return null;
    throw e;
  }
}

/**
 * Location suggestions while typing (Places API (New)). Resolves to null when
 * the Places library isn't available for the key.
 * @returns {Promise<{ suggest: Function, resolve: Function }|null>}
 */
export async function createSuggester(maps, { country, language } = {}) {
  const places = await maps.importLibrary('places');
  if (!places.AutocompleteSuggestion) return null;
  let token = new places.AutocompleteSessionToken();
  let bias = null;
  return {
    /** Ranks suggestions near this point ({ lat, lon }), e.g. the current search location. */
    setBias(point) {
      bias = point;
    },
    async suggest(input) {
      const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        sessionToken: token,
        // places to search from, not businesses or landmarks
        includedPrimaryTypes: ['locality', 'postal_code', 'sublocality', 'route', 'street_address'],
        ...(country ? { includedRegionCodes: [country] } : {}),
        ...(bias ? {
          locationBias: { center: { lat: bias.lat, lng: bias.lon }, radius: 50000 },
        } : {}),
        ...(language ? { language } : {}),
      });
      return suggestions
        .filter((s) => s.placePrediction)
        .slice(0, 5)
        .map((s) => ({ text: s.placePrediction.text.toString(), prediction: s.placePrediction }));
    },
    async resolve({ prediction }) {
      const place = prediction.toPlace();
      await place.fetchFields({ fields: ['location'] });
      // a session ends with the place lookup
      token = new places.AutocompleteSessionToken();
      return { lat: place.location.lat(), lon: place.location.lng() };
    },
  };
}

function svgUrl(svg) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/**
 * Creates the map. With a map ID it uses advanced markers (HTML pins styled in
 * locator.css); without one it uses classic markers and the grey STYLES above.
 * @param {object} maps the `google.maps` namespace
 * @param {Element} container map element
 * @param {object} options { onSelect(id), mapId, listWidth, onAuthError }
 */
export async function createMap(maps, container, {
  onSelect, mapId, listWidth = 0, onAuthError,
}) {
  if (onAuthError) authListeners.add(onAuthError);
  const [{ Map: GoogleMap, Circle }, core, markerLib] = await Promise.all([
    maps.importLibrary('maps'),
    maps.importLibrary('core'),
    maps.importLibrary('marker'),
  ]);
  const {
    LatLngBounds, ControlPosition, Size, Point, SymbolPath, event,
  } = core;
  const advanced = !!(mapId && markerLib.AdvancedMarkerElement);

  const map = new GoogleMap(container, {
    center: { lat: 39.8, lng: -98.6 },
    zoom: 4,
    ...(advanced ? { mapId } : { styles: STYLES }),
    disableDefaultUI: true,
    zoomControl: true,
    zoomControlOptions: { position: ControlPosition.RIGHT_BOTTOM },
    // inline on the page: zoom with ctrl/cmd + scroll, so the page still scrolls
    gestureHandling: 'cooperative',
    clickableIcons: false,
  });

  // 3M red pins, clusters and search radius (set in locator.css)
  const accent = getComputedStyle(container).getPropertyValue('--locator-pin').trim() || '#f00';
  const pinIcon = (active) => {
    const [w, h] = active ? [42, 52] : [22, 27];
    return {
      url: svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 27"><path fill="${accent}" d="${PIN_PATH}"/><circle fill="#fff" cx="11" cy="11" r="4.5"/></svg>`),
      scaledSize: new Size(w, h),
      anchor: new Point(w / 2, h),
    };
  };
  const clusterIcon = {
    url: svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="${accent}" stroke="#fff" stroke-width="2"/></svg>`),
    scaledSize: new Size(40, 40),
    anchor: new Point(20, 20),
  };

  function makePin(d) {
    const position = { lat: d.lat, lng: d.lon };
    if (advanced) {
      const content = document.createElement('div');
      content.className = 'locator-pin';
      content.innerHTML = PIN;
      const marker = new markerLib.AdvancedMarkerElement({
        position, content, title: d.name, gmpClickable: true,
      });
      marker.addEventListener('gmp-click', () => onSelect(d.id, 'map'));
      return {
        marker,
        position,
        setActive(on) {
          content.classList.toggle('is-active', on);
          marker.zIndex = on ? 1000 : null;
        },
      };
    }
    const marker = new markerLib.Marker({
      position, title: d.name, icon: pinIcon(false), optimized: false,
    });
    marker.addListener('click', () => onSelect(d.id, 'map'));
    return {
      marker,
      position,
      setActive(on) {
        marker.setIcon(pinIcon(on));
        marker.setZIndex(on ? 1000 : undefined);
      },
    };
  }

  function makeCluster({ count, position }) {
    if (advanced) {
      const content = document.createElement('div');
      content.className = 'locator-cluster';
      content.textContent = count;
      return new markerLib.AdvancedMarkerElement({
        position, content, zIndex: 900, title: String(count),
      });
    }
    return new markerLib.Marker({
      position,
      icon: clusterIcon,
      zIndex: 900,
      title: String(count),
      label: {
        text: String(count), color: '#fff', fontSize: '14px', fontWeight: '700',
      },
    });
  }

  // group nearby pins; without the clusterer, pins go straight on the map
  let clusterer = null;
  try {
    await loadScript(CLUSTERER);
    const { MarkerClusterer, SuperClusterAlgorithm } = window.markerClusterer;
    clusterer = new MarkerClusterer({
      map,
      algorithm: new SuperClusterAlgorithm({ radius: 60, maxZoom: SELECT_ZOOM - 2 }),
      renderer: { render: makeCluster },
    });
  } catch (e) {
    clusterer = null;
  }
  const show = (marker, on) => {
    if (advanced) marker.map = on ? map : null;
    else marker.setMap(on ? map : null);
  };

  const pins = new Map();
  let origin = null;
  let circle = null;
  let activeId = null;
  let lastFit = null;

  // the list covers the left of the map, so keep pins clear of it
  const leftPad = () => (container.closest('.is-list-view') ? 0 : listWidth);

  function centerOn(position, zoom) {
    map.setZoom(zoom);
    map.setCenter(position);
    map.panBy(-leftPad() / 2, 0);
  }

  function fitBounds(bounds) {
    map.fitBounds(bounds, {
      top: 48, right: 64, bottom: 48, left: leftPad() + 32,
    });
    event.addListenerOnce(map, 'idle', () => {
      if (map.getZoom() > MAX_FIT_ZOOM) map.setZoom(MAX_FIT_ZOOM);
    });
  }

  const api = {
    setDealers(dealers) {
      if (clusterer) clusterer.clearMarkers();
      else pins.forEach((p) => show(p.marker, false));
      pins.clear();
      activeId = null;
      dealers.filter((d) => d.lat !== null).forEach((d) => pins.set(d.id, makePin(d)));
      const markers = [...pins.values()].map((p) => p.marker);
      if (clusterer) clusterer.addMarkers(markers);
      else markers.forEach((m) => show(m, true));
    },
    setOrigin(point, radiusMiles) {
      if (origin) show(origin, false);
      if (circle) circle.setMap(null);
      origin = null;
      circle = null;
      if (!point) return;
      const center = { lat: point.lat, lng: point.lon };
      circle = new Circle({
        map,
        center,
        radius: radiusMiles * 1609.344,
        strokeColor: accent,
        strokeOpacity: 0.5,
        strokeWeight: 1,
        fillColor: accent,
        fillOpacity: 0.04,
        clickable: false,
      });
      if (advanced) {
        const content = document.createElement('div');
        content.className = 'locator-origin';
        origin = new markerLib.AdvancedMarkerElement({ position: center, content, map });
      } else {
        origin = new markerLib.Marker({
          position: center,
          map,
          clickable: false,
          icon: {
            path: SymbolPath.CIRCLE,
            scale: 7,
            fillColor: '#202024',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 3,
          },
        });
      }
    },
    select(id) {
      pins.get(activeId)?.setActive(false);
      activeId = id;
      const pin = pins.get(id);
      if (!pin) return;
      pin.setActive(true);
      centerOn(pin.position, Math.max(map.getZoom(), SELECT_ZOOM));
    },
    // `area` frames the whole search radius too, e.g. after widening it
    fit(dealers, point, { area = false } = {}) {
      lastFit = [dealers, point, { area }];
      const points = dealers.filter((d) => d.lat !== null).map((d) => ({ lat: d.lat, lng: d.lon }));
      if (point) points.push({ lat: point.lat, lng: point.lon });
      if (points.length < 2) {
        // nothing (or only the search location) to show: frame the search radius
        if (circle) fitBounds(circle.getBounds());
        else if (points.length) centerOn(points[0], 13);
        return;
      }
      const bounds = area && circle ? circle.getBounds() : new LatLngBounds();
      points.forEach((p) => bounds.extend(p));
      fitBounds(bounds);
    },
    resize() {
      if (lastFit) api.fit(...lastFit);
    },
  };

  // the block can be built while its section is still hidden: once the map
  // gets a size, repeat the last fit
  let wasHidden = !container.clientWidth;
  new ResizeObserver(() => {
    if (!container.clientWidth) {
      wasHidden = true;
      return;
    }
    if (wasHidden && lastFit) api.fit(...lastFit);
    wasHidden = false;
  }).observe(container);

  return api;
}
