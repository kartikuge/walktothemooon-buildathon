import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Polyline, Marker, useMap, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { MapGeometry } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

// Fix leaflet icon issue in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const progressIcon = new L.Icon({
  iconUrl: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjZjU5ZTBiIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIvPjwvc3ZnPg==",
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const originIcon = new L.Icon({
  iconUrl: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjMBarMmY2IiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI4Ii8+PC9zdmc+",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const destIcon = new L.Icon({
  iconUrl: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjMTA4NTQ4IiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI4Ii8+PC9zdmc+",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Calculate distance between two lat/lon points
function getDistance(p1: [number, number], p2: [number, number]) {
  const R = 6371e3; // metres
  const φ1 = p1[0] * Math.PI / 180;
  const φ2 = p2[0] * Math.PI / 180;
  const Δφ = (p2[0] - p1[0]) * Math.PI / 180;
  const Δλ = (p2[1] - p1[1]) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Interpolate along a polyline to find the coordinate at a specific fraction
function getInterpolatedPoint(coords: [number, number][], fraction: number): [number, number] {
  if (coords.length === 0) return [0, 0];
  if (fraction <= 0) return coords[0];
  if (fraction >= 1) return coords[coords.length - 1];

  let totalDist = 0;
  const segments = [];
  for (let i = 0; i < coords.length - 1; i++) {
    const d = getDistance(coords[i], coords[i + 1]);
    segments.push(d);
    totalDist += d;
  }

  const targetDist = totalDist * fraction;
  let currentDist = 0;

  for (let i = 0; i < segments.length; i++) {
    const segDist = segments[i];
    if (currentDist + segDist >= targetDist) {
      // Point is in this segment
      const segFraction = (targetDist - currentDist) / segDist;
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const lat = p1[0] + (p2[0] - p1[0]) * segFraction;
      const lon = p1[1] + (p2[1] - p1[1]) * segFraction;
      return [lat, lon];
    }
    currentDist += segDist;
  }
  
  return coords[coords.length - 1];
}

function BoundsFitter({ coords }: { coords: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (coords && coords.length > 0) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 14 });
    }
  }, [coords, map]);
  return null;
}

interface InteractiveMapProps {
  geometry?: MapGeometry;
  fraction?: number; // 0 to 1
  className?: string;
}

export function InteractiveMap({ geometry, fraction = 0, className = "h-64" }: InteractiveMapProps) {
  const [error, setError] = useState(false);
  
  useEffect(() => {
    setError(false);
  }, [geometry]);

  const coords = useMemo(() => {
    if (!geometry?.coordinates) return null;
    return geometry.coordinates as [number, number][];
  }, [geometry]);

  const unwrappedCoords = useMemo(() => {
    if (!coords || coords.length === 0) return [];
    const unwrapped: [number, number][] = [coords[0]];
    for (let i = 1; i < coords.length; i++) {
      let lon = coords[i][1];
      const prevLon = unwrapped[i - 1][1];
      while (lon - prevLon > 180) lon -= 360;
      while (prevLon - lon > 180) lon += 360;
      unwrapped.push([coords[i][0], lon]);
    }
    return unwrapped;
  }, [coords]);

  const progressPoint = useMemo(() => {
    if (!unwrappedCoords || unwrappedCoords.length < 2) return null;
    return getInterpolatedPoint(unwrappedCoords, fraction);
  }, [unwrappedCoords, fraction]);

  if (!geometry || !coords || coords.length === 0) {
    return (
      <div className={`bg-secondary/50 rounded-2xl border border-dashed border-border flex flex-col items-center justify-center p-6 text-center ${className}`}>
        <div className="text-4xl mb-2 opacity-50">🗺️</div>
        <p className="text-sm font-medium text-muted-foreground">Map view unavailable for this route.</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Virtual tracking relies on schematic distance.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-secondary/50 rounded-2xl border border-dashed border-border flex flex-col items-center justify-center p-6 text-center ${className}`}>
        <div className="text-4xl mb-2 opacity-50">🗺️</div>
        <p className="text-sm font-medium text-muted-foreground mb-2">Map tiles temporarily unavailable.</p>
        <Button variant="outline" size="sm" onClick={() => setError(false)}><RefreshCw size={14} className="mr-2"/> Retry Map</Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className={`relative rounded-2xl overflow-hidden shadow-sm border border-border z-0 ${className}`}>
        <MapContainer
          zoom={13}
          scrollWheelZoom={false}
          className="w-full h-full"
          style={{ zIndex: 0 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            keepBuffer={0}
            eventHandlers={{
              tileerror: () => setError(true)
            }}
          />
          <BoundsFitter coords={unwrappedCoords} />
          
          {unwrappedCoords.length > 1 && (
            <Polyline 
              positions={unwrappedCoords} 
              pathOptions={{ color: 'hsl(var(--primary))', weight: 4, opacity: 0.8 }} 
            />
          )}

          {unwrappedCoords.length === 1 && (
            <Marker position={unwrappedCoords[0]} icon={originIcon}>
              <Popup className="font-sans font-bold text-xs uppercase">Event Location</Popup>
            </Marker>
          )}

          {geometry.origin && (
            <Marker position={[geometry.origin.latitude, geometry.origin.longitude]} icon={originIcon}>
              <Popup className="font-sans font-bold text-xs uppercase">{geometry.origin.name}</Popup>
            </Marker>
          )}

          {geometry.destination && (
            <Marker position={[geometry.destination.latitude, geometry.destination.longitude]} icon={destIcon}>
              <Popup className="font-sans font-bold text-xs uppercase">{geometry.destination.name}</Popup>
            </Marker>
          )}

          {progressPoint && fraction > 0 && fraction < 1 && (
            <Marker position={progressPoint} icon={progressIcon}>
              <Popup className="font-sans font-bold text-xs uppercase">Current Progress: {(fraction * 100).toFixed(1)}%</Popup>
            </Marker>
          )}
        </MapContainer>
        
        <div className="absolute bottom-2 left-2 z-10 bg-background/80 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-mono border border-border shadow-sm">
          {geometry.mode.toUpperCase()}
        </div>
      </div>
      
      {(geometry.description || geometry.attribution) && (
        <div className="px-2 space-y-1">
          {geometry.description && (
            <p className="text-xs text-foreground font-medium">
              <span className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground mr-1">Route Info:</span> 
              {geometry.description}
            </p>
          )}
          {geometry.attribution && (
            <p className="text-[10px] text-muted-foreground/60 leading-tight">
              {geometry.attribution}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
