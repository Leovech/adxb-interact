"use client";

import { useEffect, useRef, useMemo } from "react";
import { areas, Transaction } from "@/data/abu-dhabi";
import { formatAED, formatNumber } from "@/lib/filters";

interface MapViewProps {
  data: Transaction[];
}

export default function MapView({ data }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Aggregate data by area
  const areaStats = useMemo(() => {
    const stats: Record<
      string,
      { count: number; totalValue: number; avgPPSF: number; prices: number[] }
    > = {};
    data.forEach((tx) => {
      if (!stats[tx.areaId]) {
        stats[tx.areaId] = { count: 0, totalValue: 0, avgPPSF: 0, prices: [] };
      }
      stats[tx.areaId].count++;
      stats[tx.areaId].totalValue += tx.price;
      if (tx.transactionType !== "Rental") {
        stats[tx.areaId].prices.push(tx.pricePerSqft);
      }
    });
    Object.values(stats).forEach((s) => {
      s.avgPPSF =
        s.prices.length > 0
          ? Math.round(s.prices.reduce((a, b) => a + b, 0) / s.prices.length)
          : 0;
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
        // Add markers for each area
        areas.forEach((area) => {
          const stat = areaStats[area.id];
          if (!stat) return;

          const size = Math.min(60, Math.max(24, Math.sqrt(stat.count) * 3));

          const el = document.createElement("div");
          el.className = "area-marker";
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
          el.textContent = stat.count > 999 ? `${(stat.count / 1000).toFixed(1)}k` : String(stat.count);
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
              <div style="font-size:14px;font-weight:700;color:#c4a04e;margin-bottom:6px;">${area.name}</div>
              <div style="font-size:12px;color:#b0aca7;line-height:1.7;">
                <div><b>${formatNumber(stat.count)}</b> transactions</div>
                <div>Total: <b>${formatAED(stat.totalValue)}</b></div>
                <div>Avg: <b>AED ${formatNumber(stat.avgPPSF)}</b>/sqft</div>
              </div>
            </div>
          `);

          new maplibregl.Marker({ element: el })
            .setLngLat([area.lng, area.lat])
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
  }, [areaStats]);

  return (
    <div className="rounded-xl border border-card-border bg-card-bg overflow-hidden" id="map">
      <div className="border-b border-card-border px-5 py-4">
        <h2 className="text-sm font-semibold text-foreground">
          Abu Dhabi Real Estate Map
        </h2>
        <p className="text-xs text-muted">
          Transaction hotspots by area - click markers for details
        </p>
      </div>
      <div ref={mapContainer} className="h-[450px] w-full" />
    </div>
  );
}
