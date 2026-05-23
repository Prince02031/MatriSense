"use strict";

import React, { useEffect, useState } from "react";
import {
    ComposableMap,
    Geographies,
    Geography,
    Sphere,
    Graticule
} from "react-simple-maps";
import { scaleLinear } from "d3";

// URL for the TopoJSON world atlas
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface VisitMapProps {
    stats: Record<string, number>;
}

const VisitMap: React.FC<VisitMapProps> = ({ stats }) => {
    const [maxVisits, setMaxVisits] = useState(1);

    useEffect(() => {
        const values = Object.values(stats);
        if (values.length > 0) {
            setMaxVisits(Math.max(...values));
        }
    }, [stats]);

    // Color scale for the choropleth
    // Lighter color for fewer visits, darker for more
    const colorScale = scaleLinear<string>()
        .domain([0, maxVisits])
        .range(["#D4EDE4", "#4A9B7F"]); // ProjectOdyssey green palette

    return (
        <div className="w-full bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-bold text-gray-900">My Global Footprint</h3>
                    <p className="text-sm text-gray-500">Visualizing countries you've explored</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-[#D4EDE4]"></div>
                        <span>1 Visit</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-[#4A9B7F]"></div>
                        <span>{maxVisits}+ Visits</span>
                    </div>
                </div>
            </div>

            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-slate-50">
                <ComposableMap
                    projectionConfig={{
                        rotate: [-10, 0, 0],
                        scale: 147
                    }}
                >
                    <Sphere stroke="#E4E7EB" strokeWidth={0.5} id="world-sphere" fill="transparent" />
                    <Graticule stroke="#E4E7EB" strokeWidth={0.5} />
                    <Geographies geography={geoUrl}>
                        {({ geographies }: { geographies: any[] }) =>
                            geographies.map((geo: any) => {
                                const countryName = geo.properties.name;
                                const visitCount = stats[countryName] || 0;

                                return (
                                    <Geography
                                        key={geo.rsmKey}
                                        geography={geo}
                                        fill={visitCount > 0 ? colorScale(visitCount) : "#E2E8F0"}
                                        stroke="#FFFFFF"
                                        strokeWidth={0.5}
                                        style={{
                                            default: { outline: "none" },
                                            hover: { fill: "#3d8a6d", outline: "none", cursor: "pointer" },
                                            pressed: { outline: "none" },
                                        }}
                                    />
                                );
                            })
                        }
                    </Geographies>
                </ComposableMap>
            </div>

            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-[#FFF5E9] p-4 rounded-2xl text-center">
                    <p className="text-2xl font-bold text-[#FF8C42]">{Object.keys(stats).length}</p>
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Countries</p>
                </div>
                <div className="bg-[#F0F7F4] p-4 rounded-2xl text-center">
                    <p className="text-2xl font-bold text-[#4A9B7F]">{Object.values(stats).reduce((a, b) => a + b, 0)}</p>
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Total Visits</p>
                </div>
                {/* You could add more stats like "Continent Leader" etc */}
            </div>
        </div>
    );
};

export default VisitMap;
