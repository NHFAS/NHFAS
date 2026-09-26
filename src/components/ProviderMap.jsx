import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const ProviderMap = () => {
  const [position, setPosition] = useState(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition([pos.coords.latitude, pos.coords.longitude]);
        },
        (error) => {
          console.error("Error getting location:", error);
          // Fallback location if permission denied or error
          setPosition([9.0227, 38.7468]); // Addis Ababa fallback
        }
      );
    } else {
      setPosition([9.0227, 38.7468]); // Fallback
    }
  }, []);

  if (!position) {
    return (
      <div className="h-96 w-full flex items-center justify-center rounded-2xl border border-slate-300 shadow-sm bg-slate-50 text-slate-500 z-0 relative">
        <p>Locating you...</p>
      </div>
    );
  }

  return (
    <div className="h-96 w-full rounded-2xl overflow-hidden border border-slate-300 shadow-sm z-0 relative">
      <MapContainer center={position} zoom={13} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position}>
          <Popup>
            You are here.
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default ProviderMap;
