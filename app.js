// Importer N3 direkte som en modul i nettleseren
import N3 from 'https://esm.sh';

// Konfigurasjon
const TTL_FILE_PATH = 'data.ttl'; // Sørg for at filnavnet matcher din Turtle-fil

// SKOS Navnerom URI-er
const SKOS = {
    Concept: 'http://w3.org',
    prefLabel: 'http://w3.org',
    altLabel: 'http://w3.org',
    definition: 'http://w3.org',
    type: 'http://w3.org'
};

let conceptsList = [];

// 1. Hent og parse Turtle-filen når siden laster
window.addEventListener('DOMContentLoaded', async () => {
    const statusEl = document.getElementById('status');
    const searchInput = document.getElementById('search-input');

    try {
        const response = await fetch(TTL_FILE_PATH);
        if (!response.ok) throw new Error(`Kunne ikke hente filen: ${response.statusText}`);
        
        const ttlText = await response.text();
        
        // Bruk N3.js til å parse tekst til tripler (quads)
        const parser = new N3.Parser();
        const store = new N3.Store();
        
        parser.parse(ttlText, (error, quad) => {
            if (error) {
                console.error(error);
                return;
            }
            if (quad) {
                store.addQuad(quad);
            } else {
                // Parsing ferdig: Indekser dataene for raskt søk
                indexConcepts(store);
                statusEl.textContent = `Katalogen er klar! Fant ${conceptsList.length} begreper.`;
                statusEl.className = '';
                searchInput.disabled = false;
                displayResults(conceptsList); // Vis alle begreper i starten
            }
        });

    } catch (err) {
        statusEl.textContent = `Feil under lasting: ${err.message}`;
        statusEl.style.color = 'red';
    }
});

// 2. Transformer RDF-tripler til en ren JavaScript-objektstruktur
function indexConcepts(store) {
    // Finn alle subjekter som er av typen skos:Concept
    const conceptQuads = store.getQuads(null, SKOS.type, SKOS.Concept, null);
    
    conceptsList = conceptQuads.map(quad => {
        const uri = quad.subject.value;
        
        // Hent ut SKOS-egenskaper for dette subjekter
        const prefLabels = store.getQuads(quad.subject, SKOS.prefLabel, null, null).map(q => q.object.value);
        const altLabels = store.getQuads(quad.subject, SKOS.altLabel, null, null).map(q => q.object.value);
        const definitions = store.getQuads(quad.subject, SKOS.definition, null, null).map(q => q.object.value);
        
        return {
            uri: uri,
            prefLabel: prefLabels[0] || 'Uten navn', // Tar den første merkelappen
            altLabels: altLabels,
            definition: definitions[0] || ''
        };
    });
}

// 3. Søkelogikk (kjører på hvert tastetrykk)
document.getElementById('search-input').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    
    if (!query) {
        displayResults(conceptsList);
        return;
    }
    
    // Filtrer listen basert på om søkeordet finnes i tittel, synonymer eller definisjon
    const filtered = conceptsList.filter(concept => {
        const matchPref = concept.prefLabel.toLowerCase().includes(query);
        const matchDef = concept.definition.toLowerCase().includes(query);
        const matchAlt = concept.altLabels.some(label => label.toLowerCase().includes(query));
        
        return matchPref || matchDef || matchAlt;
    });
    
    displayResults(filtered);
});

// 4. Rendring av resultatene til HTML
function displayResults(concepts) {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '';
    
    if (concepts.length === 0) {
        resultsContainer.innerHTML = '<p>Ingen treff funnet.</p>';
        return;
    }
    
    concepts.forEach(concept => {
        const div = document.createElement('div');
        div.className = 'concept';
        
        let altLabelsHTML = concept.altLabels.length > 0 
            ? `<p class="altLabel"><strong>Synonymer:</strong> ${concept.altLabels.join(', ')}</p>` 
            : '';
            
        let definitionHTML = concept.definition 
            ? `<p class="definition">${concept.definition}</p>` 
            : '<p class="definition" style="color:#aaa; font-style:italic;">Ingen definisjon tilgjengelig.</p>';

        div.innerHTML = `
            <div class="prefLabel">${concept.prefLabel}</div>
            ${altLabelsHTML}
            ${definitionHTML}
            <div class="uri">${concept.uri}</div>
        `;
        
        resultsContainer.appendChild(div);
    });
}
