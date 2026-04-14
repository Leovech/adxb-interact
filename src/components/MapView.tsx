"use client";

import { useEffect, useRef, useMemo } from "react";
import { Transaction } from "@/data/abu-dhabi";
import { formatAED, formatNumber } from "@/lib/filters";

interface MapViewProps {
  data: Transaction[];
}

const districtCoords: Record<string, [number, number]> = {
  "Al Reem Island": [54.4097, 24.4978],
  "Yas Island": [54.4883, 24.4892],
  "Al Saadiyat Island": [54.4343, 24.5427],
  "Al Reef": [54.7113, 24.3475],
  "Khalifa City": [54.5833, 24.4167],
  "Al Shamkhah": [54.6667, 24.3833],
  "Al Hidayriyyat": [54.4000, 24.4500],
  "Zayed City": [54.6000, 24.3500],
  "Al Rahah": [54.5167, 24.4550],
  "Al Bahyah": [54.5333, 24.5333],
  "Al Layyan": [54.7500, 24.3667],
  "Al Jubail Island": [54.4100, 24.5100],
  "Fahid Island": [54.3800, 24.4400],
  "Al Maryah Island": [54.3944, 24.5028],
  "Al Samhah": [54.6333, 24.3333],
  "Ghadeer Al Tayr": [54.7667, 24.3167],
  "Mohamed Bin Zayed City": [54.5167, 24.3667],
  "Bani Yas": [54.6333, 24.3167],
  "Masdar City": [54.6167, 24.4333],
  "Corniche": [54.3500, 24.4800],
};

export default function MapView({ data }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Aggregate data by district
  const districtStats = useMemo(() => {
    const stats: Record<
      string,
      { count: number; totalValue: number; rates: number[] }
    > = {};

    data.forEach((tx) => {
      if (!tx.district) return;
      if (!stats[tx.district]) {
        stats[tx.district] = { count: 0, totalValue: 0, rates: [] };
      }
      stats[tx.district].count++;
      stats[tx.district].totalValue += tx.price;
      if (tx.ratePerSqft > 0) {
        stats[tx.district].rates.push(tx.ratePerSqft);
      }
    });

    return stats;
  }, [data]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    import("maplibre-gl").then((maplibregl) => {
      import("maplibre-gl/dist/maplibre-gl.css");

      const map = new maplibregl.Map({
        container: mapContainer.current!,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: [
                "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
              ],
              tileSize: 256,
              attribution: "&copy; CARTO",
            },
          },
          layers: [
            {
              id: "osm",
              type: "raster",
              source: "osm",
            },
          ],
        },
        center: [54.5, 24.45],
        zoom: 10,
        maxZoom: 16,
        minZoom: 8,
      });

      map.addControl(new maplibregl.NavigationControl(), "top-right");

      map.on("load", () => {
        // Add markers for each district with known coordinates
        Object.entries(districtStats).forEach(([district, stat]) => {
          const coords = districtCoords[district];
          if (!coords) return;

          const size = Math.min(60, Math.max(24, Math.sqrt(stat.count) * 3));
          const avgRate =
            stat.rates.length > 0
              ? Math.round(
                  stat.rates.reduce((a, b) => a + b, 0) / stat.rates.length
                )
              : 0;

          const el = document.createElement("div");
          el.className = "district-marker";
          el.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            background: radial-gradient(circle, rgba(196,160,78,0.8) 0%, rgba(196,160,78,0.2) 70%, transparent 100%);
            border: 2px solid rgba(196,160,78,0.9);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform 0.2s;
            font-size: 10px;
            font-weight: 700;
            color: #fff;
          `;
          el.textContent =
            stat.count > 999
              ? `${(stat.count / 1000).toFixed(1)}k`
              : String(stat.count);

          el.addEventListener("mouseenter", () => {
            el.style.transform = "scale(1.2)";
          });
          el.addEventListener("mouseleave", () => {
            el.style.transform = "scale(1)";
          });

          const popup = new maplibregl.Popup({
            offset: 15,
            closeButton: false,
            maxWidth: "260px",
          }).setHTML(`
            <div style="background:#222d30;color:#f1decb;padding:12px;border-radius:8px;font-family:system-ui;border:1px solid #374144;">
              <div style="font-size:14px;font-weight:700;color:#c4a04e;margin-bottom:6px;">${district}</div>
              <div style="font-size:12px;color:#b0aca7;line-height:1.7;">
                <div><b>${formatNumber(stat.count)}</b> transactions</div>
                <div>Total: <b>${formatAED(stat.totalValue)}</b></div>
                <div>Avg: <b>AED ${formatNumber(avgRate)}</b>/sqft</div>
              </div>
            </div>
          `);

          new maplibregl.Marker({ element: el })
            .setLngLat(coords)
            .setPopup(popup)
            .addTo(map);
        });
      });

      mapRef.current = map;
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [districtStats]);

  return (
    <div
      className="rounded-xl border border-card-border bg-card-bg overflow-hidden"
      id="map"
    >
      <div className="border-b border-card-border px-5 py-4">
        <h2 className="text-sm font-semibold text-foreground">
          Abu Dhabi Real Estate Map
        </h2>
        <p className="text-xs text-muted">
          Transaction hotspots by district - click markers for details
        </p>
      </div>
      <div ref={mapContainer} className="h-[450px] w-full" />
    </div>
  );
}
