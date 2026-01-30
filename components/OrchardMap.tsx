import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet icon not found
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// --- TYPES ---
interface Location {
    lat: number;
    lng: number;
}

interface BlockData {
    id: string;
    name: string;
    boundary: Location[];
    color: string;
}

interface WorkerMarker {
    id: string;
    name: string;
    role: string;
    position: Location;
}

interface OrchardMapProps {
    blocks?: BlockData[];
    workers?: WorkerMarker[];
    center?: Location;
    zoom?: number;
    height?: string;
}

// --- MOCK DATA ---
const MOCK_BLOCKS: BlockData[] = [
    {
        id: 'B1',
        name: 'Block 4B',
        boundary: [
            { lat: -45.0395, lng: 169.1985 },
            { lat: -45.0395, lng: 169.2005 },
            { lat: -45.0410, lng: 169.2005 },
            { lat: -45.0410, lng: 169.1985 },
        ],
        color: '#d91e36',
    },
    {
        id: 'B2',
        name: 'Block 2A',
        boundary: [
            { lat: -45.0415, lng: 169.1985 },
            { lat: -45.0415, lng: 169.2005 },
            { lat: -45.0430, lng: 169.2005 },
            { lat: -45.0430, lng: 169.1985 },
        ],
        color: '#3b82f6',
    },
];

const DEFAULT_CENTER = { lat: -45.0402, lng: 169.1995 };

// --- SUBCOMPONENTS ---
const MapRecenter = ({ center }: { center: Location }) => {
    const map = useMap();
    useEffect(() => {
        map.setView([center.lat, center.lng]);
    }, [center, map]);
    return null;
};

// --- MAIN COMPONENT ---
const OrchardMap: React.FC<OrchardMapProps> = ({
    blocks = MOCK_BLOCKS,
    workers = [],
    center = DEFAULT_CENTER,
    zoom = 16,
    height = '300px'
}) => {
    return (
        <div style={{ height, width: '100%', borderRadius: '1rem', overflow: 'hidden', border: '2px solid #e5e7eb' }}>
            <MapContainer
                center={[center.lat, center.lng]}
                zoom={zoom}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapRecenter center={center} />

                {/* Render Blocks */}
                {blocks.map(block => (
                    <Polygon
                        key={block.id}
                        positions={block.boundary.map(p => [p.lat, p.lng])}
                        pathOptions={{ color: block.color, fillOpacity: 0.2 }}
                    >
                        <Popup>{block.name}</Popup>
                    </Polygon>
                ))}

                {/* Render Workers */}
                {workers.map(worker => (
                    <Marker
                        key={worker.id}
                        position={[worker.position.lat, worker.position.lng]}
                    >
                        <Popup>
                            <strong>{worker.name}</strong><br />
                            {worker.role}
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
};

export default OrchardMap;
