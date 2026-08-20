// /modules/products/products.js

// 🛑 INGEN IMPORT AV N3 ØVERST HER LENGER!

export async function loadProductModule(globalStore) {
  // Siden n3.min.js er lastet i <head>, bruker vi det globale N3-objektet direkte
  const store = globalStore || new N3.Store();
  const parser = new N3.Parser({ format: 'text/turtle' });

  try {
    const response = await fetch('./modules/products/products.ttl');
    if (!response.ok) throw new Error(`Kunne ikke laste fil: ${response.statusText}`);
    const turtleText = await response.text();

    await new Promise((resolve, reject) => {
      parser.parse(turtleText, (error, quad) => {
        if (error) reject(error);
        if (quad) store.addQuad(quad);
        else resolve();
      });
    });

    console.log(`[Modul: Produkter] Lastet. Tripler i minnet: ${store.size}`);
    return store;
  } catch (error) {
    console.error("Feil under lasting av produktmodul:", error);
  }
}

export function renderProducts(store, targetId) {
  const container = document.getElementById(targetId);
  
  // Merk: Vi bruker string-literals for URI-ene i store.getQuads
  const productQuads = store.getQuads(null, 'http://w3.org', 'https://schema.org');
  
  if (productQuads.length === 0) {
    container.innerHTML = "<p>Ingen produkter funnet.</p>";
    return;
  }

  container.innerHTML = productQuads.map(quad => {
    const nameQuad = store.getQuads(quad.subject, 'https://schema.org', null)[0];
    const priceQuad = store.getQuads(quad.subject, 'https://schema.org', null)[0];

    return `
      <div class="product-card" style="border: 1px solid #ccc; padding: 10px; margin: 10px 0;">
        <h3>${nameQuad ? nameQuad.object.value : 'Ukjent navn'}</h3>
        <p>Pris: $${priceQuad ? priceQuad.object.value : '0.00'}</p>
      </div>
    `;
  }).join('');
}
