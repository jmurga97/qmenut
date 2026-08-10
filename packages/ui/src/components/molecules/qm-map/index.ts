import leafletStylesText from "leaflet/dist/leaflet.css?inline";
import { html, LitElement } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";

import type { Map as LeafletMap } from "leaflet";
import type { PropertyValues } from "lit";

export const QM_MAP_TAG_NAME = "qm-map";

const componentStyles = createComponentStyles(`${leafletStylesText}\n${componentStylesText}`);
const SINGLE_MARKER_ZOOM = 16;
const MULTI_MARKER_PADDING = 40;

export interface QmMapMarkerValue {
  address: string;
  current: boolean;
  directionsHref: string;
  id: string;
  latitude: number;
  longitude: number;
  name: string;
}

export interface QmMapValue {
  ariaLabel: string;
  markers: QmMapMarkerValue[];
  openMapsLabel: string;
}

function validMarker(marker: QmMapMarkerValue): boolean {
  return (
    Number.isFinite(marker.latitude) &&
    marker.latitude >= -90 &&
    marker.latitude <= 90 &&
    Number.isFinite(marker.longitude) &&
    marker.longitude >= -180 &&
    marker.longitude <= 180
  );
}

function appendElement(parent: Node, child: Node): void {
  // `Element.append` conflicts with Cloudflare's generated `append(BodyInit)` declaration.
  // eslint-disable-next-line unicorn/prefer-dom-node-append
  parent.appendChild(child);
}

export class QmMap extends LitElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ attribute: false })
  value?: QmMapValue;

  private generation = 0;
  private map?: LeafletMap;
  private resizeObserver?: ResizeObserver;

  connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated) void this.rebuildMap();
  }

  protected updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);
    if (changedProperties.has("value")) void this.rebuildMap();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.generation += 1;
    this.destroyMap();
  }

  private destroyMap(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    this.map?.remove();
    this.map = undefined;
  }

  private createPopupContent(marker: QmMapMarkerValue): HTMLElement {
    const content = document.createElement("div");
    content.className = "marker-popup";

    const name = document.createElement("strong");
    name.textContent = marker.name;
    appendElement(content, name);

    if (marker.address) {
      const address = document.createElement("p");
      address.textContent = marker.address;
      appendElement(content, address);
    }

    const link = document.createElement("a");
    link.href = marker.directionsHref;
    link.rel = "noreferrer";
    link.target = "_blank";
    link.textContent = this.value?.openMapsLabel ?? "Open in Google Maps";
    appendElement(content, link);

    return content;
  }

  private async rebuildMap(): Promise<void> {
    const generation = ++this.generation;
    this.destroyMap();
    const markers = (this.value?.markers ?? []).filter((marker) => validMarker(marker));
    if (markers.length === 0 || !this.isConnected) return;

    const leaflet = await import("leaflet");
    if (generation !== this.generation || !this.isConnected) return;

    const container = this.renderRoot.querySelector<HTMLElement>(".map");
    if (!container) return;

    const map = leaflet.map(container, {
      attributionControl: true,
      boxZoom: false,
      doubleClickZoom: false,
      dragging: false,
      fadeAnimation: false,
      keyboard: false,
      markerZoomAnimation: false,
      scrollWheelZoom: false,
      touchZoom: false,
      zoomAnimation: false,
      zoomControl: false,
    });
    this.map = map;

    leaflet
      .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      })
      .addTo(map);

    const coordinates: [number, number][] = [];
    for (const marker of markers) {
      const size = marker.current ? 42 : 34;
      const shape = document.createElement("span");
      shape.className = marker.current ? "marker-shape marker-shape--current" : "marker-shape";
      const icon = leaflet.divIcon({
        className: "qm-map-marker",
        html: shape,
        iconAnchor: [size / 2, size],
        iconSize: [size, size],
        popupAnchor: [0, size + 28],
      });
      const coordinate: [number, number] = [marker.latitude, marker.longitude];
      coordinates.push(coordinate);
      leaflet
        .marker(coordinate, {
          alt: `${marker.name}: ${marker.address}`,
          icon,
          keyboard: true,
          riseOnHover: true,
          title: marker.name,
        })
        .addTo(map)
        .bindPopup(this.createPopupContent(marker), {
          autoPan: false,
          closeButton: true,
          maxWidth: 240,
          minWidth: 190,
        });
    }

    if (coordinates.length === 1) {
      map.setView(coordinates[0], SINGLE_MARKER_ZOOM, { animate: false });
    } else {
      map.fitBounds(leaflet.latLngBounds(coordinates), {
        animate: false,
        maxZoom: SINGLE_MARKER_ZOOM,
        padding: [MULTI_MARKER_PADDING, MULTI_MARKER_PADDING],
      });
    }

    this.resizeObserver = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    this.resizeObserver.observe(container);
  }

  render() {
    return html`<div class="map" role="region" aria-label=${this.value?.ariaLabel ?? ""}></div>`;
  }
}

export function defineQmMap() {
  if (!customElements.get(QM_MAP_TAG_NAME)) {
    customElements.define(QM_MAP_TAG_NAME, QmMap);
  }
}

export type QmMapArgs = Partial<Pick<QmMap, "value">>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-map": QmMap;
  }
}
