// Importer N3.js som en ES-modul direkte fra CDN
import { Store, Parser } from 'https://unpkg.com';

export async function loadProductModule(globalStore) {
  // Hvis du ikke sender inn et globalt lager, oppretter vi et lokalt et
  const store = globalStore || new Store();
  const parser = new Parser({ format: 'text/turtle' });

  try {
    // 1. Hent Turtle-filen fra relativ bane på GitHub Pages
    const response = await fetch('./modules/products/products.ttl');
    if (!response.ok) throw new Error(`Kunne ikke laste fil: ${response.statusText}`);
    
    const turtleText = await response.text();

    // 2. Pars Turtle-teksten og legg triplene inn i databasen (Store)
    await new Promise((resolve, reject) => {
      parser.parse(turtleText, (error, quad) => {
        if (error) reject(error);
        if (quad) store.addQuad(quad); // Legger til i grafen
        else resolve(); // Ferdig med parsing
      });
    });

    console.log(`[Modul: Produkter] Lastet inn suksessfullt. Totalt antall tripler i minnet: ${store.size}`);
    return store;

  } catch (error) {
    console.error("Feil under lasting av produktmodul:", error);
  }
}

// Enkel funksjon for å tegne ut dataene til HTML-en din
export function renderProducts(store, targetId) {
  const container = document.getElementById(targetId);
  
  // Finn alle subjekter som har rdf:type -> schema:Product
  const productQuads = store.getQuads(null, 'http://w3.org', 'https://schema.org');
  
  if (productQuads.length === 0) {
    container.innerHTML = "<p>Ingen produkter funnet.</p>";
    return;
  }

  container.innerHTML = productQuads.map(quad => {
    // Slå opp navn og pris for akkurat dette produktet (quad.subject)
    const nameQuad = store.getQuads(quad.subject, 'https://schema.org', null)[0];
    const priceQuad = store.getQuads(quad.subject, 'https://schema.org', null)[0];

    return `
      <div class="product-card" style="border: 1px solid #ccc; padding: 10px; margin: 10px 0;">
        <h3>${nameQuad ? nameQuad.object.value : 'Ukjent navn'}</h3>
        <p>Pris: $${priceQuad ? priceQuad.object.value : '0.00'}</p>
        <small style="color: gray;">ID: ${quad.subject.value}</small>
      </div>
    `;
  }).join('');
}

