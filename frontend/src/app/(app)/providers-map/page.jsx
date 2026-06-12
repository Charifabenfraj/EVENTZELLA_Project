"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fetchProvidersMap } from "@/lib/enterpriseApi";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";
import { MapPin } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });

const MAP_CENTER = [34.5, 9.3];
const MAP_ZOOM = 6.2;

export default function ProvidersMapPage() {
  const [providers, setProviders] = useState([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState("");

  useEffect(() => {
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: markerIcon2x.src,
      iconUrl: markerIcon.src,
      shadowUrl: markerShadow.src,
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchProvidersMap()
      .then((data) => {
        setProviders(Array.isArray(data.providers) ? data.providers : []);
        setSource(data.source || "");
        setError("");
      })
      .catch((err) => setError(err.message || "Unable to load providers."))
      .finally(() => setLoading(false));
  }, []);

  const filteredProviders = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return providers;
    }
    return providers.filter((item) => {
      const name = String(item.name || "").toLowerCase();
      const city = String(item.city || "").toLowerCase();
      return name.includes(q) || city.includes(q);
    });
  }, [providers, query]);

  const cityGroups = useMemo(() => {
    const map = new Map();
    filteredProviders.forEach((item) => {
      if (item.lat == null || item.lng == null) {
        return;
      }
      const city = item.city || "Unknown";
      if (!map.has(city)) {
        map.set(city, { city, lat: item.lat, lng: item.lng, providers: [] });
      }
      map.get(city).providers.push(item.name || "Unknown Provider");
    });
    return Array.from(map.values());
  }, [filteredProviders]);

  return (
    <div className="space-y-6">
      <header className="border-b border-border pb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Operations geo</p>
        <h1 className="font-display text-4xl text-foreground mt-2">Carte des providers en Tunisie</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Visualise les villes couvertes et les prestataires disponibles. Filtre par nom ou ville.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filtrer par provider ou ville"
          className="w-full max-w-md"
        />
        {source && (
          <span className="text-xs text-muted-foreground">Source: {source}</span>
        )}
      </div>

      {loading && <p className="text-sm text-muted-foreground">Chargement de la carte...</p>}
      {error && <p className="text-sm text-danger">{error}</p>}

      {!loading && !error && (
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <Card className="p-4">
            <div className="providers-map">
              <MapContainer center={MAP_CENTER} zoom={MAP_ZOOM} scrollWheelZoom>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                {cityGroups.map((group) => (
                  <Marker key={group.city} position={[group.lat, group.lng]}>
                    <Popup>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 font-semibold">
                          <MapPin size={16} />
                          <span>{group.city}</span>
                        </div>
                        <ul className="space-y-1 text-sm">
                          {group.providers.slice(0, 8).map((name) => (
                            <li key={`${group.city}-${name}`}>{name}</li>
                          ))}
                          {group.providers.length > 8 && (
                            <li className="text-muted-foreground">+{group.providers.length - 8} autres</li>
                          )}
                        </ul>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-lg font-semibold">Providers</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {filteredProviders.length} resultats
            </p>
            <div className="providers-list">
              {filteredProviders.map((item, index) => (
                <div key={`${item.name}-${index}`} className="provider-row">
                  <div>
                    <p className="font-semibold">{item.name || "Unknown Provider"}</p>
                    <p className="text-xs text-muted-foreground">{item.city || "Unknown city"}</p>
                  </div>
                  <MapPin size={16} className="text-muted-foreground" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
