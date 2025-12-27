const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Use a different mirror
const OVERPASS_URL = 'https://lz4.overpass-api.de/api/interpreter';

// Very small area: Battery Park / FiDi tip
const BBOX = '40.702,-74.018,40.710,-74.005';

const query = `
[out:json][timeout:30];
(
  way["highway"~"primary|secondary|tertiary|residential"](${BBOX});
);
out body;
>;
out skel qt;
`;

async function fetchData() {
    console.log(`Fetching data from ${OVERPASS_URL}...`);
    try {
        const response = await axios.post(OVERPASS_URL, `data=${encodeURIComponent(query)}`);
        const data = response.data;

        const outputDir = path.join(__dirname, '../public/data');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const outputPath = path.join(outputDir, 'manhattan.json');
        fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

        console.log(`Successfully saved data to ${outputPath}`);
    } catch (error) {
        console.error('Error fetching data:', error.message);
    }
}

fetchData();
