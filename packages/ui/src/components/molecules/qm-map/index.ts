import leafletStylesText from "leaflet/dist/leaflet.css?inline";
import { html, LitElement } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";

import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import type { PropertyValues } from "lit";

export const QM_MAP_TAG_NAME = "qm-map";

const componentStyles = createComponentStyles(`${leafletStylesText}\n${componentStylesText}`);
const CENTER_MARKER_ZOOM = 16;
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

    if (marker.address) {
      const address = document.createElement("p");
      address.textContent = marker.address;
      appendElement(content, address);
    }

    const link = document.createElement("a");
    link.className = "maps-link";
    link.href = marker.directionsHref;
    link.rel = "noreferrer";
    link.target = "_blank";

    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.classList.add("maps-link-icon");
    icon.setAttribute("aria-hidden", "true");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("fill", "none");
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-width", "1.8");
    icon.setAttribute("stroke-linecap", "round");
    icon.setAttribute("stroke-linejoin", "round");

    const pin = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pin.setAttribute("d", "M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z");
    appendElement(icon, pin);

    const center = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    center.setAttribute("cx", "12");
    center.setAttribute("cy", "10");
    center.setAttribute("r", "2.5");
    appendElement(icon, center);

    appendElement(link, icon);
    appendElement(link, document.createTextNode(this.value?.openMapsLabel ?? "Open in Google Maps"));
    appendElement(content, link);

    return content;
  }

  private async rebuildMap(): Promise<void> {
    const generation = ++this.generation;
    this.destroyMap();
    const markers = (this.value?.markers ?? []).filter((marker) => validMarker(marker));
    if (markers.length === 0 || !this.isConnected) return;
    const initialMarker = markers.find((marker) => marker.current) ?? markers[0];

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
    let initialMapMarker: LeafletMarker | undefined;
    for (const marker of markers) {
      const size = marker.current ? 20 : 16;
      const shape = document.createElement("span");
      shape.className = marker.current ? "marker-dot marker-dot--current" : "marker-dot";
      const icon = leaflet.divIcon({
        className: "qm-map-marker",
        html: shape,
        iconAnchor: [size / 2, size / 2],
        iconSize: [size, size],
        popupAnchor: [0, -(size / 2 + 8)],
      });
      const coordinate: [number, number] = [marker.latitude, marker.longitude];
      const markerLabel = marker.address ? `${marker.name}: ${marker.address}` : marker.name;
      coordinates.push(coordinate);
      const mapMarker = leaflet.marker(coordinate, {
        alt: markerLabel,
        icon,
        keyboard: true,
        riseOnHover: true,
        title: marker.name,
      });
      mapMarker.once("add", () => mapMarker.getElement()?.setAttribute("aria-label", markerLabel));
      mapMarker.addTo(map).bindPopup(this.createPopupContent(marker), {
        autoPan: false,
        closeButton: false,
        maxWidth: 240,
        minWidth: 0,
      });
      if (marker.id === initialMarker.id) initialMapMarker = mapMarker;
    }

    const currentMarker = markers.find((marker) => marker.current);
    if (currentMarker) {
      map.setView([currentMarker.latitude, currentMarker.longitude], CENTER_MARKER_ZOOM, { animate: false });
    } else if (coordinates.length === 1) {
      map.setView(coordinates[0], CENTER_MARKER_ZOOM, { animate: false });
    } else {
      map.fitBounds(leaflet.latLngBounds(coordinates), {
        animate: false,
        maxZoom: CENTER_MARKER_ZOOM,
        padding: [MULTI_MARKER_PADDING, MULTI_MARKER_PADDING],
      });
    }

    map.whenReady(() => initialMapMarker?.openPopup());

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
