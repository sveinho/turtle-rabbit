import { Parser } from 'https://unpkg.com';

export async function loadUserModule(globalStore) {
  const parser = new Parser({ format: 'text/turtle' });

  try {
    // 1. Hent brukerens Turtle-fil fra GitHub Pages
    const response = await fetch('./modules/users/users.ttl');
    if (!response.ok) throw new Error(`Kunne ikke laste brukere: ${response.statusText}`);
    const turtleText = await response.text();

    // 2. Legg triplene inn i den felles databasen
    await new Promise((resolve, reject) => {
      parser.parse(turtleText, (error, quad) => {
        if (error) reject(error);
        if (quad) globalStore.addQuad(quad);
        else resolve();
      });
    });

    console.log(`[Modul: Brukere] Lastet inn. Totalt antall tripler i minnet nå: ${globalStore.size}`);
  } catch (error) {
    console.error("Feil under lasting av brukermodul:", error);
  }
}

// Funksjon for å tegne ut relasjonen mellom Brukere og Produkter
export function renderPurchaseHistory(store, targetId) {
  const container = document.getElementById(targetId);
  
  // Finn alle subjekter som er av typen schema:Person
  const userQuads = store.getQuads(null, 'http://w3.org', 'https://schema.org');

  if (userQuads.length === 0) {
    container.innerHTML = "<p>Ingen brukere funnet.</p>";
    return;
  }

  container.innerHTML = userQuads.map(userQuad => {
    const userSubject = userQuad.subject;
    
    // Hent navnet på brukeren
    const userNameQuad = store.getQuads(userSubject, 'https://schema.org', null)[0];
    
    // Hent ID-en til produktet brukeren har kjøpt (schema:purchase)
    const purchaseQuad = store.getQuads(userSubject, 'https://schema.org', null)[0];
    
    let productDetailsHTML = "<span style='color:red;'>Intet kjøp registrert</span>";

    if (purchaseQuad) {
      const productURI = purchaseQuad.object; // Dette er URI-en som peker til produkt-filen!
      
      // Siden produktdataene OGSÅ ligger i globalStore, kan vi slå opp navnet på produktet med en gang!
      const productNameQuad = store.getQuads(productURI, 'https://schema.org', null)[0];
      const productPriceQuad = store.getQuads(productURI, 'https://schema.org', null)[0];

      if (productNameQuad) {
        productDetailsHTML = `<strong>${productNameQuad.object.value}</strong> ($${productPriceQuad.object.value})`;
      } else {
        productDetailsHTML = `<span style='color:orange;'>Produkt-ID funnet, men data ikke lastet inn ennå</span>`;
      }
    }

    return `
      <div class="user-card" style="background: #f9f9f9; padding: 10px; margin: 5px 0; border-left: 5px solid #007bff;">
        <p><strong>Kunde:</strong> ${userNameQuad ? userNameQuad.object.value : 'Ukjent'}</p>
        <p><strong>Har kjøpt:</strong> ${productDetailsHTML}</p>
      </div>
    `;
  }).join('');
}

