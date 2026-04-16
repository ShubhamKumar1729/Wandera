function initMap() {
    if (typeof L === 'undefined') {
        console.error('Leaflet library not loaded: L is undefined.');
        const mapElement = document.getElementById('map');
        if (mapElement) {
            mapElement.innerHTML = '<div style="padding: 20px; color: #333; font-weight: 700;">Map could not load. Please check your connection and try again.</div>';
            mapElement.style.backgroundColor = '#f8f9fa';
            mapElement.style.border = '1px solid #dee2e6';
        }
        return;
    }

    const listingDataElement = document.getElementById('listing-data');
    if (!listingDataElement) {
        console.error('Listing data element not found.');
        return;
    }

    let listingData;
    try {
        listingData = JSON.parse(listingDataElement.textContent);
    } catch (err) {
        console.error('Invalid listing-data JSON', err);
        return;
    }

    if (!listingData.geometry || !Array.isArray(listingData.geometry.coordinates) || listingData.geometry.coordinates.length < 2) {
        console.error('Coordinates not found or invalid format');
        return;
    }

    const [lng, lat] = listingData.geometry.coordinates;

    const map = L.map('map').setView([lat, lng], 10);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    const customIcon = L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40]
    });

    const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

    marker.bindPopup(`
        <b>${listingData.title || 'Destination'}</b><br>
        ${listingData.location || 'Unknown location'}<br>
        Estimated budget: ₹ ${Number(listingData.budget ?? listingData.price ?? 0).toLocaleString('en-IN')}
    `);

    marker.on('mouseover', () => marker.openPopup());
    marker.on('mouseout', () => marker.closePopup());
}

// Ensure DOM is ready and Leaflet loaded before initialization
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initMap();
} else {
    document.addEventListener('DOMContentLoaded', initMap);
}